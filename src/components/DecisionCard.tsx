import { format } from 'date-fns';
import { Scale, ChevronRight, CheckCircle2, XCircle, HelpCircle, Minus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import type { Memory, DecisionOutcome } from '@/types/memory';
import { cn } from '@/lib/utils';

interface DecisionCardProps {
  memory: Memory;
  onClick?: () => void;
}

const outcomeConfig: Record<DecisionOutcome, { icon: typeof CheckCircle2; label: string; className: string }> = {
  pending: { icon: HelpCircle, label: 'Pending', className: 'text-muted-foreground' },
  worked: { icon: CheckCircle2, label: 'Worked', className: 'text-green-500' },
  didnt_work: { icon: XCircle, label: "Didn't Work", className: 'text-red-500' },
  mixed: { icon: Minus, label: 'Mixed Results', className: 'text-yellow-500' },
};

export function DecisionCard({ memory, onClick }: DecisionCardProps) {
  const outcome = (memory.outcome as DecisionOutcome) || 'pending';
  const OutcomeIcon = outcomeConfig[outcome].icon;
  const alternatives = (memory.alternatives_rejected || []) as { name: string; reason: string }[];
  const tags = memory.tags || [];
  const decisionDate = memory.decision_date 
    ? format(new Date(memory.decision_date), 'MMM d, yyyy')
    : format(new Date(memory.created_at), 'MMM d, yyyy');

  return (
    <Card
      onClick={onClick}
      className={cn(
        'p-4 cursor-pointer transition-all hover:shadow-md hover:border-accent/50',
        'border-l-4 border-l-primary'
      )}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-primary/10 shrink-0">
          <Scale className="h-5 w-5 text-primary" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-muted-foreground">{decisionDate}</span>
            <Badge 
              variant="outline" 
              className={cn('text-xs gap-1', outcomeConfig[outcome].className)}
            >
              <OutcomeIcon className="h-3 w-3" />
              {outcomeConfig[outcome].label}
            </Badge>
          </div>
          
          <h3 className="font-semibold text-foreground line-clamp-2 mb-2">
            {memory.title}
          </h3>
          
          {memory.reasoning && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
              <span className="font-medium text-foreground">Reasoning:</span> {memory.reasoning}
            </p>
          )}
          
          {alternatives.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Rejected {alternatives.length} alternative{alternatives.length > 1 ? 's' : ''}: {alternatives.map(a => a.name).join(', ')}
            </p>
          )}
          
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {tags.slice(0, 3).map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {tags.length > 3 && (
                <Badge variant="secondary" className="text-xs">+{tags.length - 3}</Badge>
              )}
            </div>
          )}
        </div>
        
        <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
      </div>
    </Card>
  );
}
