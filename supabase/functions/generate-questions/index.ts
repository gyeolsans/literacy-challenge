const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8"
};

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

const DEFAULT_TYPES_BY_DIFFICULTY: Record<string, string[]> = {
  easy: ["main_idea", "title", "summary", "vocabulary", "context_meaning"],
  normal: ["main_idea", "title", "summary", "inference", "vocabulary", "context_meaning", "claim", "evidence"],
  hard: ["inference", "context_meaning", "claim", "evidence", "attitude", "blank", "summary", "critical_thinking"],
  expert: ["inference", "critical_thinking", "context_meaning", "claim", "evidence", "attitude", "blank", "summary"]
};

const DIFFICULTY_GUIDES: Record<string, string> = {
  easy: [
    "easy:",
    "- 1문단, 3~4문장",
    "- 쉬운 어휘와 짧은 문장",
    "- 중심 내용, 제목, 세부 내용 위주",
    "- 보기 차이가 명확해야 함"
  ].join("\n"),
  normal: [
    "normal:",
    "- 1~2문단, 5~7문장",
    "- 고등학생 수준의 일반 교양 어휘",
    "- 주장, 근거, 문맥상 의미, 간단한 추론 포함",
    "- 일부 헷갈리는 보기를 포함"
  ].join("\n"),
  hard: [
    "hard:",
    "- 2~3문단, 8~11문장",
    "- 추상 개념어와 복합 문장 포함",
    "- 2~3단계 추론 필요",
    "- 원인/결과를 뒤집거나 부분적으로만 맞는 함정 보기 포함"
  ].join("\n"),
  expert: [
    "expert:",
    "- 3~4문단, 12~16문장",
    "- 철학, 사회과학, 과학철학, 경제, 문학 비평 등 고급 주제",
    "- 문제 제기, 개념 정의, 대립 관점, 반론, 종합 구조 포함",
    "- 3~4단계 추론 필요",
    "- 한 문장만 보고 풀 수 없고 지문 전체 논리 구조를 이해해야 함",
    "- 모든 선택지는 그럴듯하되 정답은 전체 논증과 맞아야 함"
  ].join("\n")
};

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

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function normalizeBody(body: Record<string, unknown>): Settings {
  const difficulty = ALLOWED_DIFFICULTIES.has(String(body?.difficulty)) ? String(body.difficulty) : "normal";
  const count = Math.min(15, Math.max(1, Number(body?.count || 5)));
  const providedTypes = Array.isArray(body?.selectedTypes)
    ? body.selectedTypes.map(String).filter((type) => ALLOWED_TYPES.has(type))
    : [];
  const selectedTypes = providedTypes.length ? providedTypes : DEFAULT_TYPES_BY_DIFFICULTY[difficulty];
  return {
    difficulty,
    count,
    includeShortAnswer: body?.includeShortAnswer !== false,
    selectedTypes,
    difficultyBoost: Boolean(body?.difficultyBoost)
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
  const answerType = q.answerType === "short_answer" ? "short_answer" : "multiple_choice";
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
  const output = Array.isArray(payload.output) ? payload.output : [];
  const chunks: string[] = [];
  for (const item of output as Array<Record<string, unknown>>) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const part of content as Array<Record<string, unknown>>) {
      if (typeof part?.text === "string") chunks.push(part.text);
      if (typeof part?.output_text === "string") chunks.push(part.output_text);
    }
  }
  return chunks.join("\n").trim();
}

function extractJson(text: string) {
  const trimmed = String(text || "").trim();
  if (!trimmed) throw new Error("AI 응답이 비어 있습니다.");
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("AI 응답에서 JSON 객체를 찾지 못했습니다.");
    return JSON.parse(match[0]);
  }
}

function buildPrompt(settings: Settings) {
  const aiCount = settings.count + 3;
  const boostGuide = settings.difficultyBoost
    ? [
      "difficultyBoost=true 추가 조건:",
      "- 문장 수를 20~30% 늘릴 것",
      "- 보기 함정을 강화할 것",
      "- 추론 단계를 늘릴 것",
      "- 어휘 수준을 한 단계 높일 것"
    ].join("\n")
    : "difficultyBoost=false";

  return [
    "너는 한국어 문해력 평가 문항을 만드는 교육 전문가다.",
    "아래 조건을 지켜 JSON만 반환하라. 마크다운 코드블록, 설명 문장, 주석은 절대 쓰지 마라.",
    "",
    `최종 요청 문제 수: ${settings.count}`,
    `생성 요청 문제 수: ${aiCount}`,
    `난이도: ${settings.difficulty}`,
    `주관식 포함: ${settings.includeShortAnswer}`,
    `허용 문제 유형: ${settings.selectedTypes.join(", ")}`,
    "",
    DIFFICULTY_GUIDES[settings.difficulty],
    boostGuide,
    "",
    "공통 조건:",
    "- 모든 지문, 질문, 보기, 해설은 한국어로 작성한다.",
    "- 문제끼리 지문과 발문이 중복되지 않게 만든다.",
    "- id는 ai-001, ai-002처럼 부여한다.",
    "- source는 ai로 둔다.",
    "- answerType은 multiple_choice 또는 short_answer만 사용한다.",
    "- selectedTypes 목록에 있는 type만 사용한다.",
    "- includeShortAnswer=false이면 short_answer 문제를 만들지 않는다.",
    "",
    "객관식 문제 형식:",
    "- options는 정확히 4개",
    "- answer는 정답 index 0~3 숫자",
    "- points는 10",
    "",
    "주관식 문제 형식:",
    "- sampleAnswers 배열 필수",
    "- keywords 배열 필수",
    "- requiredKeywords 배열 필수이며 최소 1개",
    "- points는 15",
    "",
    "반환 JSON 형식:",
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
        },
        {
          id: "ai-002",
          difficulty: settings.difficulty,
          type: "summary",
          answerType: "short_answer",
          passage: "지문",
          question: "질문",
          sampleAnswers: ["모범답안1", "모범답안2"],
          keywords: ["핵심어1", "핵심어2", "핵심어3"],
          requiredKeywords: ["필수핵심어1"],
          explanation: "해설",
          points: 15,
          source: "ai"
        }
      ]
    })
  ].join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "POST 요청만 허용됩니다." }, 405);

  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  if (!OPENAI_API_KEY) {
    return jsonResponse({ error: "OPENAI_API_KEY가 설정되어 있지 않습니다. Supabase Secret을 설정하세요." }, 500);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const settings = normalizeBody(body);
    const openAiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: Deno.env.get("OPENAI_MODEL") || "gpt-4.1-mini",
        input: buildPrompt(settings),
        temperature: 0.8
      })
    });

    const payload = await openAiResponse.json().catch(() => ({}));
    if (!openAiResponse.ok) {
      console.error("OpenAI API error", payload);
      return jsonResponse({ error: payload?.error?.message || "OpenAI API 호출에 실패했습니다." }, openAiResponse.status);
    }

    const rawText = extractOutputText(payload);
    let parsed;
    try {
      parsed = extractJson(rawText);
    } catch (error) {
      console.error("AI JSON parse failed. Raw response:", rawText);
      const message = error instanceof Error ? error.message : "AI 응답 JSON 파싱에 실패했습니다.";
      return jsonResponse({ error: message }, 502);
    }

    const questions = Array.isArray(parsed?.questions) ? parsed.questions : [];
    const cleanedQuestions = questions
      .map((q: Question, index: number) => normalizeQuestion(q, settings, index))
      .filter(validateQuestion)
      .slice(0, settings.count);

    return jsonResponse({
      questions: cleanedQuestions,
      requestedCount: settings.count,
      returnedCount: cleanedQuestions.length,
      shortage: Math.max(0, settings.count - cleanedQuestions.length)
    });
  } catch (error) {
    console.error("generate-questions failed", error);
    const message = error instanceof Error ? error.message : "AI 문제 생성 중 오류가 발생했습니다.";
    return jsonResponse({ error: message }, 500);
  }
});
