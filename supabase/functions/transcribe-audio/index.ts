import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { memoryId, filePath } = await req.json();

    if (!memoryId || !filePath) {
      return new Response(
        JSON.stringify({ error: "memoryId and filePath are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Download the audio file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("memories")
      .download(filePath);

    if (downloadError || !fileData) {
      console.error("Error downloading file:", downloadError);
      return new Response(
        JSON.stringify({ error: "Failed to download audio file" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Convert blob to base64
    const arrayBuffer = await fileData.arrayBuffer();
    const base64Audio = btoa(
      String.fromCharCode(...new Uint8Array(arrayBuffer))
    );

    // Use Gemini for transcription (it supports audio)
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a transcription assistant. Transcribe the audio accurately and return only the transcribed text. If there are multiple speakers, indicate speaker changes. Keep the transcription clean and readable."
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Please transcribe this audio recording accurately:"
              },
              {
                type: "input_audio",
                input_audio: {
                  data: base64Audio,
                  format: filePath.endsWith(".mp3") ? "mp3" : filePath.endsWith(".wav") ? "wav" : "mp3"
                }
              }
            ]
          }
        ],
        temperature: 0.1,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      // Fallback: return a placeholder if transcription fails
      const placeholderText = "Voice memo - transcription not available. Audio file uploaded successfully.";
      
      await supabase
        .from("memories")
        .update({ extracted_text: placeholderText })
        .eq("id", memoryId);

      return new Response(
        JSON.stringify({ 
          transcript: placeholderText,
          status: "fallback"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const transcript = data.choices?.[0]?.message?.content || "Transcription not available";

    // Update the memory with the transcript
    const { error: updateError } = await supabase
      .from("memories")
      .update({ 
        extracted_text: transcript,
        content: transcript
      })
      .eq("id", memoryId);

    if (updateError) {
      console.error("Error updating memory:", updateError);
    }

    return new Response(
      JSON.stringify({ 
        transcript,
        status: "success"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in transcribe-audio:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
