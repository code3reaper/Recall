import { FileText, Link, Image, FileIcon, Trash2, ExternalLink, Eye, Mic, Bookmark, Scale } from 'lucide-react';
import { format } from 'date-fns';
import type { Memory, MemoryType } from '@/types/memory';
import type { Collection } from '@/types/collection';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ShareMemoryButton } from '@/components/ShareMemoryButton';
import { AddToCollectionButton } from '@/components/AddToCollectionButton';

interface MemoryCardProps {
  memory: Memory;
  onDelete?: (id: string) => void;
  onClick?: () => void;
  highlighted?: boolean;
  highlightText?: string;
  className?: string;
  collections?: Collection[];
  memoryCollectionIds?: string[];
  onAddToCollection?: (memoryId: string, collectionId: string) => Promise<void>;
  onRemoveFromCollection?: (memoryId: string, collectionId: string) => Promise<void>;
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

const typeLabels: Record<MemoryType, string> = {
  note: 'Note',
  link: 'Link',
  image: 'Image',
  pdf: 'PDF',
  voice_memo: 'Voice Memo',
  bookmark: 'Bookmark',
  decision: 'Decision',
};

export function MemoryCard({
  memory,
  onDelete,
  onClick,
  highlighted = false,
  highlightText,
  className,
  collections,
  memoryCollectionIds,
  onAddToCollection,
  onRemoveFromCollection,
}: MemoryCardProps) {
  const Icon = typeIcons[memory.type];
  const [showPreview, setShowPreview] = useState(false);

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      setShowPreview(true);
    }
  };

  const getPreviewText = () => {
    const text = memory.content || memory.extracted_text || memory.url || '';
    if (highlightText && text.toLowerCase().includes(highlightText.toLowerCase())) {
      const index = text.toLowerCase().indexOf(highlightText.toLowerCase());
      const start = Math.max(0, index - 50);
      const end = Math.min(text.length, index + highlightText.length + 50);
      return '...' + text.slice(start, end) + '...';
    }
    return text.slice(0, 150) + (text.length > 150 ? '...' : '');
  };

  const [fileUrl, setFileUrl] = useState<string | null>(null);

  useEffect(() => {
    if (memory.file_path) {
      supabase.storage.from('memories').createSignedUrl(memory.file_path, 3600).then(({ data }) => {
        if (data?.signedUrl) setFileUrl(data.signedUrl);
      });
    }
  }, [memory.file_path]);

  return (
    <>
      <div
        className={cn(
          'memory-card group cursor-pointer',
          highlighted && 'ring-2 ring-accent/50 shadow-glow',
          className
        )}
        onClick={handleClick}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Thumbnail for images */}
            {memory.type === 'image' && fileUrl ? (
              <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-muted">
                <img 
                  src={fileUrl} 
                  alt={memory.title}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="flex-shrink-0 p-2 bg-muted rounded-lg">
                <Icon className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={cn('badge-type', typeBadgeStyles[memory.type])}>
                  {typeLabels[memory.type]}
                </span>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(memory.created_at), 'MMM d, yyyy')}
                </span>
              </div>
              <h3 className="font-semibold text-foreground truncate mb-1">
                {memory.title}
              </h3>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {getPreviewText()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {collections && onAddToCollection && onRemoveFromCollection && (
              <AddToCollectionButton
                memoryId={memory.id}
                collections={collections}
                memoryCollectionIds={memoryCollectionIds || []}
                onAddToCollection={onAddToCollection}
                onRemoveFromCollection={onRemoveFromCollection}
              />
            )}
            <ShareMemoryButton memory={memory} variant="icon" />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                setShowPreview(true);
              }}
            >
              <Eye className="h-4 w-4" />
            </Button>
            {memory.url && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(memory.url, '_blank');
                }}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(memory.id);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className={cn('badge-type', typeBadgeStyles[memory.type])}>
                {typeLabels[memory.type]}
              </span>
              {memory.title}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Image Preview */}
            {memory.type === 'image' && fileUrl && (
              <div className="rounded-lg overflow-hidden bg-muted">
                <img 
                  src={fileUrl} 
                  alt={memory.title}
                  className="w-full h-auto max-h-96 object-contain"
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
                className="w-full"
                onClick={() => window.open(memory.url, '_blank')}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                {memory.url}
              </Button>
            )}

            {/* Content / Extracted Text */}
            {(memory.content || memory.extracted_text) && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">
                  {memory.type === 'image' || memory.type === 'pdf' ? 'Extracted Text' : 'Content'}
                </h4>
                <div className="bg-muted/50 rounded-lg p-4 text-sm whitespace-pre-wrap max-h-64 overflow-auto">
                  {memory.content || memory.extracted_text}
                </div>
              </div>
            )}

            <div className="text-xs text-muted-foreground">
              Created {format(new Date(memory.created_at), 'PPpp')}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
