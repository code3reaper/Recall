import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  Brain, ArrowLeft, Loader2, ChevronLeft, ChevronRight,
  Presentation, Sparkles, Download, RotateCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface Slide {
  type: 'title' | 'content' | 'conclusion';
  title: string;
  subtitle?: string;
  bullets?: string[];
  notes?: string;
}

interface PresentationData {
  title: string;
  slides: Slide[];
}

const THEME_COLORS = [
  { name: 'Navy', bg: 'bg-primary', text: 'text-primary-foreground', accent: 'bg-accent' },
  { name: 'Dark', bg: 'bg-foreground', text: 'text-background', accent: 'bg-accent' },
  { name: 'Warm', bg: 'bg-accent', text: 'text-accent-foreground', accent: 'bg-primary' },
];

export default function Presentations() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [topic, setTopic] = useState('');
  const [numSlides, setNumSlides] = useState(6);
  const [generating, setGenerating] = useState(false);
  const [presentation, setPresentation] = useState<PresentationData | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [themeIndex, setThemeIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const theme = THEME_COLORS[themeIndex];

  const generate = useCallback(async () => {
    if (!topic.trim()) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-presentation', {
        body: { topic: topic.trim(), numSlides },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setPresentation(data);
      setCurrentSlide(0);
    } catch (e: any) {
      toast({
        title: 'Generation failed',
        description: e.message || 'Could not generate presentation',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  }, [topic, numSlides]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!presentation) return;
    if (e.key === 'ArrowRight' || e.key === ' ') {
      e.preventDefault();
      setCurrentSlide(c => Math.min(c + 1, presentation.slides.length - 1));
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setCurrentSlide(c => Math.max(c - 1, 0));
    } else if (e.key === 'Escape') {
      setIsFullscreen(false);
    }
  }, [presentation]);

  const renderSlide = (slide: Slide, index: number) => {
    const isTitle = slide.type === 'title';
    const isConclusion = slide.type === 'conclusion';

    return (
      <div
        className={cn(
          'w-full aspect-video rounded-2xl flex flex-col justify-center items-center p-8 md:p-16 transition-all duration-500 shadow-2xl relative overflow-hidden',
          theme.bg, theme.text
        )}
      >
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-white/5 rounded-bl-full" />
        <div className="absolute bottom-0 left-0 w-1/4 h-1/4 bg-white/5 rounded-tr-full" />

        {isTitle ? (
          <div className="text-center z-10 space-y-6">
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-display font-bold leading-tight">
              {slide.title}
            </h1>
            {slide.subtitle && (
              <p className="text-lg md:text-2xl opacity-80 font-sans font-light max-w-2xl">
                {slide.subtitle}
              </p>
            )}
          </div>
        ) : (
          <div className="w-full z-10 space-y-6 max-w-4xl">
            <h2 className={cn(
              'text-2xl md:text-4xl font-display font-bold',
              isConclusion && 'text-center'
            )}>
              {slide.title}
            </h2>
            {slide.bullets && slide.bullets.length > 0 && (
              <ul className={cn(
                'space-y-4',
                isConclusion ? 'text-center' : 'pl-2'
              )}>
                {slide.bullets.map((bullet, i) => (
                  <li
                    key={i}
                    className={cn(
                      'text-base md:text-xl font-sans opacity-90 leading-relaxed',
                      !isConclusion && 'flex items-start gap-3'
                    )}
                  >
                    {!isConclusion && (
                      <span className={cn('mt-2 w-2 h-2 rounded-full shrink-0', theme.accent)} />
                    )}
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Slide number */}
        <div className="absolute bottom-4 right-6 text-xs opacity-40 font-sans">
          {index + 1}
        </div>
      </div>
    );
  };

  // Fullscreen presentation mode
  if (isFullscreen && presentation) {
    return (
      <div
        className="fixed inset-0 z-50 bg-black flex items-center justify-center cursor-none"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onClick={() => {
          if (currentSlide < presentation.slides.length - 1) {
            setCurrentSlide(c => c + 1);
          } else {
            setIsFullscreen(false);
          }
        }}
        ref={(el) => el?.focus()}
      >
        <div className="w-full max-w-7xl px-4">
          {renderSlide(presentation.slides[currentSlide], currentSlide)}
        </div>
        <button
          className="absolute top-4 right-4 text-white/50 hover:text-white text-sm z-50"
          onClick={(e) => { e.stopPropagation(); setIsFullscreen(false); }}
        >
          ESC to exit
        </button>
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/40 text-sm">
          {currentSlide + 1} / {presentation.slides.length}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" tabIndex={0} onKeyDown={handleKeyDown}>
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="container max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Presentation className="h-5 w-5 text-accent" />
              <span className="font-display font-semibold text-lg">Presentations</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container max-w-6xl mx-auto px-4 py-8">
        {/* Input Section */}
        <div className="max-w-2xl mx-auto mb-12 space-y-4">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
              <Sparkles className="h-3.5 w-3.5" />
              AI-Powered
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">
              Create a Presentation
            </h1>
            <p className="text-muted-foreground">
              Enter a topic and let AI generate beautiful slides for you
            </p>
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="e.g. The Future of Renewable Energy"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !generating && generate()}
              className="h-12 text-base"
              disabled={generating}
            />
            <Button
              onClick={generate}
              disabled={generating || !topic.trim()}
              className="h-12 px-6"
              variant="hero"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">{generating ? 'Generating...' : 'Generate'}</span>
            </Button>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>Slides:</span>
              {[4, 6, 8, 10].map(n => (
                <button
                  key={n}
                  onClick={() => setNumSlides(n)}
                  className={cn(
                    'px-2.5 py-1 rounded-md transition-colors',
                    numSlides === n
                      ? 'bg-accent text-accent-foreground font-medium'
                      : 'hover:bg-muted'
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Presentation Viewer */}
        {presentation && (
          <div className="space-y-6 animate-fade-in">
            {/* Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {THEME_COLORS.map((t, i) => (
                  <button
                    key={t.name}
                    onClick={() => setThemeIndex(i)}
                    className={cn(
                      'w-8 h-8 rounded-full border-2 transition-all',
                      t.bg,
                      themeIndex === i ? 'border-accent scale-110' : 'border-transparent opacity-60 hover:opacity-100'
                    )}
                    title={t.name}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => { setPresentation(null); setTopic(''); }}>
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">New</span>
                </Button>
                <Button variant="accent" size="sm" onClick={() => setIsFullscreen(true)}>
                  <Presentation className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Present</span>
                </Button>
              </div>
            </div>

            {/* Main Slide */}
            <div className="relative">
              {renderSlide(presentation.slides[currentSlide], currentSlide)}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentSlide(c => Math.max(c - 1, 0))}
                disabled={currentSlide === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1.5">
                {presentation.slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentSlide(i)}
                    className={cn(
                      'w-2.5 h-2.5 rounded-full transition-all',
                      i === currentSlide ? 'bg-accent scale-125' : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                    )}
                  />
                ))}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentSlide(c => Math.min(c + 1, presentation.slides.length - 1))}
                disabled={currentSlide === presentation.slides.length - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Thumbnail Strip */}
            <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
              {presentation.slides.map((slide, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className={cn(
                    'shrink-0 w-40 aspect-video rounded-lg overflow-hidden border-2 transition-all',
                    i === currentSlide ? 'border-accent shadow-glow' : 'border-border opacity-60 hover:opacity-100'
                  )}
                >
                  <div className={cn(
                    'w-full h-full flex items-center justify-center p-3',
                    theme.bg, theme.text
                  )}>
                    <span className="text-[8px] font-medium line-clamp-2 text-center">
                      {slide.title}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {/* Speaker Notes */}
            {presentation.slides[currentSlide]?.notes && (
              <div className="bg-muted rounded-xl p-4">
                <p className="text-xs font-medium text-muted-foreground mb-1">Speaker Notes</p>
                <p className="text-sm">{presentation.slides[currentSlide].notes}</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
