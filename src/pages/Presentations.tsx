import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SlideRenderer } from '@/components/presentations/SlideRenderer';
import { TemplateSelector } from '@/components/presentations/TemplateSelector';
import {
  ArrowLeft, Loader2, ChevronLeft, ChevronRight,
  Presentation, Sparkles, RotateCcw, Pencil, PencilOff,
  ImagePlus, Plus, Trash2, Copy, LayoutTemplate,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import type { Slide, PresentationData, SlideLayout } from '@/types/presentation';

const SLIDE_PRESETS: { type: SlideLayout; label: string; icon: string }[] = [
  { type: 'content', label: 'Content', icon: '📝' },
  { type: 'two-column', label: 'Two Column', icon: '📊' },
  { type: 'image-left', label: 'Image Left', icon: '🖼️' },
  { type: 'image-right', label: 'Image Right', icon: '🖼️' },
  { type: 'quote', label: 'Quote', icon: '💬' },
  { type: 'big-number', label: 'Big Number', icon: '🔢' },
];

export default function Presentations() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [topic, setTopic] = useState('');
  const [numSlides, setNumSlides] = useState(6);
  const [generating, setGenerating] = useState(false);
  const [presentation, setPresentation] = useState<PresentationData | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [templateId, setTemplateId] = useState('midnight');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showTemplates, setShowTemplates] = useState(true);
  const [loadingImages, setLoadingImages] = useState<Set<number>>(new Set());
  const [showAddSlide, setShowAddSlide] = useState(false);

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
      setShowTemplates(false);
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

  const generateImage = useCallback(async (slideIndex: number) => {
    if (!presentation) return;
    const slide = presentation.slides[slideIndex];
    const prompt = slide.imagePrompt || `${slide.title} - professional visual`;

    setLoadingImages(prev => new Set(prev).add(slideIndex));
    try {
      const { data, error } = await supabase.functions.invoke('generate-slide-image', {
        body: { prompt, style: templateId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setPresentation(prev => {
        if (!prev) return prev;
        const slides = [...prev.slides];
        slides[slideIndex] = { ...slides[slideIndex], imageUrl: data.imageUrl };
        return { ...prev, slides };
      });
      toast({ title: 'Image generated!' });
    } catch (e: any) {
      toast({
        title: 'Image generation failed',
        description: e.message,
        variant: 'destructive',
      });
    } finally {
      setLoadingImages(prev => {
        const next = new Set(prev);
        next.delete(slideIndex);
        return next;
      });
    }
  }, [presentation, templateId]);

  const updateSlide = useCallback((index: number, field: string, value: string | string[]) => {
    setPresentation(prev => {
      if (!prev) return prev;
      const slides = [...prev.slides];
      slides[index] = { ...slides[index], [field]: value };
      return { ...prev, slides };
    });
  }, []);

  const addSlide = useCallback((type: SlideLayout) => {
    setPresentation(prev => {
      if (!prev) return prev;
      const newSlide: Slide = {
        type,
        title: 'New Slide',
        bullets: type === 'content' || type === 'two-column' || type === 'image-left' || type === 'image-right' ? ['Point 1', 'Point 2'] : undefined,
        bullets2: type === 'two-column' ? ['Point A', 'Point B'] : undefined,
        quote: type === 'quote' ? 'Your quote here' : undefined,
        quoteAuthor: type === 'quote' ? 'Author' : undefined,
        bigNumber: type === 'big-number' ? '100%' : undefined,
        bigNumberLabel: type === 'big-number' ? 'Metric Label' : undefined,
        imagePrompt: type === 'image-left' || type === 'image-right' ? 'A relevant professional image' : undefined,
      };
      const slides = [...prev.slides];
      slides.splice(currentSlide + 1, 0, newSlide);
      return { ...prev, slides };
    });
    setCurrentSlide(c => c + 1);
    setShowAddSlide(false);
  }, [currentSlide]);

  const duplicateSlide = useCallback(() => {
    if (!presentation) return;
    setPresentation(prev => {
      if (!prev) return prev;
      const slides = [...prev.slides];
      slides.splice(currentSlide + 1, 0, { ...slides[currentSlide] });
      return { ...prev, slides };
    });
    setCurrentSlide(c => c + 1);
  }, [presentation, currentSlide]);

  const deleteSlide = useCallback(() => {
    if (!presentation || presentation.slides.length <= 1) return;
    setPresentation(prev => {
      if (!prev) return prev;
      const slides = prev.slides.filter((_, i) => i !== currentSlide);
      return { ...prev, slides };
    });
    setCurrentSlide(c => Math.min(c, (presentation.slides.length - 2)));
  }, [presentation, currentSlide]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!presentation) return;
    if (isEditing) return; // don't navigate while editing text
    if (e.key === 'ArrowRight' || e.key === ' ') {
      e.preventDefault();
      setCurrentSlide(c => Math.min(c + 1, presentation.slides.length - 1));
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setCurrentSlide(c => Math.max(c - 1, 0));
    } else if (e.key === 'Escape') {
      setIsFullscreen(false);
    }
  }, [presentation, isEditing]);

  // Fullscreen
  if (isFullscreen && presentation) {
    return (
      <div
        className="fixed inset-0 z-50 bg-black flex items-center justify-center cursor-none"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onClick={() => {
          if (currentSlide < presentation.slides.length - 1) setCurrentSlide(c => c + 1);
          else setIsFullscreen(false);
        }}
        ref={(el) => el?.focus()}
      >
        <div className="w-full max-w-7xl px-4">
          <SlideRenderer slide={presentation.slides[currentSlide]} index={currentSlide} templateId={templateId} />
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
        <div className="container max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
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
            {presentation && (
              <>
                <Button
                  variant={isEditing ? 'accent' : 'outline'}
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  {isEditing ? <PencilOff className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
                  <span className="hidden sm:inline">{isEditing ? 'Done' : 'Edit'}</span>
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowTemplates(!showTemplates)}>
                  <LayoutTemplate className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Theme</span>
                </Button>
                <Button variant="accent" size="sm" onClick={() => setIsFullscreen(true)}>
                  <Presentation className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Present</span>
                </Button>
              </>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container max-w-7xl mx-auto px-4 py-8">
        {/* Input Section */}
        <div className="max-w-2xl mx-auto mb-8 space-y-4">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-medium mb-3">
              <Sparkles className="h-3.5 w-3.5" />
              AI-Powered
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">
              Create a Presentation
            </h1>
            <p className="text-muted-foreground text-sm">
              Enter a topic, pick a template, and let AI build your deck
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
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
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
                    numSlides === n ? 'bg-accent text-accent-foreground font-medium' : 'hover:bg-muted'
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Template Picker */}
        {showTemplates && !presentation && (
          <div className="max-w-2xl mx-auto mb-8">
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">Choose a template</h2>
            <TemplateSelector selected={templateId} onSelect={setTemplateId} />
          </div>
        )}

        {/* Template switcher when editing */}
        {showTemplates && presentation && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">Switch template</h2>
            <TemplateSelector selected={templateId} onSelect={setTemplateId} />
          </div>
        )}

        {/* Presentation Editor */}
        {presentation && (
          <div className="space-y-6 animate-fade-in">
            {/* Slide Editing Toolbar */}
            {isEditing && (
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Button variant="outline" size="sm" onClick={() => setShowAddSlide(!showAddSlide)}>
                    <Plus className="h-3.5 w-3.5" />
                    Add Slide
                  </Button>
                  {showAddSlide && (
                    <div className="absolute top-full mt-1 left-0 z-20 bg-card rounded-xl border border-border shadow-xl p-2 min-w-[200px]">
                      {SLIDE_PRESETS.map(p => (
                        <button
                          key={p.type}
                          onClick={() => addSlide(p.type)}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted flex items-center gap-2 text-sm"
                        >
                          <span>{p.icon}</span>
                          <span>{p.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={duplicateSlide}>
                  <Copy className="h-3.5 w-3.5" />
                  Duplicate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={deleteSlide}
                  disabled={presentation.slides.length <= 1}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
                {(presentation.slides[currentSlide]?.type === 'image-left' ||
                  presentation.slides[currentSlide]?.type === 'image-right') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => generateImage(currentSlide)}
                    disabled={loadingImages.has(currentSlide)}
                  >
                    <ImagePlus className="h-3.5 w-3.5" />
                    {loadingImages.has(currentSlide) ? 'Generating...' : 'AI Image'}
                  </Button>
                )}
              </div>
            )}

            {/* Controls (non-edit) */}
            {!isEditing && (
              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => { setPresentation(null); setTopic(''); setShowTemplates(true); }}>
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">New</span>
                </Button>
              </div>
            )}

            {/* Main Slide */}
            <div className="relative">
              <SlideRenderer
                slide={presentation.slides[currentSlide]}
                index={currentSlide}
                templateId={templateId}
                isEditing={isEditing}
                onUpdate={(field, value) => updateSlide(currentSlide, field, value)}
                loadingImage={loadingImages.has(currentSlide)}
                onGenerateImage={() => generateImage(currentSlide)}
              />
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
                  <SlideRenderer slide={slide} index={i} templateId={templateId} />
                </button>
              ))}
            </div>

            {/* Speaker Notes */}
            {(presentation.slides[currentSlide]?.notes || isEditing) && (
              <div className="bg-muted rounded-xl p-4">
                <p className="text-xs font-medium text-muted-foreground mb-1">Speaker Notes</p>
                {isEditing ? (
                  <textarea
                    value={presentation.slides[currentSlide]?.notes || ''}
                    onChange={(e) => updateSlide(currentSlide, 'notes', e.target.value)}
                    className="w-full text-sm bg-transparent border-none outline-none resize-none min-h-[60px] focus:ring-1 focus:ring-accent rounded p-1"
                    placeholder="Add speaker notes…"
                  />
                ) : (
                  <p className="text-sm">{presentation.slides[currentSlide].notes}</p>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
