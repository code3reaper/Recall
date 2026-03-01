import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function AIChatButton() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading || !user) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await supabase.functions.invoke('chat-with-memories', {
        body: { query: userMessage, userId: user.id },
      });

      if (response.error) {
        throw response.error;
      }

      const assistantMessage = response.data?.response || "I couldn't generate a response.";
      setMessages((prev) => [...prev, { role: 'assistant', content: assistantMessage }]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating button */}
      <Button
        onClick={() => setOpen(true)}
        className={cn(
          'fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-xl z-50',
          'bg-accent-gradient hover:shadow-glow transition-all duration-300',
          'flex items-center justify-center',
          open && 'scale-0'
        )}
      >
        <Sparkles className="h-6 w-6 text-accent-foreground" />
      </Button>

      {/* Chat panel */}
      <div
        className={cn(
          'fixed bottom-6 right-6 w-96 max-w-[calc(100vw-3rem)] bg-card border border-border rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden transition-all duration-300',
          open
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-95 translate-y-4 pointer-events-none'
        )}
        style={{ height: 'min(500px, calc(100vh - 120px))' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-accent-gradient">
              <Sparkles className="h-4 w-4 text-accent-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Memory Assistant</h3>
              <p className="text-xs text-muted-foreground">Ask about your memories</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="text-center py-8 space-y-3">
              <div className="w-16 h-16 rounded-full bg-muted mx-auto flex items-center justify-center">
                <MessageCircle className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-foreground">How can I help?</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Ask me anything about your saved memories
                </p>
              </div>
              <div className="flex flex-col gap-2 pt-2">
                {[
                  'Summarize my notes about React',
                  'Compare my recent bookmarks',
                  'What insights can you find in my memories?',
                  'Find links about design',
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInput(suggestion)}
                    className="text-xs text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted rounded-lg px-3 py-2 transition-colors text-left"
                  >
                    "{suggestion}"
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={cn(
                    'flex',
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm',
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-muted text-foreground rounded-bl-md'
                    )}
                  >
                    {message.role === 'assistant' ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                    ) : (
                      message.content
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t border-border bg-muted/20">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your memories..."
              className="h-10"
              disabled={isLoading}
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="h-10 w-10 shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
