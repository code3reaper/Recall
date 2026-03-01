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
    const { memoryId } = await req.json();

    if (!memoryId) {
      return new Response(
        JSON.stringify({ error: "memoryId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: memory, error: memoryError } = await supabase
      .from("memories")
      .select("*")
      .eq("id", memoryId)
      .single();

    if (memoryError || !memory) {
      console.error("Memory not found:", memoryError);
      return new Response(
        JSON.stringify({ error: "Memory not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let textToEmbed = memory.extracted_text || memory.content || memory.title || "";
    let extractedText = "";

    // Handle image OCR
    if (memory.type === "image" && memory.file_path && !memory.extracted_text) {
      console.log("Processing image for OCR:", memory.file_path);
      try {
        extractedText = await extractTextFromFile(supabase, memory.file_path, lovableApiKey, "image");
        if (extractedText) {
          textToEmbed = extractedText;
          await supabase.from("memories").update({ extracted_text: extractedText }).eq("id", memoryId);
        }
      } catch (e) {
        console.error("Image OCR failed:", e);
      }
    }

    // Handle PDF text extraction
    if (memory.type === "pdf" && memory.file_path && !memory.extracted_text) {
      console.log("Processing PDF:", memory.file_path);
      try {
        extractedText = await extractTextFromFile(supabase, memory.file_path, lovableApiKey, "pdf");
        if (extractedText) {
          textToEmbed = extractedText;
          await supabase.from("memories").update({ extracted_text: extractedText }).eq("id", memoryId);
        }
      } catch (e) {
        console.error("PDF extraction failed:", e);
      }
    }

    if (!textToEmbed.trim()) {
      return new Response(
        JSON.stringify({ success: true, message: "No text to process", extractedText }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Split text into chunks
    const chunks = splitIntoChunks(textToEmbed, 500, 50);

    // Delete existing chunks
    await supabase.from("memory_chunks").delete().eq("memory_id", memoryId);

    // Store chunks with simple embeddings (search uses AI reranking anyway)
    for (let i = 0; i < chunks.length; i++) {
      const embedding = generateSimpleEmbedding(chunks[i]);
      await supabase.from("memory_chunks").insert({
        memory_id: memoryId,
        user_id: memory.user_id,
        chunk_index: i,
        chunk_text: chunks[i],
        embedding: JSON.stringify(embedding),
      });
    }

    console.log(`Processed memory ${memoryId}: ${chunks.length} chunks created`);

    return new Response(
      JSON.stringify({ success: true, chunksProcessed: chunks.length, extractedText: extractedText || undefined }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing memory:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function extractTextFromFile(
  supabase: any,
  filePath: string,
  apiKey: string,
  type: "image" | "pdf"
): Promise<string> {
  const { data: fileData, error: downloadError } = await supabase.storage
    .from("memories")
    .download(filePath);

  if (downloadError || !fileData) {
    console.error("Error downloading file:", downloadError);
    return "";
  }

  const arrayBuffer = await fileData.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  
  // Convert to base64 in chunks to avoid stack overflow
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.slice(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  const base64 = btoa(binary);

  const mimeType = type === "pdf" ? "application/pdf" : 
    filePath.endsWith(".png") ? "image/png" : "image/jpeg";

  const prompt = type === "pdf"
    ? "Extract ALL text content from this PDF document. Preserve structure - include headings, paragraphs, lists, tables. Be thorough."
    : "Extract ALL text visible in this image. Include headings, paragraphs, labels, captions. If no text, describe the image.";

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } },
          ],
        },
      ],
      temperature: 0,
      max_tokens: 8000,
    }),
  });

  if (!response.ok) {
    console.error("AI extraction error:", response.status, await response.text());
    return "";
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

function splitIntoChunks(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    chunks.push(text.slice(start, Math.min(start + chunkSize, text.length)));
    start += chunkSize - overlap;
  }
  return chunks.filter((c) => c.trim().length > 0);
}

function generateSimpleEmbedding(text: string): number[] {
  const embedding = new Array(768).fill(0);
  const normalized = text.toLowerCase();
  for (let i = 0; i < normalized.length && i < 768; i++) {
    embedding[i % 768] += (normalized.charCodeAt(i) - 96) / 26;
  }
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    for (let i = 0; i < 768; i++) embedding[i] /= magnitude;
  }
  return embedding;
}
