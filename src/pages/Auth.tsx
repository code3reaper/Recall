import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { Loader2, Brain, Sparkles, ArrowLeft } from 'lucide-react';
import { z } from 'zod';

const authSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = authSchema.safeParse({ email, password });
    if (!result.success) {
      toast({
        title: 'Validation Error',
        description: result.error.errors[0].message,
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    if (isLogin) {
      const { error } = await signIn(email, password);
      if (error) {
        toast({
          title: 'Sign in failed',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        navigate('/');
      }
    } else {
      const { error } = await signUp(email, password);
      if (error) {
        let message = error.message;
        if (error.message.includes('already registered')) {
          message = 'This email is already registered. Try signing in instead.';
        }
        toast({
          title: 'Sign up failed',
          description: message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Check your email',
          description: 'We sent you a confirmation link to verify your account.',
        });
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-hero-gradient items-center justify-center p-12 relative">
        <Link 
          to="/" 
          className="absolute top-6 left-6 flex items-center gap-2 text-primary-foreground/70 hover:text-primary-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm font-medium">Back to Home</span>
        </Link>
        <div className="max-w-md text-center">
          <Link to="/" className="inline-block">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-accent/20 backdrop-blur-sm mb-8 animate-float hover:scale-105 transition-transform">
              <Brain className="h-10 w-10 text-accent" />
            </div>
          </Link>
          <h1 className="text-4xl font-display font-bold text-primary-foreground mb-4">
            Recall
          </h1>
          <p className="text-lg text-primary-foreground/80 mb-8">
            Your personal memory bank. Store notes, links, and documents. Find anything instantly with AI-powered semantic search.
          </p>
          <div className="flex items-center justify-center gap-2 text-primary-foreground/60">
            <Sparkles className="h-5 w-5" />
            <span className="text-sm">Powered by semantic AI</span>
          </div>
        </div>
      </div>

      {/* Right side - Auth form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Link to="/" className="lg:hidden flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-medium">Back to Home</span>
          </Link>
          <div className="lg:hidden text-center mb-8">
            <Link to="/" className="inline-block">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-4 hover:scale-105 transition-transform">
                <Brain className="h-8 w-8 text-primary-foreground" />
              </div>
            </Link>
            <h1 className="text-3xl font-display font-bold">Recall</h1>
          </div>

          <div className="glass-card rounded-2xl p-8">
            <h2 className="text-2xl font-display font-semibold text-center mb-2">
              {isLogin ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="text-muted-foreground text-center mb-8">
              {isLogin
                ? 'Sign in to access your memories'
                : 'Start building your personal memory bank'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="h-12"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-12"
                  required
                />
              </div>

              <Button
                type="submit"
                variant="hero"
                size="lg"
                className="w-full"
                disabled={loading}
              >
                {loading && <Loader2 className="h-5 w-5 animate-spin" />}
                {isLogin ? 'Sign In' : 'Create Account'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {isLogin
                  ? "Don't have an account? Sign up"
                  : 'Already have an account? Sign in'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
