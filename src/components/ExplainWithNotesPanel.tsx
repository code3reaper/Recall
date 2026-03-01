import { useState } from 'react';
import { Lightbulb, Send, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import ReactMarkdown from 'react-markdown';

export function ExplainWithNotesPanel() {
  const { user } = useAuth();
  const [concept, setConcept] = useState('');
  const [explanation, setExplanation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [usedNotes, setUsedNotes] = useState(0);

  const handleExplain = async () => {
    if (!concept.trim() || !user) return;

    setIsLoading(true);
    setExplanation('');

    try {
      const response = await supabase.functions.invoke('chat-with-memories', {
        body: {
          query: `Explain this concept using my own notes and examples: "${concept}". Use my past notes, my language style, and reference specific things I've saved. Make it feel like I'm teaching myself.`,
          userId: user.id,
          command: 'explain_with_notes',
        },
      });

      if (response.error) throw response.error;

      setExplanation(response.data?.response || "I couldn't generate an explanation.");
      setUsedNotes(response.data?.memoriesUsed || 0);
    } catch (error) {
      console.error('Explain error:', error);
      setExplanation('Sorry, I encountered an error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleExplain();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-primary">
        <Lightbulb className="h-5 w-5" />
        <h3 className="font-semibold">Explain Using My Notes</h3>
      </div>
      
      <p className="text-sm text-muted-foreground">
        Enter any concept and get an explanation using your own notes, examples, and language style.
      </p>

      <div className="flex gap-2">
        <Input
          value={concept}
          onChange={(e) => setConcept(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g., blockchain, machine learning, design patterns..."
          className="h-12"
          disabled={isLoading}
        />
        <Button
          onClick={handleExplain}
          disabled={!concept.trim() || isLoading}
          size="lg"
          className="h-12 px-6"
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <Sparkles className="h-5 w-5 mr-2" />
              Explain
            </>
          )}
        </Button>
      </div>

      {explanation && (
        <div className="mt-4 space-y-3">
          {usedNotes > 0 && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Generated using {usedNotes} of your memories
            </p>
          )}
          <ScrollArea className="h-[400px] rounded-lg border border-border bg-muted/30 p-4">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{explanation}</ReactMarkdown>
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
