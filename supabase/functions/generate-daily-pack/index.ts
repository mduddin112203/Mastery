// Generate today's daily pack: try Grok AI first (personalized), fallback to seed bank via RPC.
// Requires: GROK_API_KEY (optional), SUPABASE_ANON_KEY (for RPC fallback) in Supabase secrets.
// Pass user JWT in Authorization header.
/// <reference path="./deno.d.ts" />

import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getTodayDate(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function decodeUserIdFromJwt(token: string): string | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

interface GrokQuestion {
  prompt: string;
  snippet?: string | null;
  choices: string[];
  answer_index: number;
  explanation: string;
  topic: string;
}

function validateGrokQuestion(q: unknown, lane: string): q is GrokQuestion {
  if (!q || typeof q !== "object") return false;
  const o = q as Record<string, unknown>;
  if (typeof o.prompt !== "string" || !o.prompt.trim()) return false;
  if (!Array.isArray(o.choices) || o.choices.length < 2) return false;
  const idx = Number(o.answer_index);
  if (!Number.isInteger(idx) || idx < 0 || idx >= o.choices.length) return false;
  if (typeof o.explanation !== "string" || !o.explanation.trim()) return false;
  if (typeof o.topic !== "string") return false;
  if (o.snippet != null && typeof o.snippet !== "string") return false;
  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ error: "Missing or invalid Authorization header" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  const userJwt = authHeader.slice(7);
  const userId = decodeUserIdFromJwt(userJwt);
  if (!userId) {
    return new Response(
      JSON.stringify({ error: "Invalid token" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const grokApiKey = Deno.env.get("GROK_API_KEY");

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  }) as any;

  const packDate = getTodayDate();

  // Already have a pack for today? Return it (stable pack).
  const { data: existingPack } = await supabaseAdmin
    .from("daily_packs")
    .select("id")
    .eq("user_id", userId)
    .eq("pack_date", packDate)
    .limit(1)
    .single();

  if (existingPack?.id) {
    return new Response(
      JSON.stringify({ pack_id: existingPack.id, source: "existing" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // User settings for personalization (Grok first, then seed fallback)
  const { data: settings } = await supabaseAdmin
    .from("user_settings")
    .select("goal, level, track, language")
    .eq("user_id", userId)
    .limit(1)
    .single();

  const goal = (settings as { goal?: string } | null)?.goal ?? "interview_prep";
  const level = (settings as { level?: string } | null)?.level ?? "entry";
  const track = (settings as { track?: string } | null)?.track ?? "general";
  const language = (settings as { language?: string } | null)?.language ?? "javascript";

  let usedGrok = false;
  if (grokApiKey) {
    const systemPrompt = `You are an expert technical interviewer. Generate exactly 3 practice questions for a daily pack.
User context: goal=${goal}, level=${level}, track=${track}, preferred language for code=${language}.
Return ONLY valid JSON (no markdown, no extra text) in this exact shape:
{
  "code": { "prompt": "...", "snippet": "optional code block or null", "choices": ["A","B","C","D"], "answer_index": 0, "explanation": "...", "topic": "e.g. variables" },
  "system": { "prompt": "...", "snippet": null, "choices": ["A","B","C","D"], "answer_index": 0, "explanation": "...", "topic": "e.g. scaling" },
  "behavioral": { "prompt": "...", "snippet": null, "choices": ["A","B","C","D"], "answer_index": 0, "explanation": "...", "topic": "e.g. teamwork" }
}
Make questions appropriate for the goal, level, and track. Use the preferred language in code snippets when relevant. answer_index is 0-based.`;

    try {
      const grokRes = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${grokApiKey}`,
        },
        body: JSON.stringify({
          model: "grok-3-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: "Generate today's 3 questions (code, system design, behavioral)." },
          ],
          max_tokens: 2000,
        }),
      });

      if (grokRes.ok) {
        const data = await grokRes.json();
        const content = data?.choices?.[0]?.message?.content?.trim();
        if (content) {
          const parsed = JSON.parse(content);
          const code = parsed?.code;
          const system = parsed?.system;
          const behavioral = parsed?.behavioral;
          if (
            validateGrokQuestion(code, "code") &&
            validateGrokQuestion(system, "system") &&
            validateGrokQuestion(behavioral, "behavioral")
          ) {
            const codeLang = language === "java" ? "java" : language === "python" ? "python" : "javascript";
            const insertQuestion = async (q: GrokQuestion, lane: string, lang: string | null) => {
              const { data: row } = await supabaseAdmin
                .from("questions")
                .insert({
                  lane,
                  level,
                  track,
                  language: lang,
                  topic: q.topic.slice(0, 200),
                  prompt: q.prompt.slice(0, 2000),
                  snippet: q.snippet?.slice(0, 2000) ?? null,
                  choices: q.choices,
                  answer_index: q.answer_index,
                  explanation: q.explanation.slice(0, 2000),
                  difficulty: 2,
                  is_active: true,
                })
                .select("id")
                .single();
              return row?.id;
            };

            const codeId = await insertQuestion(code, "code", codeLang);
            const systemId = await insertQuestion(system, "system", null);
            const behavioralId = await insertQuestion(behavioral, "behavioral", null);

            if (codeId && systemId && behavioralId) {
              const { data: pack } = await supabaseAdmin
                .from("daily_packs")
                .insert({ user_id: userId, pack_date: packDate })
                .select("id")
                .single();

              if (pack?.id) {
                await supabaseAdmin.from("daily_pack_items").insert(
                  [
                    { pack_id: pack.id, question_id: codeId, lane: "code", position: 1 },
                    { pack_id: pack.id, question_id: systemId, lane: "system", position: 2 },
                    { pack_id: pack.id, question_id: behavioralId, lane: "behavioral", position: 3 },
                  ] as any
                );
                usedGrok = true;
                return new Response(
                  JSON.stringify({ pack_id: pack.id, source: "ai" }),
                  { headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
              }
            }
          }
        }
      }
    } catch (_e) {
      // Fall through to seed fallback
    }
  }

  // Fallback: call RPC as the user (seed-based pack).
  const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/generate_daily_pack`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": authHeader,
      "apikey": supabaseAnonKey,
      "Prefer": "return=representation",
    },
    body: JSON.stringify({ p_pack_date: packDate }),
  });

  if (!rpcRes.ok) {
    const errText = await rpcRes.text();
    return new Response(
      JSON.stringify({ error: "Failed to generate pack", details: errText }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const rpcData = await rpcRes.json();
  const packId =
    typeof rpcData === "string"
      ? rpcData
      : Array.isArray(rpcData) && rpcData.length > 0
        ? rpcData[0]
        : rpcData?.id ?? rpcData;

  return new Response(
    JSON.stringify({ pack_id: packId ?? null, source: "seed" }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
