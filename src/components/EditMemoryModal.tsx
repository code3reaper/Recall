import { useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Memory } from '@/types/memory';

interface EditMemoryModalProps {
  memory: Memory | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, updates: { title: string; content?: string; tags?: string[] }) => Promise<{ error: Error | null }>;
}

export function EditMemoryModal({ memory, open, onOpenChange, onSave }: EditMemoryModalProps) {
  const [title, setTitle] = useState(memory?.title || '');
  const [content, setContent] = useState(memory?.content || '');
  const [tags, setTags] = useState<string[]>((memory?.metadata as { tags?: string[] })?.tags || memory?.tags || []);
  const [newTag, setNewTag] = useState('');
  const [loading, setLoading] = useState(false);

  // Reset form when memory changes
  useState(() => {
    if (memory) {
      setTitle(memory.title);
      setContent(memory.content || '');
      setTags((memory.metadata as { tags?: string[] })?.tags || memory.tags || []);
    }
  });

  const handleSubmit = async () => {
    if (!memory || !title.trim()) return;

    setLoading(true);
    const { error } = await onSave(memory.id, {
      title,
      content: memory.type === 'note' ? content : undefined,
      tags,
    });

    setLoading(false);
    if (!error) {
      onOpenChange(false);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim().toLowerCase())) {
      setTags([...tags, newTag.trim().toLowerCase()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  if (!memory) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Edit Memory</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give your memory a title..."
              className="h-12"
            />
          </div>

          {memory.type === 'note' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Content</label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your note..."
                rows={6}
              />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Tags</label>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="Add a tag..."
                className="h-10"
              />
              <Button type="button" variant="outline" onClick={addTag}>
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="gap-1 cursor-pointer hover:bg-destructive/10"
                    onClick={() => removeTag(tag)}
                  >
                    {tag}
                    <X className="h-3 w-3" />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button variant="hero" onClick={handleSubmit} disabled={!title.trim() || loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
