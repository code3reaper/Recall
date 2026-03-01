import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';
import type { Collection, MemoryCollection } from '@/types/collection';

export function useCollections() {
  const { user } = useAuth();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [memoryCollections, setMemoryCollections] = useState<MemoryCollection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchCollections();
      fetchMemoryCollections();
    } else {
      setCollections([]);
      setMemoryCollections([]);
      setLoading(false);
    }
  }, [user]);

  const fetchCollections = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('collections')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching collections:', error);
    } else {
      setCollections(data as Collection[]);
    }
    setLoading(false);
  };

  const fetchMemoryCollections = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('memory_collections')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching memory collections:', error);
    } else {
      setMemoryCollections(data as MemoryCollection[]);
    }
  };

  const createCollection = async (
    name: string,
    description?: string,
    color?: string,
    icon?: string
  ) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { data, error } = await supabase
      .from('collections')
      .insert({
        user_id: user.id,
        name,
        description,
        color: color || 'blue',
        icon: icon || 'folder',
      })
      .select()
      .single();

    if (error) {
      toast({
        title: 'Error creating collection',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    }

    setCollections((prev) => [data as Collection, ...prev]);
    toast({
      title: 'Collection created',
      description: `"${name}" has been created.`,
    });

    return { data, error: null };
  };

  const updateCollection = async (
    id: string,
    updates: Partial<Pick<Collection, 'name' | 'description' | 'color' | 'icon'>>
  ) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { data, error } = await supabase
      .from('collections')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      toast({
        title: 'Error updating collection',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    }

    setCollections((prev) =>
      prev.map((c) => (c.id === id ? (data as Collection) : c))
    );

    return { data, error: null };
  };

  const deleteCollection = async (id: string) => {
    const { error } = await supabase
      .from('collections')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error deleting collection',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    }

    setCollections((prev) => prev.filter((c) => c.id !== id));
    setMemoryCollections((prev) => prev.filter((mc) => mc.collection_id !== id));
    
    toast({
      title: 'Collection deleted',
      description: 'The collection has been removed.',
    });
    
    return { error: null };
  };

  const addMemoryToCollection = async (memoryId: string, collectionId: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { data, error } = await supabase
      .from('memory_collections')
      .insert({
        memory_id: memoryId,
        collection_id: collectionId,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        toast({
          title: 'Already in collection',
          description: 'This memory is already in this collection.',
        });
      } else {
        toast({
          title: 'Error adding to collection',
          description: error.message,
          variant: 'destructive',
        });
      }
      return { error };
    }

    setMemoryCollections((prev) => [...prev, data as MemoryCollection]);
    toast({
      title: 'Added to collection',
      description: 'Memory has been added to the collection.',
    });

    return { data, error: null };
  };

  const removeMemoryFromCollection = async (memoryId: string, collectionId: string) => {
    const { error } = await supabase
      .from('memory_collections')
      .delete()
      .eq('memory_id', memoryId)
      .eq('collection_id', collectionId);

    if (error) {
      toast({
        title: 'Error removing from collection',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    }

    setMemoryCollections((prev) =>
      prev.filter((mc) => !(mc.memory_id === memoryId && mc.collection_id === collectionId))
    );

    return { error: null };
  };

  const getCollectionsForMemory = (memoryId: string) => {
    const collectionIds = memoryCollections
      .filter((mc) => mc.memory_id === memoryId)
      .map((mc) => mc.collection_id);
    return collections.filter((c) => collectionIds.includes(c.id));
  };

  const getMemoriesInCollection = (collectionId: string) => {
    return memoryCollections
      .filter((mc) => mc.collection_id === collectionId)
      .map((mc) => mc.memory_id);
  };

  return {
    collections,
    memoryCollections,
    loading,
    createCollection,
    updateCollection,
    deleteCollection,
    addMemoryToCollection,
    removeMemoryFromCollection,
    getCollectionsForMemory,
    getMemoriesInCollection,
    refreshCollections: fetchCollections,
  };
}
