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
    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "userId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all memories for this user that don't have chunks yet
    const { data: memories, error: memoriesError } = await supabase
      .from("memories")
      .select("id, title, content, extracted_text, type")
      .eq("user_id", userId);

    if (memoriesError) {
      console.error("Error fetching memories:", memoriesError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch memories" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get existing chunks to know which memories are already processed
    const { data: existingChunks } = await supabase
      .from("memory_chunks")
      .select("memory_id")
      .eq("user_id", userId);

    const processedMemoryIds = new Set(existingChunks?.map(c => c.memory_id) || []);
    const memoriesToProcess = memories?.filter(m => !processedMemoryIds.has(m.id)) || [];

    console.log(`Found ${memoriesToProcess.length} memories to process`);

    let processed = 0;
    let failed = 0;

    for (const memory of memoriesToProcess) {
      try {
        const textToEmbed = memory.extracted_text || memory.content || memory.title || "";
        
        if (!textToEmbed.trim()) {
          console.log(`Skipping memory ${memory.id}: no text`);
          continue;
        }

        // Split text into chunks
        const chunks = splitIntoChunks(textToEmbed, 500, 50);

        // Generate embeddings and store chunks
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          const embedding = await generateEmbedding(chunk, lovableApiKey);
          
          if (embedding) {
            const embeddingString = `[${embedding.join(",")}]`;
            await supabase.from("memory_chunks").insert({
              memory_id: memory.id,
              user_id: userId,
              chunk_index: i,
              chunk_text: chunk,
              embedding: embeddingString,
            });
          }
        }

        processed++;
        console.log(`Processed memory ${memory.id}: ${chunks.length} chunks`);
      } catch (err) {
        console.error(`Failed to process memory ${memory.id}:`, err);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed,
        failed,
        total: memoriesToProcess.length
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in batch processing:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function splitIntoChunks(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start += chunkSize - overlap;
  }

  return chunks.filter((chunk) => chunk.trim().length > 0);
}

async function generateEmbedding(text: string, apiKey: string): Promise<number[] | null> {
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
            content: "You are an embedding generator. Given text, output ONLY a JSON array of 768 floating point numbers between -1 and 1 that semantically represent the text. Output nothing else, just the raw JSON array."
          },
          {
            role: "user",
            content: `Generate a semantic embedding for this text: "${text.slice(0, 1000)}"`
          }
        ],
        temperature: 0,
      }),
    });

    if (!response.ok) {
      console.error("AI gateway error:", response.status);
      return generateSimpleEmbedding(text);
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
    
    return generateSimpleEmbedding(text);
  } catch (error) {
    console.error("Error generating embedding:", error);
    return generateSimpleEmbedding(text);
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
