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

    // Generate embedding for the query
    const queryEmbedding = await generateQueryEmbedding(query, lovableApiKey);

    if (!queryEmbedding) {
      return new Response(
        JSON.stringify({ error: "Failed to generate query embedding" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Perform semantic search using the match_memories function
    // Convert embedding array to PostgreSQL vector string format
    const embeddingString = `[${queryEmbedding.join(",")}]`;
    
    const { data: results, error: searchError } = await supabase.rpc("match_memories", {
      query_embedding: embeddingString,
      match_user_id: userId,
      match_threshold: 0.1, // Lower threshold for better recall
      match_count: 10,
    });

    if (searchError) {
      console.error("Search error:", searchError);
      return new Response(
        JSON.stringify({ error: "Search failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ results: results || [] }),
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

async function generateQueryEmbedding(query: string, apiKey: string): Promise<number[] | null> {
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: "You are an embedding generator. Given a search query, output ONLY a JSON array of 768 floating point numbers between -1 and 1 that semantically represent the query for similarity matching. Output nothing else, just the raw JSON array."
          },
          {
            role: "user",
            content: `Generate a semantic embedding for this search query: "${query}"`
          }
        ],
        temperature: 0,
      }),
    });

    if (!response.ok) {
      console.error("AI gateway error:", response.status);
      return generateSimpleEmbedding(query);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    try {
      const embedding = JSON.parse(content);
      if (Array.isArray(embedding) && embedding.length === 768) {
        return embedding;
      }
    } catch {
      // If parsing fails, use simple embedding
    }
    
    return generateSimpleEmbedding(query);
  } catch (error) {
    console.error("Error generating query embedding:", error);
    return generateSimpleEmbedding(query);
  }
}

function generateSimpleEmbedding(text: string): number[] {
  const embedding = new Array(768).fill(0);
  const normalizedText = text.toLowerCase();
  
  for (let i = 0; i < normalizedText.length && i < 768; i++) {
    const charCode = normalizedText.charCodeAt(i);
    embedding[i % 768] += (charCode - 96) / 26;
  }
  
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    for (let i = 0; i < 768; i++) {
      embedding[i] /= magnitude;
    }
  }
  
  return embedding;
}
