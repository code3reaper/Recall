import { Sparkles, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchModeToggleProps {
  mode: 'semantic' | 'keyword';
  onChange: (mode: 'semantic' | 'keyword') => void;
  className?: string;
}

export function SearchModeToggle({ mode, onChange, className }: SearchModeToggleProps) {
  return (
    <div className={cn('inline-flex items-center bg-muted rounded-lg p-1', className)}>
      <button
        onClick={() => onChange('semantic')}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
          mode === 'semantic'
            ? 'bg-card text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <Sparkles className="h-3.5 w-3.5" />
        Semantic
      </button>
      <button
        onClick={() => onChange('keyword')}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
          mode === 'keyword'
            ? 'bg-card text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <Search className="h-3.5 w-3.5" />
        Keyword
      </button>
    </div>
  );
}
