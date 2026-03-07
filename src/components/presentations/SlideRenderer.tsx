import { cn } from '@/lib/utils';
import type { Slide, PresentationTemplate } from '@/types/presentation';
import { TEMPLATES } from '@/types/presentation';
import { Loader2, ImageIcon } from 'lucide-react';

interface SlideRendererProps {
  slide: Slide;
  index: number;
  templateId: string;
  isEditing?: boolean;
  onUpdate?: (field: string, value: string | string[]) => void;
  loadingImage?: boolean;
}

function getTemplate(id: string): PresentationTemplate {
  return TEMPLATES.find(t => t.id === id) || TEMPLATES[0];
}

function DecoElements({ template }: { template: PresentationTemplate }) {
  const { decorStyle, gradientFrom } = template;

  if (decorStyle === 'geometric') return (
    <>
      <div className="absolute top-0 right-0 w-[30%] h-[30%] opacity-10" style={{ background: gradientFrom, clipPath: 'polygon(100% 0, 0 0, 100% 100%)' }} />
      <div className="absolute bottom-0 left-0 w-[20%] h-[20%] opacity-10" style={{ background: gradientFrom, clipPath: 'polygon(0 0, 0 100%, 100% 100%)' }} />
    </>
  );
  if (decorStyle === 'organic') return (
    <>
      <div className="absolute top-0 right-0 w-1/3 h-1/3 rounded-bl-full opacity-10" style={{ background: gradientFrom }} />
      <div className="absolute bottom-0 left-0 w-1/4 h-1/4 rounded-tr-full opacity-10" style={{ background: gradientFrom }} />
    </>
  );
  if (decorStyle === 'bold') return (
    <div className="absolute inset-0 opacity-5" style={{ background: `radial-gradient(circle at 80% 20%, ${gradientFrom}, transparent 60%)` }} />
  );
  if (decorStyle === 'tech') return (
    <>
      <div className="absolute top-0 left-0 w-full h-px opacity-20" style={{ background: gradientFrom }} />
      <div className="absolute bottom-0 left-0 w-full h-px opacity-20" style={{ background: gradientFrom }} />
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `radial-gradient(${gradientFrom} 1px, transparent 1px)`, backgroundSize: '24px 24px' }} />
    </>
  );
  if (decorStyle === 'elegant') return (
    <div className="absolute top-0 right-0 w-2/5 h-full opacity-[0.06]" style={{ background: `linear-gradient(180deg, ${gradientFrom}, transparent)` }} />
  );
  return null; // minimal
}

function EditableText({ value, onChange, className, placeholder, multiline }: {
  value: string;
  onChange?: (v: string) => void;
  className?: string;
  placeholder?: string;
  multiline?: boolean;
}) {
  if (!onChange) return <span className={className}>{value}</span>;
  
  if (multiline) {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(className, 'bg-transparent border-none outline-none resize-none w-full focus:ring-1 focus:ring-white/30 rounded px-1')}
        placeholder={placeholder}
        rows={2}
      />
    );
  }
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(className, 'bg-transparent border-none outline-none w-full focus:ring-1 focus:ring-white/30 rounded px-1')}
      placeholder={placeholder}
    />
  );
}

export function SlideRenderer({ slide, index, templateId, isEditing, onUpdate, loadingImage }: SlideRendererProps) {
  const template = getTemplate(templateId);
  const isDark = templateId !== 'minimal';
  const accentColor = template.gradientFrom;

  const bulletDot = (
    <span className="mt-2 w-2 h-2 rounded-full shrink-0" style={{ background: accentColor }} />
  );

  const slideNumber = (
    <div className={cn('absolute bottom-4 right-6 text-xs font-sans', isDark ? 'text-white/30' : 'text-gray-400')}>
      {index + 1}
    </div>
  );

  const imageBlock = (
    <div className="relative w-full h-full rounded-xl overflow-hidden flex items-center justify-center bg-black/20">
      {loadingImage ? (
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin opacity-50" />
          <span className="text-xs opacity-50">Generating image…</span>
        </div>
      ) : slide.imageUrl ? (
        <img src={slide.imageUrl} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="flex flex-col items-center gap-2 opacity-30">
          <ImageIcon className="h-12 w-12" />
          <span className="text-xs">Click to generate image</span>
        </div>
      )}
    </div>
  );

  const renderBullets = (bullets: string[], field: string) => (
    <ul className="space-y-3">
      {bullets.map((b, i) => (
        <li key={i} className="flex items-start gap-3 text-base md:text-lg font-sans opacity-90 leading-relaxed">
          {bulletDot}
          {isEditing && onUpdate ? (
            <input
              value={b}
              onChange={(e) => {
                const newBullets = [...bullets];
                newBullets[i] = e.target.value;
                onUpdate(field, newBullets);
              }}
              className="bg-transparent border-none outline-none flex-1 focus:ring-1 focus:ring-white/30 rounded px-1"
              placeholder={`Point ${i + 1}`}
            />
          ) : (
            <span>{b}</span>
          )}
        </li>
      ))}
      {isEditing && onUpdate && (
        <li>
          <button
            onClick={() => onUpdate(field, [...bullets, ''])}
            className="text-xs opacity-50 hover:opacity-80 ml-5 mt-1"
          >
            + Add point
          </button>
        </li>
      )}
    </ul>
  );

  const commonWrapper = cn(
    'w-full aspect-video rounded-2xl flex flex-col justify-center p-8 md:p-16 transition-all duration-500 shadow-2xl relative overflow-hidden',
    template.textClass,
  );

  const bgStyle = {
    background: `linear-gradient(135deg, ${template.gradientFrom}, ${template.gradientTo})`,
  };

  // TITLE slide
  if (slide.type === 'title') {
    return (
      <div className={cn(commonWrapper, 'items-center')} style={bgStyle}>
        <DecoElements template={template} />
        <div className="text-center z-10 space-y-6 max-w-4xl">
          <EditableText
            value={slide.title}
            onChange={isEditing ? (v) => onUpdate?.('title', v) : undefined}
            className={cn('text-3xl md:text-5xl lg:text-6xl font-bold leading-tight block', template.headingFont)}
            placeholder="Presentation Title"
          />
          {(slide.subtitle || isEditing) && (
            <EditableText
              value={slide.subtitle || ''}
              onChange={isEditing ? (v) => onUpdate?.('subtitle', v) : undefined}
              className="text-lg md:text-2xl opacity-80 font-light block"
              placeholder="Subtitle"
            />
          )}
        </div>
        {slideNumber}
      </div>
    );
  }

  // QUOTE slide
  if (slide.type === 'quote') {
    return (
      <div className={cn(commonWrapper, 'items-center')} style={bgStyle}>
        <DecoElements template={template} />
        <div className="z-10 text-center max-w-3xl space-y-6">
          <div className="text-5xl opacity-20" style={{ color: accentColor }}>"</div>
          <EditableText
            value={slide.quote || slide.title}
            onChange={isEditing ? (v) => onUpdate?.('quote', v) : undefined}
            className={cn('text-xl md:text-3xl italic leading-relaxed block', template.headingFont)}
            placeholder="Quote text"
            multiline
          />
          {(slide.quoteAuthor || isEditing) && (
            <EditableText
              value={slide.quoteAuthor || ''}
              onChange={isEditing ? (v) => onUpdate?.('quoteAuthor', v) : undefined}
              className="text-base opacity-60 block"
              placeholder="— Author"
            />
          )}
        </div>
        {slideNumber}
      </div>
    );
  }

  // BIG NUMBER slide
  if (slide.type === 'big-number') {
    return (
      <div className={cn(commonWrapper, 'items-center')} style={bgStyle}>
        <DecoElements template={template} />
        <div className="z-10 text-center space-y-4">
          <EditableText
            value={slide.bigNumber || '0'}
            onChange={isEditing ? (v) => onUpdate?.('bigNumber', v) : undefined}
            className="text-6xl md:text-8xl font-bold block"
            style={{ color: accentColor } as any}
            placeholder="100%"
          />
          <EditableText
            value={slide.bigNumberLabel || slide.title}
            onChange={isEditing ? (v) => onUpdate?.('bigNumberLabel', v) : undefined}
            className="text-xl md:text-2xl opacity-80 block"
            placeholder="Label"
          />
          {slide.bullets && slide.bullets.length > 0 && (
            <p className="text-base opacity-60 mt-4">{slide.bullets[0]}</p>
          )}
        </div>
        {slideNumber}
      </div>
    );
  }

  // IMAGE LEFT / RIGHT
  if (slide.type === 'image-left' || slide.type === 'image-right') {
    const imgFirst = slide.type === 'image-left';
    return (
      <div className={cn(commonWrapper, '!flex-row !items-stretch !p-0')} style={bgStyle}>
        <DecoElements template={template} />
        <div className={cn('w-[45%] p-4', imgFirst ? 'order-1' : 'order-2')}>
          {imageBlock}
        </div>
        <div className={cn('w-[55%] flex flex-col justify-center p-8 md:p-12 z-10', imgFirst ? 'order-2' : 'order-1')}>
          <EditableText
            value={slide.title}
            onChange={isEditing ? (v) => onUpdate?.('title', v) : undefined}
            className={cn('text-2xl md:text-3xl font-bold mb-6 block', template.headingFont)}
            placeholder="Slide Title"
          />
          {slide.bullets && renderBullets(slide.bullets, 'bullets')}
        </div>
        {slideNumber}
      </div>
    );
  }

  // TWO COLUMN
  if (slide.type === 'two-column') {
    return (
      <div className={commonWrapper} style={bgStyle}>
        <DecoElements template={template} />
        <div className="z-10 w-full max-w-5xl space-y-6">
          <EditableText
            value={slide.title}
            onChange={isEditing ? (v) => onUpdate?.('title', v) : undefined}
            className={cn('text-2xl md:text-4xl font-bold block', template.headingFont)}
            placeholder="Slide Title"
          />
          <div className="grid grid-cols-2 gap-8">
            <div>{slide.bullets && renderBullets(slide.bullets, 'bullets')}</div>
            <div>{slide.bullets2 && renderBullets(slide.bullets2, 'bullets2')}</div>
          </div>
        </div>
        {slideNumber}
      </div>
    );
  }

  // CONTENT / CONCLUSION (default)
  return (
    <div className={commonWrapper} style={bgStyle}>
      <DecoElements template={template} />
      <div className={cn('w-full z-10 space-y-6 max-w-4xl', slide.type === 'conclusion' && 'text-center mx-auto')}>
        <EditableText
          value={slide.title}
          onChange={isEditing ? (v) => onUpdate?.('title', v) : undefined}
          className={cn('text-2xl md:text-4xl font-bold block', template.headingFont)}
          placeholder="Slide Title"
        />
        {slide.bullets && slide.bullets.length > 0 && renderBullets(slide.bullets, 'bullets')}
      </div>
      {slideNumber}
    </div>
  );
}
