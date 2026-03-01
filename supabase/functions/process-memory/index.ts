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

    // Fetch the memory
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
    if (memory.type === "image" && memory.file_path) {
      console.log("Processing image for OCR:", memory.file_path);
      extractedText = await extractTextFromImage(supabase, memory.file_path, lovableApiKey);
      
      if (extractedText) {
        textToEmbed = extractedText;
        // Update memory with extracted text
        await supabase
          .from("memories")
          .update({ extracted_text: extractedText })
          .eq("id", memoryId);
      }
    }

    // Handle PDF text extraction
    if (memory.type === "pdf" && memory.file_path) {
      console.log("Processing PDF for text extraction:", memory.file_path);
      extractedText = await extractTextFromPDF(supabase, memory.file_path, lovableApiKey);
      
      if (extractedText) {
        textToEmbed = extractedText;
        // Update memory with extracted text
        await supabase
          .from("memories")
          .update({ extracted_text: extractedText })
          .eq("id", memoryId);
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

    // Delete existing chunks for this memory
    await supabase
      .from("memory_chunks")
      .delete()
      .eq("memory_id", memoryId);

    // Generate embeddings and store chunks
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = await generateEmbedding(chunk, lovableApiKey);
      
      if (embedding) {
        await supabase.from("memory_chunks").insert({
          memory_id: memoryId,
          user_id: memory.user_id,
          chunk_index: i,
          chunk_text: chunk,
          embedding: embedding,
        });
      }
    }

    console.log(`Processed memory ${memoryId}: ${chunks.length} chunks created`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        chunksProcessed: chunks.length,
        extractedText: extractedText || undefined
      }),
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

async function extractTextFromImage(
  supabase: any,
  filePath: string,
  apiKey: string
): Promise<string> {
  try {
    // Download the image from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("memories")
      .download(filePath);

    if (downloadError || !fileData) {
      console.error("Error downloading image:", downloadError);
      return "";
    }

    // Convert to base64
    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    const mimeType = filePath.endsWith(".png") ? "image/png" : "image/jpeg";

    // Use Gemini for OCR via vision capabilities
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
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract ALL text visible in this image. Include everything: headings, paragraphs, labels, captions, watermarks, etc. If there's no text, describe what you see in the image. Be thorough and accurate."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64}`
                }
              }
            ]
          }
        ],
        temperature: 0,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      console.error("OCR API error:", response.status);
      return "";
    }

    const data = await response.json();
    const extractedText = data.choices?.[0]?.message?.content || "";
    console.log("OCR extracted text length:", extractedText.length);
    return extractedText;
  } catch (error) {
    console.error("Error in OCR extraction:", error);
    return "";
  }
}

async function extractTextFromPDF(
  supabase: any,
  filePath: string,
  apiKey: string
): Promise<string> {
  try {
    // Download the PDF from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("memories")
      .download(filePath);

    if (downloadError || !fileData) {
      console.error("Error downloading PDF:", downloadError);
      return "";
    }

    // Convert to base64
    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    // Use Gemini for PDF text extraction (it supports PDF as image input)
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
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract ALL text content from this PDF document. Preserve the structure as much as possible - include headings, paragraphs, lists, tables (as text), etc. Be thorough and extract every piece of text you can find."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:application/pdf;base64,${base64}`
                }
              }
            ]
          }
        ],
        temperature: 0,
        max_tokens: 8000,
      }),
    });

    if (!response.ok) {
      console.error("PDF extraction API error:", response.status);
      return "";
    }

    const data = await response.json();
    const extractedText = data.choices?.[0]?.message?.content || "";
    console.log("PDF extracted text length:", extractedText.length);
    return extractedText;
  } catch (error) {
    console.error("Error in PDF extraction:", error);
    return "";
  }
}

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
