import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { FileText, Link, Image, FileIcon, ExternalLink, Pencil, Layers, Mic, Bookmark, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import type { Memory, MemoryType, MemoryChunk } from '@/types/memory';
import { cn } from '@/lib/utils';
import { ShareMemoryButton } from '@/components/ShareMemoryButton';

interface MemoryDetailDrawerProps {
  memory: Memory | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (memory: Memory) => void;
  onDelete: (id: string) => void;
}

const typeIcons: Record<MemoryType, React.ElementType> = {
  note: FileText,
  link: Link,
  image: Image,
  pdf: FileIcon,
  voice_memo: Mic,
  bookmark: Bookmark,
  decision: Scale,
};

const typeBadgeStyles: Record<MemoryType, string> = {
  note: 'badge-note',
  link: 'badge-link',
  image: 'badge-image',
  pdf: 'badge-pdf',
  voice_memo: 'badge-note',
  bookmark: 'badge-link',
  decision: 'badge-pdf',
};

export function MemoryDetailDrawer({
  memory,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: MemoryDetailDrawerProps) {
  const [chunks, setChunks] = useState<MemoryChunk[]>([]);
  const [loadingChunks, setLoadingChunks] = useState(false);

  useEffect(() => {
    if (memory && open) {
      fetchChunks();
    }
  }, [memory, open]);

  const fetchChunks = async () => {
    if (!memory) return;
    setLoadingChunks(true);
    const { data, error } = await supabase
      .from('memory_chunks')
      .select('*')
      .eq('memory_id', memory.id)
      .order('chunk_index', { ascending: true });

    if (!error && data) {
      setChunks(data.map(d => ({ ...d, embedding: d.embedding || undefined })) as MemoryChunk[]);
    }
    setLoadingChunks(false);
  };

  const [fileUrl, setFileUrl] = useState<string | null>(null);

  useEffect(() => {
    if (memory?.file_path) {
      supabase.storage.from('memories').createSignedUrl(memory.file_path, 3600).then(({ data }) => {
        if (data?.signedUrl) setFileUrl(data.signedUrl);
      });
    } else {
      setFileUrl(null);
    }
  }, [memory?.file_path]);

  const Icon = typeIcons[memory.type];
  const tags = memory.tags || (memory.metadata as { tags?: string[] })?.tags || [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-hidden flex flex-col">
        <SheetHeader className="flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className={cn('badge-type', typeBadgeStyles[memory.type])}>
                  {memory.type.charAt(0).toUpperCase() + memory.type.slice(1)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(memory.created_at), 'MMM d, yyyy h:mm a')}
                </span>
              </div>
              <SheetTitle className="font-display text-xl text-left">{memory.title}</SheetTitle>
            </div>
            <div className="flex items-center gap-1">
              <ShareMemoryButton memory={memory} variant="icon" />
              <Button variant="ghost" size="icon" onClick={() => onEdit(memory)}>
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {tags.map((tag: string) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </SheetHeader>

        <ScrollArea className="flex-1 mt-6 -mx-6 px-6">
          <Tabs defaultValue="content" className="w-full">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="chunks" className="gap-1">
                <Layers className="h-3.5 w-3.5" />
                Chunks ({chunks.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="mt-4 space-y-4">
              {/* Image Preview */}
              {memory.type === 'image' && fileUrl && (
                <div className="rounded-lg overflow-hidden bg-muted">
                  <img
                    src={fileUrl}
                    alt={memory.title}
                    className="w-full h-auto max-h-64 object-contain"
                  />
                </div>
              )}

              {/* PDF Link */}
              {memory.type === 'pdf' && fileUrl && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.open(fileUrl, '_blank')}
                >
                  <FileIcon className="mr-2 h-4 w-4" />
                  Open PDF in new tab
                </Button>
              )}

              {/* Link */}
              {memory.type === 'link' && memory.url && (
                <Button
                  variant="outline"
                  className="w-full justify-start truncate"
                  onClick={() => window.open(memory.url, '_blank')}
                >
                  <ExternalLink className="mr-2 h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{memory.url}</span>
                </Button>
              )}

              {/* Content / Extracted Text */}
              {(memory.content || memory.extracted_text) && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {memory.type === 'image' || memory.type === 'pdf'
                      ? 'Extracted Text'
                      : 'Content'}
                  </h4>
                  <div className="bg-muted/50 rounded-lg p-4 text-sm whitespace-pre-wrap">
                    {memory.content || memory.extracted_text}
                  </div>
                </div>
              )}

              {!memory.content && !memory.extracted_text && (
                <div className="text-center py-8 text-muted-foreground">
                  <Icon className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No content available for this memory.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="chunks" className="mt-4 space-y-3">
              {loadingChunks ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading chunks...
                </div>
              ) : chunks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Layers className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No semantic chunks have been generated yet.</p>
                  <p className="text-xs mt-1">Chunks are created when the memory is processed.</p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">
                    This memory has been split into {chunks.length} semantic chunks for better search.
                  </p>
                  {chunks.map((chunk, index) => (
                    <div
                      key={chunk.id}
                      className="bg-muted/30 border border-border rounded-lg p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="text-xs">
                          Chunk {index + 1}
                        </Badge>
                        {chunk.embedding && (
                          <span className="text-[10px] text-muted-foreground">
                            768-dim embedding ✓
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-foreground/80 whitespace-pre-wrap">
                        {chunk.chunk_text}
                      </p>
                    </div>
                  ))}
                </>
              )}
            </TabsContent>
          </Tabs>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
