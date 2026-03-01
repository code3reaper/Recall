import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function ThemeToggle({ className }: { className?: string }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    setIsDark(!isDark);
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className={cn('relative', className)}
    >
      <Sun className={cn(
        'h-5 w-5 transition-all',
        isDark ? 'scale-0 rotate-90' : 'scale-100 rotate-0'
      )} />
      <Moon className={cn(
        'absolute h-5 w-5 transition-all',
        isDark ? 'scale-100 rotate-0' : 'scale-0 -rotate-90'
      )} />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
