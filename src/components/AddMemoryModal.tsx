import { useState, useRef } from 'react';
import { FileText, Link, Image, FileIcon, Plus, X, Loader2, Upload, Mic, Bookmark } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import type { MemoryType } from '@/types/memory';

interface AddMemoryModalProps {
  onAdd: (type: MemoryType, title: string, content?: string, url?: string, file?: File, tags?: string[]) => Promise<{ error: Error | null }>;
}

const memoryTypes = [
  { type: 'note' as const, icon: FileText, label: 'Note', description: 'Text notes and thoughts' },
  { type: 'link' as const, icon: Link, label: 'Link', description: 'Save a website link' },
  { type: 'image' as const, icon: Image, label: 'Image', description: 'Screenshots with OCR' },
  { type: 'pdf' as const, icon: FileIcon, label: 'PDF', description: 'Documents with extraction' },
  { type: 'voice_memo' as const, icon: Mic, label: 'Voice Memo', description: 'Audio recordings' },
  { type: 'bookmark' as const, icon: Bookmark, label: 'Bookmark', description: 'Quick save with notes' },
];

export function AddMemoryModal({ onAdd }: AddMemoryModalProps) {
  const [open, setOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<MemoryType | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [tags, setTags] = useState('');
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setSelectedType(null);
    setTitle('');
    setContent('');
    setUrl('');
    setFile(null);
    setTags('');
  };

  const handleSubmit = async () => {
    if (!selectedType || !title.trim()) return;
    if ((selectedType === 'image' || selectedType === 'pdf' || selectedType === 'voice_memo') && !file) return;

    setLoading(true);
    const tagArray = tags.split(',').map(t => t.trim()).filter(Boolean);
    
    const { error } = await onAdd(
      selectedType,
      title,
      selectedType === 'note' || selectedType === 'bookmark' ? content : undefined,
      selectedType === 'link' || selectedType === 'bookmark' ? url : undefined,
      file || undefined,
      tagArray.length > 0 ? tagArray : undefined
    );

    setLoading(false);
    if (!error) {
      resetForm();
      setOpen(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!title) {
        setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      let isValidType = false;
      if (selectedType === 'image') {
        isValidType = droppedFile.type.startsWith('image/');
      } else if (selectedType === 'pdf') {
        isValidType = droppedFile.type === 'application/pdf';
      } else if (selectedType === 'voice_memo') {
        isValidType = droppedFile.type.startsWith('audio/');
      }
      
      if (isValidType) {
        setFile(droppedFile);
        if (!title) {
          setTitle(droppedFile.name.replace(/\.[^/.]+$/, ''));
        }
      }
    }
  };

  const getAcceptedFileTypes = () => {
    if (selectedType === 'image') return 'image/jpeg,image/png,image/webp,image/gif';
    if (selectedType === 'pdf') return 'application/pdf';
    if (selectedType === 'voice_memo') return 'audio/*';
    return '';
  };

  const requiresFile = selectedType === 'image' || selectedType === 'pdf' || selectedType === 'voice_memo';

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
      <DialogTrigger asChild>
        <Button variant="hero" size="lg" className="gap-2">
          <Plus className="h-5 w-5" />
          Add Memory
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {selectedType ? `Add ${selectedType === 'voice_memo' ? 'Voice Memo' : selectedType.charAt(0).toUpperCase() + selectedType.slice(1)}` : 'Add Memory'}
          </DialogTitle>
        </DialogHeader>

        {!selectedType ? (
          <div className="grid grid-cols-2 gap-3 pt-4">
            {memoryTypes.map(({ type, icon: Icon, label, description }) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-left',
                  'border-border hover:border-accent hover:shadow-md cursor-pointer'
                )}
              >
                <div className="p-3 bg-muted rounded-lg">
                  <Icon className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-4 pt-4">
            <button
              onClick={() => setSelectedType(null)}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
              Back
            </button>

            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Give your memory a title..."
                className="h-12"
              />
            </div>

            {(selectedType === 'note' || selectedType === 'bookmark') && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {selectedType === 'bookmark' ? 'Notes (optional)' : 'Content'}
                </label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={selectedType === 'bookmark' ? 'Add notes about this bookmark...' : 'Write your note...'}
                  rows={4}
                />
              </div>
            )}

            {(selectedType === 'link' || selectedType === 'bookmark') && (
              <div className="space-y-2">
                <label className="text-sm font-medium">URL</label>
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                  type="url"
                  className="h-12"
                />
              </div>
            )}

            {requiresFile && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {selectedType === 'image' ? 'Image File' : selectedType === 'pdf' ? 'PDF Document' : 'Audio File'}
                </label>
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all',
                    dragActive 
                      ? 'border-accent bg-accent/10' 
                      : 'border-border hover:border-muted-foreground',
                    file && 'border-accent bg-accent/5'
                  )}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={getAcceptedFileTypes()}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {file ? (
                    <div className="flex flex-col items-center gap-2">
                      {selectedType === 'image' ? (
                        <Image className="h-10 w-10 text-accent" />
                      ) : selectedType === 'voice_memo' ? (
                        <Mic className="h-10 w-10 text-accent" />
                      ) : (
                        <FileIcon className="h-10 w-10 text-accent" />
                      )}
                      <p className="font-medium text-foreground">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFile(null);
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="h-10 w-10 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        Drop your {selectedType === 'image' ? 'image' : selectedType === 'voice_memo' ? 'audio file' : 'PDF'} here or click to browse
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {selectedType === 'image' 
                          ? 'Supports JPG, PNG, WebP, GIF'
                          : selectedType === 'voice_memo'
                          ? 'Supports MP3, WAV, M4A, WebM'
                          : 'PDF documents up to 20MB'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tags input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tags (optional)</label>
              <Input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="work, ideas, project (comma separated)"
                className="h-10"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="hero"
                onClick={handleSubmit}
                disabled={
                  !title.trim() || 
                  loading || 
                  (requiresFile && !file) ||
                  (selectedType === 'bookmark' && !url.trim())
                }
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Memory
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
