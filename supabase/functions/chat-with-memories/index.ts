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
    const { query, userId, command } = await req.json();

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

    // Detect command type from query
    const detectedCommand = detectCommand(query);
    const effectiveCommand = command || detectedCommand;

    // Fetch relevant memories based on command type
    let relevantContext = "";
    let memories: any[] = [];

    if (effectiveCommand === 'summarize' || effectiveCommand === 'compare' || effectiveCommand === 'insights') {
      // For these commands, fetch more memories for comprehensive analysis
      const { data: allMemories } = await supabase
        .from("memories")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      memories = allMemories || [];
      
      // Filter by topic if mentioned in query
      const topicMatches = query.toLowerCase();
      const filteredMemories = memories.filter((m: any) => {
        const searchText = `${m.title} ${m.content || ''} ${m.extracted_text || ''} ${(m.tags || []).join(' ')}`.toLowerCase();
        return searchText.includes(topicMatches.split(' ').filter((w: string) => w.length > 3).join(' '));
      });

      const memoriesToUse = filteredMemories.length > 0 ? filteredMemories : memories.slice(0, 20);
      
      relevantContext = memoriesToUse.map((m: any) => {
        const content = m.content || m.extracted_text || "";
        const tags = m.tags?.length ? `[Tags: ${m.tags.join(', ')}]` : '';
        return `[${m.type.toUpperCase()}] "${m.title}" ${tags}\n${content.slice(0, 800)}`;
      }).join("\n\n---\n\n");
    } else {
      // Fetch all user memories and use AI to pick the most relevant ones
      const { data: allMemories } = await supabase
        .from("memories")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      const allMems = allMemories || [];

      if (allMems.length > 0) {
        // Build candidate list for AI reranking
        const candidates = allMems.map((m: any, i: number) => {
          const content = m.content || m.extracted_text || "";
          return `[${i}] [${m.type}] "${m.title}" - ${content.slice(0, 200)}`;
        }).join("\n");

        // Use AI to pick the most relevant memories
        try {
          const rankResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${lovableApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-lite",
              messages: [
                { role: "system", content: "You select the most relevant items for a query. Return ONLY a JSON array of indices, e.g. [0,3,5]. Max 8 items." },
                { role: "user", content: `Query: "${query}"\n\nCandidates:\n${candidates}` },
              ],
              temperature: 0,
            }),
          });

          if (rankResponse.ok) {
            const rankData = await rankResponse.json();
            const rankContent = rankData.choices?.[0]?.message?.content || "[]";
            const match = rankContent.match(/\[[\d,\s]+\]/);
            if (match) {
              const indices: number[] = JSON.parse(match[0]);
              const selected = indices.filter(i => i >= 0 && i < allMems.length).map(i => allMems[i]);
              if (selected.length > 0) {
                memories = selected;
              }
            }
          }
        } catch (e) {
          console.error("Reranking failed, using all memories:", e);
        }

        // Fallback: if reranking didn't select anything, use keyword match or all
        if (memories.length === 0) {
          const queryWords = query.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2);
          memories = allMems.filter((m: any) => {
            const text = `${m.title} ${m.content || ''} ${m.extracted_text || ''}`.toLowerCase();
            return queryWords.some((w: string) => text.includes(w));
          });
          if (memories.length === 0) memories = allMems.slice(0, 10);
        }

        relevantContext = memories.map((m: any) => {
          const content = m.content || m.extracted_text || "";
          const tags = m.tags?.length ? `[Tags: ${m.tags.join(', ')}]` : '';
          return `[${m.type.toUpperCase()}] "${m.title}" ${tags}\n${content.slice(0, 800)}`;
        }).join("\n\n---\n\n");
      }
    }

    // Build system prompt based on command
    let systemPrompt = `You are a helpful AI assistant that helps users explore and understand their saved memories (notes, links, images, PDFs, voice memos, bookmarks, decisions).
You have access to the user's memories and can answer questions about them.
Be concise, helpful, and reference specific memories when relevant.
Use markdown formatting for better readability.`;

    if (effectiveCommand === 'summarize') {
      systemPrompt = `You are an expert summarizer. Analyze the user's memories and provide a comprehensive summary.
Structure your response with:
1. **Overview** - A brief 2-3 sentence summary
2. **Key Points** - Bullet points of the most important information
3. **Themes** - Common themes or patterns you notice
4. **Recommendations** - Any actionable insights

Use markdown formatting. Be thorough but concise.`;
    } else if (effectiveCommand === 'compare') {
      systemPrompt = `You are an analyst that compares and contrasts information.
When comparing memories:
1. **Similarities** - What do these memories have in common?
2. **Differences** - How do they differ?
3. **Connections** - Any interesting relationships between them?
4. **Insights** - What can we learn from this comparison?

Use markdown tables when appropriate. Be analytical and insightful.`;
    } else if (effectiveCommand === 'insights') {
      systemPrompt = `You are an insights analyst. Extract meaningful patterns and insights from the user's memories.
Provide:
1. **Patterns** - Recurring themes, topics, or behaviors
2. **Trends** - How interests or focus areas have evolved
3. **Gaps** - Areas that might need more attention
4. **Recommendations** - Actionable suggestions based on the data

Be creative and look for non-obvious connections. Use markdown formatting.`;
    } else if (effectiveCommand === 'explain_with_notes') {
      systemPrompt = `You are a personalized learning assistant. Your job is to explain concepts using the user's OWN notes, examples, and language style.

CRITICAL RULES:
1. Reference specific notes and examples from the user's memories
2. Use analogies based on topics the user has previously saved
3. Match the user's language style and vocabulary level
4. Say things like "Based on your notes about X, you can think of this as..."
5. Connect new concepts to things the user already knows

Make the explanation feel like the user is teaching themselves. Be warm and personal.`;
    } else if (effectiveCommand === 'compress') {
      systemPrompt = `You are a compression expert. Convert long text into extremely concise bullet points.

RULES:
1. Extract ONLY the essential facts, insights, and actionable items
2. Use bullet points with clear, scannable formatting
3. Preserve key data points, dates, and numbers
4. Remove all fluff, repetition, and filler words
5. Aim for 80-90% reduction in length while keeping core meaning
6. Use bold for key terms

Output ONLY the compressed bullet points, nothing else.`;
    }

    // Generate AI response
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: relevantContext
              ? `Here are my relevant memories:\n\n${relevantContext}\n\n---\n\nMy request: ${query}`
              : `I don't have any memories directly related to this, but please help me with: ${query}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      console.error("AI gateway error:", response.status);
      return new Response(
        JSON.stringify({ 
          response: "I'm having trouble processing your request right now. Please try again." 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || "I couldn't generate a response.";

    return new Response(
      JSON.stringify({ 
        response: aiResponse,
        memoriesUsed: memories.length,
        command: effectiveCommand
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in chat-with-memories:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function detectCommand(query: string): string | null {
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes('summarize') || lowerQuery.includes('summary') || lowerQuery.includes('sum up')) {
    return 'summarize';
  }
  if (lowerQuery.includes('compare') || lowerQuery.includes('difference between') || lowerQuery.includes('vs')) {
    return 'compare';
  }
  if (lowerQuery.includes('insight') || lowerQuery.includes('pattern') || lowerQuery.includes('trend') || lowerQuery.includes('analyze')) {
    return 'insights';
  }
  if (lowerQuery.includes('explain') && (lowerQuery.includes('using my') || lowerQuery.includes('with my') || lowerQuery.includes('from my'))) {
    return 'explain_with_notes';
  }
  
  return null;
}

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
