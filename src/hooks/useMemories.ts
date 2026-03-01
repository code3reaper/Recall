import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Memory, MemoryType, SearchResult, DecisionOutcome } from '@/types/memory';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';

export function useMemories() {
  const { user } = useAuth();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (user) {
      fetchMemories();
    } else {
      setMemories([]);
      setLoading(false);
    }
  }, [user]);

  const fetchMemories = async () => {
    if (!user) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('memories')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: 'Error fetching memories',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setMemories(data as Memory[]);
    }
    setLoading(false);
  };

  const uploadFile = async (file: File, userId: string): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('memories')
      .upload(fileName, file);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      toast({
        title: 'Upload failed',
        description: uploadError.message,
        variant: 'destructive',
      });
      return null;
    }

    return fileName;
  };

  const createMemory = async (
    type: MemoryType,
    title: string,
    content?: string,
    url?: string,
    file?: File,
    tags?: string[]
  ) => {
    if (!user) return { error: new Error('Not authenticated') };

    let filePath: string | null = null;

    // Upload file if provided
    if (file && (type === 'image' || type === 'pdf' || type === 'voice_memo')) {
      filePath = await uploadFile(file, user.id);
      if (!filePath) {
        return { error: new Error('File upload failed') };
      }
    }

    const { data, error } = await supabase
      .from('memories')
      .insert({
        user_id: user.id,
        type,
        title,
        content,
        url,
        file_path: filePath,
        extracted_text: content, // For notes, set extracted text immediately
        tags: tags || [],
      })
      .select()
      .single();

    if (error) {
      toast({
        title: 'Error creating memory',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    }

    // Process the memory for semantic search
    if (data) {
      processMemoryForSearch(data as Memory);
      setMemories((prev) => [data as Memory, ...prev]);
      
      let processingMsg = 'Your memory has been stored and indexed.';
      if (type === 'image' || type === 'pdf') {
        processingMsg = 'Your memory is being processed. Text extraction in progress...';
      } else if (type === 'voice_memo') {
        processingMsg = 'Your voice memo is being processed. Transcription in progress...';
      }
      
      toast({
        title: 'Memory saved',
        description: processingMsg,
      });
    }

    return { data, error: null };
  };

  const updateMemory = async (
    id: string,
    updates: { title?: string; content?: string; tags?: string[] }
  ) => {
    if (!user) return { error: new Error('Not authenticated') };

    const updateData: Record<string, unknown> = {};
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.content !== undefined) {
      updateData.content = updates.content;
      updateData.extracted_text = updates.content; // Also update extracted text for notes
    }
    if (updates.tags !== undefined) updateData.tags = updates.tags;

    const { data, error } = await supabase
      .from('memories')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      toast({
        title: 'Error updating memory',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    }

    // Update local state
    if (data) {
      setMemories((prev) =>
        prev.map((m) => (m.id === id ? (data as Memory) : m))
      );
    }

    // Re-process for search if content changed
    if (updates.content && data) {
      processMemoryForSearch(data as Memory);
    }

    toast({
      title: 'Memory updated',
      description: 'Your changes have been saved.',
    });

    return { data, error: null };
  };

  const processMemoryForSearch = async (memory: Memory) => {
    try {
      // For voice memos, trigger transcription
      if (memory.type === 'voice_memo' && memory.file_path) {
        const transcribeResponse = await supabase.functions.invoke('transcribe-audio', {
          body: { memoryId: memory.id, filePath: memory.file_path },
        });
        
        if (transcribeResponse.data?.transcript) {
          setMemories((prev) =>
            prev.map((m) =>
              m.id === memory.id
                ? { ...m, extracted_text: transcribeResponse.data.transcript, content: transcribeResponse.data.transcript }
                : m
            )
          );
          
          toast({
            title: 'Transcription complete',
            description: 'Your voice memo has been transcribed.',
          });
        }
      }
      
      const response = await supabase.functions.invoke('process-memory', {
        body: { memoryId: memory.id },
      });
      
      if (response.error) {
        console.error('Error processing memory:', response.error);
      } else if (response.data?.extractedText) {
        // Update the memory in state with extracted text
        setMemories((prev) => 
          prev.map((m) => 
            m.id === memory.id 
              ? { ...m, extracted_text: response.data.extractedText }
              : m
          )
        );
      }
    } catch (err) {
      console.error('Error calling process-memory function:', err);
    }
  };

  const searchMemories = async (query: string, mode: 'semantic' | 'keyword' = 'semantic') => {
    if (!user || !query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      if (mode === 'semantic') {
        const response = await supabase.functions.invoke('search-memories', {
          body: { query, userId: user.id },
        });

        if (response.error) {
          throw response.error;
        }

        const results = response.data?.results || [];
        
        // Fetch full memory data for each result
        const memoryIds = [...new Set(results.map((r: SearchResult) => r.memory_id))] as string[];
        
        if (memoryIds.length > 0) {
          const { data: memoriesData } = await supabase
            .from('memories')
            .select('*')
            .in('id', memoryIds);

          const memoriesMap = new Map(
            (memoriesData || []).map((m) => [m.id, m as Memory])
          );

          const enrichedResults = results.map((r: SearchResult) => ({
            ...r,
            memory: memoriesMap.get(r.memory_id),
          }));

          setSearchResults(enrichedResults);
        } else {
          setSearchResults([]);
        }
      } else {
        // Keyword search - simple text matching
        const { data: keywordResults } = await supabase
          .from('memories')
          .select('*')
          .eq('user_id', user.id)
          .or(`title.ilike.%${query}%,content.ilike.%${query}%,extracted_text.ilike.%${query}%`)
          .order('created_at', { ascending: false })
          .limit(20);

        if (keywordResults && keywordResults.length > 0) {
          const results: SearchResult[] = keywordResults.map((m) => ({
            memory_id: m.id,
            chunk_id: m.id, // Use memory id as chunk id for keyword search
            chunk_text: (m.content || m.extracted_text || '').slice(0, 200),
            similarity: 1, // Keyword match
            memory: m as Memory,
          }));
          setSearchResults(results);
        } else {
          setSearchResults([]);
        }
      }
    } catch (err) {
      console.error('Search error:', err);
      toast({
        title: 'Search failed',
        description: 'Unable to search your memories.',
        variant: 'destructive',
      });
    } finally {
      setIsSearching(false);
    }
  };

  const deleteMemory = async (id: string) => {
    const { error } = await supabase.from('memories').delete().eq('id', id);

    if (error) {
      toast({
        title: 'Error deleting memory',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    }

    setMemories((prev) => prev.filter((m) => m.id !== id));
    toast({
      title: 'Memory deleted',
      description: 'Your memory has been removed.',
    });
    return { error: null };
  };

  const getFileUrl = (filePath: string): string => {
    const { data } = supabase.storage.from('memories').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const createDecision = async (
    title: string,
    reasoning: string,
    alternatives: { name: string; reason: string }[],
    tags?: string[],
    decisionDate?: string
  ) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { data, error } = await supabase
      .from('memories')
      .insert({
        user_id: user.id,
        type: 'decision',
        title,
        reasoning,
        alternatives_rejected: alternatives,
        tags: tags || [],
        decision_date: decisionDate ? new Date(decisionDate).toISOString() : new Date().toISOString(),
        outcome: 'pending',
      })
      .select()
      .single();

    if (error) {
      toast({
        title: 'Error creating decision',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    }

    if (data) {
      setMemories((prev) => [data as Memory, ...prev]);
      processMemoryForSearch(data as Memory);
      toast({
        title: 'Decision logged',
        description: 'Your decision has been recorded.',
      });
    }

    return { data, error: null };
  };

  const updateDecisionOutcome = async (
    id: string,
    outcome: DecisionOutcome,
    outcomeNotes?: string
  ) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { data, error } = await supabase
      .from('memories')
      .update({
        outcome,
        outcome_notes: outcomeNotes,
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      toast({
        title: 'Error updating outcome',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    }

    if (data) {
      setMemories((prev) =>
        prev.map((m) => (m.id === id ? (data as Memory) : m))
      );
      toast({
        title: 'Outcome updated',
        description: 'Your decision outcome has been saved.',
      });
    }

    return { data, error: null };
  };

  const compressMemory = async (id: string, compressedContent: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { data, error } = await supabase
      .from('memories')
      .update({
        compressed_content: compressedContent,
        is_compressed: true,
        compression_date: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      toast({
        title: 'Error compressing memory',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    }

    if (data) {
      setMemories((prev) =>
        prev.map((m) => (m.id === id ? (data as Memory) : m))
      );
      toast({
        title: 'Memory compressed',
        description: 'Original and compressed versions saved.',
      });
    }

    return { data, error: null };
  };

  const batchProcessMemories = async () => {
    if (!user) return { error: new Error('Not authenticated'), processed: 0 };

    try {
      toast({
        title: 'Processing memories...',
        description: 'Generating embeddings for semantic search. This may take a minute.',
      });

      const response = await supabase.functions.invoke('batch-process-memories', {
        body: { userId: user.id },
      });

      if (response.error) {
        throw response.error;
      }

      const { processed, failed, total } = response.data || {};
      
      toast({
        title: 'Processing complete',
        description: `Processed ${processed} of ${total} memories${failed > 0 ? ` (${failed} failed)` : ''}.`,
      });

      return { error: null, processed: processed || 0 };
    } catch (error) {
      console.error('Batch processing error:', error);
      toast({
        title: 'Processing failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
      return { error, processed: 0 };
    }
  };

  return {
    memories,
    loading,
    searchResults,
    isSearching,
    createMemory,
    createDecision,
    updateMemory,
    updateDecisionOutcome,
    compressMemory,
    searchMemories,
    deleteMemory,
    refreshMemories: fetchMemories,
    getFileUrl,
    batchProcessMemories,
  };
}
