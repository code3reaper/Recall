import { useState } from 'react';
import { Scale, Plus, X, Loader2, Trash2 } from 'lucide-react';
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

interface Alternative {
  name: string;
  reason: string;
}

interface AddDecisionModalProps {
  onAdd: (
    title: string,
    reasoning: string,
    alternatives: Alternative[],
    tags?: string[],
    decisionDate?: string
  ) => Promise<{ error: Error | null }>;
}

export function AddDecisionModal({ onAdd }: AddDecisionModalProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [reasoning, setReasoning] = useState('');
  const [alternatives, setAlternatives] = useState<Alternative[]>([]);
  const [newAltName, setNewAltName] = useState('');
  const [newAltReason, setNewAltReason] = useState('');
  const [tags, setTags] = useState('');
  const [decisionDate, setDecisionDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setTitle('');
    setReasoning('');
    setAlternatives([]);
    setNewAltName('');
    setNewAltReason('');
    setTags('');
    setDecisionDate(new Date().toISOString().split('T')[0]);
  };

  const addAlternative = () => {
    if (newAltName.trim()) {
      setAlternatives([...alternatives, { name: newAltName.trim(), reason: newAltReason.trim() }]);
      setNewAltName('');
      setNewAltReason('');
    }
  };

  const removeAlternative = (index: number) => {
    setAlternatives(alternatives.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!title.trim() || !reasoning.trim()) return;

    setLoading(true);
    const tagArray = tags.split(',').map(t => t.trim()).filter(Boolean);

    const { error } = await onAdd(
      title,
      reasoning,
      alternatives,
      tagArray.length > 0 ? tagArray : undefined,
      decisionDate
    );

    setLoading(false);
    if (!error) {
      resetForm();
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="lg" className="gap-2">
          <Scale className="h-5 w-5" />
          Log Decision
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl flex items-center gap-2">
            <Scale className="h-6 w-6 text-primary" />
            Record a Decision
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">What did you decide?</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Chose React over Vue for the project"
              className="h-12"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Why did you make this decision?</label>
            <Textarea
              value={reasoning}
              onChange={(e) => setReasoning(e.target.value)}
              placeholder="Explain your reasoning, factors considered, and what led to this choice..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">When did you make this decision?</label>
            <Input
              type="date"
              value={decisionDate}
              onChange={(e) => setDecisionDate(e.target.value)}
              className="h-10"
            />
          </div>

          {/* Alternatives Section */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Alternatives you rejected</label>
            
            {alternatives.length > 0 && (
              <div className="space-y-2">
                {alternatives.map((alt, index) => (
                  <div key={index} className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{alt.name}</p>
                      {alt.reason && (
                        <p className="text-xs text-muted-foreground mt-1">{alt.reason}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => removeAlternative(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <div className="flex-1 space-y-2">
                <Input
                  value={newAltName}
                  onChange={(e) => setNewAltName(e.target.value)}
                  placeholder="Alternative option..."
                  className="h-10"
                />
                <Input
                  value={newAltReason}
                  onChange={(e) => setNewAltReason(e.target.value)}
                  placeholder="Why you rejected it (optional)"
                  className="h-10"
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={addAlternative}
                disabled={!newAltName.trim()}
                className="h-10 w-10 shrink-0 self-start"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Tags input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Tags (optional)</label>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="career, tech, project (comma separated)"
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
              disabled={!title.trim() || !reasoning.trim() || loading}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Decision
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
