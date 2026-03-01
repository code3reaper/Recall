import { useState } from 'react';
import { Share2, Copy, Check, Link2, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Memory, SharedMemory } from '@/types/memory';

interface ShareMemoryButtonProps {
  memory: Memory;
  variant?: 'icon' | 'button';
}

export function ShareMemoryButton({ memory, variant = 'icon' }: ShareMemoryButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shareData, setShareData] = useState<SharedMemory | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchExistingShare = async () => {
    const { data } = await supabase
      .from('shared_memories')
      .select('*')
      .eq('memory_id', memory.id)
      .eq('is_active', true)
      .maybeSingle();
    
    if (data) {
      setShareData(data as unknown as SharedMemory);
    }
  };

  const handleOpen = async (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      setLoading(true);
      await fetchExistingShare();
      setLoading(false);
    }
  };

  const createShare = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('shared_memories')
      .insert({
        memory_id: memory.id,
        user_id: memory.user_id,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: 'Error creating share link',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setShareData(data as unknown as SharedMemory);
      toast({
        title: 'Share link created',
        description: 'Anyone with the link can view this memory.',
      });
    }
    setLoading(false);
  };

  const toggleShare = async (active: boolean) => {
    if (!shareData) return;
    
    setLoading(true);
    const { error } = await supabase
      .from('shared_memories')
      .update({ is_active: active })
      .eq('id', shareData.id);

    if (error) {
      toast({
        title: 'Error updating share',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setShareData({ ...shareData, is_active: active });
      toast({
        title: active ? 'Share enabled' : 'Share disabled',
        description: active ? 'Link is now active.' : 'Link has been deactivated.',
      });
    }
    setLoading(false);
  };

  const copyLink = async () => {
    if (!shareData) return;
    
    const shareUrl = `${window.location.origin}/shared/${shareData.share_token}`;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: 'Link copied',
      description: 'Share link copied to clipboard.',
    });
  };

  const shareUrl = shareData 
    ? `${window.location.origin}/shared/${shareData.share_token}`
    : '';

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        {variant === 'icon' ? (
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Share2 className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="gap-2">
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Share Memory
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="p-3 bg-muted rounded-lg">
            <p className="font-medium text-sm truncate">{memory.title}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {memory.type.replace('_', ' ')} • Created {new Date(memory.created_at).toLocaleDateString()}
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : shareData ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="share-active" className="text-sm font-medium">
                  Share publicly
                </Label>
                <Switch
                  id="share-active"
                  checked={shareData.is_active}
                  onCheckedChange={toggleShare}
                />
              </div>

              {shareData.is_active && (
                <>
                  <div className="flex items-center gap-2">
                    <Input
                      value={shareUrl}
                      readOnly
                      className="h-10 text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={copyLink}
                      className="shrink-0"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Views: {shareData.view_count}</span>
                    <a
                      href={shareUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-foreground transition-colors"
                    >
                      Open link
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-muted mx-auto flex items-center justify-center">
                <Share2 className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">Share this memory publicly</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Create a link that anyone can use to view this memory
                </p>
              </div>
              <Button onClick={createShare} className="gap-2">
                <Link2 className="h-4 w-4" />
                Create Share Link
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
