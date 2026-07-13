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

const DEEPSEEK_MODEL = "deepseek/deepseek-chat-v3.1:free";
const MODEL_BY_DIFFICULTY: Record<string, string> = {
  easy: DEEPSEEK_MODEL,
  normal: DEEPSEEK_MODEL,
  hard: DEEPSEEK_MODEL,
  expert: "qwen/qwen3-235b-a22b:free"
};
const FALLBACK_MODELS = [DEEPSEEK_MODEL, "openrouter/auto"];

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

type ValidationReport = {
  index: number;
  id?: string;
  errors: string[];
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

function textMetrics(text: string) {
  const value = String(text || "");
  return {
    value,
    korean: (value.match(/[가-힣]/g) || []).length,
    english: (value.match(/[A-Za-z]/g) || []).length
  };
}

function isMostlyKorean(text: string, minKorean = 8) {
  const { korean, english } = textMetrics(text);
  const totalLetters = korean + english;
  return korean >= minKorean &&
    korean / Math.max(1, totalLetters) >= 0.75 &&
    english <= Math.max(3, Math.floor(korean * 0.2));
}

function isKoreanToken(text: string) {
  const { value, korean, english } = textMetrics(text);
  return value.trim().length > 0 && korean > 0 && english === 0;
}

function countParagraphs(text: string) {
  const value = String(text || "").trim();
  if (!value) return 0;
  const blankLineParagraphs = value.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
  if (blankLineParagraphs.length > 1) return blankLineParagraphs.length;
  return value.split(/\n+/).map((part) => part.trim()).filter((part) => part.length >= 80).length || 1;
}

function countSentences(text: string) {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  if (!value) return 0;
  const punctuationMatches = value.match(/[^.!?。！？]+[.!?。！？]/g) || [];
  if (punctuationMatches.length) return punctuationMatches.length;
  return value.split(/(?:다|요|죠|니다|한다|였다|된다|이다|까)(?=\s|$)/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 12)
    .length;
}

function normalizeQuestion(q: Question, settings: Settings, index: number): Question {
  const answerType = q.answerType === "short_answer" && settings.includeShortAnswer ? "short_answer" : "multiple_choice";
  const keywords = Array.isArray(q.keywords) ? q.keywords.map(String).filter(Boolean) : [];
  const requiredKeywords = Array.isArray(q.requiredKeywords)
    ? q.requiredKeywords.map(String).filter(Boolean)
    : [];
  return {
    ...q,
    id: q.id || `ai-${Date.now()}-${index + 1}`,
    difficulty: ALLOWED_DIFFICULTIES.has(String(q.difficulty)) ? q.difficulty : settings.difficulty,
    type: ALLOWED_TYPES.has(String(q.type)) ? q.type : settings.selectedTypes[index % settings.selectedTypes.length] || "main_idea",
    answerType,
    options: Array.isArray(q.options) ? q.options.map(String) : q.options,
    answer: answerType === "multiple_choice" ? Number(q.answer) : q.answer,
    sampleAnswers: Array.isArray(q.sampleAnswers) ? q.sampleAnswers.map(String).filter(Boolean) : q.sampleAnswers,
    keywords,
    requiredKeywords: requiredKeywords.length ? requiredKeywords : keywords.slice(0, 2),
    points: Number(q.points || (answerType === "short_answer" ? 15 : 10)),
    source: "ai"
  };
}

function getQuestionValidationErrors(q: Question, settings: Settings) {
  const errors: string[] = [];
  if (!q || typeof q !== "object") return ["질문 객체가 아닙니다."];
  if (!q.passage) errors.push("지문이 없습니다.");
  if (!q.question) errors.push("질문이 없습니다.");
  if (!q.explanation) errors.push("해설이 없습니다.");
  if (!ALLOWED_DIFFICULTIES.has(String(q.difficulty))) errors.push("허용되지 않은 난이도입니다.");
  if (q.difficulty !== settings.difficulty) errors.push("요청 난이도와 다릅니다.");
  if (!ALLOWED_TYPES.has(String(q.type))) errors.push("허용되지 않은 유형입니다.");
  if (q.passage && !isMostlyKorean(q.passage, 80)) errors.push("지문이 한국어 중심이 아닙니다.");
  if (q.question && !isMostlyKorean(q.question, 8)) errors.push("질문이 한국어 중심이 아닙니다.");
  if (q.explanation && !isMostlyKorean(q.explanation, 20)) errors.push("해설이 한국어 중심이 아닙니다.");

  if (q.answerType === "multiple_choice") {
    if (!Array.isArray(q.options) || q.options.length !== 4) {
      errors.push("객관식 보기는 정확히 4개여야 합니다.");
    } else {
      if (!q.options.every((option) => isKoreanToken(option))) errors.push("객관식 보기에 영어가 포함되었거나 한국어가 부족합니다.");
    }
    if (!Number.isInteger(Number(q.answer)) || Number(q.answer) < 0 || Number(q.answer) > 3) {
      errors.push("객관식 정답은 0부터 3까지의 정수여야 합니다.");
    }
  } else if (q.answerType === "short_answer") {
    if (!settings.includeShortAnswer) errors.push("주관식이 비활성화되어 있습니다.");
    if (!Array.isArray(q.sampleAnswers) || q.sampleAnswers.length === 0) {
      errors.push("주관식 예시 답안이 없습니다.");
    } else if (!q.sampleAnswers.every((answer) => isMostlyKorean(answer, 4))) {
      errors.push("주관식 예시 답안이 한국어 중심이 아닙니다.");
    }
    if (!Array.isArray(q.keywords) || q.keywords.length === 0) {
      errors.push("주관식 키워드가 없습니다.");
    } else if (!q.keywords.every((keyword) => isKoreanToken(keyword))) {
      errors.push("주관식 키워드는 한국어여야 합니다.");
    }
    if (Array.isArray(q.requiredKeywords) && !q.requiredKeywords.every((keyword) => isKoreanToken(keyword))) {
      errors.push("필수 키워드는 한국어여야 합니다.");
    }
  } else {
    errors.push("answerType은 multiple_choice 또는 short_answer여야 합니다.");
  }

  if (settings.difficulty === "expert") {
    const passage = String(q.passage || "");
    if (passage.length < 900) errors.push("expert 지문은 900자 이상이어야 합니다.");
    if (countParagraphs(passage) < 4) errors.push("expert 지문은 최소 4문단이어야 합니다.");
    if (countSentences(passage) < 14) errors.push("expert 지문은 최소 14문장이어야 합니다.");
    if (String(q.question || "").length < 35) errors.push("expert 질문이 너무 짧습니다.");
    if (String(q.explanation || "").length < 80) errors.push("expert 해설은 80자 이상이어야 합니다.");
    if (q.answerType === "multiple_choice" && Array.isArray(q.options) && !q.options.every((option) => option.length >= 12)) {
      errors.push("expert 객관식 보기는 각각 12자 이상이어야 합니다.");
    }
  }

  return errors;
}

function validateQuestion(q: Question, settings: Settings) {
  return getQuestionValidationErrors(q, settings).length === 0;
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
    const error = new Error("모델 응답이 비어 있거나 JSON 객체를 찾을 수 없습니다.");
    (error as Error & { detail?: Record<string, unknown> }).detail = { responsePreview: "" };
    throw error;
  }

  try {
    return JSON.parse(jsonText) as { questions?: Question[] };
  } catch (parseError) {
    const error = new Error("모델 응답 JSON 파싱 실패");
    (error as Error & { detail?: Record<string, unknown> }).detail = {
      parseError: (parseError as Error)?.message || String(parseError),
      responsePreview: rawText.slice(0, 2000),
      jsonPreview: jsonText.slice(0, 2000)
    };
    throw error;
  }
}

function difficultyGuidance(settings: Settings) {
  if (settings.difficulty === "expert") {
    return [
      "expert 난이도 규칙:",
      "- 지문은 반드시 한국어 4~6문단, 16~24문장, 900자 이상으로 작성한다.",
      "- 문단은 JSON 문자열 안에서 \\n\\n으로 구분한다.",
      "- 주제는 과학기술 윤리, 공공정책, 경제 구조, 철학적 논증, 미디어 리터러시처럼 고차원적인 주제로 삼는다.",
      "- 질문은 3~5단계 추론, 관점 비교, 전제/함의 파악, 반론 평가를 요구해야 한다.",
      "- 객관식 오답은 모두 그럴듯해야 하며, 단순한 반대말이나 명백한 오답을 만들지 않는다.",
      "- 객관식 보기는 각각 12자 이상으로 작성한다.",
      "- 해설은 최소 80자 이상으로 정답의 근거와 오답 배제 이유를 함께 설명한다."
    ].join("\n");
  }

  const base = {
    easy: "easy 난이도는 짧고 명확한 한국어 지문으로 핵심 정보 확인 중심의 문제를 만든다.",
    normal: "normal 난이도는 중간 길이의 한국어 지문으로 요지, 추론, 어휘 의미를 균형 있게 묻는다.",
    hard: "hard 난이도는 긴 한국어 지문으로 논리 구조, 숨은 전제, 비판적 판단을 요구한다."
  }[settings.difficulty] || "normal 난이도 기준으로 자연스러운 한국어 문해력 문제를 만든다.";

  return settings.difficultyBoost
    ? `${base}\n난이도 강화가 켜져 있으므로 지문을 더 촘촘하게 구성하고 오답의 매력도를 높인다.`
    : base;
}

function buildPrompt(settings: Settings, retryReason = "") {
  const requested = settings.count;
  const generateCount = requested + (settings.difficulty === "expert" ? 2 : 3);
  const schemaExample = {
    questions: [
      {
        id: "ai-001",
        difficulty: settings.difficulty,
        type: settings.selectedTypes[0] || "main_idea",
        answerType: "multiple_choice",
        passage: "한국어 지문을 여기에 작성합니다. 여러 문단이 필요하면 \\n\\n으로 구분합니다.",
        question: "한국어 질문을 여기에 작성합니다.",
        options: ["한국어 보기 하나", "한국어 보기 둘", "한국어 보기 셋", "한국어 보기 넷"],
        answer: 0,
        explanation: "정답 근거와 오답 배제 이유를 한국어로 설명합니다.",
        points: 10,
        source: "ai"
      }
    ]
  };

  return [
    "당신은 한국어 문해력 평가 문제를 만드는 전문가입니다.",
    "반드시 유효한 JSON 객체 하나만 반환하세요. 마크다운, 코드블록, 주석, 설명 문장은 금지입니다.",
    "",
    "가장 중요한 규칙:",
    "- passage, question, options, explanation, sampleAnswers, keywords, requiredKeywords의 값은 모두 한국어로만 작성합니다.",
    "- 영어 문장, 영어 보기, 영어 해설, 영어 키워드는 절대 넣지 않습니다.",
    "- JSON key 이름은 아래 예시의 영문 key를 그대로 사용하되, 학습자가 보는 모든 값은 한국어여야 합니다.",
    `- 검증 후 최소 ${requested}개가 남도록 ${generateCount}개의 문제를 생성합니다.`,
    `- difficulty 값은 반드시 "${settings.difficulty}"만 사용합니다.`,
    `- allowedTypes 중에서만 type을 고릅니다: ${settings.selectedTypes.join(", ")}`,
    `- includeShortAnswer: ${settings.includeShortAnswer}`,
    settings.includeShortAnswer
      ? "- answerType은 multiple_choice와 short_answer를 섞어도 됩니다."
      : "- includeShortAnswer가 false이므로 answerType은 반드시 multiple_choice만 사용합니다.",
    "- multiple_choice는 options 4개와 answer 0~3 정수 인덱스를 반드시 포함합니다.",
    "- short_answer는 sampleAnswers, keywords, requiredKeywords를 비어 있지 않은 한국어 배열로 포함합니다.",
    "",
    difficultyGuidance(settings),
    retryReason ? `\n이전 응답 검증 실패 이유: ${retryReason}\n이번 응답은 위 실패를 반드시 수정하세요.` : "",
    "",
    "반환 형식 예시:",
    JSON.stringify(schemaExample, null, 2)
  ].join("\n");
}

function getModelOrder(settings: Settings) {
  const selectedModel = MODEL_BY_DIFFICULTY[settings.difficulty] || MODEL_BY_DIFFICULTY.normal;
  return [...new Set([selectedModel, ...FALLBACK_MODELS])];
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
          content: [
            "당신은 한국어 문해력 평가 문항 생성기입니다.",
            "응답은 반드시 JSON 객체 하나만 반환합니다.",
            "학습자가 보는 모든 문자열은 한국어로만 작성합니다.",
            "영어 지문, 영어 질문, 영어 보기, 영어 해설, 영어 키워드는 실패로 간주됩니다."
          ].join(" ")
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: model === MODEL_BY_DIFFICULTY.expert ? 0.62 : 0.7
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
    const error = new Error("OpenRouter API 호출 실패");
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
    const error = new Error("OpenRouter 모델 응답 content가 비어 있습니다.");
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

function summarizeValidationErrors(reports: ValidationReport[]) {
  const counts = new Map<string, number>();
  reports.forEach((report) => {
    report.errors.forEach((error) => counts.set(error, (counts.get(error) || 0) + 1));
  });
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([error, count]) => `${error} (${count}개)`);
}

function validateGeneratedQuestions(result: OpenRouterResult, settings: Settings) {
  const rawQuestions = Array.isArray(result.parsed?.questions) ? result.parsed.questions : [];
  const normalized = rawQuestions.map((q: Question, index: number) => normalizeQuestion(q, settings, index));
  const reports = normalized.map((question, index) => ({
    index: index + 1,
    id: question.id,
    errors: getQuestionValidationErrors(question, settings)
  }));
  const questions = normalized
    .filter((question, index) => reports[index].errors.length === 0 && validateQuestion(question, settings))
    .slice(0, settings.count);

  return {
    rawQuestionCount: rawQuestions.length,
    reports,
    questions
  };
}

function retryReasonFromReports(reports: ValidationReport[], settings: Settings) {
  const summary = summarizeValidationErrors(reports).join("; ");
  const expertHint = settings.difficulty === "expert"
    ? " expert는 4문단 이상, 14문장 이상, 900자 이상, 해설 80자 이상을 반드시 지켜야 합니다."
    : "";
  return `${summary || "검증을 통과한 문제가 없습니다."} 모든 사용자 노출 문자열을 한국어로만 다시 작성하세요.${expertHint}`;
}

async function generateWithRetry(apiKey: string, settings: Settings) {
  const models = getModelOrder(settings);
  const validationRetryCount = settings.difficulty === "expert" ? 2 : 1;
  const failures: Array<Record<string, unknown>> = [];
  let lastModel = models[0] || "";

  for (const model of models) {
    let retryReason = "";
    for (let attempt = 0; attempt <= validationRetryCount; attempt += 1) {
      lastModel = model;
      const prompt = buildPrompt(settings, retryReason);
      try {
        console.log("OpenRouter generate-questions request", {
          provider: PROVIDER,
          model,
          attempt: attempt + 1,
          difficulty: settings.difficulty,
          count: settings.count,
          includeShortAnswer: settings.includeShortAnswer,
          selectedTypes: settings.selectedTypes,
          difficultyBoost: settings.difficultyBoost
        });
        const result = await callOpenRouter({ apiKey, model, prompt });
        const validation = validateGeneratedQuestions(result, settings);
        console.log("OpenRouter raw response preview", {
          model: result.model,
          attempt: attempt + 1,
          rawQuestionCount: validation.rawQuestionCount,
          validQuestionCount: validation.questions.length,
          validationSummary: summarizeValidationErrors(validation.reports),
          preview: result.rawText.slice(0, 1200)
        });

        if (validation.questions.length) {
          return {
            result,
            questions: validation.questions,
            rawQuestionCount: validation.rawQuestionCount,
            validationReports: validation.reports,
            attempt: attempt + 1
          };
        }

        retryReason = retryReasonFromReports(validation.reports, settings);
        failures.push({
          kind: "validation",
          provider: PROVIDER,
          model,
          attempt: attempt + 1,
          rawQuestionCount: validation.rawQuestionCount,
          validQuestionCount: 0,
          validationSummary: summarizeValidationErrors(validation.reports),
          validationReports: validation.reports.slice(0, 8),
          responsePreview: result.rawText.slice(0, 1200)
        });
      } catch (error) {
        const detail = (error as Error & { detail?: Record<string, unknown> }).detail || serializeDetail(error);
        console.error("OpenRouter generation failed", { model, error: (error as Error)?.message || String(error), detail });
        failures.push({
          kind: "api",
          provider: PROVIDER,
          model,
          attempt: attempt + 1,
          error: (error as Error)?.message || String(error),
          ...((detail && typeof detail === "object") ? detail : { detail })
        });
        break;
      }
    }
  }

  const hasValidationFailure = failures.some((failure) => failure.kind === "validation");
  const error = new Error(hasValidationFailure
    ? "AI 생성 실패: 한국어 전용/전문가 난이도 검증을 통과한 문제가 없습니다. 자동 재시도와 fallback 모델 호출을 완료했습니다."
    : "All OpenRouter model calls failed.");
  (error as Error & { detail?: Record<string, unknown> }).detail = {
    provider: PROVIDER,
    failures,
    required: settings.difficulty === "expert"
      ? "expert 문제는 한국어, 900자 이상 지문, 4문단 이상, 14문장 이상, 80자 이상 해설을 통과해야 합니다."
      : "모든 사용자 노출 문자열은 한국어 중심이어야 합니다."
  };
  (error as Error & { model?: string }).model = lastModel;
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

    const generation = await generateWithRetry(OPENROUTER_API_KEY, settings);

    return jsonResponse({
      ok: true,
      provider: PROVIDER,
      model: generation.result.model,
      questions: generation.questions,
      requestedCount: settings.count,
      returnedCount: generation.questions.length,
      rawQuestionCount: generation.rawQuestionCount,
      validationAttempt: generation.attempt,
      shortage: Math.max(0, settings.count - generation.questions.length)
    });
  } catch (error) {
    const err = error as Error & { detail?: Record<string, unknown>; model?: string };
    console.error("generate-questions failed", error);
    return errorResponse(err.message || "generate-questions failed.", err.detail || err, 500, err.model || "");
  }
});
