import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { MemoryType } from '@/types/memory';

interface DummyMemory {
  type: MemoryType;
  title: string;
  content?: string;
  url?: string;
  tags: string[];
  daysAgo: number;
}

const dummyMemories: DummyMemory[] = [
  // Notes
  {
    type: 'note',
    title: 'React Hooks Best Practices',
    content: `# React Hooks Best Practices

1. **Use useCallback for event handlers** passed to child components to prevent unnecessary re-renders.

2. **useMemo for expensive calculations** - Only use when you have measurable performance issues.

3. **Custom hooks for reusable logic** - Extract shared stateful logic into custom hooks.

4. **Cleanup in useEffect** - Always return a cleanup function when subscribing to events or timers.

\`\`\`jsx
useEffect(() => {
  const subscription = api.subscribe();
  return () => subscription.unsubscribe();
}, []);
\`\`\`

5. **Avoid prop drilling** - Use Context for deeply nested state.`,
    tags: ['react', 'development', 'javascript'],
    daysAgo: 2,
  },
  {
    type: 'note',
    title: 'Meeting Notes - Q1 Planning',
    content: `## Q1 Planning Meeting - January 15

**Attendees:** Sarah, Mike, Lisa, John

### Key Decisions:
- Launch new feature by end of February
- Hire 2 more frontend developers
- Focus on mobile-first approach

### Action Items:
- [ ] Sarah to prepare budget proposal
- [ ] Mike to create technical roadmap
- [ ] Lisa to schedule user interviews

### Next Steps:
Weekly standup every Monday at 10 AM`,
    tags: ['work', 'meetings', 'planning'],
    daysAgo: 5,
  },
  {
    type: 'note',
    title: 'Startup Ideas Brainstorm',
    content: `Ideas to explore:

1. AI-powered meal planning app
2. Local community marketplace
3. Skill-sharing platform for professionals
4. Sustainable product scanner
5. Mental health journaling with AI insights

Need to research market size and competition for each.`,
    tags: ['ideas', 'startup', 'brainstorm'],
    daysAgo: 10,
  },

  // Links
  {
    type: 'link',
    title: 'Tailwind CSS Documentation',
    content: 'Official Tailwind CSS documentation - great reference for utility classes and configuration.',
    url: 'https://tailwindcss.com/docs',
    tags: ['css', 'development', 'reference'],
    daysAgo: 1,
  },
  {
    type: 'link',
    title: 'The Art of Product Management',
    content: 'Excellent article on product management principles and frameworks.',
    url: 'https://www.svpg.com/inspired-how-to-create-products-customers-love/',
    tags: ['product', 'reading', 'career'],
    daysAgo: 7,
  },
  {
    type: 'link',
    title: 'TypeScript Handbook',
    content: 'Complete TypeScript documentation and tutorials.',
    url: 'https://www.typescriptlang.org/docs/handbook/',
    tags: ['typescript', 'development', 'learning'],
    daysAgo: 14,
  },

  // Bookmarks
  {
    type: 'bookmark',
    title: 'VS Code Keyboard Shortcuts',
    content: 'Must learn: Cmd+Shift+P, Cmd+P, Cmd+D, Option+Up/Down',
    url: 'https://code.visualstudio.com/shortcuts/keyboard-shortcuts-macos.pdf',
    tags: ['tools', 'productivity'],
    daysAgo: 3,
  },
  {
    type: 'bookmark',
    title: 'GitHub Actions Examples',
    content: 'Collection of useful CI/CD workflows',
    url: 'https://github.com/actions/starter-workflows',
    tags: ['devops', 'automation', 'github'],
    daysAgo: 8,
  },
  {
    type: 'bookmark',
    title: 'Design Inspiration - Dribbble',
    content: 'Dark mode UI patterns I like',
    url: 'https://dribbble.com/tags/dark_mode',
    tags: ['design', 'inspiration', 'ui'],
    daysAgo: 12,
  },

  // Voice Memos (simulated - without actual audio files)
  {
    type: 'voice_memo',
    title: 'Product Feedback Call Notes',
    content: 'Voice memo from user interview - mentioned pain points with onboarding and search functionality.',
    tags: ['feedback', 'product', 'users'],
    daysAgo: 4,
  },
  {
    type: 'voice_memo',
    title: 'Podcast Ideas',
    content: 'Quick audio note about potential podcast topics: tech trends, startup stories, developer experiences.',
    tags: ['ideas', 'content', 'personal'],
    daysAgo: 9,
  },

  // Additional variety
  {
    type: 'note',
    title: 'Book Notes: Atomic Habits',
    content: `Key takeaways from Atomic Habits by James Clear:

1. **1% Better Every Day** - Small improvements compound over time
2. **Habit Stacking** - Link new habits to existing ones
3. **Environment Design** - Make good habits obvious, bad habits invisible
4. **Identity-Based Habits** - Focus on who you want to become

Favorite quote: "You do not rise to the level of your goals. You fall to the level of your systems."`,
    tags: ['books', 'self-improvement', 'habits'],
    daysAgo: 15,
  },
  {
    type: 'note',
    title: 'Gym Workout Routine',
    content: `Monday - Chest & Triceps
- Bench Press 4x8
- Incline Dumbbell Press 3x10
- Cable Flyes 3x12
- Tricep Dips 3x12

Wednesday - Back & Biceps
- Deadlifts 4x6
- Pull-ups 4x10
- Rows 3x10
- Curls 3x12

Friday - Legs
- Squats 4x8
- Leg Press 3x12
- Lunges 3x10
- Calf Raises 4x15`,
    tags: ['fitness', 'health', 'personal'],
    daysAgo: 20,
  },
  {
    type: 'link',
    title: 'Supabase Edge Functions Guide',
    content: 'How to build and deploy edge functions with Supabase',
    url: 'https://supabase.com/docs/guides/functions',
    tags: ['supabase', 'backend', 'development'],
    daysAgo: 6,
  },
  {
    type: 'bookmark',
    title: 'MDN Web Docs - Fetch API',
    content: 'Reference for modern HTTP requests in JavaScript',
    url: 'https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API',
    tags: ['javascript', 'reference', 'web'],
    daysAgo: 11,
  },
  {
    type: 'note',
    title: 'Travel Packing List - Japan',
    content: `## Essentials
- Passport & travel docs
- Phone charger + adapter
- Portable WiFi reservation

## Clothing
- 5 t-shirts
- 2 pants
- Light jacket
- Comfortable walking shoes

## To Research
- JR Pass options
- Pocket WiFi vs SIM card
- Tokyo day trips`,
    tags: ['travel', 'planning', 'personal'],
    daysAgo: 25,
  },
];

export function useDummyData() {
  const seedDummyData = async (userId: string, forceAdd = false) => {
    try {
      // Check if user already has memories (skip if forceAdd)
      if (!forceAdd) {
        const { data: existingMemories } = await supabase
          .from('memories')
          .select('id')
          .eq('user_id', userId)
          .limit(1);

        if (existingMemories && existingMemories.length > 0) {
          toast({
            title: 'Data already exists',
            description: 'You already have memories. Click again to add anyway.',
          });
          return { success: false, hasExisting: true };
        }
      }

      // Create memories with varied dates
      const now = new Date();
      const memoriesToInsert = dummyMemories.map((memory) => {
        const createdAt = new Date(now);
        createdAt.setDate(createdAt.getDate() - memory.daysAgo);
        createdAt.setHours(Math.floor(Math.random() * 12) + 8); // Random hour between 8-20
        createdAt.setMinutes(Math.floor(Math.random() * 60));

        return {
          user_id: userId,
          type: memory.type,
          title: memory.title,
          content: memory.content,
          url: memory.url,
          extracted_text: memory.content,
          tags: memory.tags,
          created_at: createdAt.toISOString(),
          updated_at: createdAt.toISOString(),
        };
      });

      const { error } = await supabase
        .from('memories')
        .insert(memoriesToInsert);

      if (error) {
        throw error;
      }

      toast({
        title: 'Demo data added! 🎉',
        description: `Added ${memoriesToInsert.length} sample memories to explore.`,
      });

      return { success: true };
    } catch (error) {
      console.error('Error seeding dummy data:', error);
      toast({
        title: 'Error adding demo data',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
      return { success: false };
    }
  };

  return { seedDummyData };
}
