import { useState } from 'react';
import { FolderPlus, Check, Folder, Star, Heart, Bookmark, Briefcase, GraduationCap, Lightbulb, Music, Camera, Code } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { Collection } from '@/types/collection';
import { COLLECTION_COLORS } from '@/types/collection';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  folder: Folder,
  star: Star,
  heart: Heart,
  bookmark: Bookmark,
  briefcase: Briefcase,
  'graduation-cap': GraduationCap,
  lightbulb: Lightbulb,
  music: Music,
  camera: Camera,
  code: Code,
};

interface AddToCollectionButtonProps {
  memoryId: string;
  collections: Collection[];
  memoryCollectionIds: string[];
  onAddToCollection: (memoryId: string, collectionId: string) => Promise<void>;
  onRemoveFromCollection: (memoryId: string, collectionId: string) => Promise<void>;
}

export function AddToCollectionButton({
  memoryId,
  collections,
  memoryCollectionIds,
  onAddToCollection,
  onRemoveFromCollection,
}: AddToCollectionButtonProps) {
  const [open, setOpen] = useState(false);

  const getColorValue = (colorName: string) => {
    return COLLECTION_COLORS.find((c) => c.name === colorName)?.value || COLLECTION_COLORS[0].value;
  };

  const handleToggle = async (collectionId: string) => {
    if (memoryCollectionIds.includes(collectionId)) {
      await onRemoveFromCollection(memoryId, collectionId);
    } else {
      await onAddToCollection(memoryId, collectionId);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <FolderPlus className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="end">
        <p className="text-sm font-medium mb-2 px-2">Add to collection</p>
        {collections.length === 0 ? (
          <p className="text-sm text-muted-foreground px-2 py-4 text-center">
            No collections yet. Create one first!
          </p>
        ) : (
          <div className="space-y-1">
            {collections.map((collection) => {
              const Icon = iconMap[collection.icon] || Folder;
              const colorValue = getColorValue(collection.color);
              const isInCollection = memoryCollectionIds.includes(collection.id);

              return (
                <button
                  key={collection.id}
                  onClick={() => handleToggle(collection.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left transition-colors',
                    'hover:bg-muted'
                  )}
                >
                  <div
                    className="p-1.5 rounded"
                    style={{ backgroundColor: colorValue + '20', color: colorValue }}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="flex-1 truncate text-sm">{collection.name}</span>
                  {isInCollection && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
