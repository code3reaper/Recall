import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { topic, numSlides = 6 } = await req.json();
    if (!topic) {
      return new Response(JSON.stringify({ error: "Topic is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a professional presentation designer. Generate engaging, well-structured slide content with varied layouts. Use different slide types for visual variety. For slides that would benefit from imagery, include an imagePrompt describing what image would complement the content. Return structured data using the provided tool.`,
          },
          {
            role: "user",
            content: `Create a ${numSlides}-slide presentation about: "${topic}". 
Use a variety of slide layouts:
- "title" for the opening slide (with subtitle)
- "content" for standard bullet-point slides  
- "two-column" for comparing two sets of points
- "image-left" or "image-right" for slides where an image would enhance the content
- "quote" for impactful quotes or key takeaways
- "big-number" for statistics or key metrics
- "conclusion" for the closing slide

Each slide should have a clear title. Include imagePrompt for image slides describing the ideal image.
Make content informative, concise, and professionally structured.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_presentation",
              description: "Create a structured presentation with slides",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string", description: "Overall presentation title" },
                  slides: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: {
                          type: "string",
                          enum: ["title", "content", "two-column", "image-left", "image-right", "quote", "big-number", "conclusion"],
                          description: "Slide layout type",
                        },
                        title: { type: "string", description: "Slide title" },
                        subtitle: { type: "string", description: "Subtitle (for title slides)" },
                        bullets: {
                          type: "array",
                          items: { type: "string" },
                          description: "Bullet points (left column for two-column)",
                        },
                        bullets2: {
                          type: "array",
                          items: { type: "string" },
                          description: "Right column bullets for two-column layout",
                        },
                        quote: { type: "string", description: "Quote text for quote slides" },
                        quoteAuthor: { type: "string", description: "Quote attribution" },
                        bigNumber: { type: "string", description: "The big stat/number" },
                        bigNumberLabel: { type: "string", description: "Label for the big number" },
                        imagePrompt: { type: "string", description: "AI image generation prompt for image slides" },
                        notes: { type: "string", description: "Speaker notes" },
                      },
                      required: ["type", "title"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["title", "slides"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_presentation" } },
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
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const presentation = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(presentation), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-presentation error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
