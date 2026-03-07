import { cn } from '@/lib/utils';
import type { PresentationTemplate } from '@/types/presentation';
import { TEMPLATES } from '@/types/presentation';
import { Check } from 'lucide-react';

interface TemplateSelectorProps {
  selected: string;
  onSelect: (id: string) => void;
}

export function TemplateSelector({ selected, onSelect }: TemplateSelectorProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {TEMPLATES.map((t) => (
        <button
          key={t.id}
          onClick={() => onSelect(t.id)}
          className={cn(
            'relative rounded-xl overflow-hidden border-2 transition-all text-left p-0',
            selected === t.id
              ? 'border-accent shadow-glow scale-[1.02]'
              : 'border-border/50 hover:border-accent/50 opacity-80 hover:opacity-100'
          )}
        >
          <div
            className={cn('aspect-video flex items-center justify-center', t.bgClass, t.textClass)}
            style={{
              background: `linear-gradient(135deg, ${t.gradientFrom}, ${t.gradientTo})`,
            }}
          >
            <div className="text-center px-3">
              <span className="text-2xl">{t.preview}</span>
              <p className={cn('text-xs font-semibold mt-1 opacity-90', t.headingFont)}>{t.name}</p>
            </div>
          </div>
          <div className="p-2 bg-card">
            <p className="text-[10px] text-muted-foreground line-clamp-1">{t.description}</p>
          </div>
          {selected === t.id && (
            <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-accent flex items-center justify-center">
              <Check className="h-3 w-3 text-accent-foreground" />
            </div>
          )}
        </button>
      ))}
    </div>
  );
}
