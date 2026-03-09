import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  Brain, ArrowLeft, Trash2, Play, Loader2, GripHorizontal,
  Pencil, Eraser, Circle, Square, Triangle, Minus, Diamond,
  Download, Plus, FileText, X, ChevronLeft,
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import 'katex/dist/katex.min.css';
import katex from 'katex';
import { jsPDF } from 'jspdf';

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

interface SavedNote {
  id: string;
  name: string;
  canvasData: string; // dataURL
  latexItems: LatexItem[];
  dictOfVars: Record<string, string>;
  updatedAt: number;
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
      const rx = w / 2, ry = h / 2;
      ctx.beginPath();
      ctx.ellipse(x + rx, y + ry, Math.abs(rx), Math.abs(ry), 0, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case 'rectangle': ctx.strokeRect(x, y, w, h); break;
    case 'triangle':
      ctx.beginPath(); ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.closePath(); ctx.stroke(); break;
    case 'line':
      ctx.beginPath(); ctx.moveTo(x, y + h / 2); ctx.lineTo(x + w, y + h / 2); ctx.stroke(); break;
    case 'diamond':
      ctx.beginPath(); ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w, y + h / 2); ctx.lineTo(x + w / 2, y + h); ctx.lineTo(x, y + h / 2); ctx.closePath(); ctx.stroke(); break;
  }
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function loadNotes(): SavedNote[] {
  try {
    const raw = localStorage.getItem('math-notes-list');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveNotesToStorage(notes: SavedNote[]) {
  localStorage.setItem('math-notes-list', JSON.stringify(notes));
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

  // Shape drawing
  const [draggingShape, setDraggingShape] = useState<ShapeType | null>(null);
  const [shapePlacing, setShapePlacing] = useState<{ type: ShapeType; startX: number; startY: number } | null>(null);
  const [shapeEnd, setShapeEnd] = useState<{ x: number; y: number } | null>(null);

  // Notes management
  const [notes, setNotes] = useState<SavedNote[]>(() => loadNotes());
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [showNotesList, setShowNotesList] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Save current canvas state to the active note
  const saveCurrentNote = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !activeNoteId) return;
    const canvasData = canvas.toDataURL('image/png');
    setNotes(prev => {
      const updated = prev.map(n =>
        n.id === activeNoteId
          ? { ...n, canvasData, latexItems, dictOfVars, updatedAt: Date.now() }
          : n
      );
      saveNotesToStorage(updated);
      return updated;
    });
  }, [activeNoteId, latexItems, dictOfVars]);

  // Auto-save every 5 seconds
  useEffect(() => {
    if (!activeNoteId) return;
    const interval = setInterval(saveCurrentNote, 5000);
    return () => clearInterval(interval);
  }, [activeNoteId, saveCurrentNote]);

  // Create new note
  const createNewNote = useCallback(() => {
    // Save current first
    saveCurrentNote();

    const newNote: SavedNote = {
      id: generateId(),
      name: `Note ${notes.length + 1}`,
      canvasData: '',
      latexItems: [],
      dictOfVars: {},
      updatedAt: Date.now(),
    };

    const updated = [newNote, ...notes];
    setNotes(updated);
    saveNotesToStorage(updated);
    setActiveNoteId(newNote.id);

    // Clear canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) { ctx.fillStyle = 'black'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    }
    setLatexItems([]);
    setDictOfVars({});
    setShowNotesList(false);
  }, [notes, saveCurrentNote]);

  // Switch to a note
  const switchToNote = useCallback((noteId: string) => {
    saveCurrentNote();
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    setActiveNoteId(noteId);
    setLatexItems(note.latexItems);
    setDictOfVars(note.dictOfVars);

    // Restore canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        if (note.canvasData) {
          const img = new Image();
          img.onload = () => ctx.drawImage(img, 0, 0);
          img.src = note.canvasData;
        }
      }
    }
    setShowNotesList(false);
  }, [notes, saveCurrentNote]);

  // Delete a note
  const deleteNote = useCallback((noteId: string) => {
    const updated = notes.filter(n => n.id !== noteId);
    setNotes(updated);
    saveNotesToStorage(updated);
    if (activeNoteId === noteId) {
      if (updated.length > 0) {
        switchToNote(updated[0].id);
      } else {
        setActiveNoteId(null);
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) { ctx.fillStyle = 'black'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
        }
        setLatexItems([]);
        setDictOfVars({});
      }
    }
  }, [notes, activeNoteId, switchToNote]);

  // Rename note
  const startRename = (id: string, currentName: string) => {
    setRenamingId(id);
    setRenameValue(currentName);
  };

  const finishRename = () => {
    if (renamingId && renameValue.trim()) {
      setNotes(prev => {
        const updated = prev.map(n => n.id === renamingId ? { ...n, name: renameValue.trim() } : n);
        saveNotesToStorage(updated);
        return updated;
      });
    }
    setRenamingId(null);
  };

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

  // Auto-create first note if none exists
  useEffect(() => {
    if (notes.length === 0) {
      const first: SavedNote = {
        id: generateId(),
        name: 'Note 1',
        canvasData: '',
        latexItems: [],
        dictOfVars: {},
        updatedAt: Date.now(),
      };
      setNotes([first]);
      saveNotesToStorage([first]);
      setActiveNoteId(first.id);
    } else if (!activeNoteId) {
      setActiveNoteId(notes[0].id);
    }
  }, []);

  const resetCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) { ctx.fillStyle = 'black'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    setLatexItems([]);
    setDictOfVars({});
  };

  // PDF Export
  const exportAsPDF = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Save current note first
    saveCurrentNote();

    try {
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [canvas.width, canvas.height] });

      // Add canvas as image
      const canvasImage = canvas.toDataURL('image/png');
      pdf.addImage(canvasImage, 'PNG', 0, 0, canvas.width, canvas.height);

      // Add LaTeX results as text
      if (latexItems.length > 0) {
        pdf.setFontSize(16);
        pdf.setTextColor(255, 255, 255);
        latexItems.forEach(item => {
          // Render plain text version
          const plainText = item.latex.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1/$2)').replace(/\\/g, '');
          pdf.text(plainText, Math.max(10, item.x), Math.max(20, item.y + 20));
        });
      }

      const noteName = notes.find(n => n.id === activeNoteId)?.name || 'math-note';
      pdf.save(`${noteName}.pdf`);

      toast({ title: 'PDF saved!', description: `${noteName}.pdf downloaded` });
    } catch (err) {
      console.error('PDF export error:', err);
      toast({ title: 'Export failed', description: 'Could not export PDF', variant: 'destructive' });
    }
  }, [latexItems, activeNoteId, notes, saveCurrentNote]);

  const getCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
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
    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (shapePlacing) {
      const { x, y } = getCoords(e);
      setShapeEnd({ x, y });
      return;
    }
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
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
    if (shapePlacing && shapeEnd) {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx) {
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
        if (shape.width > 5 && shape.height > 5) drawShapeOnCanvas(ctx, shape);
      }
      setShapePlacing(null);
      setShapeEnd(null);
      return;
    }
    setIsDrawing(false);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) ctx.globalCompositeOperation = 'source-over';
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
                minX = Math.min(minX, x); minY = Math.min(minY, y);
                maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
              }
            }
          }
        }
        const clampX = (val: number) => Math.max(80, Math.min(canvas.width - 80, val));
        const clampY = (val: number) => Math.max(10, Math.min(canvas.height - 60, val));
        const centerX = clampX((minX + maxX) / 2);
        const baseY = maxY + 30;
        results.forEach(r => { if (r.assign) setDictOfVars(prev => ({ ...prev, [r.expr]: r.result })); });
        const newItems = results.map((r, i) => ({ latex: `${r.expr} = ${r.result}`, x: centerX, y: clampY(baseY + i * 50) }));
        setLatexItems(prev => [...prev, ...newItems]);
        toast({ title: 'Math solved!', description: `Found ${results.length} expression(s)` });
      }
    } catch (err) {
      console.error('Math analysis error:', err);
      toast({ title: 'Error', description: 'Failed to analyze. Please try again.', variant: 'destructive' });
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
    const [clientX, clientY] = 'touches' in e ? [e.touches[0].clientX, e.touches[0].clientY] : [e.clientX, e.clientY];
    setLatexItems(prev => prev.map((item, i) => i === draggingIndex ? { ...item, x: clientX - dragOffset.x, y: clientY - dragOffset.y } : item));
  }, [draggingIndex, dragOffset]);

  const handleDragEnd = useCallback(() => { setDraggingIndex(null); }, []);

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

  const renderShapePreview = () => {
    if (!shapePlacing || !shapeEnd) return null;
    const x = Math.min(shapePlacing.startX, shapeEnd.x);
    const y = Math.min(shapePlacing.startY, shapeEnd.y);
    const w = Math.abs(shapeEnd.x - shapePlacing.startX);
    const h = Math.abs(shapeEnd.y - shapePlacing.startY);
    if (w < 2 && h < 2) return null;
    return (
      <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 15 }} width="100%" height="100%">
        {shapePlacing.type === 'circle' && <ellipse cx={x + w / 2} cy={y + h / 2} rx={w / 2} ry={h / 2} fill="none" stroke={color} strokeWidth={brushSize} strokeDasharray="6 3" opacity={0.8} />}
        {shapePlacing.type === 'rectangle' && <rect x={x} y={y} width={w} height={h} fill="none" stroke={color} strokeWidth={brushSize} strokeDasharray="6 3" opacity={0.8} />}
        {shapePlacing.type === 'triangle' && <polygon points={`${x + w / 2},${y} ${x + w},${y + h} ${x},${y + h}`} fill="none" stroke={color} strokeWidth={brushSize} strokeDasharray="6 3" opacity={0.8} />}
        {shapePlacing.type === 'line' && <line x1={shapePlacing.startX} y1={shapePlacing.startY} x2={shapeEnd.x} y2={shapeEnd.y} stroke={color} strokeWidth={brushSize} strokeDasharray="6 3" opacity={0.8} />}
        {shapePlacing.type === 'diamond' && <polygon points={`${x + w / 2},${y} ${x + w},${y + h / 2} ${x + w / 2},${y + h} ${x},${y + h / 2}`} fill="none" stroke={color} strokeWidth={brushSize} strokeDasharray="6 3" opacity={0.8} />}
      </svg>
    );
  };

  const activeNoteName = notes.find(n => n.id === activeNoteId)?.name || 'Untitled';

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
          {/* Note name / switcher */}
          <button
            onClick={() => setShowNotesList(!showNotesList)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-sm font-medium max-w-[140px] truncate"
          >
            <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{activeNoteName}</span>
          </button>
        </div>

        {/* Tools Section */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center bg-muted rounded-lg p-0.5">
            <button onClick={() => { setTool('pen'); setDraggingShape(null); }} className={cn('p-1.5 rounded-md transition-colors', tool === 'pen' && !draggingShape ? 'bg-background shadow-sm' : 'hover:bg-background/50')} title="Pen">
              <Pencil className="h-4 w-4" />
            </button>
            <button onClick={() => { setTool('eraser'); setDraggingShape(null); }} className={cn('p-1.5 rounded-md transition-colors', tool === 'eraser' && !draggingShape ? 'bg-background shadow-sm' : 'hover:bg-background/50')} title="Eraser">
              <Eraser className="h-4 w-4" />
            </button>
          </div>
          <div className="w-px h-6 bg-border mx-1" />
          <div className="flex items-center gap-1">
            {BRUSH_SIZES.map(size => (
              <button key={size} onClick={() => setBrushSize(size)} className={cn('flex items-center justify-center w-7 h-7 rounded-md transition-colors', brushSize === size ? 'bg-accent/20 ring-1 ring-accent' : 'hover:bg-muted')} title={`Size ${size}`}>
                <div className="rounded-full bg-foreground" style={{ width: Math.min(size + 2, 14), height: Math.min(size + 2, 14) }} />
              </button>
            ))}
          </div>
          <div className="w-px h-6 bg-border mx-1" />
          <div className="flex items-center gap-1">
            {SWATCHES.map(swatch => (
              <button key={swatch} onClick={() => { setColor(swatch); setTool('pen'); setDraggingShape(null); }} className={cn('w-5 h-5 rounded-full border-2 transition-transform hover:scale-110', color === swatch && tool === 'pen' ? 'border-accent scale-110' : 'border-border/60')} style={{ backgroundColor: swatch }} />
            ))}
          </div>
          <div className="w-px h-6 bg-border mx-1" />
          <div className="flex items-center gap-0.5">
            {SHAPE_DEFS.map(({ type, icon: Icon, label }) => (
              <button key={type} onClick={() => { if (draggingShape === type) { setDraggingShape(null); setTool('pen'); } else { setDraggingShape(type); setTool('pen'); } }} className={cn('p-1.5 rounded-md transition-colors', draggingShape === type ? 'bg-accent/20 ring-1 ring-accent' : 'hover:bg-muted')} title={label}>
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
          <Button variant="outline" size="sm" onClick={createNewNote} className="gap-1.5" title="New Note">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New</span>
          </Button>
          <Button variant="outline" size="sm" onClick={exportAsPDF} className="gap-1.5" title="Save as PDF">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">PDF</span>
          </Button>
          <Button variant="outline" size="sm" onClick={resetCanvas} className="gap-1.5">
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">Reset</span>
          </Button>
          <Button size="sm" onClick={handleRun} disabled={isProcessing} className="gap-1.5">
            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            <span className="hidden sm:inline">{isProcessing ? 'Solving...' : 'Calculate'}</span>
          </Button>
          <ThemeToggle />
        </div>
      </header>

      {/* Canvas area */}
      <div ref={containerRef} className={cn('flex-1 relative select-none overflow-hidden', draggingShape ? 'cursor-crosshair' : tool === 'eraser' ? 'cursor-cell' : 'cursor-crosshair')}>
        {/* Notes sidebar panel */}
        {showNotesList && (
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-card/95 backdrop-blur-xl border-r border-border z-40 flex flex-col animate-fade-in">
            <div className="flex items-center justify-between p-3 border-b border-border">
              <h3 className="text-sm font-semibold">All Notes</h3>
              <div className="flex items-center gap-1">
                <button onClick={createNewNote} className="p-1.5 rounded-md hover:bg-muted" title="New note">
                  <Plus className="h-4 w-4" />
                </button>
                <button onClick={() => setShowNotesList(false)} className="p-1.5 rounded-md hover:bg-muted">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {notes.length === 0 && (
                <p className="text-xs text-muted-foreground p-4 text-center">No notes yet</p>
              )}
              {notes.sort((a, b) => b.updatedAt - a.updatedAt).map(note => (
                <div
                  key={note.id}
                  className={cn(
                    'group flex items-center gap-2 px-3 py-2.5 border-b border-border/50 cursor-pointer transition-colors',
                    note.id === activeNoteId ? 'bg-accent/10' : 'hover:bg-muted/50'
                  )}
                  onClick={() => switchToNote(note.id)}
                >
                  <FileText className={cn('h-4 w-4 shrink-0', note.id === activeNoteId ? 'text-accent' : 'text-muted-foreground')} />
                  <div className="flex-1 min-w-0">
                    {renamingId === note.id ? (
                      <input
                        value={renameValue}
                        onChange={e => setRenameValue(e.target.value)}
                        onBlur={finishRename}
                        onKeyDown={e => e.key === 'Enter' && finishRename()}
                        className="text-sm bg-transparent border-none outline-none w-full focus:ring-1 focus:ring-accent rounded px-1"
                        autoFocus
                        onClick={e => e.stopPropagation()}
                      />
                    ) : (
                      <p className="text-sm font-medium truncate">{note.name}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(note.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={e => { e.stopPropagation(); startRename(note.id, note.name); }}
                      className="p-1 rounded hover:bg-muted"
                      title="Rename"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); deleteNote(note.id); }}
                      className="p-1 rounded hover:bg-destructive/20 text-destructive"
                      title="Delete"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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

        {renderShapePreview()}

        {draggingShape && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-accent/90 text-accent-foreground px-3 py-1 rounded-full text-xs font-medium z-30 pointer-events-none">
            Click & drag to draw {draggingShape}
          </div>
        )}

        {latexItems.map((item, index) => (
          <div
            key={index}
            className="absolute px-4 py-3 rounded-xl shadow-2xl cursor-grab active:cursor-grabbing select-none max-w-[90vw] sm:max-w-[70vw]"
            style={{
              left: Math.max(0, Math.min(item.x, (containerRef.current?.clientWidth ?? 800) - 40)),
              top: Math.max(0, Math.min(item.y, (containerRef.current?.clientHeight ?? 600) - 40)),
              transform: 'translate(-50%, 0)',
              background: 'rgba(0,0,0,0.85)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.2)',
              zIndex: 20,
            }}
            onMouseDown={e => handleDragStart(index, e)}
            onTouchStart={e => handleDragStart(index, e)}
          >
            <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide">
              <GripHorizontal className="h-3.5 w-3.5 text-muted-foreground shrink-0 opacity-60" />
              <div
                className="text-white text-lg sm:text-xl leading-relaxed overflow-x-auto scrollbar-hide [&_.katex]:text-lg sm:[&_.katex]:text-xl"
                dangerouslySetInnerHTML={{
                  __html: (() => {
                    try { return katex.renderToString(item.latex, { throwOnError: false, displayMode: false }); }
                    catch { return item.latex; }
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
