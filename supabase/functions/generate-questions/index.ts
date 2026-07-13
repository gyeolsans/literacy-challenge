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
const PROVIDER = "openrouter";
const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_HTTP_REFERER = Deno.env.get("OPENROUTER_HTTP_REFERER") || "https://YOUR_SITE_URL.vercel.app";
const OPENROUTER_TITLE = Deno.env.get("OPENROUTER_TITLE") || "Literacy Challenge";

const MODEL_BY_DIFFICULTY: Record<string, string> = {
  easy: "deepseek/deepseek-chat-v3.1:free",
  normal: "deepseek/deepseek-chat-v3.1:free",
  hard: "deepseek/deepseek-chat-v3.1:free",
  expert: "deepseek/deepseek-chat-v3.1:free"
};
const FALLBACK_MODELS = ["openrouter/auto"];

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

type OpenRouterResult = {
  model: string;
  rawText: string;
  payload: Record<string, unknown>;
  parsed: { questions?: Question[] };
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

function errorResponse(error: string, detail: unknown = "", status = 200, model = "") {
  return jsonResponse({
    ok: false,
    provider: PROVIDER,
    model,
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
      q.keywords.length > 0;
  }
  return false;
}

function normalizeQuestion(q: Question, settings: Settings, index: number): Question {
  const answerType = q.answerType === "short_answer" && settings.includeShortAnswer ? "short_answer" : "multiple_choice";
  const keywords = Array.isArray(q.keywords) ? q.keywords : [];
  return {
    ...q,
    id: q.id || `ai-${Date.now()}-${index + 1}`,
    difficulty: ALLOWED_DIFFICULTIES.has(String(q.difficulty)) ? q.difficulty : settings.difficulty,
    type: ALLOWED_TYPES.has(String(q.type)) ? q.type : settings.selectedTypes[index % settings.selectedTypes.length] || "main_idea",
    answerType,
    answer: answerType === "multiple_choice" ? Number(q.answer) : q.answer,
    keywords,
    requiredKeywords: Array.isArray(q.requiredKeywords) && q.requiredKeywords.length ? q.requiredKeywords : keywords.slice(0, 2),
    points: Number(q.points || (answerType === "short_answer" ? 15 : 10)),
    source: "ai"
  };
}

function extractJsonText(text: string) {
  if (!text) return "";
  let cleaned = text.trim();

  if (cleaned.startsWith("```")) {
    cleaned = cleaned
      .replace(/^```json/i, "")
      .replace(/^```/i, "")
      .replace(/```$/i, "")
      .trim();
  }

  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");

  if (first >= 0 && last > first) {
    return cleaned.slice(first, last + 1);
  }

  return cleaned;
}

function parseQuestionsJson(rawText: string) {
  const jsonText = extractJsonText(rawText);
  if (!jsonText) {
    const error = new Error("紐⑤뜽 ?묐떟??鍮꾩뼱 ?덉뒿?덈떎.");
    (error as Error & { detail?: Record<string, unknown> }).detail = { responsePreview: "" };
    throw error;
  }

  try {
    return JSON.parse(jsonText) as { questions?: Question[] };
  } catch (parseError) {
    const error = new Error("紐⑤뜽 ?묐떟 JSON ?뚯떛 ?ㅽ뙣");
    (error as Error & { detail?: Record<string, unknown> }).detail = {
      parseError: (parseError as Error)?.message || String(parseError),
      responsePreview: rawText.slice(0, 2000),
      jsonPreview: jsonText.slice(0, 2000)
    };
    throw error;
  }
}

function buildPrompt(settings: Settings) {
  const requested = settings.count;
  const generateCount = requested + 3;
  return [
    "?덈뒗 ?쒓뎅??臾명빐???됯? 臾몄젣瑜?留뚮뱶???꾨Ц媛?? 諛섎뱶??JSON留?諛섑솚?쒕떎.",
    "留덊겕?ㅼ슫, 肄붾뱶釉붾줉, ?ㅻ챸, 二쇱꽍 ?놁씠 ?쒖닔 JSON 媛앹껜留?諛섑솚?쒕떎.",
    `寃利???理쒖냼 ${requested}媛쒕? ?④만 ???덈룄濡?${generateCount}媛쒖쓽 臾몄젣瑜??앹꽦?쒕떎.`,
    `difficulty 媛믪? 諛섎뱶??"${settings.difficulty}"留??ъ슜?쒕떎.`,
    `includeShortAnswer: ${settings.includeShortAnswer}`,
    `allowedTypes: ${settings.selectedTypes.join(", ")}`,
    `difficultyBoost: ${settings.difficultyBoost}`,
    "",
    "紐⑤뱺 吏臾? 吏덈Ц, 蹂닿린, ?댁꽕, ?덉떆 ?듭븞, ?ㅼ썙?쒕뒗 ?먯뿰?ㅻ윭???쒓뎅?대줈 ?묒꽦?쒕떎.",
    "answerType? multiple_choice ?먮뒗 short_answer留??ъ슜?쒕떎.",
    "includeShortAnswer媛 false?대㈃ multiple_choice留??ъ슜?쒕떎.",
    "媛앷??앹? options媛 ?뺥솗??4媛쒖씠怨?answer??0遺??3源뚯????뺤닔 ?몃뜳?ㅼ뿬???쒕떎.",
    "二쇨??앹? sampleAnswers? keywords媛 鍮꾩뼱 ?덉? ?딆? 諛곗뿴?댁뼱???쒕떎.",
    "type? allowedTypes 以??섎굹留??ъ슜?섍퀬 difficulty???붿껌 ?쒖씠?꾩? ?숈씪?댁빞 ?쒕떎.",
    "",
    "諛섑솚 ?뺤떇:",
    JSON.stringify({
      questions: [
        {
          id: "ai-001",
          difficulty: settings.difficulty,
          type: "main_idea",
          answerType: "multiple_choice",
          passage: "passage",
          question: "question",
          options: ["option1", "option2", "option3", "option4"],
          answer: 0,
          explanation: "explanation",
          points: 10,
          source: "ai"
        }
      ]
    })
  ].join("\n");
}

async function callOpenRouter({
  apiKey,
  model,
  prompt
}: {
  apiKey: string;
  model: string;
  prompt: string;
}): Promise<OpenRouterResult> {
  const response = await fetch(OPENROUTER_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": OPENROUTER_HTTP_REFERER,
      "X-Title": OPENROUTER_TITLE
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content: "?덈뒗 ?쒓뎅??臾명빐???됯? 臾몄젣瑜?留뚮뱶???꾨Ц媛?? 諛섎뱶??JSON留?諛섑솚?쒕떎."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7
    })
  });

  const rawText = await response.text();
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawText) as Record<string, unknown>;
  } catch {
    payload = { rawText };
  }
  if (!response.ok) {
    const error = new Error("OpenRouter API ?몄텧 ?ㅽ뙣");
    (error as Error & { detail?: Record<string, unknown> }).detail = {
      status: response.status,
      statusText: response.statusText,
      payload
    };
    throw error;
  }

  const content = (payload as {
    choices?: Array<{ message?: { content?: string } }>;
  })?.choices?.[0]?.message?.content;

  if (!content) {
    const error = new Error("OpenRouter 紐⑤뜽 ?묐떟 content媛 鍮꾩뼱 ?덉뒿?덈떎.");
    (error as Error & { detail?: Record<string, unknown> }).detail = { payload };
    throw error;
  }

  return {
    model,
    payload,
    rawText: content,
    parsed: parseQuestionsJson(content)
  };
}

async function generateWithRetry(apiKey: string, settings: Settings) {
  const selectedModel = MODEL_BY_DIFFICULTY[settings.difficulty] || MODEL_BY_DIFFICULTY.normal;
  const prompt = buildPrompt(settings);
  const models = [selectedModel, ...FALLBACK_MODELS.filter((model) => model !== selectedModel)];
  const failures: Array<Record<string, unknown>> = [];

  for (const model of models) {
    try {
      console.log("OpenRouter generate-questions request", {
        provider: PROVIDER,
        model,
        difficulty: settings.difficulty,
        count: settings.count,
        includeShortAnswer: settings.includeShortAnswer,
        selectedTypes: settings.selectedTypes,
        difficultyBoost: settings.difficultyBoost
      });
      return await callOpenRouter({ apiKey, model, prompt });
    } catch (error) {
      const detail = (error as Error & { detail?: Record<string, unknown> }).detail || serializeDetail(error);
      console.error("OpenRouter generation failed", { model, error: (error as Error)?.message || String(error), detail });
      failures.push({
        model,
        error: (error as Error)?.message || String(error),
        ...((detail && typeof detail === "object") ? detail : { detail })
      });
    }
  }

  const lastFailure = failures[failures.length - 1] || {};
  const error = new Error("All OpenRouter model calls failed.");
  (error as Error & { detail?: Record<string, unknown> }).detail = { failures };
  (error as Error & { model?: string }).model = String(lastFailure.model || selectedModel);
  throw error;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("Only POST requests are allowed.", req.method, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const settings = normalizeSettings(body);
    const selectedModel = MODEL_BY_DIFFICULTY[settings.difficulty] || MODEL_BY_DIFFICULTY.normal;
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    console.log("[generate-questions] OPENROUTER_API_KEY exists", Boolean(OPENROUTER_API_KEY));
    if (!OPENROUTER_API_KEY) {
      return errorResponse(
        "OPENROUTER_API_KEY is not configured.",
        "Run supabase.cmd secrets set OPENROUTER_API_KEY=... and supabase.cmd functions deploy generate-questions.",
        500,
        selectedModel
      );
    }

    const result = await generateWithRetry(OPENROUTER_API_KEY, settings);
    console.log("OpenRouter raw response preview", {
      model: result.model,
      preview: result.rawText.slice(0, 1200)
    });

    const rawQuestions = Array.isArray(result.parsed?.questions) ? result.parsed.questions : [];
    const questions = rawQuestions
      .map((q: Question, index: number) => normalizeQuestion(q, settings, index))
      .filter(validateQuestion)
      .slice(0, settings.count);

    if (!questions.length) {
      return errorResponse("OpenRouter returned zero valid questions.", {
        rawQuestionCount: rawQuestions.length,
        responsePreview: result.rawText.slice(0, 1200)
      }, 500, result.model);
    }

    return jsonResponse({
      ok: true,
      provider: PROVIDER,
      model: result.model,
      questions,
      requestedCount: settings.count,
      returnedCount: questions.length,
      shortage: Math.max(0, settings.count - questions.length)
    });
  } catch (error) {
    const err = error as Error & { detail?: Record<string, unknown>; model?: string };
    console.error("generate-questions failed", error);
    return errorResponse(err.message || "generate-questions failed.", err.detail || err, 500, err.model || "");
  }
});
