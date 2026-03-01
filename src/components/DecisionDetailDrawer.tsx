import { useState } from 'react';
import { format } from 'date-fns';
import { Scale, CheckCircle2, XCircle, HelpCircle, Minus, Pencil, Calendar, ListX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Memory, DecisionOutcome } from '@/types/memory';
import { cn } from '@/lib/utils';

interface DecisionDetailDrawerProps {
  memory: Memory | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateOutcome: (id: string, outcome: DecisionOutcome, notes?: string) => Promise<void>;
}

const outcomeConfig: Record<DecisionOutcome, { icon: typeof CheckCircle2; label: string; className: string; bgClass: string }> = {
  pending: { icon: HelpCircle, label: 'Pending', className: 'text-muted-foreground', bgClass: 'bg-muted' },
  worked: { icon: CheckCircle2, label: 'This worked!', className: 'text-green-500', bgClass: 'bg-green-500/10' },
  didnt_work: { icon: XCircle, label: "Didn't work out", className: 'text-red-500', bgClass: 'bg-red-500/10' },
  mixed: { icon: Minus, label: 'Mixed results', className: 'text-yellow-500', bgClass: 'bg-yellow-500/10' },
};

export function DecisionDetailDrawer({
  memory,
  open,
  onOpenChange,
  onUpdateOutcome,
}: DecisionDetailDrawerProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [outcomeNotes, setOutcomeNotes] = useState(memory?.outcome_notes || '');
  const [selectedOutcome, setSelectedOutcome] = useState<DecisionOutcome>((memory?.outcome as DecisionOutcome) || 'pending');

  if (!memory) return null;

  const currentOutcome = (memory.outcome as DecisionOutcome) || 'pending';
  const OutcomeIcon = outcomeConfig[currentOutcome].icon;
  const alternatives = (memory.alternatives_rejected || []) as { name: string; reason: string }[];
  const tags = memory.tags || [];
  const decisionDate = memory.decision_date 
    ? format(new Date(memory.decision_date), 'MMMM d, yyyy')
    : format(new Date(memory.created_at), 'MMMM d, yyyy');

  const handleUpdateOutcome = async () => {
    setIsUpdating(true);
    await onUpdateOutcome(memory.id, selectedOutcome, outcomeNotes);
    setIsUpdating(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-hidden flex flex-col">
        <SheetHeader className="flex-shrink-0">
          <div className="flex items-start gap-3 mb-4">
            <div className={cn('p-3 rounded-xl', outcomeConfig[currentOutcome].bgClass)}>
              <Scale className={cn('h-6 w-6', outcomeConfig[currentOutcome].className)} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{decisionDate}</span>
              </div>
              <SheetTitle className="font-display text-xl text-left">{memory.title}</SheetTitle>
            </div>
          </div>

          {/* Current Outcome Status */}
          <div className={cn('flex items-center gap-2 p-3 rounded-lg', outcomeConfig[currentOutcome].bgClass)}>
            <OutcomeIcon className={cn('h-5 w-5', outcomeConfig[currentOutcome].className)} />
            <span className={cn('font-medium', outcomeConfig[currentOutcome].className)}>
              {outcomeConfig[currentOutcome].label}
            </span>
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
          <div className="space-y-6">
            {/* Reasoning Section */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Pencil className="h-4 w-4" />
                Why you made this decision
              </h4>
              <div className="bg-muted/50 rounded-lg p-4 text-sm whitespace-pre-wrap">
                {memory.reasoning || 'No reasoning recorded.'}
              </div>
            </div>

            {/* Alternatives Section */}
            {alternatives.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <ListX className="h-4 w-4" />
                  Alternatives you rejected
                </h4>
                <div className="space-y-2">
                  {alternatives.map((alt, index) => (
                    <div key={index} className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                      <p className="font-medium text-sm text-foreground">{alt.name}</p>
                      {alt.reason && (
                        <p className="text-xs text-muted-foreground mt-1">{alt.reason}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Update Outcome Section */}
            <div className="space-y-3 border-t border-border pt-6">
              <h4 className="text-sm font-semibold text-foreground">
                How did this decision turn out?
              </h4>
              
              <Select 
                value={selectedOutcome} 
                onValueChange={(v) => setSelectedOutcome(v as DecisionOutcome)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">
                    <span className="flex items-center gap-2">
                      <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      Still pending / Too early to tell
                    </span>
                  </SelectItem>
                  <SelectItem value="worked">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      It worked! Good decision.
                    </span>
                  </SelectItem>
                  <SelectItem value="didnt_work">
                    <span className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-500" />
                      It didn't work out
                    </span>
                  </SelectItem>
                  <SelectItem value="mixed">
                    <span className="flex items-center gap-2">
                      <Minus className="h-4 w-4 text-yellow-500" />
                      Mixed results
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>

              <Textarea
                value={outcomeNotes}
                onChange={(e) => setOutcomeNotes(e.target.value)}
                placeholder="Add notes about the outcome... What did you learn?"
                rows={3}
              />

              <Button 
                onClick={handleUpdateOutcome} 
                disabled={isUpdating}
                className="w-full"
              >
                {isUpdating ? 'Updating...' : 'Update Outcome'}
              </Button>
            </div>

            {/* Previous Outcome Notes */}
            {memory.outcome_notes && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground">Previous Outcome Notes</h4>
                <div className="bg-muted/50 rounded-lg p-4 text-sm whitespace-pre-wrap">
                  {memory.outcome_notes}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
