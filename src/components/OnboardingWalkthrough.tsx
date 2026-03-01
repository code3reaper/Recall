import { useState, useEffect } from 'react';
import { Upload, Sparkles, Search, X, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface OnboardingStep {
  title: string;
  description: string;
  icon: React.ElementType;
  highlight: string;
}

const steps: OnboardingStep[] = [
  {
    title: 'Capture',
    description: 'Add notes, links, images, and PDFs. We automatically extract and index all text content.',
    icon: Upload,
    highlight: 'Add your first memory using the "Add Memory" button',
  },
  {
    title: 'Index',
    description: 'Your memories are split into semantic chunks and embedded for intelligent search.',
    icon: Sparkles,
    highlight: 'Each memory is processed with AI to understand its meaning',
  },
  {
    title: 'Ask',
    description: 'Search naturally or chat with the AI assistant to find and summarize your knowledge.',
    icon: Search,
    highlight: 'Try searching with phrases like "my notes about..." or chat with the AI',
  },
];

export function OnboardingWalkthrough() {
  const [show, setShow] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
    if (!hasSeenOnboarding) {
      setShow(true);
    }
  }, []);

  const handleComplete = () => {
    localStorage.setItem('hasSeenOnboarding', 'true');
    setShow(false);
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  if (!show) return null;

  const step = steps[currentStep];
  const Icon = step.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={handleComplete} />

      {/* Modal */}
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-slide-up">
        {/* Close button */}
        <button
          onClick={handleComplete}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors z-10"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header with gradient */}
        <div className="bg-hero-gradient text-primary-foreground p-8 pb-12">
          <div className="flex items-center gap-2 text-sm font-medium opacity-80 mb-2">
            Welcome to Recall
          </div>
          <h2 className="text-2xl font-display font-bold">
            Your Second Brain, Powered by AI
          </h2>
        </div>

        {/* Content */}
        <div className="p-6 -mt-6">
          {/* Step indicator circles */}
          <div className="flex justify-center gap-2 mb-8">
            {steps.map((_, index) => (
              <div
                key={index}
                className={cn(
                  'w-2.5 h-2.5 rounded-full transition-all',
                  index === currentStep
                    ? 'bg-accent w-8'
                    : index < currentStep
                    ? 'bg-accent/60'
                    : 'bg-muted'
                )}
              />
            ))}
          </div>

          {/* Current step */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent-gradient shadow-glow">
              <Icon className="h-8 w-8 text-accent-foreground" />
            </div>
            <div>
              <div className="text-sm font-medium text-accent mb-1">
                Step {currentStep + 1} of {steps.length}
              </div>
              <h3 className="text-xl font-display font-semibold text-foreground">
                {step.title}
              </h3>
            </div>
            <p className="text-muted-foreground">{step.description}</p>
            <div className="bg-muted/50 rounded-lg px-4 py-3 text-sm text-foreground/80">
              💡 {step.highlight}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between mt-8">
            <Button
              variant="ghost"
              onClick={handleComplete}
              className="text-muted-foreground"
            >
              Skip tour
            </Button>
            <Button onClick={handleNext} className="gap-2">
              {currentStep < steps.length - 1 ? (
                <>
                  Next
                  <ArrowRight className="h-4 w-4" />
                </>
              ) : (
                'Get Started'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
