# NoteRecall - AI-Powered Personal Knowledge Management

NoteRecall is an intelligent personal knowledge management application that helps you capture, organize, and retrieve your memories, notes, and ideas using AI-powered features.

## 🌟 Features

### Core Features
- **Memory Management**: Store notes, PDFs, voice memos, images, and bookmarks
- **AI-Powered Chat**: Context-aware chat assistant that uses your saved memories
- **Semantic Search**: Find memories using natural language queries with AI reranking
- **Collections**: Organize memories into custom collections
- **Math Notes**: Interactive canvas for solving math problems with LaTeX rendering
- **AI Presentations**: Generate slide decks with AI-generated content and images
- **Sharing**: Share memories via public links with expiration

### AI Capabilities
- **Memory Chat**: Ask questions about your stored memories
- **Math Solving**: Solve handwritten or typed math problems
- **Presentation Generation**: Auto-create slides from topics
- **Image Generation**: Create presentation images from text prompts
- **Audio Transcription**: Convert voice memos to text
- **OCR**: Extract text from images and PDFs

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **npm** or **bun** package manager
- **Git** - [Download here](https://git-scm.com/)

### Installation

#### Step 1: Clone the Repository

```bash
git clone <YOUR_GIT_URL>
cd <PROJECT_NAME>
```

#### Step 2: Install Dependencies

Using npm:
```bash
npm install
```

Using bun:
```bash
bun install
```

#### Step 3: Set Up Environment Variables

The project uses Lovable Cloud (managed Supabase backend). The environment variables are automatically configured, but if you need to set them manually:

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://wjtpedozqxkjfqxhdfdw.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqdHBlZG96cXhramZxeGhkZmR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNzM5MDksImV4cCI6MjA4Nzk0OTkwOX0.R2kjRVBkD3eOGMw3rKxCnng3XXAB-jxQKdGfEiNps1o
VITE_SUPABASE_PROJECT_ID=wjtpedozqxkjfqxhdfdw
```

**Note**: These are public/publishable keys safe for client-side use. The actual AI API keys are managed server-side by Lovable Cloud.

#### Step 4: Start the Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173` (or another port if 5173 is in use).

## 🔧 Backend Setup (Lovable Cloud)

This project uses **Lovable Cloud** for backend services including:
- PostgreSQL Database
- Authentication
- File Storage
- AI Gateway (Gemini, GPT models)
- Edge Functions

### Database Schema

The app uses these main tables:
- `memories` - Stores all memory entries
- `memory_chunks` - Text chunks with embeddings for semantic search
- `collections` - User-defined collections
- `memory_collections` - Junction table for many-to-many relationship
- `shared_memories` - Public sharing links

### Edge Functions

Backend logic is implemented via Supabase Edge Functions:
- `chat-with-memories` - AI chat with memory context
- `process-memory` - Text extraction and chunking
- `batch-process-memories` - Batch embedding generation
- `search-memories` - Semantic search with reranking
- `analyze-math` - Math problem solving from images
- `transcribe-audio` - Voice memo transcription
- `generate-presentation` - Slide content generation
- `generate-slide-image` - AI image generation for slides
- `get-shared-memory` - Public memory retrieval

### AI Models Used

| Feature | Model |
|---------|-------|
| Chat, OCR, Math, Audio | `google/gemini-2.5-flash` |
| Slide Image Generation | `google/gemini-2.5-flash-image` |
| Search Reranking | `google/gemini-2.5-flash-lite` |

## 📁 Project Structure

```
noterecall/
├── public/                 # Static assets
├── src/
│   ├── components/         # React components
│   │   ├── ui/            # shadcn/ui components
│   │   └── ...            # Feature components
│   ├── hooks/             # Custom React hooks
│   ├── integrations/        # Third-party integrations
│   │   └── supabase/      # Supabase client & types
│   ├── lib/               # Utility functions
│   ├── pages/             # Page components
│   ├── types/             # TypeScript type definitions
│   └── ...
├── supabase/
│   ├── functions/         # Edge Functions
│   └── config.toml        # Supabase config
├── .env                   # Environment variables
├── index.html             # HTML entry point
├── package.json           # Dependencies
├── tailwind.config.ts     # Tailwind CSS config
├── tsconfig.json          # TypeScript config
└── vite.config.ts         # Vite config
```

## 🛠️ Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run test` | Run tests |
| `npm run lint` | Run ESLint |

## 🚢 Deployment

### Deploy via Lovable (Recommended)

1. Open your project in Lovable
2. Click **Share → Publish**
3. Your app will be deployed to a public URL

### Deploy to Custom Domain

1. Go to **Project → Settings → Domains**
2. Click **Connect Domain**
3. Follow the DNS configuration instructions

## 🔐 Security

- **Row Level Security (RLS)** is enabled on all tables
- Users can only access their own data
- Shared memories use secure tokens with optional expiration
- AI API keys are stored server-side only
- File uploads are validated and stored securely

## 🐛 Troubleshooting

### Common Issues

**Build fails with "Cannot find module"**
- Run `npm install` again
- Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`

**Supabase connection errors**
- Check your `.env` file has correct values
- Verify you're connected to Lovable Cloud in the project settings

**AI features not working**
- Ensure Lovable Cloud is enabled
- Check that you have AI credits in your workspace

**Port already in use**
- The dev server will automatically use the next available port
- Or specify a port: `npm run dev -- --port 3000`

## 📄 License

This project is built with Lovable. See [Lovable Terms](https://lovable.dev/terms) for usage terms.

## 🤝 Support

- **Documentation**: [https://docs.lovable.dev](https://docs.lovable.dev)
- **Discord Community**: [Join here](https://discord.com/channels/1119885301872070706/1280461670979993613)
- **Email Support**: support@lovable.dev

---

Built with ❤️ using [Lovable](https://lovable.dev)
