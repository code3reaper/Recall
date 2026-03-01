import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, userId } = await req.json();

    if (!query || !userId) {
      return new Response(
        JSON.stringify({ error: "query and userId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Step 1: Fetch candidate chunks via keyword pre-filter + recent chunks
    const queryWords = query.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2);
    
    // Get chunks that match keywords OR are recent
    const { data: allChunks, error: chunksError } = await supabase
      .from("memory_chunks")
      .select("id, memory_id, chunk_text, chunk_index")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (chunksError) {
      console.error("Error fetching chunks:", chunksError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch memory chunks" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!allChunks || allChunks.length === 0) {
      // Fallback: search directly in memories table
      const { data: directResults } = await supabase
        .from("memories")
        .select("*")
        .eq("user_id", userId)
        .or(`title.ilike.%${query}%,content.ilike.%${query}%,extracted_text.ilike.%${query}%`)
        .order("created_at", { ascending: false })
        .limit(10);

      if (directResults && directResults.length > 0) {
        const results = directResults.map((m) => ({
          memory_id: m.id,
          chunk_id: m.id,
          chunk_text: (m.content || m.extracted_text || m.title).slice(0, 300),
          similarity: 0.8,
        }));
        return new Response(
          JSON.stringify({ results }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ results: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Pre-score chunks with keyword matching to narrow candidates
    const scoredChunks = allChunks.map((chunk) => {
      const text = chunk.chunk_text.toLowerCase();
      let keywordScore = 0;
      for (const word of queryWords) {
        if (text.includes(word)) keywordScore++;
      }
      return { ...chunk, keywordScore };
    });

    // Sort by keyword relevance, take top 30 candidates for AI reranking
    scoredChunks.sort((a, b) => b.keywordScore - a.keywordScore);
    const candidates = scoredChunks.slice(0, 30);

    // Step 3: Use AI to semantically rerank candidates
    const rankedResults = await rerankWithAI(query, candidates, lovableApiKey);

    return new Response(
      JSON.stringify({ results: rankedResults }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error searching memories:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

interface ChunkCandidate {
  id: string;
  memory_id: string;
  chunk_text: string;
  chunk_index: number;
  keywordScore: number;
}

async function rerankWithAI(
  query: string,
  candidates: ChunkCandidate[],
  apiKey: string
): Promise<{ memory_id: string; chunk_id: string; chunk_text: string; similarity: number }[]> {
  if (candidates.length === 0) return [];

  // If all candidates have 0 keyword score and there are many, just return top by recency
  const hasKeywordMatches = candidates.some(c => c.keywordScore > 0);
  
  // Build numbered list for AI
  const numberedChunks = candidates
    .map((c, i) => `[${i}] ${c.chunk_text.slice(0, 200)}`)
    .join("\n\n");

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `You are a search relevance ranker. Given a search query and numbered text chunks, return ONLY a JSON array of the indices of the most relevant chunks, ordered by relevance (most relevant first). Return at most 10 indices. Output ONLY the JSON array of numbers, nothing else. Example: [3, 0, 7, 1]`
          },
          {
            role: "user",
            content: `Search query: "${query}"\n\nChunks:\n${numberedChunks}`
          }
        ],
        temperature: 0,
      }),
    });

    if (!response.ok) {
      console.error("AI reranking error:", response.status);
      // Fallback: return keyword-scored results
      return fallbackResults(candidates);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse the ranked indices
    const jsonMatch = content.match(/\[[\d\s,]*\]/);
    if (!jsonMatch) {
      console.error("Could not parse AI ranking response:", content);
      return fallbackResults(candidates);
    }

    const rankedIndices: number[] = JSON.parse(jsonMatch[0]);
    const results: { memory_id: string; chunk_id: string; chunk_text: string; similarity: number }[] = [];
    const seen = new Set<string>();

    for (let rank = 0; rank < rankedIndices.length; rank++) {
      const idx = rankedIndices[rank];
      if (idx < 0 || idx >= candidates.length) continue;
      const chunk = candidates[idx];
      
      // Deduplicate by memory_id
      if (seen.has(chunk.memory_id)) continue;
      seen.add(chunk.memory_id);

      results.push({
        memory_id: chunk.memory_id,
        chunk_id: chunk.id,
        chunk_text: chunk.chunk_text,
        similarity: Math.max(0.5, 1 - rank * 0.08), // Decreasing similarity score by rank
      });
    }

    return results;
  } catch (error) {
    console.error("AI reranking failed:", error);
    return fallbackResults(candidates);
  }
}

function fallbackResults(candidates: ChunkCandidate[]) {
  const seen = new Set<string>();
  return candidates
    .filter(c => {
      if (seen.has(c.memory_id)) return false;
      seen.add(c.memory_id);
      return true;
    })
    .slice(0, 10)
    .map((c, i) => ({
      memory_id: c.memory_id,
      chunk_id: c.id,
      chunk_text: c.chunk_text,
      similarity: Math.max(0.3, 1 - i * 0.07),
    }));
}
