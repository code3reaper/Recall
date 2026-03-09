import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt, style = "modern" } = await req.json();
    if (!prompt) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const imagePrompt = `Professional presentation slide image: ${prompt}. Style: ${style}, clean, high-quality, suitable for a business presentation background or illustration. No text in the image.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-image-preview",
        messages: [{ role: "user", content: imagePrompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Usage limit reached. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log("AI response keys:", JSON.stringify(Object.keys(data)));
    
    // Try multiple response formats
    let imageUrl: string | undefined;
    
    // Format 1: content array with image_url items
    const content = data.choices?.[0]?.message?.content;
    if (Array.isArray(content)) {
      const imageItem = content.find((c: any) => c.type === 'image_url');
      imageUrl = imageItem?.image_url?.url;
    }
    
    // Format 2: inline_data in parts
    if (!imageUrl && Array.isArray(content)) {
      const inlineItem = content.find((c: any) => c.inline_data);
      if (inlineItem?.inline_data) {
        imageUrl = `data:${inlineItem.inline_data.mime_type};base64,${inlineItem.inline_data.data}`;
      }
    }

    // Format 3: direct images array
    if (!imageUrl) {
      const img = data.choices?.[0]?.message?.images?.[0];
      imageUrl = img?.image_url?.url || img?.url;
    }

    if (!imageUrl) {
      console.error("Full AI response:", JSON.stringify(data).substring(0, 2000));
      throw new Error("No image generated - unexpected response format");
    }

    return new Response(JSON.stringify({ imageUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-slide-image error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
