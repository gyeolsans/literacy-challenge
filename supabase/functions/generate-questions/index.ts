declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };
const ALLOWED_DIFFICULTIES = new Set(["easy", "normal", "hard", "expert"]);
const ALLOWED_TYPES = new Set([
  "main_idea",
  "title",
  "summary",
  "inference",
  "critical_thinking",
  "vocabulary",
  "context_meaning",
  "claim",
  "evidence",
  "attitude",
  "blank"
]);

type Settings = {
  difficulty: string;
  count: number;
  includeShortAnswer: boolean;
  selectedTypes: string[];
  difficultyBoost: boolean;
};

type Question = {
  id?: string;
  difficulty?: string;
  type?: string;
  answerType?: string;
  passage?: string;
  question?: string;
  options?: string[];
  answer?: number;
  sampleAnswers?: string[];
  keywords?: string[];
  requiredKeywords?: string[];
  explanation?: string;
  points?: number;
  source?: string;
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

function serializeDetail(detail: unknown) {
  if (detail instanceof Error) {
    return {
      name: detail.name,
      message: detail.message,
      stack: detail.stack
    };
  }
  if (detail && typeof detail === "object") return detail;
  return String(detail || "");
}

function errorResponse(error: string, detail: unknown = "", status = 200) {
  return jsonResponse({
    ok: false,
    error,
    detail: serializeDetail(detail || error)
  }, status);
}

function normalizeSettings(body: Record<string, unknown>): Settings {
  const difficulty = ALLOWED_DIFFICULTIES.has(String(body.difficulty)) ? String(body.difficulty) : "normal";
  const count = Math.min(15, Math.max(1, Number(body.count || 5)));
  const selectedTypes = Array.isArray(body.selectedTypes)
    ? body.selectedTypes.map(String).filter((type) => ALLOWED_TYPES.has(type))
    : [];
  return {
    difficulty,
    count,
    includeShortAnswer: body.includeShortAnswer !== false,
    selectedTypes: selectedTypes.length ? selectedTypes : ["main_idea", "summary", "inference", "vocabulary"],
    difficultyBoost: Boolean(body.difficultyBoost)
  };
}

function validateQuestion(q: Question) {
  if (!q || typeof q !== "object") return false;
  if (!q.passage || !q.question || !q.explanation) return false;
  if (!ALLOWED_DIFFICULTIES.has(String(q.difficulty))) return false;
  if (!ALLOWED_TYPES.has(String(q.type))) return false;
  if (q.answerType === "multiple_choice") {
    return Array.isArray(q.options) &&
      q.options.length === 4 &&
      Number.isInteger(Number(q.answer)) &&
      Number(q.answer) >= 0 &&
      Number(q.answer) <= 3;
  }
  if (q.answerType === "short_answer") {
    return Array.isArray(q.sampleAnswers) &&
      q.sampleAnswers.length > 0 &&
      Array.isArray(q.keywords) &&
      q.keywords.length > 0 &&
      Array.isArray(q.requiredKeywords) &&
      q.requiredKeywords.length > 0;
  }
  return false;
}

function normalizeQuestion(q: Question, settings: Settings, index: number): Question {
  const answerType = q.answerType === "short_answer" && settings.includeShortAnswer ? "short_answer" : "multiple_choice";
  return {
    ...q,
    id: q.id || `ai-${Date.now()}-${index + 1}`,
    difficulty: ALLOWED_DIFFICULTIES.has(String(q.difficulty)) ? q.difficulty : settings.difficulty,
    type: ALLOWED_TYPES.has(String(q.type)) ? q.type : settings.selectedTypes[index % settings.selectedTypes.length] || "main_idea",
    answerType,
    answer: answerType === "multiple_choice" ? Number(q.answer) : q.answer,
    points: Number(q.points || (answerType === "short_answer" ? 15 : 10)),
    source: "ai"
  };
}

function extractOutputText(payload: Record<string, unknown>) {
  if (typeof payload.output_text === "string") return payload.output_text;
  const chunks: string[] = [];
  for (const item of Array.isArray(payload.output) ? payload.output as Array<Record<string, unknown>> : []) {
    for (const part of Array.isArray(item.content) ? item.content as Array<Record<string, unknown>> : []) {
      if (typeof part.text === "string") chunks.push(part.text);
      if (typeof part.output_text === "string") chunks.push(part.output_text);
    }
  }
  return chunks.join("\n").trim();
}

function extractJson(text: string) {
  const trimmed = String(text || "").trim();
  if (!trimmed) throw new Error("OpenAI response text is empty.");
  try {
    return JSON.parse(trimmed);
  } catch (directError) {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = fenced?.[1] || trimmed.match(/\{[\s\S]*\}/)?.[0];
    if (!candidate) {
      const error = new Error("Could not find a JSON object in the OpenAI response.");
      (error as Error & { detail?: Record<string, unknown> }).detail = {
        directParseError: (directError as Error)?.message || String(directError),
        responsePreview: trimmed.slice(0, 2000)
      };
      throw error;
    }
    try {
      return JSON.parse(candidate);
    } catch (candidateError) {
      const error = new Error("Could not parse JSON from the OpenAI response.");
      (error as Error & { detail?: Record<string, unknown> }).detail = {
        directParseError: (directError as Error)?.message || String(directError),
        candidateParseError: (candidateError as Error)?.message || String(candidateError),
        responsePreview: trimmed.slice(0, 2000)
      };
      throw error;
    }
  }
}

function buildPrompt(settings: Settings) {
  const requested = settings.count;
  const generateCount = requested + 3;
  return [
    "You are a Korean literacy assessment question writer.",
    "Return JSON only. No markdown, no comments, no prose outside JSON.",
    `Generate ${generateCount} questions so validation can keep at least ${requested}.`,
    `difficulty: ${settings.difficulty}`,
    `includeShortAnswer: ${settings.includeShortAnswer}`,
    `allowedTypes: ${settings.selectedTypes.join(", ")}`,
    `difficultyBoost: ${settings.difficultyBoost}`,
    "",
    "All passages, questions, choices, explanations, sample answers, and keywords must be written in natural Korean.",
    "Use only these answerType values: multiple_choice or short_answer.",
    "If includeShortAnswer is false, use multiple_choice only.",
    "For multiple_choice, options must contain exactly 4 strings and answer must be an integer index from 0 to 3.",
    "For short_answer, sampleAnswers, keywords, and requiredKeywords must be non-empty arrays.",
    "Use only allowedTypes for type and the requested difficulty for difficulty.",
    "",
    "Return shape:",
    JSON.stringify({
      questions: [
        {
          id: "ai-001",
          difficulty: settings.difficulty,
          type: "main_idea",
          answerType: "multiple_choice",
          passage: "지문",
          question: "질문",
          options: ["보기1", "보기2", "보기3", "보기4"],
          answer: 0,
          explanation: "해설",
          points: 10,
          source: "ai"
        }
      ]
    })
  ].join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("Only POST requests are allowed.", req.method, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const settings = normalizeSettings(body);
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return errorResponse("OPENAI_API_KEY is not set in Supabase Edge Function Secrets.", "Run: supabase secrets set OPENAI_API_KEY=...");
    }

    console.log("generate-questions request", {
      difficulty: settings.difficulty,
      count: settings.count,
      includeShortAnswer: settings.includeShortAnswer,
      selectedTypes: settings.selectedTypes,
      difficultyBoost: settings.difficultyBoost
    });

    const openAiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: Deno.env.get("OPENAI_MODEL") || "gpt-4.1-mini",
        input: buildPrompt(settings),
        temperature: 0.7
      })
    });

    const payload = await openAiResponse.json().catch((error) => ({ parseError: String(error) }));
    if (!openAiResponse.ok) {
      console.error("OpenAI API error", payload);
      return errorResponse("OpenAI API call failed.", payload);
    }

    const rawText = extractOutputText(payload as Record<string, unknown>);
    console.log("OpenAI raw response preview", rawText.slice(0, 1200));
    let parsed: { questions?: Question[] };
    try {
      parsed = extractJson(rawText) as { questions?: Question[] };
    } catch (parseError) {
      const detail = (parseError as Error & { detail?: Record<string, unknown> }).detail || {
        message: (parseError as Error)?.message || String(parseError),
        responsePreview: rawText.slice(0, 2000)
      };
      console.error("OpenAI JSON parse failed", detail);
      return errorResponse("OpenAI response JSON parsing failed.", detail);
    }
    const rawQuestions = Array.isArray(parsed?.questions) ? parsed.questions : [];
    const questions = rawQuestions
      .map((q: Question, index: number) => normalizeQuestion(q, settings, index))
      .filter(validateQuestion)
      .slice(0, settings.count);

    if (!questions.length) {
      return errorResponse("OpenAI returned zero valid questions.", {
        rawQuestionCount: rawQuestions.length,
        responsePreview: rawText.slice(0, 1200)
      });
    }

    return jsonResponse({
      ok: true,
      questions,
      requestedCount: settings.count,
      returnedCount: questions.length,
      shortage: Math.max(0, settings.count - questions.length)
    });
  } catch (error) {
    console.error("generate-questions failed", error);
    return errorResponse("generate-questions failed.", error);
  }
});
