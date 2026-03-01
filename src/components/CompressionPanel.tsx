import { useState } from 'react';
import { Minimize2, Loader2, ChevronDown, ChevronUp, Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Memory } from '@/types/memory';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

interface CompressionPanelProps {
  memories: Memory[];
  onCompress: (memoryId: string, compressedContent: string) => Promise<void>;
}

interface CompressionSuggestion {
  memoryId: string;
  memory: Memory;
  originalLength: number;
  compressed?: string;
  compressedLength?: number;
  isCompressing?: boolean;
  isApplied?: boolean;
}

export function CompressionPanel({ memories, onCompress }: CompressionPanelProps) {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<CompressionSuggestion[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Find memories that could benefit from compression (longer than 500 chars)
  const compressibleMemories = memories.filter(m => {
    const content = m.content || m.extracted_text || '';
    return content.length > 500 && !m.is_compressed;
  });

  const analyzeForCompression = async () => {
    if (!user || compressibleMemories.length === 0) return;

    setIsAnalyzing(true);
    
    // Initialize suggestions
    const initialSuggestions = compressibleMemories.slice(0, 5).map(m => ({
      memoryId: m.id,
      memory: m,
      originalLength: (m.content || m.extracted_text || '').length,
    }));
    
    setSuggestions(initialSuggestions);

    // Compress each one
    for (let i = 0; i < initialSuggestions.length; i++) {
      const suggestion = initialSuggestions[i];
      
      setSuggestions(prev => prev.map((s, idx) => 
        idx === i ? { ...s, isCompressing: true } : s
      ));

      try {
        const content = suggestion.memory.content || suggestion.memory.extracted_text || '';
        
        const response = await supabase.functions.invoke('chat-with-memories', {
          body: {
            query: `Compress this content into key bullet points. Keep the essential insights and facts. Be extremely concise. Content to compress:\n\n${content}`,
            userId: user.id,
            command: 'compress',
          },
        });

        if (response.data?.response) {
          setSuggestions(prev => prev.map((s, idx) => 
            idx === i ? { 
              ...s, 
              compressed: response.data.response,
              compressedLength: response.data.response.length,
              isCompressing: false 
            } : s
          ));
        }
      } catch (error) {
        console.error('Compression error:', error);
        setSuggestions(prev => prev.map((s, idx) => 
          idx === i ? { ...s, isCompressing: false } : s
        ));
      }
    }

    setIsAnalyzing(false);
  };

  const applyCompression = async (suggestion: CompressionSuggestion) => {
    if (!suggestion.compressed) return;
    
    await onCompress(suggestion.memoryId, suggestion.compressed);
    
    setSuggestions(prev => prev.map(s => 
      s.memoryId === suggestion.memoryId ? { ...s, isApplied: true } : s
    ));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-primary">
          <Minimize2 className="h-5 w-5" />
          <h3 className="font-semibold">Memory Compression</h3>
        </div>
        <Badge variant="outline">
          {compressibleMemories.length} compressible
        </Badge>
      </div>

      <p className="text-sm text-muted-foreground">
        Long memories can be compressed into key insights. Both versions are kept.
      </p>

      {suggestions.length === 0 ? (
        <Button
          onClick={analyzeForCompression}
          disabled={isAnalyzing || compressibleMemories.length === 0}
          className="w-full"
          variant="outline"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Analyzing memories...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Analyze for compression
            </>
          )}
        </Button>
      ) : (
        <ScrollArea className="h-[400px]">
          <div className="space-y-3">
            {suggestions.map((suggestion) => (
              <Collapsible
                key={suggestion.memoryId}
                open={expandedId === suggestion.memoryId}
                onOpenChange={(open) => setExpandedId(open ? suggestion.memoryId : null)}
              >
                <div className={cn(
                  'border border-border rounded-lg overflow-hidden',
                  suggestion.isApplied && 'border-green-500/50 bg-green-500/5'
                )}>
                  <CollapsibleTrigger className="w-full p-3 flex items-center justify-between hover:bg-muted/50 transition-colors">
                    <div className="flex-1 text-left">
                      <p className="font-medium text-sm line-clamp-1">
                        {suggestion.memory.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {suggestion.originalLength} chars
                        </span>
                        {suggestion.compressedLength && (
                          <>
                            <span className="text-xs text-muted-foreground">→</span>
                            <span className="text-xs text-green-500 font-medium">
                              {suggestion.compressedLength} chars
                            </span>
                            <Badge variant="outline" className="text-xs text-green-500">
                              -{Math.round((1 - suggestion.compressedLength / suggestion.originalLength) * 100)}%
                            </Badge>
                          </>
                        )}
                      </div>
                    </div>
                    {suggestion.isCompressing ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : suggestion.isApplied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : expandedId === suggestion.memoryId ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    {suggestion.compressed && (
                      <div className="p-3 border-t border-border space-y-3">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-2">Compressed version:</p>
                          <div className="bg-muted/50 rounded-lg p-3 text-sm prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown>{suggestion.compressed}</ReactMarkdown>
                          </div>
                        </div>
                        
                        {!suggestion.isApplied && (
                          <Button
                            onClick={() => applyCompression(suggestion)}
                            size="sm"
                            className="w-full"
                          >
                            <Check className="h-4 w-4 mr-2" />
                            Apply Compression
                          </Button>
                        )}
                      </div>
                    )}
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
