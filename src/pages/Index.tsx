import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Brain, Search, Sparkles, FileText, Link, Loader2 } from 'lucide-react';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-hero-gradient opacity-5" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-accent/10 via-transparent to-transparent" />
        
        <nav className="relative container max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-xl shadow-lg">
              <Brain className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-2xl">Recall</span>
          </div>
          <Button variant="hero" onClick={() => navigate('/auth')}>
            Get Started
          </Button>
        </nav>

        <div className="relative container max-w-6xl mx-auto px-4 pt-20 pb-32 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent mb-6 text-sm font-medium">
            <Sparkles className="h-4 w-4" />
            AI-Powered Personal Memory
          </div>
          
          <h1 className="text-5xl md:text-7xl font-display font-bold mb-6 leading-tight">
            Your second brain.
            <br />
            <span className="text-gradient">Always accessible.</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Store notes, links, screenshots, and documents. Find anything instantly using natural language search powered by AI.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button variant="hero" size="xl" onClick={() => navigate('/auth')}>
              Start for Free
            </Button>
            <Button variant="outline" size="xl">
              See How It Works
            </Button>
          </div>

          {/* Floating preview */}
          <div className="relative mt-16 max-w-3xl mx-auto">
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10" />
            <div className="glass-card rounded-2xl p-6 shadow-2xl">
              <div className="flex items-center gap-3 px-4 py-3 bg-muted rounded-xl mb-4">
                <Search className="h-5 w-5 text-muted-foreground" />
                <span className="text-muted-foreground">Where did I save that internship screenshot?</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-card rounded-lg border border-accent/30 shadow-glow">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <FileText className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-sm">Internship Application Notes</p>
                    <p className="text-xs text-muted-foreground">Contains: "Google internship screenshot..."</p>
                  </div>
                  <span className="ml-auto text-xs bg-accent/20 text-accent px-2 py-1 rounded-full">98% match</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-card rounded-lg border border-border">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Link className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-sm">Summer Internship Links</p>
                    <p className="text-xs text-muted-foreground">Collection of application links...</p>
                  </div>
                  <span className="ml-auto text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">82% match</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section className="py-24 bg-muted/30">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              Everything you save, instantly searchable
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Stop digging through folders. Just ask what you're looking for.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: FileText,
                title: 'Notes & Ideas',
                description: 'Capture thoughts, meeting notes, and ideas. All fully searchable by meaning, not just keywords.',
              },
              {
                icon: Link,
                title: 'Links & Resources',
                description: 'Save articles, documentation, and resources. Find them later by describing what you need.',
              },
              {
                icon: Search,
                title: 'Semantic Search',
                description: 'Our AI understands context. Search "that React tutorial about hooks" and find exactly what you meant.',
              },
            ].map(({ icon: Icon, title, description }) => (
              <div key={title} className="glass-card rounded-2xl p-6 text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-accent/10 mb-4">
                  <Icon className="h-7 w-7 text-accent" />
                </div>
                <h3 className="text-xl font-display font-semibold mb-2">{title}</h3>
                <p className="text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="container max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-6">
            <Brain className="h-8 w-8 text-primary-foreground" />
          </div>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
            Ready to remember everything?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join thousands of people who never lose track of important information.
          </p>
          <Button variant="hero" size="xl" onClick={() => navigate('/auth')}>
            Get Started — It's Free
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="container max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">© 2026 Recall. All rights reserved.</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Built with AI-powered semantic search
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
