export type SlideLayout = 
  | 'title' 
  | 'content' 
  | 'two-column' 
  | 'image-left' 
  | 'image-right' 
  | 'quote' 
  | 'big-number' 
  | 'conclusion';

export interface Slide {
  type: SlideLayout;
  title: string;
  subtitle?: string;
  bullets?: string[];
  bullets2?: string[]; // For two-column layout
  quote?: string;
  quoteAuthor?: string;
  bigNumber?: string;
  bigNumberLabel?: string;
  imagePrompt?: string;
  imageUrl?: string;
  notes?: string;
}

export interface PresentationData {
  title: string;
  slides: Slide[];
}

export interface PresentationTemplate {
  id: string;
  name: string;
  description: string;
  preview: string; // emoji or icon
  bgClass: string;
  textClass: string;
  accentClass: string;
  headingFont: string;
  bodyFont: string;
  gradientFrom: string;
  gradientTo: string;
  decorStyle: 'geometric' | 'organic' | 'minimal' | 'bold' | 'elegant' | 'tech';
}

export const TEMPLATES: PresentationTemplate[] = [
  {
    id: 'midnight',
    name: 'Midnight',
    description: 'Dark & elegant with blue accents',
    preview: '🌙',
    bgClass: 'bg-[#0f172a]',
    textClass: 'text-white',
    accentClass: 'bg-blue-500',
    headingFont: 'font-display',
    bodyFont: 'font-sans',
    gradientFrom: '#1e3a5f',
    gradientTo: '#0f172a',
    decorStyle: 'elegant',
  },
  {
    id: 'sunset',
    name: 'Sunset Warm',
    description: 'Warm gradients with orange tones',
    preview: '🌅',
    bgClass: 'bg-[#1a1a2e]',
    textClass: 'text-white',
    accentClass: 'bg-orange-500',
    headingFont: 'font-display',
    bodyFont: 'font-sans',
    gradientFrom: '#e94560',
    gradientTo: '#1a1a2e',
    decorStyle: 'bold',
  },
  {
    id: 'minimal',
    name: 'Clean White',
    description: 'Minimalist with sharp typography',
    preview: '⬜',
    bgClass: 'bg-white',
    textClass: 'text-gray-900',
    accentClass: 'bg-gray-900',
    headingFont: 'font-display',
    bodyFont: 'font-sans',
    gradientFrom: '#f8fafc',
    gradientTo: '#e2e8f0',
    decorStyle: 'minimal',
  },
  {
    id: 'forest',
    name: 'Forest',
    description: 'Deep greens with organic feel',
    preview: '🌿',
    bgClass: 'bg-[#1b4332]',
    textClass: 'text-white',
    accentClass: 'bg-emerald-400',
    headingFont: 'font-display',
    bodyFont: 'font-sans',
    gradientFrom: '#2d6a4f',
    gradientTo: '#1b4332',
    decorStyle: 'organic',
  },
  {
    id: 'neon',
    name: 'Neon Tech',
    description: 'Cyberpunk with neon accents',
    preview: '💜',
    bgClass: 'bg-[#0a0a0a]',
    textClass: 'text-white',
    accentClass: 'bg-violet-500',
    headingFont: 'font-display',
    bodyFont: 'font-sans',
    gradientFrom: '#7c3aed',
    gradientTo: '#0a0a0a',
    decorStyle: 'tech',
  },
  {
    id: 'corporate',
    name: 'Corporate',
    description: 'Professional blue theme',
    preview: '💼',
    bgClass: 'bg-[#1e293b]',
    textClass: 'text-white',
    accentClass: 'bg-sky-500',
    headingFont: 'font-display',
    bodyFont: 'font-sans',
    gradientFrom: '#0284c7',
    gradientTo: '#1e293b',
    decorStyle: 'geometric',
  },
];
