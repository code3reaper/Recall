import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Brain, ArrowLeft, Trash2, Play, Loader2, GripHorizontal, Pencil, Eraser, Circle, Square, Triangle, Minus, Diamond } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import 'katex/dist/katex.min.css';
import katex from 'katex';

const SWATCHES = [
  '#ffffff', '#ef4444', '#22c55e', '#3b82f6',
  '#eab308', '#a855f7', '#f97316', '#ec4899',
];

const BRUSH_SIZES = [2, 4, 6, 10, 16];

type Tool = 'pen' | 'eraser';
type ShapeType = 'circle' | 'rectangle' | 'triangle' | 'line' | 'diamond';

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

interface DragShape {
  type: ShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  strokeWidth: number;
}

const SHAPE_DEFS: { type: ShapeType; icon: typeof Circle; label: string }[] = [
  { type: 'circle', icon: Circle, label: 'Circle' },
  { type: 'rectangle', icon: Square, label: 'Rectangle' },
  { type: 'triangle', icon: Triangle, label: 'Triangle' },
  { type: 'line', icon: Minus, label: 'Line' },
  { type: 'diamond', icon: Diamond, label: 'Diamond' },
];

function drawShapeOnCanvas(ctx: CanvasRenderingContext2D, shape: DragShape) {
  ctx.strokeStyle = shape.color;
  ctx.lineWidth = shape.strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const { x, y, width: w, height: h } = shape;

  switch (shape.type) {
    case 'circle': {
      const rx = w / 2;
      const ry = h / 2;
      ctx.beginPath();
      ctx.ellipse(x + rx, y + ry, Math.abs(rx), Math.abs(ry), 0, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case 'rectangle':
      ctx.strokeRect(x, y, w, h);
      break;
    case 'triangle':
      ctx.beginPath();
      ctx.moveTo(x + w / 2, y);
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x, y + h);
      ctx.closePath();
      ctx.stroke();
      break;
    case 'line':
      ctx.beginPath();
      ctx.moveTo(x, y + h / 2);
      ctx.lineTo(x + w, y + h / 2);
      ctx.stroke();
      break;
    case 'diamond':
      ctx.beginPath();
      ctx.moveTo(x + w / 2, y);
      ctx.lineTo(x + w, y + h / 2);
      ctx.lineTo(x + w / 2, y + h);
      ctx.lineTo(x, y + h / 2);
      ctx.closePath();
      ctx.stroke();
      break;
  }
}

export default function MathNotes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#ffffff');
  const [brushSize, setBrushSize] = useState(4);
  const [tool, setTool] = useState<Tool>('pen');
  const [dictOfVars, setDictOfVars] = useState<Record<string, string>>({});
  const [latexItems, setLatexItems] = useState<LatexItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Shape dragging from toolbar
  const [draggingShape, setDraggingShape] = useState<ShapeType | null>(null);
  const [shapePreview, setShapePreview] = useState<{ x: number; y: number } | null>(null);
  const [shapePlacing, setShapePlacing] = useState<{ type: ShapeType; startX: number; startY: number } | null>(null);
  const [shapeEnd, setShapeEnd] = useState<{ x: number; y: number } | null>(null);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const container = containerRef.current;
      if (!container) return;
      const ctx = canvas.getContext('2d');
      const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      if (ctx) {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        if (imageData) ctx.putImageData(imageData, 0, 0);
        ctx.lineCap = 'round';
        ctx.lineWidth = brushSize;
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
    // If we're placing a shape via click-drag on canvas
    if (draggingShape) {
      const { x, y } = getCoords(e);
      setShapePlacing({ type: draggingShape, startX: x, startY: y });
      setShapeEnd({ x, y });
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = brushSize;

    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
    } else {
      ctx.globalCompositeOperation = 'source-over';
    }

    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    // Shape placing drag
    if (shapePlacing) {
      const { x, y } = getCoords(e);
      setShapeEnd({ x, y });
      return;
    }

    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoords(e);

    if (tool === 'eraser') {
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.lineWidth = brushSize * 3;
    } else {
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    // Finalize shape
    if (shapePlacing && shapeEnd) {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx && canvas) {
        ctx.globalCompositeOperation = 'source-over';
        const shape: DragShape = {
          type: shapePlacing.type,
          x: Math.min(shapePlacing.startX, shapeEnd.x),
          y: Math.min(shapePlacing.startY, shapeEnd.y),
          width: Math.abs(shapeEnd.x - shapePlacing.startX),
          height: Math.abs(shapeEnd.y - shapePlacing.startY),
          color,
          strokeWidth: brushSize,
        };
        if (shape.width > 5 && shape.height > 5) {
          drawShapeOnCanvas(ctx, shape);
        }
      }
      setShapePlacing(null);
      setShapeEnd(null);
      return;
    }

    setIsDrawing(false);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      ctx.globalCompositeOperation = 'source-over';
    }
  };

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

        const ctx = canvas.getContext('2d');
        const imgData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
        let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;

        if (imgData) {
          for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < canvas.width; x++) {
              const i = (y * canvas.width + x) * 4;
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

  // Render shape preview overlay
  const renderShapePreview = () => {
    if (!shapePlacing || !shapeEnd) return null;
    const x = Math.min(shapePlacing.startX, shapeEnd.x);
    const y = Math.min(shapePlacing.startY, shapeEnd.y);
    const w = Math.abs(shapeEnd.x - shapePlacing.startX);
    const h = Math.abs(shapeEnd.y - shapePlacing.startY);
    if (w < 2 && h < 2) return null;

    return (
      <svg
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 15 }}
        width="100%"
        height="100%"
      >
        {shapePlacing.type === 'circle' && (
          <ellipse
            cx={x + w / 2} cy={y + h / 2}
            rx={w / 2} ry={h / 2}
            fill="none" stroke={color} strokeWidth={brushSize}
            strokeDasharray="6 3" opacity={0.8}
          />
        )}
        {shapePlacing.type === 'rectangle' && (
          <rect
            x={x} y={y} width={w} height={h}
            fill="none" stroke={color} strokeWidth={brushSize}
            strokeDasharray="6 3" opacity={0.8}
          />
        )}
        {shapePlacing.type === 'triangle' && (
          <polygon
            points={`${x + w / 2},${y} ${x + w},${y + h} ${x},${y + h}`}
            fill="none" stroke={color} strokeWidth={brushSize}
            strokeDasharray="6 3" opacity={0.8}
          />
        )}
        {shapePlacing.type === 'line' && (
          <line
            x1={shapePlacing.startX} y1={shapePlacing.startY}
            x2={shapeEnd.x} y2={shapeEnd.y}
            stroke={color} strokeWidth={brushSize}
            strokeDasharray="6 3" opacity={0.8}
          />
        )}
        {shapePlacing.type === 'diamond' && (
          <polygon
            points={`${x + w / 2},${y} ${x + w},${y + h / 2} ${x + w / 2},${y + h} ${x},${y + h / 2}`}
            fill="none" stroke={color} strokeWidth={brushSize}
            strokeDasharray="6 3" opacity={0.8}
          />
        )}
      </svg>
    );
  };

  return (
    <div className="h-screen flex flex-col bg-black overflow-hidden">
      {/* Toolbar */}
      <header className="flex items-center justify-between px-3 py-2 bg-card/90 backdrop-blur-xl border-b border-border z-30 gap-2 overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="hidden sm:flex items-center gap-2">
            <div className="p-1.5 bg-primary rounded-lg">
              <Brain className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display font-semibold text-lg">Math Notes</span>
          </div>
        </div>

        {/* Tools Section */}
        <div className="flex items-center gap-1.5">
          {/* Pen / Eraser toggle */}
          <div className="flex items-center bg-muted rounded-lg p-0.5">
            <button
              onClick={() => { setTool('pen'); setDraggingShape(null); }}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                tool === 'pen' && !draggingShape ? 'bg-background shadow-sm' : 'hover:bg-background/50'
              )}
              title="Pen"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => { setTool('eraser'); setDraggingShape(null); }}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                tool === 'eraser' && !draggingShape ? 'bg-background shadow-sm' : 'hover:bg-background/50'
              )}
              title="Eraser"
            >
              <Eraser className="h-4 w-4" />
            </button>
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-border mx-1" />

          {/* Brush size */}
          <div className="flex items-center gap-1">
            {BRUSH_SIZES.map((size) => (
              <button
                key={size}
                onClick={() => setBrushSize(size)}
                className={cn(
                  'flex items-center justify-center w-7 h-7 rounded-md transition-colors',
                  brushSize === size ? 'bg-accent/20 ring-1 ring-accent' : 'hover:bg-muted'
                )}
                title={`Size ${size}`}
              >
                <div
                  className="rounded-full bg-foreground"
                  style={{ width: Math.min(size + 2, 14), height: Math.min(size + 2, 14) }}
                />
              </button>
            ))}
          </div>

          <div className="w-px h-6 bg-border mx-1" />

          {/* Color swatches */}
          <div className="flex items-center gap-1">
            {SWATCHES.map((swatch) => (
              <button
                key={swatch}
                onClick={() => { setColor(swatch); setTool('pen'); setDraggingShape(null); }}
                className={cn(
                  'w-5 h-5 rounded-full border-2 transition-transform hover:scale-110',
                  color === swatch && tool === 'pen' ? 'border-accent scale-110' : 'border-border/60'
                )}
                style={{ backgroundColor: swatch }}
              />
            ))}
          </div>

          <div className="w-px h-6 bg-border mx-1" />

          {/* Shapes */}
          <div className="flex items-center gap-0.5">
            {SHAPE_DEFS.map(({ type, icon: Icon, label }) => (
              <button
                key={type}
                onClick={() => {
                  if (draggingShape === type) {
                    setDraggingShape(null);
                    setTool('pen');
                  } else {
                    setDraggingShape(type);
                    setTool('pen');
                  }
                }}
                className={cn(
                  'p-1.5 rounded-md transition-colors',
                  draggingShape === type ? 'bg-accent/20 ring-1 ring-accent' : 'hover:bg-muted'
                )}
                title={label}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {Object.keys(dictOfVars).length > 0 && (
            <div className="hidden md:flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
              {Object.entries(dictOfVars).map(([k, v]) => (
                <span key={k} className="font-mono">{k}={v}</span>
              ))}
            </div>
          )}

          <Button variant="outline" size="sm" onClick={resetCanvas} className="gap-1.5">
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">Reset</span>
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
            <span className="hidden sm:inline">{isProcessing ? 'Solving...' : 'Calculate'}</span>
          </Button>
          <ThemeToggle />
        </div>
      </header>

      {/* Canvas area */}
      <div
        ref={containerRef}
        className={cn(
          'flex-1 relative select-none',
          draggingShape ? 'cursor-crosshair' : tool === 'eraser' ? 'cursor-cell' : 'cursor-crosshair'
        )}
      >
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

        {/* Shape preview overlay */}
        {renderShapePreview()}

        {/* Active shape indicator */}
        {draggingShape && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-accent/90 text-accent-foreground px-3 py-1 rounded-full text-xs font-medium z-30 pointer-events-none">
            Click & drag to draw {draggingShape}
          </div>
        )}

        {/* LaTeX results overlay */}
        {latexItems.map((item, index) => (
          <div
            key={index}
            className="absolute px-4 py-3 rounded-xl shadow-2xl cursor-grab active:cursor-grabbing select-none"
            style={{
              left: item.x,
              top: item.y,
              transform: 'translate(-50%, 0)',
              background: 'rgba(0,0,0,0.85)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.2)',
              zIndex: 20,
            }}
            onMouseDown={(e) => handleDragStart(index, e)}
            onTouchStart={(e) => handleDragStart(index, e)}
          >
            <div className="flex items-center gap-3">
              <GripHorizontal className="h-3.5 w-3.5 text-muted-foreground shrink-0 opacity-60" />
              <div
                className="text-white text-xl leading-relaxed [&_.katex]:text-xl [&_.katex_.mord]:mx-[0.05em] [&_.katex_.mbin]:mx-[0.25em] [&_.katex_.mrel]:mx-[0.3em] [&_.katex_.mopen]:ml-[0.05em] [&_.katex_.mclose]:mr-[0.05em]"
                dangerouslySetInnerHTML={{
                  __html: (() => {
                    try {
                      return katex.renderToString(item.latex, { throwOnError: false, displayMode: true });
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
