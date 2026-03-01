import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Brain, FileText, Link as LinkIcon, Image, FileIcon, Mic, Bookmark, ArrowLeft, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { Memory } from '@/types/memory';
import { cn } from '@/lib/utils';

const typeIcons = {
  note: FileText,
  link: LinkIcon,
  image: Image,
  pdf: FileIcon,
  voice_memo: Mic,
  bookmark: Bookmark,
};

export default function SharedMemory() {
  const { token } = useParams<{ token: string }>();
  const [memory, setMemory] = useState<Memory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSharedMemory();
  }, [token]);

  const fetchSharedMemory = async () => {
    if (!token) {
      setError('Invalid share link');
      setLoading(false);
      return;
    }

    try {
      // First get the share record
      const { data: shareData, error: shareError } = await supabase
        .from('shared_memories')
        .select('*')
        .eq('share_token', token)
        .eq('is_active', true)
        .maybeSingle();

      if (shareError || !shareData) {
        setError('This share link is invalid or has been deactivated');
        setLoading(false);
        return;
      }

      // Check expiration
      if (shareData.expires_at && new Date(shareData.expires_at) < new Date()) {
        setError('This share link has expired');
        setLoading(false);
        return;
      }

      // Increment view count
      await supabase
        .from('shared_memories')
        .update({ view_count: (shareData.view_count || 0) + 1 })
        .eq('id', shareData.id);

      // Fetch the memory using the edge function (bypasses RLS)
      const { data: memoryData, error: memoryError } = await supabase.functions.invoke('get-shared-memory', {
        body: { memoryId: shareData.memory_id },
      });

      if (memoryError || !memoryData) {
        setError('Failed to load the shared memory');
        setLoading(false);
        return;
      }

      setMemory(memoryData.memory as Memory);
    } catch (err) {
      console.error('Error fetching shared memory:', err);
      setError('An error occurred while loading');
    } finally {
      setLoading(false);
    }
  };

  const getFileUrl = (filePath: string): string => {
    const { data } = supabase.storage.from('memories').getPublicUrl(filePath);
    return data.publicUrl;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
          <div className="container max-w-3xl mx-auto px-4 h-16 flex items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary rounded-xl">
                <Brain className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-display font-semibold text-xl">Recall</span>
            </div>
          </div>
        </header>
        <main className="container max-w-3xl mx-auto px-4 py-12">
          <Skeleton className="h-8 w-3/4 mb-4" />
          <Skeleton className="h-4 w-1/4 mb-8" />
          <Skeleton className="h-64 w-full" />
        </main>
      </div>
    );
  }

  if (error || !memory) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-muted mx-auto flex items-center justify-center">
            <FileText className="h-10 w-10 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-display font-bold">{error || 'Memory not found'}</h1>
          <p className="text-muted-foreground">
            The memory you're looking for doesn't exist or has been removed.
          </p>
          <Link to="/">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Go to Recall
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const Icon = typeIcons[memory.type as keyof typeof typeIcons] || FileText;
  const tags = memory.tags || [];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="container max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-xl">
              <Brain className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display font-semibold text-xl">Recall</span>
          </Link>
          <Badge variant="secondary" className="gap-1">
            <Icon className="h-3 w-3" />
            Shared {memory.type.replace('_', ' ')}
          </Badge>
        </div>
      </header>

      <main className="container max-w-3xl mx-auto px-4 py-12">
        <article className="space-y-6">
          <header>
            <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">
              {memory.title}
            </h1>
            <p className="text-muted-foreground">
              {format(new Date(memory.created_at), 'MMMM d, yyyy')}
            </p>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </header>

          {/* Content based on type */}
          {memory.type === 'link' && memory.url && (
            <a
              href={memory.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-primary hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              {memory.url}
            </a>
          )}

          {memory.type === 'bookmark' && (
            <div className="space-y-4">
              {memory.url && (
                <a
                  href={memory.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-primary hover:underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  {memory.url}
                </a>
              )}
              {memory.content && (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <p>{memory.content}</p>
                </div>
              )}
            </div>
          )}

          {memory.type === 'image' && memory.file_path && (
            <div className="rounded-xl overflow-hidden border border-border">
              <img
                src={getFileUrl(memory.file_path)}
                alt={memory.title}
                className="w-full h-auto"
              />
            </div>
          )}

          {memory.type === 'voice_memo' && memory.file_path && (
            <div className="p-4 bg-muted rounded-xl">
              <audio controls className="w-full">
                <source src={getFileUrl(memory.file_path)} />
                Your browser does not support the audio element.
              </audio>
            </div>
          )}

          {memory.type === 'pdf' && memory.file_path && (
            <div className="p-4 bg-muted rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileIcon className="h-10 w-10 text-muted-foreground" />
                <div>
                  <p className="font-medium">{memory.title}</p>
                  <p className="text-sm text-muted-foreground">PDF Document</p>
                </div>
              </div>
              <a
                href={getFileUrl(memory.file_path)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm" className="gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Open PDF
                </Button>
              </a>
            </div>
          )}

          {(memory.type === 'note' || memory.content) && memory.type !== 'bookmark' && (
            <div className="prose prose-lg dark:prose-invert max-w-none">
              <p className="whitespace-pre-wrap">{memory.content}</p>
            </div>
          )}

          {memory.extracted_text && memory.type !== 'note' && (
            <div className="mt-8 pt-8 border-t border-border">
              <h2 className="text-lg font-semibold mb-4">Extracted Text</h2>
              <div className="p-4 bg-muted rounded-xl">
                <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                  {memory.extracted_text}
                </p>
              </div>
            </div>
          )}
        </article>

        <footer className="mt-12 pt-8 border-t border-border text-center">
          <p className="text-sm text-muted-foreground mb-4">
            This memory was shared via Recall
          </p>
          <Link to="/">
            <Button variant="outline" className="gap-2">
              <Brain className="h-4 w-4" />
              Create your own Recall
            </Button>
          </Link>
        </footer>
      </main>
    </div>
  );
}
