import { useState } from 'react';
import { Download, FileJson, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';
import type { Memory } from '@/types/memory';

interface ExportButtonProps {
  memories: Memory[];
}

export function ExportButton({ memories }: ExportButtonProps) {
  const [exporting, setExporting] = useState(false);

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportAsJSON = () => {
    setExporting(true);
    try {
      const exportData = memories.map((m) => ({
        id: m.id,
        type: m.type,
        title: m.title,
        content: m.content,
        url: m.url,
        tags: m.tags || [],
        extracted_text: m.extracted_text,
        created_at: m.created_at,
        updated_at: m.updated_at,
      }));

      const json = JSON.stringify(exportData, null, 2);
      const date = new Date().toISOString().split('T')[0];
      downloadFile(json, `recall-memories-${date}.json`, 'application/json');
      
      toast({
        title: 'Export complete',
        description: `Exported ${memories.length} memories as JSON.`,
      });
    } catch (error) {
      toast({
        title: 'Export failed',
        description: 'Unable to export memories.',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  const exportAsMarkdown = () => {
    setExporting(true);
    try {
      let markdown = `# Recall Memories Export\n\nExported on ${new Date().toLocaleDateString()}\n\n---\n\n`;

      memories.forEach((m) => {
        markdown += `## ${m.title}\n\n`;
        markdown += `**Type:** ${m.type}\n`;
        markdown += `**Created:** ${new Date(m.created_at).toLocaleString()}\n`;
        
        if (m.tags && m.tags.length > 0) {
          markdown += `**Tags:** ${m.tags.join(', ')}\n`;
        }
        
        if (m.url) {
          markdown += `**URL:** ${m.url}\n`;
        }
        
        markdown += '\n';
        
        if (m.content) {
          markdown += `${m.content}\n`;
        } else if (m.extracted_text) {
          markdown += `${m.extracted_text}\n`;
        }
        
        markdown += '\n---\n\n';
      });

      const date = new Date().toISOString().split('T')[0];
      downloadFile(markdown, `recall-memories-${date}.md`, 'text/markdown');
      
      toast({
        title: 'Export complete',
        description: `Exported ${memories.length} memories as Markdown.`,
      });
    } catch (error) {
      toast({
        title: 'Export failed',
        description: 'Unable to export memories.',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" disabled={exporting}>
          {exporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportAsJSON}>
          <FileJson className="h-4 w-4 mr-2" />
          Export as JSON
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportAsMarkdown}>
          <FileText className="h-4 w-4 mr-2" />
          Export as Markdown
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
