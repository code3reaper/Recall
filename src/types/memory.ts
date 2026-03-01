export type MemoryType = 'note' | 'link' | 'image' | 'pdf' | 'voice_memo' | 'bookmark' | 'decision';

export type DecisionOutcome = 'pending' | 'worked' | 'didnt_work' | 'mixed';

export interface Memory {
  id: string;
  user_id: string;
  type: MemoryType;
  title: string;
  content?: string;
  url?: string;
  file_path?: string;
  extracted_text?: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
  created_at: string;
  updated_at: string;
  // Decision-specific fields
  reasoning?: string;
  alternatives_rejected?: { name: string; reason: string }[];
  outcome?: DecisionOutcome;
  outcome_notes?: string;
  decision_date?: string;
  // Compression fields
  compressed_content?: string;
  is_compressed?: boolean;
  compression_date?: string;
}

export interface MemoryChunk {
  id: string;
  memory_id: string;
  user_id: string;
  chunk_index: number;
  chunk_text: string;
  embedding?: string | null;
  created_at: string;
}

export interface SearchResult {
  memory_id: string;
  chunk_id: string;
  chunk_text: string;
  similarity: number;
  memory?: Memory;
}

export interface CreateMemoryInput {
  type: MemoryType;
  title: string;
  content?: string;
  url?: string;
  file?: File;
  tags?: string[];
}

export interface CreateDecisionInput {
  title: string;
  reasoning: string;
  alternatives: { name: string; reason: string }[];
  tags?: string[];
  decision_date?: string;
}

export interface SharedMemory {
  id: string;
  memory_id: string;
  user_id: string;
  share_token: string;
  is_active: boolean;
  created_at: string;
  expires_at?: string;
  view_count: number;
}
