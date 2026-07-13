declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" };
const PROVIDER = "openrouter";
const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_HTTP_REFERER = Deno.env.get("OPENROUTER_HTTP_REFERER") || "https://YOUR_SITE_URL.vercel.app";
const OPENROUTER_TITLE = Deno.env.get("OPENROUTER_TITLE") || "Literacy Challenge";

const AUTO_MODEL = "openrouter/auto";
const PAID_DEEPSEEK_MODEL = "deepseek/deepseek-chat-v3.1";
const USE_PAID_OPENROUTER_MODELS = Deno.env.get("USE_PAID_OPENROUTER_MODELS") === "true";
const MODEL_BY_DIFFICULTY: Record<string, string> = {
  easy: AUTO_MODEL,
  normal: AUTO_MODEL,
  hard: AUTO_MODEL,
  expert: AUTO_MODEL
};
const PAID_MODEL_BY_DIFFICULTY: Record<string, string> = {
  easy: PAID_DEEPSEEK_MODEL,
  normal: PAID_DEEPSEEK_MODEL,
  hard: PAID_DEEPSEEK_MODEL,
  expert: PAID_DEEPSEEK_MODEL
};
const FALLBACK_MODELS = [AUTO_MODEL];

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
    return { name: detail.name, message: detail.message, stack: detail.stack };
  }
  if (detail && typeof detail === "object") return detail;
  return String(detail || "");
}

function summarizeGenerationFailure(error: string, detail: unknown = "") {
  const text = `${error} ${typeof detail === "string" ? detail : JSON.stringify(detail || {})}`;
  if (text.includes("This model is unavailable for free") || text.includes("404")) {
    return "OpenRouter model call failed. The app should use built-in AI fallback questions.";
  }
  if (text.includes("Unauthorized") || text.includes("401")) {
    return "OpenRouter API authentication failed. The app should use built-in AI fallback questions.";
  }
  if (text.toLowerCase().includes("validation")) {
    return "AI returned questions, but they did not satisfy Korean or difficulty validation.";
  }
  return "AI realtime generation failed. The app should use built-in AI fallback questions.";
}

function errorResponse(error: string, detail: unknown = "", status = 200, model = "") {
  return jsonResponse({
    ok: false,
    provider: PROVIDER,
    model,
    error,
    summary: summarizeGenerationFailure(error, detail),
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

function countMatches(text: string, regex: RegExp) {
  return (String(text || "").match(regex) || []).length;
}

function textStats(text: string) {
  const value = String(text || "");
  return {
    value,
    length: value.trim().length,
    korean: countMatches(value, /[가-힣]/g),
    english: countMatches(value, /[A-Za-z]/g),
    questionMarks: countMatches(value, /\?/g),
    replacement: countMatches(value, /�|占/g),
    cjk: countMatches(value, /[\u4E00-\u9FFF]/g),
    weirdSymbols: countMatches(value, /[뼬뭄묒옙썩ㅿ]/g)
  };
}

function isGarbledText(text: string, minLength = 1, minKorean = 1) {
  const stats = textStats(text);
  if (!text || typeof text !== "string") return true;
  if (stats.length < minLength) return true;
  if (stats.replacement > 0) return true;
  if (stats.weirdSymbols > 0) return true;
  if (stats.questionMarks >= 5 && stats.questionMarks > stats.korean * 0.2) return true;
  if (stats.cjk > Math.max(2, stats.korean * 0.25)) return true;
  if (stats.korean < minKorean) return true;
  if (stats.english > Math.max(8, stats.korean * 0.45)) return true;
  return false;
}

function isMostlyKorean(text: string, minKorean = 1) {
  const stats = textStats(text);
  if (stats.replacement > 0 || stats.weirdSymbols > 0) return false;
  if (stats.korean < minKorean) return false;
  if (stats.english > Math.max(8, stats.korean * 0.45)) return false;
  if (stats.cjk > Math.max(2, stats.korean * 0.2)) return false;
  if (stats.questionMarks > Math.max(4, stats.korean * 0.2)) return false;
  return true;
}

function isKoreanToken(text: string) {
  const value = String(text || "").trim();
  return value.length > 0 && !isGarbledText(value, 1, 1) && isMostlyKorean(value, 1);
}

function countParagraphs(text: string) {
  return String(text || "")
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean).length;
}

function countSentences(text: string) {
  return String(text || "")
    .split(/(?<=[.!?。！？])\s+|(?<=[다요죠함음임됨됨다])\.\s*|(?<=[다요죠함음임됨])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 8).length;
}

function difficultyMinimums(difficulty: string) {
  if (difficulty === "easy") return { length: 120, paragraphs: 1, sentences: 3, question: 8, explanation: 25, option: 4 };
  if (difficulty === "normal") return { length: 220, paragraphs: 1, sentences: 4, question: 10, explanation: 40, option: 5 };
  if (difficulty === "hard") return { length: 500, paragraphs: 2, sentences: 7, question: 18, explanation: 70, option: 8 };
  return { length: 1000, paragraphs: 4, sentences: 14, question: 32, explanation: 120, option: 12 };
}

function validateDifficultyRequirements(q: Question, difficulty: string) {
  const errors: string[] = [];
  const passage = String(q.passage || "");
  const minimums = difficultyMinimums(difficulty);
  const paragraphs = countParagraphs(passage);
  const sentences = countSentences(passage);

  if (passage.length < minimums.length) errors.push(`지문 길이가 부족합니다. ${difficulty}는 최소 ${minimums.length}자 이상이어야 합니다.`);
  if (paragraphs < minimums.paragraphs) errors.push(`문단 수가 부족합니다. ${difficulty}는 최소 ${minimums.paragraphs}문단 이상이어야 합니다.`);
  if (sentences < minimums.sentences) errors.push(`문장 수가 부족합니다. ${difficulty}는 최소 ${minimums.sentences}문장 이상이어야 합니다.`);
  if (String(q.question || "").length < minimums.question) errors.push(`질문이 너무 짧습니다. 최소 ${minimums.question}자 이상이어야 합니다.`);
  if (String(q.explanation || "").length < minimums.explanation) errors.push(`해설이 너무 짧습니다. 최소 ${minimums.explanation}자 이상이어야 합니다.`);

  if (q.answerType === "multiple_choice" && Array.isArray(q.options)) {
    q.options.forEach((option, index) => {
      if (String(option || "").length < minimums.option) {
        errors.push(`${index + 1}번 선택지가 너무 짧습니다. 최소 ${minimums.option}자 이상이어야 합니다.`);
      }
    });
  }
  return errors;
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
    passage: String(q.passage || "").trim(),
    question: String(q.question || "").trim(),
    options: Array.isArray(q.options) ? q.options.map((option) => String(option || "").trim()) : q.options,
    answer: answerType === "multiple_choice" ? Number(q.answer) : q.answer,
    sampleAnswers: Array.isArray(q.sampleAnswers) ? q.sampleAnswers.map((answer) => String(answer || "").trim()).filter(Boolean) : q.sampleAnswers,
    keywords,
    requiredKeywords: requiredKeywords.length ? requiredKeywords : keywords.slice(0, 2),
    explanation: String(q.explanation || "").trim(),
    points: Number(q.points || (answerType === "short_answer" ? 15 : 10)),
    source: "ai"
  };
}

function getQuestionValidationErrors(q: Question, settings: Settings) {
  const errors: string[] = [];
  if (!q || typeof q !== "object") return ["문제 객체가 아닙니다."];
  if (!q.passage) errors.push("지문이 없습니다.");
  if (!q.question) errors.push("질문이 없습니다.");
  if (!q.explanation) errors.push("해설이 없습니다.");
  if (!ALLOWED_DIFFICULTIES.has(String(q.difficulty))) errors.push("허용되지 않은 난이도입니다.");
  if (q.difficulty !== settings.difficulty) errors.push("요청 난이도와 다릅니다.");
  if (!ALLOWED_TYPES.has(String(q.type))) errors.push("허용되지 않은 문제 유형입니다.");

  if (q.passage && (isGarbledText(q.passage, 20, 20) || !isMostlyKorean(q.passage, 20))) errors.push("지문이 정상 한국어가 아니거나 깨진 문자를 포함합니다.");
  if (q.question && (isGarbledText(q.question, 8, 4) || !isMostlyKorean(q.question, 4))) errors.push("질문이 정상 한국어가 아니거나 깨진 문자를 포함합니다.");
  if (q.explanation && (isGarbledText(q.explanation, 20, 8) || !isMostlyKorean(q.explanation, 8))) errors.push("해설이 정상 한국어가 아니거나 깨진 문자를 포함합니다.");

  if (q.answerType === "multiple_choice") {
    if (!Array.isArray(q.options) || q.options.length !== 4) {
      errors.push("객관식 선택지는 정확히 4개여야 합니다.");
    } else {
      q.options.forEach((option, index) => {
        if (!isKoreanToken(option)) errors.push(`${index + 1}번 선택지가 정상 한국어가 아닙니다.`);
      });
    }
    if (!Number.isInteger(Number(q.answer)) || Number(q.answer) < 0 || Number(q.answer) > 3) {
      errors.push("객관식 정답은 0부터 3까지의 정수여야 합니다.");
    }
  } else if (q.answerType === "short_answer") {
    if (!settings.includeShortAnswer) errors.push("주관식이 비활성화되어 있습니다.");
    if (!Array.isArray(q.sampleAnswers) || q.sampleAnswers.length === 0) {
      errors.push("주관식 예시 답안이 없습니다.");
    } else {
      q.sampleAnswers.forEach((answer, index) => {
        if (!isMostlyKorean(answer, 2) || isGarbledText(answer, 2, 2)) errors.push(`${index + 1}번 예시 답안이 정상 한국어가 아닙니다.`);
      });
    }
    if (!Array.isArray(q.keywords) || q.keywords.length === 0) {
      errors.push("주관식 키워드가 없습니다.");
    } else {
      q.keywords.forEach((keyword, index) => {
        if (!isKoreanToken(keyword)) errors.push(`${index + 1}번 키워드가 정상 한국어가 아닙니다.`);
      });
    }
    if (Array.isArray(q.requiredKeywords)) {
      q.requiredKeywords.forEach((keyword, index) => {
        if (!isKoreanToken(keyword)) errors.push(`${index + 1}번 필수 키워드가 정상 한국어가 아닙니다.`);
      });
    }
  } else {
    errors.push("answerType은 multiple_choice 또는 short_answer여야 합니다.");
  }

  errors.push(...validateDifficultyRequirements(q, settings.difficulty));
  return errors;
}

function extractJsonText(text: string) {
  if (!text) return "";
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```json/i, "").replace(/^```/i, "").replace(/```$/i, "").trim();
  }
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  return first >= 0 && last > first ? cleaned.slice(first, last + 1) : cleaned;
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
  const guidance: Record<string, string> = {
    easy: [
      "easy 난이도 조건:",
      "- 지문은 1문단, 3~4문장, 120~250자입니다.",
      "- 초등 고학년부터 중학생도 이해 가능한 어휘를 사용합니다.",
      "- 중심 내용, 세부 내용, 단순 추론을 묻습니다.",
      "- 해설은 25자 이상입니다."
    ].join("\n"),
    normal: [
      "normal 난이도 조건:",
      "- 지문은 1~2문단, 4~7문장, 220~500자입니다.",
      "- 고등학생 수준의 어휘와 문장 구조를 사용합니다.",
      "- 주장, 근거, 간단한 추론을 함께 묻습니다.",
      "- 해설은 40자 이상이고 객관식 선택지는 각각 5자 이상입니다."
    ].join("\n"),
    hard: [
      "hard 난이도 조건:",
      "- 지문은 2~3문단, 7~12문장, 500~900자입니다.",
      "- 추상 개념과 복합 문장을 사용합니다.",
      "- 반론, 조건, 예외, 비교 구조를 포함하고 2~3단계 추론을 요구합니다.",
      "- 해설은 70자 이상입니다."
    ].join("\n"),
    expert: [
      "expert 난이도 조건:",
      "- 지문은 반드시 4~6문단입니다. 각 문단은 빈 줄 한 개, 즉 \\n\\n로 구분합니다.",
      "- 전체 지문은 1000~1700자이고 최소 14문장 이상입니다.",
      "- 주제는 철학, 사회과학, 법/정책, 경제, 과학철학, 언어학, 미학, 문학비평 중 하나를 사용합니다.",
      "- 단순 정보 확인 문제가 아니라 논증 구조, 반론, 조건, 함의를 종합해야 풀 수 있어야 합니다.",
      "- 정답은 지문 전체 구조를 이해해야 고를 수 있어야 합니다.",
      "- 선택지 4개 중 2개 이상은 그럴듯하지만 전체 논리와 충돌하는 함정이어야 합니다.",
      "- 해설은 정답 근거와 오답 배제 이유를 포함하고 최소 120자 이상이어야 합니다.",
      "- 객관식 선택지는 각각 12자 이상이어야 합니다.",
      "- 영어 문장, 중국어, 일본어, 깨진 문자, 의미 없는 기호가 포함되면 실패입니다.",
      "- JSON key는 영어로 유지하되, JSON value는 모두 자연스러운 한국어로 작성합니다."
    ].join("\n")
  };
  return `${guidance[settings.difficulty] || guidance.normal}${settings.difficultyBoost ? "\n난이도 강화가 켜져 있으므로 지문을 더 촘촘하게 구성하고 오답의 매력도를 높입니다." : ""}`;
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
        passage: "한국어 지문을 여기에 작성합니다. 여러 문단이 필요하면 \\n\\n로 구분합니다.",
        question: "한국어 질문을 여기에 작성합니다.",
        options: ["한국어 선택지 하나", "한국어 선택지 둘", "한국어 선택지 셋", "한국어 선택지 넷"],
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
    "- 영어 문장, 영어 선택지, 영어 해설, 영어 키워드는 절대 넣지 않습니다.",
    "- 중국어, 일본어, 한자 남용, 깨진 문자, 물음표가 섞인 비정상 문자열, 의미 없는 특수문자는 절대 넣지 않습니다.",
    "- JSON key 이름은 아래 예시의 영어 key를 그대로 사용하되, 학습자가 보는 모든 value는 자연스러운 한국어여야 합니다.",
    `- 검증 후 최소 ${requested}개가 남도록 ${generateCount}개의 문제를 생성합니다.`,
    `- difficulty 값은 반드시 "${settings.difficulty}"만 사용합니다.`,
    `- type은 다음 allowedTypes 중에서만 고릅니다: ${settings.selectedTypes.join(", ")}`,
    `- includeShortAnswer: ${settings.includeShortAnswer}`,
    settings.includeShortAnswer
      ? "- answerType은 multiple_choice와 short_answer를 섞어도 됩니다."
      : "- includeShortAnswer가 false이므로 answerType은 반드시 multiple_choice만 사용합니다.",
    "- multiple_choice는 options 4개와 answer 0~3 정수 인덱스를 반드시 포함합니다.",
    "- short_answer는 sampleAnswers, keywords, requiredKeywords를 비어 있지 않은 한국어 배열로 포함합니다.",
    "",
    difficultyGuidance(settings),
    retryReason
      ? [
        "",
        "이전 응답은 한국어/난이도/형식 조건을 만족하지 못했습니다.",
        `실패 이유: ${retryReason}`,
        "이번에는 반드시 조건을 지키세요. 깨진 문자, 영어, 짧은 지문은 실패입니다."
      ].join("\n")
      : "",
    "",
    "반환 형식 예시:",
    JSON.stringify(schemaExample, null, 2)
  ].filter(Boolean).join("\n");
}

function getModelOrder(settings: Settings) {
  const selectedModel = USE_PAID_OPENROUTER_MODELS
    ? PAID_MODEL_BY_DIFFICULTY[settings.difficulty] || PAID_DEEPSEEK_MODEL
    : MODEL_BY_DIFFICULTY[settings.difficulty] || AUTO_MODEL;
  return [...new Set([selectedModel, ...FALLBACK_MODELS])];
}

function getSelectedModel(settings: Settings) {
  return getModelOrder(settings)[0] || AUTO_MODEL;
}

function settingsTemperature(model: string) {
  return model === AUTO_MODEL ? 0.66 : 0.58;
}

async function callOpenRouter({ apiKey, model, prompt }: { apiKey: string; model: string; prompt: string }): Promise<OpenRouterResult> {
  const response = await fetch(OPENROUTER_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json; charset=utf-8",
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
            "학습자가 보는 모든 문자열은 자연스러운 한국어로만 작성합니다.",
            "영어, 중국어, 일본어, 깨진 문자, 의미 없는 기호가 포함되면 실패입니다."
          ].join(" ")
        },
        { role: "user", content: prompt }
      ],
      temperature: settingsTemperature(model)
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

  const content = (payload as { choices?: Array<{ message?: { content?: string } }> })?.choices?.[0]?.message?.content;
  if (!content) {
    const error = new Error("OpenRouter 모델 응답 content가 비어 있습니다.");
    (error as Error & { detail?: Record<string, unknown> }).detail = { payload };
    throw error;
  }

  return { model, payload, rawText: content, parsed: parseQuestionsJson(content) };
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
    .filter((_, index) => reports[index].errors.length === 0)
    .slice(0, settings.count);
  return { rawQuestionCount: rawQuestions.length, reports, questions };
}

function retryReasonFromReports(reports: ValidationReport[], settings: Settings) {
  const summary = summarizeValidationErrors(reports).join("; ");
  const expertHint = settings.difficulty === "expert"
    ? " expert는 4문단 이상, 16문장 이상, 1200자 이상, 해설 120자 이상을 반드시 지켜야 합니다."
    : "";
  return `${summary || "검증을 통과한 문제가 없습니다."} 모든 사용자 표시 문자열을 정상 한국어로 다시 작성하세요.${expertHint}`;
}

async function generateWithRetry(apiKey: string, settings: Settings) {
  const models = getModelOrder(settings);
  const failures: Array<Record<string, unknown>> = [];
  let retryReason = "";
  let lastModel = models[0] || "";
  const maxAttempts = 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const model = models[(attempt - 1) % models.length] || models[0];
    lastModel = model;
    const prompt = buildPrompt(settings, retryReason);
    try {
      console.log("OpenRouter generate-questions request", {
        provider: PROVIDER,
        model,
        attempt,
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
        attempt,
        rawQuestionCount: validation.rawQuestionCount,
        validQuestionCount: validation.questions.length,
        validationSummary: summarizeValidationErrors(validation.reports),
        preview: result.rawText.slice(0, 1200)
      });

      if (validation.questions.length >= 1) {
        return {
          result,
          questions: validation.questions,
          rawQuestionCount: validation.rawQuestionCount,
          validationReports: validation.reports,
          attempt
        };
      }

      retryReason = retryReasonFromReports(validation.reports, settings);
      failures.push({
        kind: "validation",
        provider: PROVIDER,
        model,
        attempt,
        rawQuestionCount: validation.rawQuestionCount,
        validQuestionCount: validation.questions.length,
        validationSummary: summarizeValidationErrors(validation.reports),
        validationReports: validation.reports.slice(0, 10),
        responsePreview: result.rawText.slice(0, 1200)
      });
    } catch (error) {
      const detail = (error as Error & { detail?: Record<string, unknown> }).detail || serializeDetail(error);
      console.error("OpenRouter generation failed", { model, error: (error as Error)?.message || String(error), detail });
      failures.push({
        kind: "api",
        provider: PROVIDER,
        model,
        attempt,
        error: (error as Error)?.message || String(error),
        ...((detail && typeof detail === "object") ? detail : { detail })
      });
      retryReason = (error as Error)?.message || String(error);
    }
  }

  const error = new Error("한국어와 난이도 조건을 만족하는 문제를 생성하지 못했습니다.");
  (error as Error & { detail?: Record<string, unknown> }).detail = {
    provider: PROVIDER,
    summary: summarizeGenerationFailure("validation failed", failures),
    failures,
    required: settings.difficulty === "expert"
      ? "expert 문제는 정상 한국어, 1000자 이상 지문, 4문단 이상, 14문장 이상, 120자 이상 해설을 통과해야 합니다."
      : "모든 사용자 표시 문자열은 정상 한국어이고 난이도별 길이 조건을 통과해야 합니다."
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
    const selectedModel = getSelectedModel(settings);
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
    return errorResponse("AI question generation failed", err.detail || err, 500, err.model || "");
  }
});
