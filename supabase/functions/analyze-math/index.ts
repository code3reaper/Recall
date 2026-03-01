import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image, dict_of_vars } = await req.json();

    if (!image) {
      return new Response(
        JSON.stringify({ error: "image is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const dictOfVarsStr = JSON.stringify(dict_of_vars || {}, null, 2);

    const prompt = `You have been given an image with some mathematical expressions, equations, or graphical problems, and you need to solve them.
Note: Use the PEMDAS rule for solving mathematical expressions. PEMDAS stands for the Priority Order: Parentheses, Exponents, Multiplication and Division (from left to right), Addition and Subtraction (from left to right).

YOU CAN HAVE FIVE TYPES OF EQUATIONS/EXPRESSIONS IN THIS IMAGE, AND ONLY ONE CASE SHALL APPLY EVERY TIME:
Following are the cases:
1. Simple mathematical expressions like 2 + 2, 3 * 4, 5 / 6, 7 - 8, etc.: In this case, solve and return the answer in the format of a LIST OF ONE DICT [{"expr": "given expression", "result": "calculated answer"}].
2. Set of Equations like x^2 + 2x + 1 = 0, 3y + 4x = 0, etc.: In this case, solve for the given variable, and the format should be a COMMA SEPARATED LIST OF DICTS, with dict 1 as {"expr": "x", "result": 2, "assign": true} and dict 2 as {"expr": "y", "result": 5, "assign": true}.
3. Assigning values to variables like x = 4, y = 5, z = 6, etc.: In this case, assign values to variables and return another key in the dict called {"assign": true}, keeping the variable as "expr" and the value as "result" in the original dictionary. RETURN AS A LIST OF DICTS.
4. Analyzing Graphical Math problems, which are word problems represented in drawing form, such as cars colliding, trigonometric problems, problems on the Pythagorean theorem, etc. You need to return the answer in the format of a LIST OF ONE DICT [{"expr": "given expression", "result": "calculated answer"}].
5. Detecting Abstract Concepts that a drawing might show, such as love, hate, jealousy, patriotism, or a historic reference. USE THE SAME FORMAT AS OTHERS TO RETURN THE ANSWER, where "expr" will be the explanation of the drawing, and "result" will be the abstract concept.

Analyze the equation or expression in this image and return the answer according to the given rules.
Here is a dictionary of user-assigned variables. If the given expression has any of these variables, use its actual value from this dictionary accordingly: ${dictOfVarsStr}.
DO NOT USE BACKTICKS OR MARKDOWN FORMATTING.
Return ONLY a valid JSON array. Nothing else.`;

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
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: { url: image },
              },
            ],
          },
        ],
        temperature: 0,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.error("AI gateway error:", status);
      return new Response(
        JSON.stringify({ error: "AI processing failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "[]";
    
    console.log("Raw AI response:", content);

    let results = [];
    try {
      // Try to parse as JSON, handling potential markdown wrapping
      let cleanContent = content.trim();
      if (cleanContent.startsWith("```")) {
        cleanContent = cleanContent.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      }
      results = JSON.parse(cleanContent);
    } catch (e) {
      console.error("Failed to parse AI response:", e, "Content:", content);
      results = [{ expr: "Parse error", result: "Could not parse the expression", assign: false }];
    }

    // Normalize results
    const normalizedResults = results.map((r: any) => ({
      expr: String(r.expr || ""),
      result: String(r.result || ""),
      assign: Boolean(r.assign),
    }));

    return new Response(
      JSON.stringify({ data: normalizedResults, status: "success" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error analyzing math:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
