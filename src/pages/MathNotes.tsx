import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Brain, ArrowLeft, Trash2, Play, Loader2, GripHorizontal } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import 'katex/dist/katex.min.css';
import katex from 'katex';

const SWATCHES = [
  '#ffffff', '#ef4444', '#22c55e', '#3b82f6',
  '#eab308', '#a855f7', '#f97316', '#ec4899',
];

interface MathResult {
  expr: string;
  result: string;
  assign: boolean;
}

interface LatexItem {
  latex: string;
  x: number;
  y: number;
}

export default function MathNotes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#ffffff');
  const [dictOfVars, setDictOfVars] = useState<Record<string, string>>({});
  const [latexItems, setLatexItems] = useState<LatexItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const container = containerRef.current;
      if (!container) return;
      const ctx = canvas.getContext('2d');
      // Save current image
      const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      if (ctx) {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        if (imageData) ctx.putImageData(imageData, 0, 0);
        ctx.lineCap = 'round';
        ctx.lineWidth = 3;
      }
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const resetCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    setLatexItems([]);
    setDictOfVars({});
  };

  const getCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoords(e);
    ctx.strokeStyle = color;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);

  const handleRun = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !user) return;

    setIsProcessing(true);
    try {
      const imageData = canvas.toDataURL('image/png');

      const { data, error } = await supabase.functions.invoke('analyze-math', {
        body: { image: imageData, dict_of_vars: dictOfVars },
      });

      if (error) throw error;

      if (data?.data) {
        const results: MathResult[] = data.data;

        // Find bounding box of drawn content for positioning
        const ctx = canvas.getContext('2d');
        const imgData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
        let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;

        if (imgData) {
          for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < canvas.width; x++) {
              const i = (y * canvas.width + x) * 4;
              // Check if pixel is not pure black
              if (imgData.data[i] > 10 || imgData.data[i + 1] > 10 || imgData.data[i + 2] > 10) {
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
              }
            }
          }
        }

        const centerX = (minX + maxX) / 2;
        const centerY = maxY + 30;

        results.forEach((r) => {
          if (r.assign) {
            setDictOfVars((prev) => ({ ...prev, [r.expr]: r.result }));
          }
        });

        const newItems = results.map((r, i) => ({
          latex: `${r.expr} = ${r.result}`,
          x: centerX,
          y: centerY + i * 50,
        }));

        setLatexItems((prev) => [...prev, ...newItems]);

        toast({
          title: 'Math solved!',
          description: `Found ${results.length} expression(s)`,
        });
      }
    } catch (err) {
      console.error('Math analysis error:', err);
      toast({
        title: 'Error',
        description: 'Failed to analyze the drawing. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Drag handlers for latex items
  const handleDragStart = (index: number, e: React.MouseEvent | React.TouchEvent) => {
    setDraggingIndex(index);
    const item = latexItems[index];
    if ('touches' in e) {
      setDragOffset({ x: e.touches[0].clientX - item.x, y: e.touches[0].clientY - item.y });
    } else {
      setDragOffset({ x: e.clientX - item.x, y: e.clientY - item.y });
    }
  };

  const handleDragMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (draggingIndex === null) return;
    let clientX: number, clientY: number;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    setLatexItems((prev) =>
      prev.map((item, i) =>
        i === draggingIndex ? { ...item, x: clientX - dragOffset.x, y: clientY - dragOffset.y } : item
      )
    );
  }, [draggingIndex, dragOffset]);

  const handleDragEnd = useCallback(() => {
    setDraggingIndex(null);
  }, []);

  useEffect(() => {
    if (draggingIndex !== null) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleDragMove);
      window.addEventListener('touchend', handleDragEnd);
      return () => {
        window.removeEventListener('mousemove', handleDragMove);
        window.removeEventListener('mouseup', handleDragEnd);
        window.removeEventListener('touchmove', handleDragMove);
        window.removeEventListener('touchend', handleDragEnd);
      };
    }
  }, [draggingIndex, handleDragMove, handleDragEnd]);

  return (
    <div className="h-screen flex flex-col bg-black overflow-hidden">
      {/* Toolbar */}
      <header className="flex items-center justify-between px-4 py-2 bg-card/90 backdrop-blur-xl border-b border-border z-30">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="p-1.5 bg-primary rounded-lg">
            <Brain className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-display font-semibold text-lg">Math Notes</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Color swatches */}
          <div className="flex items-center gap-1.5 mr-2">
            {SWATCHES.map((swatch) => (
              <button
                key={swatch}
                onClick={() => setColor(swatch)}
                className={cn(
                  'w-6 h-6 rounded-full border-2 transition-transform hover:scale-110',
                  color === swatch ? 'border-primary scale-110' : 'border-border'
                )}
                style={{ backgroundColor: swatch }}
              />
            ))}
          </div>

          {/* Variables display */}
          {Object.keys(dictOfVars).length > 0 && (
            <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md mr-2">
              {Object.entries(dictOfVars).map(([k, v]) => (
                <span key={k} className="font-mono">{k}={v}</span>
              ))}
            </div>
          )}

          <Button variant="outline" size="sm" onClick={resetCanvas} className="gap-1.5">
            <Trash2 className="h-4 w-4" />
            Reset
          </Button>
          <Button
            size="sm"
            onClick={handleRun}
            disabled={isProcessing}
            className="gap-1.5"
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {isProcessing ? 'Solving...' : 'Calculate'}
          </Button>
          <ThemeToggle />
        </div>
      </header>

      {/* Canvas area */}
      <div ref={containerRef} className="flex-1 relative cursor-crosshair select-none">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseOut={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />

        {/* LaTeX results overlay */}
        {latexItems.map((item, index) => (
          <div
            key={index}
            className="absolute p-2 rounded-lg shadow-lg cursor-grab active:cursor-grabbing select-none"
            style={{
              left: item.x,
              top: item.y,
              transform: 'translate(-50%, 0)',
              background: 'rgba(0,0,0,0.75)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.15)',
              zIndex: 20,
            }}
            onMouseDown={(e) => handleDragStart(index, e)}
            onTouchStart={(e) => handleDragStart(index, e)}
          >
            <div className="flex items-center gap-2">
              <GripHorizontal className="h-3 w-3 text-muted-foreground shrink-0" />
              <span
                className="text-white text-lg"
                dangerouslySetInnerHTML={{
                  __html: (() => {
                    try {
                      return katex.renderToString(item.latex, { throwOnError: false, displayMode: false });
                    } catch {
                      return item.latex;
                    }
                  })(),
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
