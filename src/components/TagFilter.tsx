import { useMemo } from 'react';
import { Tag, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Memory } from '@/types/memory';
import { cn } from '@/lib/utils';

interface TagFilterProps {
  memories: Memory[];
  selectedTags: string[];
  onTagSelect: (tag: string) => void;
  onTagDeselect: (tag: string) => void;
  onClear: () => void;
  className?: string;
}

export function TagFilter({
  memories,
  selectedTags,
  onTagSelect,
  onTagDeselect,
  onClear,
  className,
}: TagFilterProps) {
  const allTags = useMemo(() => {
    const tagCounts = new Map<string, number>();
    memories.forEach((memory) => {
      const tags = memory.tags || (memory.metadata as { tags?: string[] })?.tags || [];
      tags.forEach((tag: string) => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });
    return Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20); // Limit to top 20 tags
  }, [memories]);

  if (allTags.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Tag className="h-4 w-4" />
          <span>Filter by tag</span>
        </div>
        {selectedTags.length > 0 && (
          <Button variant="ghost" size="sm" onClick={onClear} className="h-6 text-xs">
            Clear all
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {allTags.map(([tag, count]) => {
          const isSelected = selectedTags.includes(tag);
          return (
            <Badge
              key={tag}
              variant={isSelected ? 'default' : 'outline'}
              className={cn(
                'cursor-pointer transition-all gap-1',
                isSelected
                  ? 'bg-accent text-accent-foreground hover:bg-accent/80'
                  : 'hover:bg-muted'
              )}
              onClick={() => (isSelected ? onTagDeselect(tag) : onTagSelect(tag))}
            >
              {tag}
              <span className={cn('text-xs', isSelected ? 'opacity-70' : 'opacity-50')}>
                {count}
              </span>
              {isSelected && <X className="h-3 w-3 ml-0.5" />}
            </Badge>
          );
        })}
      </div>
    </div>
  );
}
