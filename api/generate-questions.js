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

const DEFAULT_TYPES_BY_DIFFICULTY = {
  easy: ["main_idea", "title", "summary", "vocabulary", "context_meaning"],
  normal: ["main_idea", "title", "summary", "inference", "vocabulary", "context_meaning", "claim", "evidence"],
  hard: ["inference", "context_meaning", "claim", "evidence", "attitude", "blank", "summary", "critical_thinking"],
  expert: ["inference", "critical_thinking", "context_meaning", "claim", "evidence", "attitude", "blank", "summary"]
};

const DIFFICULTY_GUIDES = {
  easy: `
난이도 easy:
- 지문 길이: 1문단, 3~4문장
- 문장 길이: 짧고 단순한 문장
- 어휘 수준: 중학생도 쉽게 이해할 수 있는 일상적 어휘
- 문단 구조: 단순한 원인-결과, 설명, 사례 중심
- 문제 유형: 중심 내용, 세부 내용, 제목 찾기 위주
- 추론 단계: 거의 1단계
- 보기: 정답과 오답이 명확하게 구분되어야 하며 함정 보기는 거의 쓰지 않는다.
`,
  normal: `
난이도 normal:
- 지문 길이: 1~2문단, 5~7문장
- 문장 길이: 중간 길이
- 어휘 수준: 고등학생 수준의 일반 교양 어휘
- 문단 구조: 주장-근거, 비교, 간단한 대조 포함
- 문제 유형: 중심 내용, 주장, 근거, 문맥상 의미, 간단한 추론
- 추론 단계: 1~2단계
- 보기: 일부 헷갈리는 선택지를 포함하고, 지문의 일부만 맞는 보기를 넣는다.
`,
  hard: `
난이도 hard:
- 지문 길이: 2~3문단, 8~11문장
- 문장 길이: 길고 복합적인 문장 포함
- 어휘 수준: 고급 교양어와 추상적 개념어 포함
- 문단 구조: 주장-반론-재반론, 비교와 대조, 조건부 논리 포함
- 문제 유형: 추론, 비판적 사고, 글쓴이 태도, 빈칸 추론, 문맥상 의미 중심
- 추론 단계: 2~3단계
- 보기: 서로 비슷한 선택지와 원인/결과를 뒤집은 오답, 지문 표현을 가져왔지만 핵심 논지와 어긋나는 오답을 포함한다.
`,
  expert: `
난이도 expert:
- 지문 길이: 3~4문단, 12~16문장
- 문장 길이: 긴 복문, 삽입구, 대조 구조, 조건절이 포함된 문장
- 어휘 수준: 고급 학술어, 추상적 개념어, 철학/사회과학/과학/경제/문학 비평 어휘 포함
- 문단 구조: 문제 제기, 개념 정의, 대립 관점 제시, 반론 또는 한계 제시, 종합적 결론
- 문제 유형: 고난도 추론, 비판적 사고, 관점 비교, 전제 파악, 논리적 빈칸 추론, 숨은 태도 파악, 핵심 개념의 문맥상 의미
- 추론 단계: 3~4단계
- 정답은 지문 전체 구조를 이해해야 고를 수 있게 만들고, 한 문장만 보고 풀 수 있는 문제는 금지한다.
- 지문 안에 정답 문장을 그대로 노출하지 않는다.
- 모든 보기가 그럴듯해야 하며, 정답은 지문 전체의 논리 구조와 관점 차이를 이해해야만 고를 수 있게 만들어라.
`
};

const TOPIC_GUIDES = {
  easy: "일상생활, 학교생활, 환경 보호, 독서, 습관, 친구 관계",
  normal: "기술과 사회, 미디어, 교육, 소비문화, 과학 교양, 공정성, 공동체",
  hard: "알고리즘과 편향, 과학적 설명의 한계, 경제적 선택과 윤리, 예술의 해석, 사회 제도와 개인, 언어와 사고, 정보 과잉",
  expert: "인식론, 과학철학, 사회계약, 시장 효율성과 외부성, 알고리즘 통치성, 문학 비평, 기억과 정체성, 언어의 지시성과 의미, 기술 발전과 규범 윤리, 민주주의와 숙의, 지식의 객관성과 해석의 문제"
};

const OPTION_TRAP_GUIDES = {
  easy: "- 정답과 오답이 명확하게 구분되게 한다.",
  normal: "- 일부 표현이 비슷한 오답과 지문의 일부만 맞는 오답을 포함한다.",
  hard: "- 지문의 일부 내용만 맞는 오답, 원인과 결과를 뒤집은 오답, 글쓴이의 태도를 과장한 오답을 포함한다.",
  expert: "- 필요조건과 충분조건을 바꾼 오답, 부분적으로는 맞지만 전체 논지와 어긋나는 오답, 지문 표현을 그대로 쓰지만 맥락을 왜곡한 오답, 일반 상식으로는 맞아 보이나 지문에서는 뒷받침되지 않는 오답, 대립 관점의 주장을 글쓴이의 주장처럼 바꾼 오답을 반드시 포함한다."
};

const SHORT_ANSWER_GUIDES = {
  easy: "- 한 문장 요약, 핵심어 2~3개",
  normal: "- 중심 주장과 근거를 포함한 요약, 핵심어 3~4개",
  hard: "- 글쓴이의 주장, 반론, 결론을 포함한 요약, 핵심어 4~5개, requiredKeywords 2개 이상",
  expert: "- 글 전체의 논증 구조를 요약하고 대립 관점과 글쓴이의 최종 입장을 함께 반영한다. 핵심어 5~7개, requiredKeywords 3개 이상. 단순 키워드 나열만으로는 정답 처리되지 않도록 모범답안을 구체적으로 작성한다."
};

const ADVANCED_WORDS = [
  "인식론", "규범", "담론", "외부성", "정당화", "상호주관성", "해석", "전제", "귀납", "연역",
  "환원", "구조", "매개", "제도", "합리성", "객관성", "상대성", "필요조건", "충분조건",
  "반론", "재반론", "논증", "타당성", "맥락", "함의", "숙의", "통치성", "자율성", "규범 윤리"
];

function normalizeBody(body) {
  const difficulty = ALLOWED_DIFFICULTIES.has(body?.difficulty) ? body.difficulty : "normal";
  const count = Math.min(20, Math.max(1, Number(body?.count || 5)));
  const includeShortAnswer = Boolean(body?.includeShortAnswer);
  const providedTypes = Array.isArray(body?.selectedTypes)
    ? body.selectedTypes.filter((type) => ALLOWED_TYPES.has(type))
    : [];
  const selectedTypes = providedTypes.length ? providedTypes : DEFAULT_TYPES_BY_DIFFICULTY[difficulty];

  return {
    difficulty,
    count,
    includeShortAnswer,
    selectedTypes: selectedTypes.length ? selectedTypes : DEFAULT_TYPES_BY_DIFFICULTY.normal,
    difficultyBoost: Boolean(body?.difficultyBoost)
  };
}

function validateQuestion(q) {
  if (!q || typeof q !== "object") return false;
  if (!q.passage || !q.question || !q.explanation) return false;
  if (!ALLOWED_DIFFICULTIES.has(q.difficulty)) return false;
  if (!ALLOWED_TYPES.has(q.type)) return false;

  if (q.answerType === "multiple_choice") {
    return Array.isArray(q.options) &&
      q.options.length === 4 &&
      Number.isInteger(q.answer) &&
      q.answer >= 0 &&
      q.answer <= 3;
  }

  if (q.answerType === "short_answer") {
    return Array.isArray(q.sampleAnswers) &&
      q.sampleAnswers.length > 0 &&
      Array.isArray(q.keywords) &&
      q.keywords.length > 0 &&
      Array.isArray(q.requiredKeywords);
  }

  return false;
}

function estimateDifficultyScore(question) {
  const passage = question?.passage || "";
  const sentenceCount = passage.split(/[.!?。！？]|[.?!]\s|\n/).filter((part) => part.trim().length > 8).length;
  const paragraphCount = passage.split(/\n+/).filter((p) => p.trim()).length;
  const charLength = passage.length;

  let score = 0;
  if (charLength > 250) score += 1;
  if (charLength > 500) score += 2;
  if (charLength > 800) score += 3;
  if (sentenceCount >= 6) score += 1;
  if (sentenceCount >= 10) score += 2;
  if (sentenceCount >= 14) score += 3;
  if (paragraphCount >= 2) score += 1;
  if (paragraphCount >= 3) score += 2;
  if (question?.answerType === "short_answer") score += 1;
  if (["inference", "critical_thinking", "context_meaning", "attitude", "blank"].includes(question?.type)) score += 1;

  const advancedCount = ADVANCED_WORDS.filter((word) => passage.includes(word)).length;
  score += Math.min(advancedCount, 5);

  return score;
}

function meetsDifficultyFloor(question, difficulty) {
  const score = estimateDifficultyScore(question);
  const floors = { easy: 0, normal: 2, hard: 5, expert: 8 };
  return score >= floors[difficulty];
}

function extractJson(text) {
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

function buildPrompt(settings) {
  const difficultyGuide = DIFFICULTY_GUIDES[settings.difficulty] || DIFFICULTY_GUIDES.normal;
  const topicGuide = TOPIC_GUIDES[settings.difficulty] || TOPIC_GUIDES.normal;
  const optionTrapGuide = OPTION_TRAP_GUIDES[settings.difficulty] || OPTION_TRAP_GUIDES.normal;
  const shortAnswerGuide = SHORT_ANSWER_GUIDES[settings.difficulty] || SHORT_ANSWER_GUIDES.normal;
  const boostGuide = settings.difficultyBoost
    ? [
      "추가 난이도 강화(difficultyBoost=true):",
      "- 지문 문장 수를 기본 기준보다 20~30% 늘린다.",
      "- expert는 4문단 이상도 허용한다.",
      "- 보기 함정을 더 강하게 만들고 모든 오답을 그럴듯하게 만든다.",
      "- 추론 단계를 1단계 증가시킨다.",
      "- 어휘 수준을 한 단계 더 높인다."
    ].join("\n")
    : "";

  return [
    "너는 한국어 문해력 평가 문항을 만드는 교육 전문가다.",
    "아래 조건을 지켜 JSON만 반환하라. 마크다운 코드블록, 설명 문장, 주석은 절대 쓰지 마라.",
    "",
    `난이도: ${settings.difficulty}`,
    `문제 수: ${settings.count}`,
    `주관식 포함 여부: ${settings.includeShortAnswer}`,
    `난이도 강화 요청: ${settings.difficultyBoost}`,
    `허용 문제 유형: ${settings.selectedTypes.join(", ")}`,
    "",
    difficultyGuide,
    "",
    `권장 주제 범위: ${topicGuide}`,
    settings.difficulty === "expert" ? "expert에서는 지나치게 쉬운 일상 주제를 피하고, 지문 전체 논증 구조가 드러나는 고급 주제를 사용하라." : "",
    "",
    "공통 조건:",
    "- 모든 지문, 질문, 보기, 해설은 한국어로 작성한다.",
    "- 정치적 선동, 혐오, 선정적 내용, 개인정보 관련 내용은 금지한다.",
    "- 문제끼리 지문과 발문이 중복되지 않게 만든다.",
    "- difficultyGuide의 지문 길이, 문단 수, 어휘 수준, 추론 단계, 보기 함정 기준을 반드시 따른다.",
    "- main_idea나 title 유형도 expert에서는 단순 중심/제목 찾기가 아니라 전체 논지 구조를 반영한 고난도 핵심 논지 문제로 만든다.",
    "",
    "객관식 조건:",
    "- answerType은 multiple_choice다.",
    "- options는 정확히 4개다.",
    "- answer는 정답 보기의 index 숫자 0~3이다.",
    "- points는 10을 권장한다.",
    optionTrapGuide,
    "expert 난이도에서는 모든 보기가 그럴듯해야 하며, 정답은 지문 전체의 논리 구조와 관점 차이를 이해해야만 고를 수 있게 만들어라.",
    "",
    "주관식 조건:",
    "- answerType은 short_answer다.",
    "- sampleAnswers, keywords, requiredKeywords 배열을 반드시 포함한다.",
    "- points는 15를 권장한다.",
    shortAnswerGuide,
    "",
    "난이도 자기검증:",
    "- 각 문제에는 difficultyMeta를 포함하고, 해당 문제가 왜 그 난이도에 해당하는지 내부 지표를 작성하라.",
    "- difficultyMeta 예: { paragraphCount, sentenceCount, reasoningSteps, vocabularyLevel, trapOptions }",
    boostGuide,
    "",
    "반환 스키마:",
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
          difficultyMeta: {
            paragraphCount: 1,
            sentenceCount: 4,
            reasoningSteps: 1,
            vocabularyLevel: "basic",
            trapOptions: []
          },
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
          difficultyMeta: {
            paragraphCount: 2,
            sentenceCount: 7,
            reasoningSteps: 2,
            vocabularyLevel: "intermediate",
            trapOptions: ["부분적으로 맞지만 전체 논지와 어긋나는 보기"]
          },
          points: 15,
          source: "ai"
        }
      ]
    })
  ].join("\n");
}

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "POST 요청만 허용됩니다." });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "OPENAI_API_KEY 환경 변수가 설정되어 있지 않습니다." });
  }

  const settings = normalizeBody(req.body || {});
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model,
        temperature: 0.75,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "너는 안전하고 교육적인 한국어 문해력 평가 문항을 JSON으로만 생성하는 도우미다."
          },
          {
            role: "user",
            content: buildPrompt(settings)
          }
        ]
      })
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      return res.status(response.status).json({
        error: payload?.error?.message || "OpenAI API 호출에 실패했습니다."
      });
    }

    const content = payload?.choices?.[0]?.message?.content;
    const parsed = extractJson(content);
    const questions = Array.isArray(parsed.questions) ? parsed.questions : [];
    const normalizedQuestions = questions
      .map((q, index) => ({
        ...q,
        id: q.id || `ai-${Date.now()}-${index + 1}`,
        difficulty: q.difficulty || settings.difficulty,
        points: Number(q.points || (q.answerType === "short_answer" ? 15 : 10)),
        source: "ai"
      }))
      .filter(validateQuestion);
    const validQuestions = normalizedQuestions
      .filter((q) => meetsDifficultyFloor(q, settings.difficulty))
      .map((q) => ({
        ...q,
        difficultyScore: estimateDifficultyScore(q)
      }))
      .slice(0, settings.count);
    const rejectedByDifficulty = normalizedQuestions.length - validQuestions.length;

    if (!validQuestions.length) {
      return res.status(502).json({
        error: "AI가 난이도 기준을 충족하는 문제를 반환하지 않았습니다.",
        requestedCount: settings.count,
        returnedCount: 0,
        rejectedByDifficulty
      });
    }

    return res.status(200).json({
      questions: validQuestions,
      requestedCount: settings.count,
      returnedCount: validQuestions.length,
      shortage: Math.max(0, settings.count - validQuestions.length),
      rejectedByDifficulty
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "AI 응답 JSON 파싱 또는 문제 생성 중 오류가 발생했습니다."
    });
  }
};
