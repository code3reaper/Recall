import { format } from 'date-fns';
import type { Memory, MemoryType } from '@/types/memory';
import type { Collection } from '@/types/collection';
import { MemoryCard } from './MemoryCard';
import { cn } from '@/lib/utils';

interface MemoryTimelineProps {
  memories: Memory[];
  onDelete?: (id: string) => void;
  onMemoryClick?: (memory: Memory) => void;
  filterType?: MemoryType | 'all';
  className?: string;
  collections?: Collection[];
  getCollectionsForMemory?: (memoryId: string) => Collection[];
  onAddToCollection?: (memoryId: string, collectionId: string) => Promise<{ error: Error | null }>;
  onRemoveFromCollection?: (memoryId: string, collectionId: string) => Promise<{ error: Error | null }>;
}

export function MemoryTimeline({
  memories,
  onDelete,
  onMemoryClick,
  filterType = 'all',
  className,
  collections,
  getCollectionsForMemory,
  onAddToCollection,
  onRemoveFromCollection,
}: MemoryTimelineProps) {
  const filteredMemories =
    filterType === 'all'
      ? memories
      : memories.filter((m) => m.type === filterType);

  // Group memories by date
  const groupedMemories = filteredMemories.reduce(
    (groups, memory) => {
      const date = format(new Date(memory.created_at), 'MMMM d, yyyy');
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(memory);
      return groups;
    },
    {} as Record<string, Memory[]>
  );

  if (filteredMemories.length === 0) {
    return (
      <div className={cn('text-center py-16', className)}>
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
          <svg
            className="h-8 w-8 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-1">No memories yet</h3>
        <p className="text-muted-foreground">
          Start adding notes, links, and more to build your personal memory bank.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-8', className)}>
      {Object.entries(groupedMemories).map(([date, dateMemories]) => (
        <div key={date}>
          <h4 className="text-sm font-medium text-muted-foreground mb-3 sticky top-0 bg-background py-2">
            {date}
          </h4>
          <div className="space-y-3">
            {dateMemories.map((memory, index) => (
              <div
                key={memory.id}
                className="animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <MemoryCard 
                  memory={memory} 
                  onDelete={onDelete} 
                  onClick={() => onMemoryClick?.(memory)}
                  collections={collections}
                  memoryCollectionIds={getCollectionsForMemory ? getCollectionsForMemory(memory.id).map(c => c.id) : []}
                  onAddToCollection={onAddToCollection ? async (mId, cId) => { await onAddToCollection(mId, cId); } : undefined}
                  onRemoveFromCollection={onRemoveFromCollection ? async (mId, cId) => { await onRemoveFromCollection(mId, cId); } : undefined}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
