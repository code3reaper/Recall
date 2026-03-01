import { Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  placeholder?: string;
  isSearching?: boolean;
  className?: string;
  size?: 'default' | 'hero';
}

export function SearchBar({
  value,
  onChange,
  onSearch,
  placeholder = 'Search your memories...',
  isSearching = false,
  className,
  size = 'default',
}: SearchBarProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearch();
    }
  };

  return (
    <div className={cn('relative', className)}>
      <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
        {isSearching ? (
          <Loader2 className={cn(
            'text-muted-foreground animate-spin',
            size === 'hero' ? 'h-6 w-6' : 'h-5 w-5'
          )} />
        ) : (
          <Search className={cn(
            'text-muted-foreground',
            size === 'hero' ? 'h-6 w-6' : 'h-5 w-5'
          )} />
        )}
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn(
          'w-full bg-card border-2 border-border rounded-2xl transition-all duration-300',
          'focus:border-accent focus:ring-4 focus:ring-accent/20 focus:shadow-2xl',
          'placeholder:text-muted-foreground/60 outline-none',
          size === 'hero' 
            ? 'px-14 py-5 text-lg shadow-xl' 
            : 'px-12 py-3 text-base shadow-md',
        )}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute inset-y-0 right-4 flex items-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <span className="sr-only">Clear</span>
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
