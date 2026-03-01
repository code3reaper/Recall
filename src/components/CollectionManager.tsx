import { useState } from 'react';
import { FolderPlus, MoreVertical, Edit2, Trash2, Star, Heart, Bookmark, Briefcase, GraduationCap, Lightbulb, Music, Camera, Code, Folder } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { Collection } from '@/types/collection';
import { COLLECTION_COLORS, COLLECTION_ICONS } from '@/types/collection';

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

interface CollectionManagerProps {
  collections: Collection[];
  selectedCollection: string | null;
  onSelectCollection: (id: string | null) => void;
  onCreateCollection: (name: string, description?: string, color?: string, icon?: string) => Promise<{ error: Error | null }>;
  onUpdateCollection: (id: string, updates: Partial<Pick<Collection, 'name' | 'description' | 'color' | 'icon'>>) => Promise<{ error: Error | null }>;
  onDeleteCollection: (id: string) => Promise<{ error: Error | null }>;
  getMemoryCount: (collectionId: string) => number;
}

export function CollectionManager({
  collections,
  selectedCollection,
  onSelectCollection,
  onCreateCollection,
  onUpdateCollection,
  onDeleteCollection,
  getMemoryCount,
}: CollectionManagerProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState('blue');
  const [selectedIcon, setSelectedIcon] = useState('folder');

  const resetForm = () => {
    setName('');
    setDescription('');
    setSelectedColor('blue');
    setSelectedIcon('folder');
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    const { error } = await onCreateCollection(name, description, selectedColor, selectedIcon);
    if (!error) {
      resetForm();
      setCreateOpen(false);
    }
  };

  const handleEdit = async () => {
    if (!editingCollection || !name.trim()) return;
    const { error } = await onUpdateCollection(editingCollection.id, {
      name,
      description,
      color: selectedColor,
      icon: selectedIcon,
    });
    if (!error) {
      setEditingCollection(null);
      resetForm();
    }
  };

  const openEditDialog = (collection: Collection) => {
    setEditingCollection(collection);
    setName(collection.name);
    setDescription(collection.description || '');
    setSelectedColor(collection.color);
    setSelectedIcon(collection.icon);
  };

  const getColorValue = (colorName: string) => {
    return COLLECTION_COLORS.find((c) => c.name === colorName)?.value || COLLECTION_COLORS[0].value;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Collections
        </h3>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <FolderPlus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Collection</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Collection name..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description (optional)</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What's this collection about?"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {COLLECTION_COLORS.map(({ name: colorName, value }) => (
                    <button
                      key={colorName}
                      onClick={() => setSelectedColor(colorName)}
                      className={cn(
                        'w-8 h-8 rounded-full transition-all',
                        selectedColor === colorName && 'ring-2 ring-offset-2 ring-foreground'
                      )}
                      style={{ backgroundColor: value }}
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Icon</label>
                <div className="flex gap-2 flex-wrap">
                  {COLLECTION_ICONS.map((iconName) => {
                    const Icon = iconMap[iconName] || Folder;
                    return (
                      <button
                        key={iconName}
                        onClick={() => setSelectedIcon(iconName)}
                        className={cn(
                          'p-2 rounded-lg transition-all',
                          selectedIcon === iconName
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={!name.trim()}>
                  Create
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* All memories button */}
      <button
        onClick={() => onSelectCollection(null)}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors',
          selectedCollection === null
            ? 'bg-primary text-primary-foreground'
            : 'hover:bg-muted'
        )}
      >
        <Folder className="h-4 w-4" />
        <span className="flex-1 truncate">All Memories</span>
      </button>

      {/* Collection list */}
      {collections.map((collection) => {
        const Icon = iconMap[collection.icon] || Folder;
        const colorValue = getColorValue(collection.color);
        const memoryCount = getMemoryCount(collection.id);

        return (
          <div
            key={collection.id}
            className={cn(
              'group flex items-center gap-3 px-3 py-2 rounded-lg transition-colors cursor-pointer',
              selectedCollection === collection.id
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            )}
            onClick={() => onSelectCollection(collection.id)}
          >
            <div
              className="p-1.5 rounded"
              style={{ backgroundColor: colorValue + '20', color: colorValue }}
            >
              <Icon className="h-4 w-4" />
            </div>
            <span className="flex-1 truncate">{collection.name}</span>
            <span className="text-xs opacity-60">{memoryCount}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openEditDialog(collection)}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => onDeleteCollection(collection.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      })}

      {/* Edit dialog */}
      <Dialog open={!!editingCollection} onOpenChange={(o) => !o && setEditingCollection(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Collection</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Collection name..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this collection about?"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Color</label>
              <div className="flex gap-2 flex-wrap">
                {COLLECTION_COLORS.map(({ name: colorName, value }) => (
                  <button
                    key={colorName}
                    onClick={() => setSelectedColor(colorName)}
                    className={cn(
                      'w-8 h-8 rounded-full transition-all',
                      selectedColor === colorName && 'ring-2 ring-offset-2 ring-foreground'
                    )}
                    style={{ backgroundColor: value }}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Icon</label>
              <div className="flex gap-2 flex-wrap">
                {COLLECTION_ICONS.map((iconName) => {
                  const Icon = iconMap[iconName] || Folder;
                  return (
                    <button
                      key={iconName}
                      onClick={() => setSelectedIcon(iconName)}
                      className={cn(
                        'p-2 rounded-lg transition-all',
                        selectedIcon === iconName
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditingCollection(null)}>
                Cancel
              </Button>
              <Button onClick={handleEdit} disabled={!name.trim()}>
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
