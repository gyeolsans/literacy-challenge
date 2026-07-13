console.log("DEPLOY_VERSION", "test-guest-mode-v1");
console.log("APP_CONFIG_AT_START", window.APP_CONFIG);
window.DEPLOY_VERSION = "test-guest-mode-v1";
window.DEBUG_MODE = true;

function debugLog(scope, message, data) {
  if (!window.DEBUG_MODE) return;
  console.log(`[${scope}] ${message}`, data ?? "");
}

function debugError(scope, message, error) {
  window[`LAST_${String(scope).split(".")[0].toUpperCase()}_ERROR`] = error;
  console.error(`[${scope}] ${message}`, error);
  window.showNotice?.(`${scope}: ${message} - ${error?.message || error}`, "error", 0);
}

function formatSupabaseError(error, context = {}) {
  if (!error) return "unknown error";
  const metadata = {
    functionName: context.functionName || error.functionName,
    table: context.table || error.table,
    queryType: context.queryType || error.queryType,
    stage: context.stage || error.stage
  };
  const parts = [
    metadata.functionName && `function=${metadata.functionName}`,
    metadata.table && `table=${metadata.table}`,
    metadata.queryType && `query=${metadata.queryType}`,
    metadata.stage && `stage=${metadata.stage}`,
    error.message && `message=${error.message}`,
    error.code && `code=${error.code}`,
    error.details && `details=${error.details}`,
    error.hint && `hint=${error.hint}`,
    error.status && `status=${error.status}`,
    error.statusText && `statusText=${error.statusText}`
  ].filter(Boolean);
  return parts.length ? parts.join(" / ") : String(error);
}

window.debugLog = debugLog;
window.debugError = debugError;
window.formatSupabaseError = formatSupabaseError;

const app = document.querySelector("#app");
const navButtons = [...document.querySelectorAll("[data-nav]")];
const nicknameDialog = document.querySelector("#nicknameDialog");
const nicknameForm = document.querySelector("#nicknameForm");
const nicknameInput = document.querySelector("#nicknameInput");
const nicknameError = document.querySelector("#nicknameError");

const STORAGE_KEYS = {
  nickname: "literacy.nickname",
  aiQuestions: "aiQuestions",
  rankings: "literacy.rankings",
  histories: "literacy.histories",
  wrongNotes: "literacy.wrongNotes",
  testProgress: "literacy.testProgress",
  today: "literacy.today",
  lastResult: "literacy.lastResult",
  adminAuthed: "literacy.adminAuthed",
  notice: "literacy.lastNotice",
  anonymousUserId: "literacy.anonymousUserId",
  currentRoomId: "currentRoomId",
  currentRoomUserId: "currentRoomUserId",
  currentRoomMode: "currentRoomMode",
  currentRankedMatchId: "currentRankedMatchId"
};

const TYPE_LABELS = {
  main_idea: "중심 내용 찾기",
  title: "제목 붙이기",
  summary: "요약하기",
  inference: "추론",
  critical_thinking: "비판적 사고",
  vocabulary: "어휘 의미",
  context_meaning: "문맥 의미",
  claim: "주장 파악",
  evidence: "근거 찾기",
  attitude: "글쓴이의 태도",
  blank: "빈칸 추론"
};

const DIFFICULTY_LABELS = {
  easy: "easy",
  normal: "normal",
  hard: "hard",
  expert: "expert"
};

const DIFFICULTY_DESCRIPTIONS = {
  easy: "짧은 지문과 명확한 보기로 기본 독해력을 확인합니다.",
  normal: "일반적인 지문에서 주장과 근거를 파악합니다.",
  hard: "복합적인 문장과 추상적 개념을 바탕으로 추론합니다.",
  expert: "긴 지문에서 전제, 관점, 논리 관계를 분석합니다."
};

const SAMPLE_QUESTIONS = [
  {
    id: "sample-001",
    difficulty: "easy",
    type: "main_idea",
    answerType: "multiple_choice",
    passage: "도서관은 책을 빌리는 공간을 넘어 지역 사람들이 지식을 나누는 장소가 되고 있다. 여러 도서관은 독서 모임, 글쓰기 수업, 어린이 과학 교실을 운영한다. 이러한 프로그램은 사람들이 혼자 읽는 데서 그치지 않고 생각을 서로 비교하게 돕는다.",
    question: "이 글의 중심 내용으로 가장 알맞은 것은?",
    options: ["도서관은 책 보관에만 집중해야 한다.", "도서관은 지역의 배움과 소통 공간으로 확장되고 있다.", "어린이 과학 교실은 독서와 관련이 없다.", "독서 모임은 혼자 책 읽는 습관을 막는다."],
    answer: 1,
    explanation: "글은 도서관이 다양한 프로그램을 통해 지역 배움과 소통의 공간이 된다는 점을 설명합니다.",
    points: 10,
    source: "sample"
  },
  {
    id: "sample-002",
    difficulty: "normal",
    type: "summary",
    answerType: "short_answer",
    passage: "일회용품을 줄이는 일은 개인의 습관만으로 완성되기 어렵다. 텀블러를 쓰는 사람이 많아도 매장에 세척 시설이 없으면 지속하기 힘들다. 따라서 개인의 실천과 함께 기업의 운영 방식, 지역의 재사용 시스템이 함께 바뀌어야 한다.",
    question: "이 글을 한 문장으로 요약하세요.",
    sampleAnswers: ["일회용품을 줄이려면 개인 실천뿐 아니라 기업과 지역 시스템의 변화가 함께 필요하다.", "재사용 문화를 만들기 위해 개인, 기업, 지역이 함께 움직여야 한다."],
    keywords: ["일회용품", "개인", "기업", "지역", "시스템", "변화"],
    requiredKeywords: ["일회용품", "시스템"],
    explanation: "핵심은 개인 습관만이 아니라 사회적 시스템 변화가 함께 필요하다는 것입니다.",
    points: 15,
    source: "sample"
  },
  {
    id: "sample-003",
    difficulty: "normal",
    type: "inference",
    answerType: "multiple_choice",
    passage: "민지는 발표 자료를 만들 때 처음에는 화면을 화려하게 꾸미는 데 집중했다. 하지만 친구들이 발표 내용을 잘 기억하지 못하자 다음 발표에서는 핵심 문장과 예시를 먼저 정리했다. 발표 뒤 친구들은 민지가 말하려는 내용을 쉽게 따라갈 수 있었다고 말했다.",
    question: "민지가 다음 발표에서 깨달았을 내용으로 가장 적절한 것은?",
    options: ["시각 효과가 많을수록 전달력이 좋아진다.", "발표 자료에는 예시를 넣으면 안 된다.", "전달하려는 핵심을 분명히 정리하는 것이 중요하다.", "친구들의 반응은 발표 개선과 관련이 없다."],
    answer: 2,
    explanation: "핵심 문장과 예시를 정리한 뒤 전달력이 좋아졌으므로 핵심 정리의 중요성을 깨달았다고 볼 수 있습니다.",
    points: 10,
    source: "sample"
  },
  {
    id: "sample-004",
    difficulty: "hard",
    type: "claim",
    answerType: "short_answer",
    passage: "온라인 정보가 빠르게 퍼질수록 읽는 사람의 판단 책임도 커진다. 제목만 보고 내용을 단정하면 사실과 의견을 구분하지 못할 수 있다. 정보의 출처와 근거를 확인하는 습관은 단순한 예절이 아니라 사회적 오해를 줄이는 능력이다.",
    question: "글쓴이의 주장을 쓰세요.",
    sampleAnswers: ["온라인 정보를 읽을 때 출처와 근거를 확인하며 신중하게 판단해야 한다.", "정보가 빠르게 퍼지는 시대에는 사실과 의견을 구분하고 근거를 확인해야 한다."],
    keywords: ["온라인 정보", "출처", "근거", "확인", "판단"],
    requiredKeywords: ["근거", "확인"],
    explanation: "글쓴이는 정보 확산 시대에 출처와 근거 확인이 필요하다고 주장합니다.",
    points: 15,
    source: "sample"
  },
  {
    id: "sample-005",
    difficulty: "expert",
    type: "attitude",
    answerType: "multiple_choice",
    passage: "추천 알고리즘은 사용자의 선택을 돕는 편리한 도구처럼 보이지만, 동시에 선택의 범위를 미리 배열한다. 사용자는 자유롭게 고른다고 느끼지만 어떤 항목이 먼저 보이고 어떤 항목이 보이지 않는지는 시스템의 기준에 따라 조정된다. 따라서 추천 시스템을 평가할 때는 클릭률뿐 아니라 선택의 조건이 어떻게 구성되는지도 함께 살펴야 한다.",
    question: "글쓴이의 태도로 가장 적절한 것은?",
    options: ["추천 알고리즘 자체를 전면 금지해야 한다는 태도", "편리함을 인정하되 작동 기준을 비판적으로 검토해야 한다는 태도", "추천 결과는 언제나 사용자의 실제 욕구를 반영한다는 태도", "정보가 많으므로 추천 기준 공개는 필요 없다는 태도"],
    answer: 1,
    explanation: "글쓴이는 알고리즘의 편리함을 부정하지 않지만 선택 조건을 비판적으로 검토해야 한다고 봅니다.",
    points: 10,
    source: "sample"
  }
];
let testState = null;
let currentResult = null;
let timerId = null;
let isSubmittingAnswer = false;
let isCreatingRoom = false;
let isJoiningRoom = false;
let isStartingRankedQueue = false;
let isStartingRoomGame = false;
let multiplayerState = null;
let activeRoomContext = null;
let activeRankedContext = null;

function safeParse(value, fallback) {
  try {
    return JSON.parse(value) ?? fallback;
  } catch {
    return fallback;
  }
}

function getStorage(key, fallback) {
  return safeParse(localStorage.getItem(key), fallback);
}

function setStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function removeStorage(key) {
  localStorage.removeItem(key);
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function secondsLabel(value = 0) {
  const sec = Math.max(0, Math.round(value));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m ? `${m}분 ${s}초` : `${s}초`;
}

function toast(message) {
  const node = document.createElement("div");
  node.className = "toast";
  node.textContent = message;
  document.body.appendChild(node);
  setTimeout(() => node.remove(), 3200);
}

function showNotice(message, type = "info", timeout = 5200) {
  if (!message) return;
  const existing = document.querySelector(".notice");
  existing?.remove();
  const node = document.createElement("div");
  node.className = `notice ${type}`;
  node.innerHTML = `<span>${escapeHtml(message)}</span><button type="button" aria-label="?덈궡 ?リ린">횞</button>`;
  document.body.appendChild(node);
  node.querySelector("button")?.addEventListener("click", () => node.remove());
  setStorage(STORAGE_KEYS.notice, { message, type, date: Date.now() });
  if (timeout) setTimeout(() => node.remove(), timeout);
}

function saveCurrentRoomSession(roomId, userId, mode) {
  if (!roomId) return;
  localStorage.setItem(STORAGE_KEYS.currentRoomId, roomId);
  if (userId) localStorage.setItem(STORAGE_KEYS.currentRoomUserId, userId);
  if (mode) localStorage.setItem(STORAGE_KEYS.currentRoomMode, mode);
}

function clearCurrentRoomSession() {
  removeStorage(STORAGE_KEYS.currentRoomId);
  removeStorage(STORAGE_KEYS.currentRoomUserId);
  removeStorage(STORAGE_KEYS.currentRoomMode);
}
window.showNotice = showNotice;

function isLocalFileMode() {
  return window.location.protocol === "file:";
}

async function checkApiAvailable() {
  if (isLocalFileMode()) return false;
  if (!window.SupabaseService?.hasSupabaseConfig?.().ok) return false;
  return true;
}

function validateQuestion(q) {
  if (!q || typeof q !== "object") return false;
  if (!q.id || !q.passage || !q.question || !q.explanation) return false;
  if (!Object.keys(TYPE_LABELS).includes(q.type)) return false;
  if (!Object.keys(DIFFICULTY_LABELS).includes(q.difficulty)) return false;
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
      Array.isArray(q.requiredKeywords);
  }
  return false;
}

function normalizeQuestion(q, fallbackId = `q-${Date.now()}`) {
  const answerType = q?.answerType === "short_answer" ? "short_answer" : "multiple_choice";
  return {
    ...q,
    id: String(q?.id || fallbackId),
    difficulty: DIFFICULTY_LABELS[q?.difficulty] ? q.difficulty : "normal",
    type: TYPE_LABELS[q?.type] ? q.type : "main_idea",
    answerType,
    answer: answerType === "multiple_choice" ? Number(q?.answer) : q?.answer,
    points: Number(q?.points || (answerType === "short_answer" ? 15 : 10)),
    source: q?.source || "local"
  };
}

function sanitizeQuestions(questions) {
  if (!Array.isArray(questions)) return [];
  const map = new Map();
  questions.forEach((question, index) => {
    const normalized = normalizeQuestion(question, `local-${Date.now()}-${index}`);
    if (validateQuestion(normalized)) map.set(normalized.id, normalized);
  });
  return [...map.values()].slice(-100);
}

function mergeQuestionPools(pools) {
  const map = new Map();
  (Array.isArray(pools) ? pools : []).flat().forEach((question, index) => {
    const normalized = normalizeQuestion(question, `merged-${Date.now()}-${index}`);
    if (validateQuestion(normalized) && !map.has(normalized.id)) {
      map.set(normalized.id, normalized);
    }
  });
  return [...map.values()];
}

function filterQuestions(questions, options = {}) {
  const selectedTypes = Array.isArray(options.selectedTypes) ? options.selectedTypes : [];
  return sanitizeQuestions(questions).filter((question) => {
    if (options.difficulty && options.difficulty !== "all" && question.difficulty !== options.difficulty) return false;
    if (selectedTypes.length && !selectedTypes.includes(question.type)) return false;
    if (options.includeShortAnswer === false && question.answerType !== "multiple_choice") return false;
    return true;
  });
}

function saveCurrentTest() {
  if (!testState || testState.isFinished) return;
  setStorage(STORAGE_KEYS.testProgress, testState);
}

function loadCurrentTest() {
  const saved = getStorage(STORAGE_KEYS.testProgress, null);
  if (!saved || saved.isFinished || !Array.isArray(saved.questions) || !saved.questions.length) {
    clearCurrentTest();
    return null;
  }
  if (Number(saved.currentIndex) >= saved.questions.length) {
    clearCurrentTest();
    return null;
  }
  saved.currentIndex = Number(saved.currentIndex || 0);
  saved.answers = Array.isArray(saved.answers) ? saved.answers : [];
  saved.questions = sanitizeQuestions(saved.questions);
  if (!saved.questions.length) {
    clearCurrentTest();
    return null;
  }
  return saved;
}

function clearCurrentTest() {
  testState = null;
  isSubmittingAnswer = false;
  clearInterval(timerId);
  removeStorage(STORAGE_KEYS.testProgress);
}

function getNickname() {
  return getStorage(STORAGE_KEYS.nickname, "") || window.UserRemoteService?.getOrCreateGuestNickname?.() || "";
}

function isSupabaseOnlineReady(diagnostics = window.SUPABASE_DIAGNOSTICS || window.SupabaseService?.getStatus?.()) {
  if (window.SupabaseService?.isSupabaseOnlineReady) {
    return window.SupabaseService.isSupabaseOnlineReady(diagnostics);
  }
  const requiredTables = [
    "users",
    "rooms",
    "room_players",
    "room_matches",
    "ranking_profiles",
    "ranked_matches",
    "replays",
    "replay_items",
    "questions_cache"
  ];
  const details = Array.isArray(diagnostics?.details) ? diagnostics.details : [];
  return Boolean(
    window.supabase &&
    window.APP_CONFIG?.SUPABASE_URL &&
    window.APP_CONFIG?.SUPABASE_ANON_KEY &&
    diagnostics?.ok === true &&
    requiredTables.every((table) => details.includes(`${table} select OK`))
  );
}
window.isSupabaseOnlineReady = isSupabaseOnlineReady;

function isOnlineFeatureAvailable() {
  if (window.location.protocol === "file:") return false;
  return isSupabaseOnlineReady();
}

function onlineDisabledHtml() {
  if (window.location.protocol === "file:") {
    return `<div class="card notice-inline warning">?꾩옱 ?뚯씪 吏곸젒 ?ㅽ뻾 紐⑤뱶?낅땲?? ?⑤씪??湲곕뒫???ъ슜?섎젮硫?npm run dev ?먮뒗 Vercel 諛고룷 二쇱냼濡??묒냽?섏꽭??</div>`;
  }
  const diagnostics = window.SUPABASE_DIAGNOSTICS || window.SupabaseService?.getStatus?.();
  if (!diagnostics || diagnostics.state === "unknown") {
    return `<div class="card notice-inline info">Supabase 吏꾨떒???뺤씤?섎뒗 以묒엯?덈떎.</div>`;
  }
  const details = Array.isArray(diagnostics.details) ? diagnostics.details.join(" ") : "";
  return `<div class="card notice-inline warning"><strong>Supabase 吏꾨떒 ?ㅽ뙣</strong>${details ? `<p>${escapeHtml(details)}</p>` : ""}</div>`;
}

function supabaseStatusHtml() {
  return window.SupabaseService?.renderSupabaseStatus?.() || onlineDisabledHtml();
}

function friendlyOnlineError(error) {
  if (error?.code || error?.details || error?.hint || error?.stage || error?.table || error?.queryType) {
    return formatSupabaseError(error);
  }
  return window.SupabaseService?.getFriendlyErrorMessage?.(error) || error?.message || "?????녿뒗 ?ㅻ쪟";
}

async function ensureSupabaseReadyForAction(actionName = "?⑤씪??湲곕뒫") {
  if (window.location.protocol === "file:") {
    throw new Error("?꾩옱 ?뚯씪 吏곸젒 ?ㅽ뻾 紐⑤뱶?낅땲?? ?⑤씪??湲곕뒫???ъ슜?섎젮硫?npm run dev ?먮뒗 Vercel 諛고룷 二쇱냼濡??묒냽?섏꽭??");
  }
  if (isSupabaseOnlineReady()) return true;

  const status = await window.SupabaseService?.checkSupabaseDiagnostics?.();
  if (!isSupabaseOnlineReady(status)) {
    const details = Array.isArray(status?.details) ? status.details.join(" ") : "";
    throw new Error(`${actionName}???쒖옉?????놁뒿?덈떎. ${details || status?.label || "Supabase 吏꾨떒???ㅽ뙣?덉뒿?덈떎."}`);
  }
  return true;
}

function validateNickname(name) {
  if (window.UserRemoteService?.validateNickname) return window.UserRemoteService.validateNickname(name);
  const trimmed = String(name || "").trim();
  if (trimmed.length < 2) return "닉네임은 2자 이상이어야 합니다.";
  if (trimmed.length > 12) return "닉네임은 12자 이하로 입력해 주세요.";
  if (/\s/.test(trimmed)) return "닉네임에는 공백을 사용할 수 없습니다.";
  if (!/^[가-힣A-Za-z0-9_]+$/u.test(trimmed)) return "닉네임은 한글, 영문, 숫자, 언더바만 사용할 수 있습니다.";
  return "";
}

function ensureNickname() {
  window.UserRemoteService?.getOrCreateGuestNickname?.();
  return Boolean(getNickname());
}

function shuffleArray(array) {
  const copied = [...array];
  for (let i = copied.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copied[i], copied[j]] = [copied[j], copied[i]];
  }
  return copied;
}

function shuffleOptions(question) {
  if (question.answerType !== "multiple_choice" || !Array.isArray(question.options)) return question;
  const shuffled = shuffleArray(question.options.map((text, index) => ({
    text,
    isCorrect: index === Number(question.answer)
  })));
  return {
    ...question,
    options: shuffled.map((item) => item.text),
    answer: shuffled.findIndex((item) => item.isCorrect)
  };
}

function prepareTestQuestions({ questions, settings }) {
  try {
    const result = selectQuestionsWithFallback({ questions, settings });
    if (result.message) {
      showNotice(result.message, result.shortage ? "warning" : "info");
    }
    return result.selectedQuestions;
  } catch (error) {
    console.error("prepareTestQuestions failed:", error);
    showNotice("臾몄젣瑜?以鍮꾪븯??以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎. ?ㅼ젙??諛붽씀嫄곕굹 ?ㅼ떆 ?쒕룄??二쇱꽭??", "error");
    return [];
  }
}

function selectQuestionsWithFallback({ questions, settings }) {
  const targetCount = Math.max(1, Number(settings.count || 5));
  const safeQuestions = sanitizeQuestions(questions);
  const selected = [];
  const usedIds = new Set();
  const selectedTypes = Array.isArray(settings.selectedTypes) ? settings.selectedTypes : [];
  let usedRelaxedFilters = false;
  const relaxationNotes = [];

  function addCandidates(candidates, relaxedLabel = "") {
    const before = selected.length;
    for (const question of shuffleArray(candidates)) {
      if (selected.length >= targetCount) break;
      if (!usedIds.has(question.id) && validateQuestion(question)) {
        selected.push(question);
        usedIds.add(question.id);
      }
    }
    if (relaxedLabel && selected.length > before) {
      usedRelaxedFilters = true;
      relaxationNotes.push(relaxedLabel);
    }
  }

  addCandidates(filterQuestions(safeQuestions, {
    difficulty: settings.difficulty,
    selectedTypes,
    includeShortAnswer: settings.includeShortAnswer
  }));

  if (selected.length < targetCount) {
    addCandidates(filterQuestions(safeQuestions, {
      difficulty: settings.difficulty,
      selectedTypes: [],
      includeShortAnswer: settings.includeShortAnswer
    }), "臾몄젣 ?좏삎 議곌굔???꾪솕?덉뒿?덈떎.");
  }

  if (selected.length < targetCount) {
    addCandidates(filterQuestions(safeQuestions, {
      difficulty: null,
      selectedTypes,
      includeShortAnswer: settings.includeShortAnswer
    }), "?쒖씠??議곌굔???꾪솕?덉뒿?덈떎.");
  }

  if (selected.length < targetCount) {
    addCandidates(filterQuestions(safeQuestions, {
      difficulty: null,
      selectedTypes: [],
      includeShortAnswer: settings.includeShortAnswer
    }), "?쒖씠?꾩? ?좏삎 議곌굔???꾪솕?덉뒿?덈떎.");
  }

  if (selected.length < targetCount && settings.includeShortAnswer === false) {
    addCandidates(filterQuestions(safeQuestions, {
      difficulty: null,
      selectedTypes: [],
      includeShortAnswer: true
    }), "媛앷???臾몄젣媛 遺議깊빐 二쇨??앸룄 ?ы븿?덉뒿?덈떎.");
  }

  if (selected.length < targetCount) {
    addCandidates(safeQuestions, "?꾩껜 臾몄젣 ??먯꽌 異붽??덉뒿?덈떎.");
  }

  const selectedQuestions = selected.slice(0, targetCount).map((question) => (
    question.answerType === "multiple_choice" ? shuffleOptions(question) : { ...question }
  ));
  const shortage = Math.max(0, targetCount - selectedQuestions.length);
  const message = shortage
    ? `?붿껌??${targetCount}臾몄젣 以?${selectedQuestions.length}臾몄젣留?異쒖젣?????덉뒿?덈떎. ??λ맂 臾몄젣???섑뵆 臾몄젣瑜?異붽???二쇱꽭??`
    : usedRelaxedFilters
      ? `${targetCount}臾몄젣瑜?留욎텛湲??꾪빐 ${[...new Set(relaxationNotes)].join(" ")}`
      : "";

  console.log("臾몄젣 ?좏깮 寃곌낵:", {
    targetCount,
    totalPool: safeQuestions.length,
    selectedCount: selectedQuestions.length,
    shortage,
    usedRelaxedFilters,
    selectedIds: selectedQuestions.map((q) => q.id)
  });

  return {
    selectedQuestions,
    shortage,
    usedRelaxedFilters,
    message
  };
}

function normalizeKoreanText(text = "") {
  return String(text)
    .trim()
    .toLowerCase()
    .replace(/[.,!?;:'"`()[\]{}<>]/g, " ")
    .replace(/[^\w가-힣\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeKoreanText(text = "") {
  const normalized = normalizeKoreanText(text);
  if (!normalized) return [];
  return normalized
    .split(/\s+/)
    .filter((token) => token.length >= 2);
}

function calculateJaccardSimilarity(a, b) {
  const setA = new Set(tokenizeKoreanText(a));
  const setB = new Set(tokenizeKoreanText(b));
  if (!setA.size || !setB.size) return 0;
  const intersection = [...setA].filter((token) => setB.has(token)).length;
  const union = new Set([...setA, ...setB]).size;
  return intersection / union;
}

function calculateKeywordScore(userAnswer, keywords = []) {
  const normalized = normalizeKoreanText(userAnswer);
  const matchedKeywords = keywords.filter((keyword) => normalized.includes(normalizeKoreanText(keyword)));
  return {
    score: keywords.length ? matchedKeywords.length / keywords.length : 0,
    matchedKeywords
  };
}

function hasRequiredKeywords(userAnswer, requiredKeywords = []) {
  const normalized = normalizeKoreanText(userAnswer);
  const matched = requiredKeywords.filter((keyword) => normalized.includes(normalizeKoreanText(keyword)));
  return {
    all: requiredKeywords.length === 0 || matched.length === requiredKeywords.length,
    some: matched.length > 0,
    matched
  };
}

function gradeShortAnswer({ userAnswer, sampleAnswers = [], keywords = [], requiredKeywords = [], points = 15 }) {
  const answer = String(userAnswer || "").trim();
  const similarity = Math.max(0, ...sampleAnswers.map((sample) => calculateJaccardSimilarity(answer, sample)));
  const keyword = calculateKeywordScore(answer, keywords);
  const required = hasRequiredKeywords(answer, requiredKeywords);
  const enoughKeywords = keyword.score >= 0.58;
  const middleKeywords = keyword.score >= 0.34;
  let scoreRatio = 0;
  let feedback = "?듭떖 ?ㅼ썙?쒓? 遺議깊빐 ?ㅻ떟?쇰줈 泥섎━?섏뿀?듬땲??";

  if (!answer || answer.length < 2) {
    scoreRatio = 0;
  } else if (similarity >= 0.8 || (required.all && enoughKeywords)) {
    scoreRatio = 1;
    feedback = "?듭떖 ?섎?媛 ???ы븿?섏뼱 ?덉뼱 ?뺣떟?쇰줈 泥섎━?섏뿀?듬땲??";
  } else if (similarity >= 0.6 || (required.some && middleKeywords) || keyword.score >= 0.5) {
    scoreRatio = 0.5;
    feedback = "?듭떖 ?섎?媛 ?쇰? ?ы븿?섏뼱 遺遺??뺣떟?쇰줈 泥섎━?섏뿀?듬땲??";
  }

  return {
    isCorrect: scoreRatio === 1,
    isPartial: scoreRatio === 0.5,
    scoreRatio,
    earnedPoints: Math.round(points * scoreRatio),
    similarity: Number(similarity.toFixed(2)),
    keywordScore: Number(keyword.score.toFixed(2)),
    matchedKeywords: keyword.matchedKeywords,
    requiredMatched: required.matched,
    feedback
  };
}

function gradeAnswer({ question, userAnswer }) {
  const points = Number(question.points || (question.answerType === "short_answer" ? 15 : 10));
  if (question.answerType === "multiple_choice") {
    const selectedAnswer = Number(userAnswer);
    const isCorrect = selectedAnswer === Number(question.answer);
    return {
      isCorrect,
      isPartial: false,
      scoreRatio: isCorrect ? 1 : 0,
      earnedPoints: isCorrect ? points : 0,
      selectedAnswer,
      correctAnswer: Number(question.answer)
    };
  }
  return gradeShortAnswer({
    userAnswer,
    sampleAnswers: question.sampleAnswers,
    keywords: question.keywords,
    requiredKeywords: question.requiredKeywords,
    points
  });
}

async function saveAIQuestionsToRemoteCache(questions, settings) {
  if (!window.SupabaseService?.isConfigured?.()) return;
  const cleaned = sanitizeQuestions(questions);
  if (!cleaned.length) return;
  try {
    const supabase = window.SupabaseService.getSupabaseClient();
    const user = await window.UserRemoteService?.getOrCreateUser?.(getNickname() || "?듬챸").catch(() => null);
    const userId = user?.id && !String(user.id).startsWith("guest_") ? user.id : null;
    const { error } = await supabase.from("questions_cache").insert({
      difficulty: settings.difficulty,
      selected_types: settings.selectedTypes || [],
      include_short_answer: settings.includeShortAnswer !== false,
      question_count: cleaned.length,
      questions: cleaned,
      created_by: userId
    });
    if (error) throw error;
  } catch (error) {
    console.warn("questions_cache save skipped:", error);
  }
}

async function getRemoteCachedAIQuestions(settings = {}) {
  if (!window.SupabaseService?.isConfigured?.()) return [];
  try {
    const supabase = window.SupabaseService.getSupabaseClient();
    let query = supabase
      .from("questions_cache")
      .select("questions, created_at")
      .order("created_at", { ascending: false })
      .limit(10);
    if (settings.difficulty && settings.difficulty !== "all") query = query.eq("difficulty", settings.difficulty);
    const { data, error } = await query;
    if (error) throw error;
    return sanitizeQuestions((data || []).flatMap((row) => Array.isArray(row.questions) ? row.questions : []));
  } catch (error) {
    console.warn("remote cached AI questions load skipped:", error);
    return [];
  }
}

async function getStoredAIQuestions(settings = {}) {
  return mergeQuestionPools([
    await getRemoteCachedAIQuestions(settings),
    getSavedAIQuestions()
  ]);
}

function questionSourceLabel(source) {
  const labels = {
    "ai-live": "AI ?ㅼ떆媛??앹꽦(OpenRouter)",
    "ai-saved": "??λ맂 AI 臾몄젣",
    "ai-fallback": "?댁옣 AI ?ㅽ???臾몄젣",
    saved: "??λ맂 AI 臾몄젣",
    sample: "?섑뵆 臾몄젣"
  };
  return labels[source] || source || "?????놁쓬";
}

function setAIStatus(message, type = "info") {
  const node = document.querySelector("#aiGenerationStatus");
  if (!node) return;
  node.textContent = message;
  node.className = type === "error" ? "notice-inline error" : type === "warning" ? "notice-inline warning" : "muted";
}

async function extractFunctionErrorDetail(error) {
  const response = error?.context || error?.response;
  if (!response?.clone) return null;
  try {
    const text = await response.clone().text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return { rawText: text };
    }
  } catch (readError) {
    return { readError: readError?.message || String(readError) };
  }
}

function formatAIErrorDetail(detail) {
  if (!detail) return "";
  if (typeof detail === "string") return detail;
  if (detail.message && Object.keys(detail).length <= 3) return detail.message;
  try {
    return JSON.stringify(detail, null, 2);
  } catch {
    return String(detail);
  }
}

function buildAIErrorMessage(payload = {}) {
  const provider = payload.provider ? `[${payload.provider}] ` : "";
  const model = payload.model ? ` model=${payload.model}` : "";
  const error = payload.error || payload.message || "AI ?앹꽦 ?ㅽ뙣";
  const detail = formatAIErrorDetail(payload.detail);
  return `${provider}${error}${model}${detail ? ` / detail=${detail}` : ""}`;
}

async function generateAIQuestions(settings) {
  console.log("[AI] generateAIQuestions called", settings);
  debugLog("AI", "generateAIQuestions called", settings);
  if (isLocalFileMode()) {
    const error = new Error("Local file mode cannot call Supabase Edge Functions. Use npm run dev or deployed URL.");
    window.LAST_AI_ERROR = error;
    debugError("AI.generateAIQuestions", "AI question generation failed", error);
    setAIStatus("AI 臾몄젣 ?앹꽦 ?ㅽ뙣: " + error.message, "error");
    throw error;
  }

  const configCheck = window.SupabaseService?.hasSupabaseConfig?.();
  debugLog("AI", "Supabase config check", configCheck);
  if (!configCheck?.ok) {
    const error = new Error(configCheck?.details?.join(" ") || "Supabase config is missing.");
    window.LAST_AI_ERROR = error;
    debugError("AI.generateAIQuestions", "Supabase config check failed", error);
    setAIStatus("AI 臾몄젣 ?앹꽦 ?ㅽ뙣: " + error.message, "error");
    throw error;
  }

  const buttons = [...document.querySelectorAll("[data-start-ai], [data-regenerate-ai], [data-start-ai-boost]")];
  const labels = buttons.map((button) => button.textContent);
  buttons.forEach((button) => {
    button.disabled = true;
    button.textContent = "AI generating...";
  });
  showNotice("AI 臾몄젣 ?앹꽦 ?붿껌 以?..", "info", 0);
  setAIStatus("AI Edge Function generate-questions ?몄텧 以?..", "info");

  try {
    const supabase = window.SupabaseService.getSupabaseClient();
    if (!supabase) {
      const error = new Error("Supabase client媛 ?놁뒿?덈떎.");
      console.error("[AI] no supabase client", error);
      window.LAST_AI_ERROR = error;
      setAIStatus("AI 臾몄젣 ?앹꽦 ?ㅽ뙣: " + error.message, "error");
      throw error;
    }
    debugLog("AI", "Supabase client ready", Boolean(supabase));
    const requestBody = {
      difficulty: settings?.difficulty || "normal",
      count: Number(settings?.count || 5),
      includeShortAnswer: settings?.includeShortAnswer !== false,
      selectedTypes: settings?.selectedTypes || [],
      difficultyBoost: Boolean(settings?.difficultyBoost)
    };
    console.log("[AI] invoking generate-questions", requestBody);
    const { data, error } = await supabase.functions.invoke("generate-questions", {
      body: requestBody
    });
    console.log("[AI] function data", data);
    console.error("[AI] function error", error);
    debugLog("AI", "generate-questions response", { data, error });
    window.LAST_AI_RESPONSE = data || null;
    if (error) {
      const detail = await extractFunctionErrorDetail(error);
      window.LAST_AI_FUNCTION_ERROR_DETAIL = detail;
      console.error("[AI] function error detail", detail);
      const message = buildAIErrorMessage({
        provider: detail?.provider,
        model: detail?.model,
        error: detail?.error || detail?.message || error.message || String(error),
        detail: detail?.detail || detail
      });
      const err = new Error(message);
      err.originalError = error;
      err.detail = detail;
      err.provider = detail?.provider;
      err.model = detail?.model;
      window.LAST_AI_ERROR = err;
      showNotice("AI ?앹꽦 ?ㅽ뙣: " + err.message, "error", 0);
      setAIStatus("AI ?앹꽦 ?ㅽ뙣: " + err.message, "error");
      throw err;
    }
    if (!data) {
      const err = new Error("AI Edge Function ?묐떟 data媛 鍮꾩뼱 ?덉뒿?덈떎.");
      window.LAST_AI_ERROR = err;
      showNotice(err.message, "error", 0);
      setAIStatus(err.message, "error");
      throw err;
    }
    if (data.ok === false) {
      const err = new Error(buildAIErrorMessage({
        provider: data.provider,
        model: data.model,
        error: data.error || "AI Edge Function???ㅽ뙣 ?묐떟??諛섑솚?덉뒿?덈떎.",
        detail: data.detail
      }));
      err.detail = data.detail;
      err.provider = data.provider;
      err.model = data.model;
      window.LAST_AI_ERROR = err;
      console.error("[AI] function returned ok false", data);
      showNotice("AI ?앹꽦 ?ㅽ뙣: " + err.message, "error", 0);
      setAIStatus("AI ?앹꽦 ?ㅽ뙣: " + err.message, "error");
      throw err;
    }
    if (!Array.isArray(data.questions)) {
      const err = new Error("Edge Function did not return data.questions array.");
      window.LAST_AI_ERROR = err;
      setAIStatus("AI ?앹꽦 ?ㅽ뙣: " + err.message, "error");
      throw err;
    }

    const questions = data.questions
      .map((question, index) => normalizeQuestion(question, "ai-live-" + Date.now() + "-" + index))
      .filter(validateQuestion);
    debugLog("AI", "validated questions", {
      provider: data.provider,
      model: data.model,
      rawCount: data.questions.length,
      validCount: questions.length,
      firstQuestion: questions[0]
    });
    if (!questions.length) {
      const err = new Error("AI媛 諛섑솚??臾몄젣 ?뺤떇???щ컮瑜댁? ?딆뒿?덈떎.");
      window.LAST_AI_ERROR = err;
      showNotice(err.message, "error", 0);
      setAIStatus(err.message, "error");
      throw err;
    }

    saveAIQuestionsToLocal(questions);
    try {
      await saveAIQuestionsToRemoteCache(questions, settings);
    } catch (cacheError) {
      debugError("AI.cache", "questions_cache save failed; live AI questions will still be used", cacheError);
    }
    window.LAST_QUESTION_SOURCE = "ai-live";
    window.LAST_AI_PROVIDER = data.provider || "openrouter";
    window.LAST_AI_MODEL = data.model || "";
    console.log("[AI] selected source", "ai-live");
    showNotice("AI 臾몄젣 " + questions.length + "媛??앹꽦 ?꾨즺 (" + questionSourceLabel("ai-live") + ")", "success");
    setAIStatus("AI 臾몄젣 " + questions.length + "媛??앹꽦 ?꾨즺" + (data.model ? " / model=" + data.model : ""), "info");
    return questions;
  } catch (error) {
    window.LAST_AI_ERROR = error;
    debugError("AI.generateAIQuestions", "AI question generation failed", error);
    setAIStatus("AI 臾몄젣 ?앹꽦 ?ㅽ뙣: " + (error?.message || error), "error");
    throw error;
  } finally {
    buttons.forEach((button, index) => {
      button.disabled = false;
      button.textContent = labels[index] || "Start with AI questions";
    });
  }
}

function saveAIQuestionsToLocal(questions) {
  const saved = getSavedAIQuestions();
  const incoming = sanitizeQuestions(questions);
  const map = new Map(saved.map((question) => [question.id, question]));
  incoming.forEach((question) => map.set(question.id, question));
  setStorage(STORAGE_KEYS.aiQuestions, [...map.values()].slice(-100));
}

function getSavedAIQuestions() {
  const cleaned = sanitizeQuestions(getStorage(STORAGE_KEYS.aiQuestions, []));
  if (cleaned.length > 100) {
    setStorage(STORAGE_KEYS.aiQuestions, cleaned.slice(-100));
  } else if (cleaned.length !== (getStorage(STORAGE_KEYS.aiQuestions, []) || []).length) {
    setStorage(STORAGE_KEYS.aiQuestions, cleaned);
  }
  return cleaned;
}

async function buildQuestionSet(settings, options = {}) {
  const sourcePreference = options.sourcePreference || settings.questionSource || "ai";
  let aiFailureReason = "";
  debugLog("buildQuestionSet", "called", { settings, sourcePreference });

  if (sourcePreference === "sample") {
    const selection = selectQuestionsWithFallback({ questions: SAMPLE_QUESTIONS, settings });
    console.log("[AI] selected source", "sample");
    window.LAST_QUESTION_SOURCE = "sample";
    return { source: "sample", questions: selection.selectedQuestions, message: selection.message };
  }

  if (sourcePreference === "ai") {
    try {
      const aiQuestions = await generateAIQuestions(settings);
      if (aiQuestions?.length) {
        const selection = selectQuestionsWithFallback({ questions: aiQuestions, settings });
        return { source: "ai-live", questions: selection.selectedQuestions, message: selection.message };
      }
      throw new Error("AI generation returned an empty question list.");
    } catch (error) {
      window.LAST_AI_ERROR = error;
      aiFailureReason = error?.message || String(error);
      debugError("buildQuestionSet", "AI generation failed", error);
      showNotice("AI가 한국어/난이도 검증을 통과하지 못해 fallback 문제를 확인합니다: " + aiFailureReason, "warning", 0);
    }
  }

  const savedAI = sourcePreference === "sample" ? [] : await getStoredAIQuestions(settings);
  if (savedAI?.length) {
    const selection = selectQuestionsWithFallback({ questions: savedAI, settings });
    showNotice("Falling back to saved AI questions.", "warning", 0);
    console.log("[AI] selected source", "ai-saved");
    window.LAST_QUESTION_SOURCE = "ai-saved";
    return { source: "ai-saved", questions: selection.selectedQuestions, message: selection.message, aiFailureReason };
  }

  const selection = selectQuestionsWithFallback({ questions: SAMPLE_QUESTIONS, settings });
  const fallbackSource = sourcePreference === "ai" ? "ai-fallback" : "sample";
  showNotice("臾몄젣 異쒖쿂: " + questionSourceLabel(fallbackSource), sourcePreference === "ai" ? "warning" : "info", sourcePreference === "ai" ? 0 : 5200);
  console.log("[AI] selected source", fallbackSource);
  window.LAST_QUESTION_SOURCE = fallbackSource;
  return { source: fallbackSource, questions: selection.selectedQuestions, message: selection.message, aiFailureReason };
}

function loadSavedAIQuestions() {
  return getSavedAIQuestions();
}

window.buildQuestionSet = buildQuestionSet;

function getSettingsFromForm() {
  const selectedTypes = [...document.querySelectorAll("input[name='type']:checked")].map((input) => input.value);
  return {
    difficulty: document.querySelector("#difficulty")?.value || "normal",
    count: Number(document.querySelector("#count")?.value || 5),
    selectedTypes: selectedTypes.length ? selectedTypes : Object.keys(TYPE_LABELS),
    includeShortAnswer: Boolean(document.querySelector("#includeShortAnswer")?.checked),
    useTimer: Boolean(document.querySelector("#useTimer")?.checked),
    secondsPerQuestion: Number(document.querySelector("#secondsPerQuestion")?.value || 60),
    difficultyBoost: Boolean(document.querySelector("#difficultyBoost")?.checked)
  };
}

async function startTest(sourceMode = "ai", difficultyBoostOverride = false) {
  try {
    debugLog("TEST", "startTest called", { sourceMode, difficultyBoostOverride });
    if (!ensureNickname()) return;
    const existing = loadCurrentTest();
    if (existing) {
      const startFresh = confirm("A test is already in progress. Start a new test?");
      if (!startFresh) {
        testState = existing;
        showNotice("Restored the in-progress test.", "info");
        showView("test");
        return;
      }
      clearCurrentTest();
    }

    const settings = getSettingsFromForm();
    if (difficultyBoostOverride) settings.difficultyBoost = true;
    const mode = typeof sourceMode === "boolean" ? (sourceMode ? "ai" : "saved") : sourceMode;
    const sourcePreference = mode === "sample" ? "sample" : mode === "saved" ? "saved" : "ai";
    let built = null;
    let aiFailureReason = "";

    if (sourcePreference === "sample") {
      const selection = selectQuestionsWithFallback({ questions: SAMPLE_QUESTIONS, settings });
      built = { source: "sample", questions: selection.selectedQuestions, message: selection.message };
      showNotice("?섑뵆 臾몄젣濡??쒖옉?⑸땲??", "info");
    } else if (sourcePreference === "saved") {
      const savedAI = await getStoredAIQuestions(settings);
      if (savedAI.length) {
        const selection = selectQuestionsWithFallback({ questions: savedAI, settings });
        built = { source: "ai-saved", questions: selection.selectedQuestions, message: selection.message };
      }
    } else {
      try {
        const aiQuestions = await generateAIQuestions(settings);
        if (aiQuestions?.length) {
          const selection = selectQuestionsWithFallback({ questions: aiQuestions, settings });
          built = { source: "ai-live", questions: selection.selectedQuestions, message: selection.message };
        } else {
          throw new Error("AI generation returned an empty question list.");
        }
      } catch (error) {
        console.error("[TEST] AI generation failed", error);
        window.LAST_AI_ERROR = error;
        aiFailureReason = error?.message || String(error);
        showNotice("AI 臾몄젣 ?앹꽦 ?ㅽ뙣: " + (error?.message || error), "error", 0);

        const savedAI = await getStoredAIQuestions(settings);
        if (savedAI.length) {
          const selection = selectQuestionsWithFallback({ questions: savedAI, settings });
          built = { source: "ai-saved", questions: selection.selectedQuestions, message: selection.message };
          showNotice("??λ맂 AI 臾몄젣濡??泥댄빀?덈떎.", "warning", 0);
        }
      }
    }

    if (!built?.questions?.length) {
      const selection = selectQuestionsWithFallback({ questions: SAMPLE_QUESTIONS, settings });
      built = { source: sourcePreference === "ai" ? "ai-fallback" : "sample", questions: selection.selectedQuestions, message: selection.message };
      showNotice(questionSourceLabel(built.source) + "濡??泥댄빀?덈떎.", "warning", 0);
    }

    const selectedQuestions = sanitizeQuestions(built.questions);
    const source = built.source;

    debugLog("TEST", "selected question source", {
      source,
      count: selectedQuestions.length,
      firstQuestion: selectedQuestions[0]
    });

    if (built.message) showNotice(built.message, "warning");
    if (!selectedQuestions.length) {
      showNotice("No usable questions are available. Check the AI error and settings.", "error", 0);
      return;
    }
    window.LAST_QUESTION_SOURCE = source;
    console.log("[TEST] selected question source", {
      questionSource: source,
      label: questionSourceLabel(source),
      count: selectedQuestions.length,
      first: selectedQuestions[0]
    });
    if (mode === "ai" && source === "ai-live") showNotice("臾몄젣 異쒖쿂: " + questionSourceLabel(source), "success");
    if (mode === "ai" && source !== "ai-live") showNotice("AI가 한국어/난이도 검증을 통과하지 못해 대체 문제를 사용합니다: " + (aiFailureReason || "원인 미상") + " / 문제 출처: " + questionSourceLabel(source), "warning", 0);
    if (mode === "sample") showNotice("臾몄젣 異쒖쿂: " + questionSourceLabel(source), "info");

    testState = {
      id: "test-" + Date.now(),
      nickname: getNickname(),
      settings: {
        ...settings,
        questionSource: source,
        aiFailureReason,
        aiProvider: source === "ai-live" ? (window.LAST_AI_PROVIDER || "") : "",
        aiModel: source === "ai-live" ? (window.LAST_AI_MODEL || "") : ""
      },
      questions: selectedQuestions,
      currentIndex: 0,
      answers: [],
      startedAt: Date.now(),
      finishedAt: null,
      isFinished: false,
      resultSaved: false,
      questionStartedAt: Date.now(),
      currentAnswer: "",
      selectedAnswer: null,
      timeLeft: settings.secondsPerQuestion
    };
    saveCurrentTest();
    showView("test");
  } catch (error) {
    window.LAST_TEST_ERROR = error;
    debugError("TEST.startTest", "test start failed", error);
  }
}

function getGrade(scorePercent) {
  if (scorePercent >= 90) return { code: "S", label: "문해력 고수" };
  if (scorePercent >= 80) return { code: "A", label: "뛰어난 이해력" };
  if (scorePercent >= 70) return { code: "B", label: "안정적인 문해력" };
  if (scorePercent >= 60) return { code: "C", label: "기본기는 있음" };
  if (scorePercent >= 50) return { code: "D", label: "연습 필요" };
  return { code: "E", label: "기초부터 다시" };
}

function typeAccuracy(details, type) {
  const target = (Array.isArray(details) ? details : []).filter((item) => item.question?.type === type);
  if (!target.length) return null;
  const ratio = target.reduce((sum, item) => sum + Number(item.grade?.scoreRatio || 0), 0) / target.length;
  return Number((ratio * 100).toFixed(1));
}

function getStrongWeakTypes(details) {
  const rows = Object.keys(TYPE_LABELS)
    .map((type) => ({ type, value: typeAccuracy(details, type) }))
    .filter((row) => row.value !== null);
  if (!rows.length) return { strong: "-", weak: "-" };
  rows.sort((a, b) => b.value - a.value);
  return {
    strong: `${TYPE_LABELS[rows[0].type]} ${rows[0].value}%`,
    weak: `${TYPE_LABELS[rows[rows.length - 1].type]} ${rows[rows.length - 1].value}%`
  };
}

function buildResultFromDetails(base, details) {
  const safeDetails = Array.isArray(details) ? details : [];
  const maxScore = safeDetails.reduce((sum, item) => sum + Number(item.question?.points || 10), 0);
  const score = safeDetails.reduce((sum, item) => sum + Number(item.grade?.earnedPoints || 0), 0);
  const scorePercent = maxScore ? Math.round((score / maxScore) * 100) : 0;
  const correctCount = safeDetails.filter((item) => item.grade?.isCorrect).length;
  const partialCount = safeDetails.filter((item) => item.grade?.isPartial).length;
  const wrongCount = safeDetails.length - correctCount - partialCount;
  const timeoutCount = safeDetails.filter((item) => item.timedOut || item.grade?.isTimeout).length;
  const mc = safeDetails.filter((item) => item.question?.answerType === "multiple_choice");
  const short = safeDetails.filter((item) => item.question?.answerType === "short_answer");
  const totalTime = safeDetails.reduce((sum, item) => sum + Number(item.elapsed || 0), 0);
  const grade = getGrade(scorePercent);
  const strongWeak = getStrongWeakTypes(safeDetails);

  return {
    ...base,
    details: safeDetails,
    score,
    maxScore,
    scorePercent,
    grade: `${grade.code} - ${grade.label}`,
    gradeCode: grade.code,
    correctCount,
    partialCount,
    wrongCount,
    timeoutCount,
    totalTime,
    averageTime: safeDetails.length ? Math.round(totalTime / safeDetails.length) : 0,
    multipleChoiceAccuracy: mc.length ? Math.round((mc.filter((item) => item.grade.isCorrect).length / mc.length) * 100) : 0,
    shortAnswerAccuracy: short.length ? Math.round((short.filter((item) => item.grade.isCorrect).length / short.length) * 100) : 0,
    strongType: strongWeak.strong,
    weakType: strongWeak.weak,
    advice: makeAdvice(scorePercent, strongWeak)
  };
}

async function getQuestionSetForMultiplayer(settings) {
  debugLog("buildQuestionSet", "multiplayer question set requested", settings);
  const built = await buildQuestionSet(settings, { sourcePreference: settings.questionSource || "ai" });
  debugLog("buildQuestionSet", "multiplayer question source", {
    source: built.source,
    count: built.questions.length,
    aiFailureReason: built.aiFailureReason || "",
    firstQuestion: built.questions[0]
  });
  if ((settings.questionSource || "ai") === "ai" && built.source !== "ai-live") {
    showNotice("AI가 한국어/난이도 검증을 통과하지 못해 대체 문제를 사용합니다. 출처: " + questionSourceLabel(built.source) + (built.aiFailureReason ? " / " + built.aiFailureReason : ""), "warning", 0);
  }
  return sanitizeQuestions(built.questions);
}

function createMultiplayerState({ mode, room = null, match = null, user, profile = null }) {
  const questions = sanitizeQuestions(room?.question_set || match?.question_set || []);
  const settings = {
    difficulty: room?.difficulty || match?.difficulty || "normal",
    count: Number(room?.question_count || match?.question_count || questions.length || 5),
    useTimer: Boolean(room?.time_limit_enabled),
    secondsPerQuestion: Number(room?.time_per_question || 60)
  };
  return {
    mode,
    room,
    match,
    user,
    profile,
    questions,
    settings,
    currentIndex: 0,
    answers: [],
    selectedAnswer: null,
    currentAnswer: "",
    questionStartedAt: Date.now(),
    timeLeft: settings.secondsPerQuestion,
    isFinished: false,
    submitted: false
  };
}

function multiplayerSummary(state, extra = {}) {
  const details = (state.answers || []).map((answer) => ({
    question: answer.question,
    grade: answer.grade,
    elapsed: answer.elapsedTime,
    timedOut: answer.isTimeout,
    userAnswer: answer.userAnswer
  }));
  const result = buildResultFromDetails({
    id: `${state.mode}-${state.room?.id || state.match?.id || Date.now()}-${state.user?.id || "local"}`,
    nickname: state.user?.nickname || getNickname() || "?듬챸",
    difficulty: state.settings?.difficulty || "normal",
    totalQuestions: state.questions?.length || 0,
    date: new Date().toISOString()
  }, details);
  return {
    ...extra,
    nickname: state.user?.nickname || getNickname() || "?듬챸",
    details: state.answers || [],
    current_index: Number(state.currentIndex || 0),
    current_score: Number(result.score || 0),
    score: Number(result.score || 0),
    max_score: Number(result.maxScore || 0),
    score_percent: Number(result.scorePercent || 0),
    correct_count: Number(result.correctCount || 0),
    partial_count: Number(result.partialCount || 0),
    wrong_count: Number(result.wrongCount || 0),
    total_time: Number(result.totalTime || 0),
    average_time: Number(result.averageTime || 0)
  };
}

function canHostStartGame(players, hostUserId) {
  const activePlayers = (players || []).filter((player) => player.status !== "left");
  const nonHostPlayers = activePlayers.filter((player) => player.user_id !== hostUserId);
  if (activePlayers.length < 2) return false;
  return nonHostPlayers.length > 0 && nonHostPlayers.every((player) => player.is_ready);
}

function roomStartBlockReason(players, hostUserId) {
  const activePlayers = (players || []).filter((player) => player.status !== "left");
  const nonHostPlayers = activePlayers.filter((player) => player.user_id !== hostUserId);
  if (activePlayers.length < 2) return "李멸??먭? 2紐??댁긽 ?꾩슂?⑸땲??";
  if (!nonHostPlayers.length) return "諛⑹옣 ??李멸??먭? ?꾩슂?⑸땲??";
  if (!nonHostPlayers.every((player) => player.is_ready)) return "?꾩쭅 以鍮꾪븯吏 ?딆? 李멸??먭? ?덉뒿?덈떎.";
  return "";
}

function roomPlayersHtml(players, profileByUserId = new Map()) {
  return (players || []).map((player) => {
    const profile = profileByUserId.get(player.user_id);
    const readyText = player.is_host ? "방장" : player.is_ready ? "준비 완료" : "대기 중";
    return `<div class="history-item">
      <div class="row between">
        <strong>${tierNick(player.nickname, profile)}</strong>
        <div class="badges">${player.is_host ? `<span class="badge hard">방장</span>` : ""}<span class="badge ${player.is_ready ? "easy" : "normal"}">${readyText}</span></div>
      </div>
      <p class="muted">정답 ${Number(player.correct_count || 0)} · 부분 ${Number(player.partial_count || 0)} · 시간 ${secondsLabel(player.total_time || 0)}</p>
    </div>`;
  }).join("") || `<div class="empty">참가자 정보를 불러오는 중입니다.</div>`;
}

function roomLobbyActionsHtml(room, players, user, me) {
  const isHost = room.host_user_id === user.id || me?.is_host;
  const canStart = canHostStartGame(players, room.host_user_id);
  const blockReason = roomStartBlockReason(players, room.host_user_id);
  if (isHost) {
    return `
      <p class="muted">${canStart ? "모든 참가자가 준비했습니다. 게임을 시작할 수 있습니다." : blockReason}</p>
      <div class="actions" style="margin-top:12px"><button class="btn primary" data-start-room-game ${canStart ? "" : "disabled"}>게임 시작</button></div>
    `;
  }
  return `
    <p class="muted">방장이 게임을 시작할 때까지 기다리는 중입니다.</p>
    <div class="actions" style="margin-top:12px">
      <button class="btn ${me?.is_ready ? "" : "primary"}" data-toggle-ready="${me?.is_ready ? "false" : "true"}">${me?.is_ready ? "준비 취소" : "준비하기"}</button>
    </div>
  `;
}

function roomProgressHtml(players = [], totalQuestions = 0) {
  return (players || []).map((player) => {
    const index = Math.min(Number(player.current_index || 0), totalQuestions || Number(player.current_index || 0));
    const percent = totalQuestions ? Math.round((index / totalQuestions) * 100) : 0;
    return `<div class="history-item">
      <div class="row between">
        <strong>${escapeHtml(player.nickname || "?듬챸")}</strong>
        <span class="badge ${player.status === "finished" ? "easy" : player.status === "left" ? "hard" : "normal"}">${player.status || "playing"}</span>
      </div>
      <div class="progress" style="margin-top:8px"><span style="width:${percent}%"></span></div>
      <p class="muted">吏꾪뻾 ${index}/${totalQuestions || "-"} 쨌 ?먯닔 ${Number(player.current_score || 0)} 쨌 ?뺣떟 ${Number(player.correct_count || 0)} 쨌 遺遺?${Number(player.partial_count || 0)} 쨌 ?쒓컙 ${secondsLabel(player.total_time || 0)}</p>
    </div>`;
  }).join("") || `<div class="empty">李멸???吏꾪뻾瑜좎쓣 遺덈윭?ㅻ뒗 以묒엯?덈떎.</div>`;
}

async function updateRoomProgressPanel(roomId, totalQuestions) {
  const target = document.querySelector("#roomProgressList");
  if (!target) return;
  const players = await window.RoomService.getRoomPlayers(roomId);
  target.innerHTML = roomProgressHtml(players, totalQuestions);
}

async function updateRoomLobbyPanels(room, user) {
  if (activeRoomContext?.roomId !== room.id || activeRoomContext.view !== "lobby") return;
  const latestRoom = await window.RoomService.getRoom(room.id);
  if (!latestRoom || latestRoom.status !== "waiting") {
    await handleRoomRealtimeStatus(room.id, user);
    return;
  }
  const players = await window.RoomService.getRoomPlayers(room.id);
  const profiles = await window.RankedMatchService?.getRankingProfiles?.().catch(() => []);
  const decoratedProfiles = window.RatingUtils.decorateProfilesWithPercentTiers(profiles || []);
  const profileByUserId = new Map(decoratedProfiles.map((profile) => [profile.user_id, profile]));
  const me = players.find((player) => player.user_id === user.id);
  const list = document.querySelector("#roomPlayersList");
  if (list) list.innerHTML = roomPlayersHtml(players, profileByUserId);
  const actions = document.querySelector("#roomLobbyActions");
  if (actions) actions.innerHTML = roomLobbyActionsHtml(latestRoom, players, user, me);
  bindRoomLobbyDynamicActions(latestRoom, user);
}

async function handleRoomRealtimeStatus(roomId, user) {
  const latestRoom = await window.RoomService.getRoom(roomId);
  if (!latestRoom) {
    showNotice("諛??뺣낫瑜?李얠쓣 ???놁뒿?덈떎.", "warning");
    clearCurrentRoomSession();
    showView("rooms");
    return;
  }
  if (latestRoom.status === "playing" && activeRoomContext?.view !== "play") {
    showNotice("寃뚯엫???쒖옉?섏뿀?듬땲??", "success");
    saveCurrentRoomSession(roomId, user?.id, "playing");
    renderRoomPlay(latestRoom);
    return;
  }
  if (latestRoom.status === "finished" && activeRoomContext?.view !== "result") {
    saveCurrentRoomSession(roomId, user?.id, "result");
    renderRoomResult(latestRoom);
    return;
  }
  if (latestRoom.status === "cancelled") {
    showNotice("諛⑹옣???섍???諛⑹씠 痍⑥냼?섏뿀?듬땲??", "warning", 0);
    clearCurrentRoomSession();
    window.RoomService.unsubscribeRoom();
    showView("rooms");
  }
}

function bindRoomLobbyDynamicActions(room, user) {
  document.querySelector("[data-toggle-ready]")?.addEventListener("click", async () => {
    try {
      debugLog("room.toggleReady", "button clicked", { roomId: room.id, userId: user.id });
      await window.RoomService.toggleReady(room.id, user.id);
      await updateRoomLobbyPanels(room, user);
    } catch (error) {
      window.LAST_ROOM_ERROR = error;
      debugError("room.toggleReady", "ready update failed", error);
    }
  });
  document.querySelector("[data-start-room-game]")?.addEventListener("click", async () => {
    if (isStartingRoomGame) return;
    try {
      isStartingRoomGame = true;
      debugLog("room.startRoomGame", "button clicked", { roomId: room.id, userId: user.id });
      const startedRoom = await window.RoomService.startRoom(room.id, user.id);
      saveCurrentRoomSession(room.id, user.id, "playing");
      renderRoomPlay(startedRoom);
    } catch (error) {
      window.LAST_ROOM_ERROR = error;
      debugError("room.startRoomGame", "room start failed", error);
    } finally {
      isStartingRoomGame = false;
    }
  });
}

function tierNick(nickname, tierOrProfile = "??궧?놁쓬") {
  const tier = typeof tierOrProfile === "string" ? tierOrProfile : tierOrProfile?.tier;
  return `${window.RatingUtils?.getTierIcon?.(tier || "??궧?놁쓬") || "[ ]"} ${escapeHtml(nickname || "?듬챸")}`;
}

function currentHashBase() {
  return String(location.hash || "#home").replace("#", "").split(":")[0] || "home";
}

function makeAdvice(scorePercent, strongWeak) {
  if (scorePercent >= 90) return "洹쇨굅瑜??뺥솗??吏싲뒗 ?섏씠 醫뗭뒿?덈떎. expert ?쒖씠?꾩뿉??異붾줎怨??쒕룄 臾몄젣瑜??욎뼱 ?좎? ?덈젴???대낫?몄슂.";
  if (scorePercent >= 70) return `?꾨컲?곸쑝濡??덉젙?곸엯?덈떎. ?쏀븳 ?곸뿭??${strongWeak.weak} ?좏삎???ㅻ떟?명듃濡?諛섎났?섎㈃ ?먯닔媛 鍮⑤━ ?ㅻ쫭?덈떎.`;
  return `湲곗큹 ?낇빐 猷⑦떞???ㅼ떆 ?〓뒗 寃껋씠 醫뗭뒿?덈떎. 吏臾몃쭏??以묒떖 臾몄옣, 洹쇨굅, 寃곕줎????以꾩뵫 ?쒖떆??蹂댁꽭??`;
}

function submitCurrentAnswer(timedOut = false) {
  try {
    if (!testState || testState.isFinished || isSubmittingAnswer) return;
    const question = testState.questions?.[testState.currentIndex];
    if (!question) {
      showNotice("?꾩옱 臾몄젣瑜?李얠쓣 ???놁뼱 ?뚯뒪?몃? 珥덇린?뷀빀?덈떎.", "error");
      clearCurrentTest();
      showView("settings");
      return;
    }

    const rawAnswer = question.answerType === "multiple_choice" ? testState.selectedAnswer : testState.currentAnswer;
    if (!timedOut) {
      if (question.answerType === "multiple_choice" && rawAnswer === null) return showNotice("蹂닿린瑜??좏깮??二쇱꽭??", "warning");
      if (question.answerType === "short_answer" && String(rawAnswer || "").trim().length < 2) return showNotice("二쇨????듭븞? 2湲???댁긽 ?낅젰??二쇱꽭??", "warning");
    }

    isSubmittingAnswer = true;
    document.querySelector("[data-next]")?.setAttribute("disabled", "disabled");
    clearInterval(timerId);

    const elapsed = Math.round((Date.now() - Number(testState.questionStartedAt || Date.now())) / 1000);
    const grade = timedOut
      ? { isCorrect: false, isPartial: false, isTimeout: true, scoreRatio: 0, earnedPoints: 0, feedback: "?쒓컙??珥덇낵?섏뿀?듬땲??" }
      : gradeAnswer({ question, userAnswer: rawAnswer });

    testState.answers.push({
      questionId: question.id,
      question,
      userAnswer: timedOut ? "" : rawAnswer,
      grade,
      result: grade,
      answeredAt: Date.now(),
      elapsed,
      timedOut: Boolean(timedOut)
    });

    testState.currentIndex += 1;
    testState.currentAnswer = "";
    testState.selectedAnswer = null;

    if (testState.currentIndex >= testState.questions.length) {
      finishTest();
      return;
    }

    testState.questionStartedAt = Date.now();
    testState.timeLeft = testState.settings.secondsPerQuestion;
    saveCurrentTest();
    isSubmittingAnswer = false;
    renderTest();
  } catch (error) {
    console.error("submitCurrentAnswer failed:", error);
    isSubmittingAnswer = false;
    showNotice("?듭븞???쒖텧?섎뒗 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎. ?ㅼ떆 ?쒕룄??二쇱꽭??", "error");
  }
}

function finishTest() {
  try {
    if (!testState) return;
    if (testState.isFinished && testState.resultSaved) {
      currentResult = getStorage(STORAGE_KEYS.lastResult, currentResult);
      showView("result");
      return;
    }
    clearInterval(timerId);
    testState.isFinished = true;
    testState.finishedAt = Date.now();

    const base = {
      id: testState.id,
      nickname: testState.nickname || getNickname() || "?듬챸",
      difficulty: testState.settings?.difficulty || "normal",
      totalQuestions: testState.questions?.length || 0,
      date: new Date().toISOString()
    };
    currentResult = buildResultFromDetails(base, testState.answers || []);
    if (!testState.resultSaved) {
      saveResult(currentResult);
      setStorage(STORAGE_KEYS.lastResult, currentResult);
      testState.resultSaved = true;
      showNotice("?뚯뒪?멸? 醫낅즺?섏뼱 寃곌낵媛 ??λ릺?덉뒿?덈떎.", "success");
    }
    clearCurrentTest();
    showView("result");
  } catch (error) {
    console.error("finishTest failed:", error);
    showNotice("寃곌낵瑜???ν븯??以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.", "error");
    clearCurrentTest();
  }
}

function saveResult(result) {
  try {
    if (!result?.id) return;
    const historiesRaw = getStorage(STORAGE_KEYS.histories, []);
    const histories = (Array.isArray(historiesRaw) ? historiesRaw : []).filter((item) => item.id !== result.id);
    histories.push(result);
    setStorage(STORAGE_KEYS.histories, histories);

    const rankingsRaw = getStorage(STORAGE_KEYS.rankings, []);
    const rankings = (Array.isArray(rankingsRaw) ? rankingsRaw : []).filter((item) => item.id !== `ranking-${result.id}`);
    rankings.push({
      id: `ranking-${result.id}`,
      nickname: result.nickname || "?듬챸",
      score: Number(result.scorePercent || 0),
      rawScore: Number(result.score || 0),
      maxScore: Number(result.maxScore || 0),
      grade: result.gradeCode || "-",
      difficulty: result.difficulty || "normal",
      totalQuestions: Number(result.totalQuestions || 0),
      correctCount: Number(result.correctCount || 0),
      partialCount: Number(result.partialCount || 0),
      wrongCount: Number(result.wrongCount || 0),
      totalTime: Number(result.totalTime || 0),
      averageTime: Number(result.averageTime || 0),
      date: result.date || new Date().toISOString()
    });
    setStorage(STORAGE_KEYS.rankings, rankings);
    saveWrongNotes(result);
  } catch (error) {
    console.error("saveResult failed:", error);
    showNotice("寃곌낵 ???以??쇰? ?ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.", "error");
  }
}

function saveWrongNotes(result) {
  try {
    const raw = getStorage(STORAGE_KEYS.wrongNotes, []);
    const notes = (Array.isArray(raw) ? raw : []).filter((note) => note.sourceResultId !== result.id);
    (result.details || []).forEach((item) => {
      if (item.grade?.isCorrect) return;
      const q = item.question;
      if (!q?.id) return;
      const existing = notes.find((note) => note.questionId === q.id);
      const payload = {
        questionId: q.id,
        passage: q.passage || "",
        question: q.question || "",
        options: q.options || [],
        correctAnswer: q.answer,
        selectedAnswer: item.grade?.selectedAnswer,
        userAnswer: item.userAnswer,
        sampleAnswers: q.sampleAnswers || [],
        explanation: q.explanation || "",
        difficulty: q.difficulty || "normal",
        type: q.type || "main_idea",
        answerType: q.answerType || "multiple_choice",
        wrongCount: existing ? Number(existing.wrongCount || 0) + 1 : 1,
        lastWrongDate: result.date,
        isMastered: existing ? existing.isMastered : false,
        sourceResultId: result.id
      };
      if (existing) Object.assign(existing, payload);
      else notes.push(payload);
    });
    setStorage(STORAGE_KEYS.wrongNotes, notes);
  } catch (error) {
    console.error("saveWrongNotes failed:", error);
  }
}

function replaceSavedResult(result) {
  saveResult(result);
  setStorage(STORAGE_KEYS.lastResult, result);
}

function applyManualGrade(index, mode) {
  if (!currentResult) return;
  const detail = currentResult.details[index];
  const points = Number(detail.question.points || 10);
  const ratio = mode === "correct" ? 1 : mode === "partial" ? 0.5 : 0;
  detail.grade = {
    ...detail.grade,
    isCorrect: ratio === 1,
    isPartial: ratio === 0.5,
    scoreRatio: ratio,
    earnedPoints: Math.round(points * ratio),
    feedback: "?ъ슜?먭? ?섎룞?쇰줈 梨꾩젏 寃곌낵瑜??섏젙?덉뒿?덈떎.",
    manual: true
  };
  currentResult = buildResultFromDetails(currentResult, currentResult.details);
  replaceSavedResult(currentResult);
  renderResult();
}

function aggregateStats(histories = getStorage(STORAGE_KEYS.histories, [])) {
  histories = Array.isArray(histories) ? histories : [];
  const best = histories.length ? Math.max(...histories.map((item) => Number(item.scorePercent || 0))) : 0;
  const avg = histories.length ? Math.round(histories.reduce((sum, item) => sum + Number(item.scorePercent || 0), 0) / histories.length) : 0;
  const latest = histories.at(-1);
  const correct = histories.reduce((sum, item) => sum + Number(item.correctCount || 0), 0);
  const partial = histories.reduce((sum, item) => sum + Number(item.partialCount || 0), 0);
  const wrong = histories.reduce((sum, item) => sum + Number(item.wrongCount || 0), 0);
  const total = correct + partial + wrong;
  const details = histories.flatMap((item) => item.details || []);
  const mc = details.filter((item) => item.question.answerType === "multiple_choice");
  const short = details.filter((item) => item.question.answerType === "short_answer");
  const strongWeak = getStrongWeakTypes(details);
  return {
    count: histories.length,
    best,
    avg,
    latestGrade: latest?.grade || "-",
    averageGrade: histories.length ? getGrade(avg).code : "-",
    correct,
    partial,
    wrong,
    total,
    accuracy: total ? Math.round(((correct + partial * 0.5) / total) * 100) : 0,
    mcAccuracy: mc.length ? Math.round((mc.filter((item) => item.grade.isCorrect).length / mc.length) * 100) : 0,
    shortAccuracy: short.length ? Math.round((short.filter((item) => item.grade.isCorrect).length / short.length) * 100) : 0,
    strongType: strongWeak.strong,
    weakType: strongWeak.weak
  };
}

function showView(view) {
  clearInterval(timerId);
  const [baseView, detailId] = String(view || "home").split(":");
  if (baseView === "rooms") {
    window.RoomService?.unsubscribeRoom?.();
    activeRoomContext = null;
  }
  if (!["rooms", "room-lobby", "room-play", "room-result"].includes(baseView)) {
    window.RoomService?.unsubscribeRoom?.();
    window.RoomService?.unsubscribeOpenRooms?.();
    activeRoomContext = null;
  }
  if (baseView === "ranked") {
    window.RankedMatchService?.unsubscribeRankedMatch?.();
    activeRankedContext = null;
  }
  if (!["ranked", "ranked-queue", "ranked-play", "ranked-result"].includes(baseView)) {
    window.RankedMatchService?.unsubscribeRankedMatch?.();
    activeRankedContext = null;
  }
  navButtons.forEach((button) => button.classList.toggle("active", button.dataset.nav === baseView));
  if (baseView !== "test" && !String(location.hash).includes(view)) location.hash = view;
  const renderers = {
    home: renderHome,
    settings: renderSettings,
    test: renderTest,
    result: renderResult,
    ranking: renderRanking,
    profile: renderProfile,
    "wrong-note": renderWrongNote,
    stats: renderStats,
    today: renderToday,
    rooms: renderRooms,
    ranked: renderRanked,
    "room-lobby": () => renderRoomLobbyById(detailId),
    "room-play": () => renderRoomPlayById(detailId),
    "room-result": () => renderRoomResultById(detailId),
    "ranked-queue": () => renderRankedQueueById(detailId),
    "ranked-play": () => renderRankedPlayById(detailId),
    "ranked-result": () => renderRankedResultById(detailId),
    replays: renderReplays,
    "public-replays": renderPublicReplays,
    "replay-detail": renderReplayDetail,
    admin: renderAdmin
  };
  try {
    if (baseView === "replay-detail") {
      renderReplayDetail(detailId);
      return;
    }
    (renderers[baseView] || renderHome)();
  } catch (error) {
    console.error(`render ${baseView} failed:`, error);
    app.innerHTML = `<div class="empty">?붾㈃??遺덈윭?ㅻ뒗 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎. ?덉쑝濡??뚯븘媛 ?ㅼ떆 ?쒕룄??二쇱꽭??</div>`;
    showNotice("?붾㈃??遺덈윭?ㅻ뒗 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.", "error");
  }
}
window.showView = showView;

function renderHome() {
  const stats = aggregateStats();
  const progress = loadCurrentTest();
  app.innerHTML = `
    <section class="section">
      <div class="hero">
        <div class="hero-copy">
          <span class="eyebrow">AI ?낇빐 ?덈젴 ?뱀빋</span>
          <h1>臾명빐??梨뚮┛吏</h1>
          <p class="lead">AI媛 留뚮뱺 臾명빐??臾몄젣濡??낇빐?κ낵 ?ш퀬?μ쓣 ?뚯뒪?명빐蹂댁꽭??</p>
          <div class="actions">
            <button class="btn primary" data-go="settings">테스트 시작</button>
            <button class="btn" data-go="today">오늘의 문제</button>
            <button class="btn" data-go="ranking">랭킹 보기</button>
            <button class="btn" data-go="profile">내 정보 보기</button>
          </div>
          ${progress ? `<button class="btn success" data-resume>진행 중인 테스트 이어가기</button>` : ""}
        </div>
        <div class="hero-art" role="img" aria-label="독해 문제와 학습 카드 일러스트"></div>
      </div>
      <div class="grid">
        ${statCard("현재 닉네임", getNickname() || "Guest", "span-3")}
        ${statCard("현재 최고 점수", `${stats.best}점`, "span-3")}
        ${statCard("총 테스트 횟수", `${stats.count}회`, "span-3")}
        ${statCard("최근 등급", stats.latestGrade, "span-3")}
      </div>
      ${supabaseStatusHtml()}
    </section>
  `;
  bindGoButtons();
  document.querySelector("[data-resume]")?.addEventListener("click", () => {
    testState = progress;
    showView("test");
  });
}

function statCard(label, value, span = "span-4") {
  return `<div class="card stat ${span}"><span class="muted">${label}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function renderSettings() {
  const progress = loadCurrentTest();
  const types = Object.entries(TYPE_LABELS).map(([value, label]) => `
    <label class="check"><input type="checkbox" name="type" value="${value}" checked /> ${label}</label>
  `).join("");
  app.innerHTML = `
    <section class="section">
      <div class="card">
        <h2>?뚯뒪???ㅼ젙</h2>
        <p class="muted">?쒖씠?? 臾몄젣 ?? ?좏삎??怨좊Ⅸ ??AI ?앹꽦 ?먮뒗 ??λ맂 臾몄젣濡??쒖옉?섏꽭??</p>
      </div>
      ${isLocalFileMode() ? `<div class="card notice-inline warning">?꾩옱 濡쒖뺄 ?뚯씪濡??ㅽ뻾 以묒씠誘濡?Supabase Edge Function???몄텧?????놁뒿?덈떎. npm run dev ?먮뒗 諛고룷 二쇱냼濡??묒냽?섏꽭?? 吏湲덉? ??λ맂 臾몄젣 ?먮뒗 ?섑뵆 臾몄젣濡?吏꾪뻾?⑸땲??</div>` : ""}
      ${progress ? `<div class="card notice-inline info row between"><span>?뚯뒪??蹂듦뎄媛 媛?ν빀?덈떎. ${progress.currentIndex + 1} / ${progress.questions.length}踰?臾몄젣遺???댁뼱??? ???덉뒿?덈떎.</span><button class="btn success" data-resume-test>?댁뼱???湲?/button></div>` : ""}
      <div class="card">
        <div class="form-grid">
          <div class="field">
            <label for="difficulty">?쒖씠??/label>
            <select id="difficulty">
              <option value="easy">easy</option>
              <option value="normal" selected>normal</option>
              <option value="hard">hard</option>
              <option value="expert">expert</option>
            </select>
            <p id="difficultyDescription" class="muted">${DIFFICULTY_DESCRIPTIONS.normal}</p>
            <p id="expertWarning" class="notice-inline warning" style="display:none">expert ?쒖씠?꾨뒗 吏臾몄씠 湲멸퀬 ?좏깮吏媛 留ㅼ슦 ?룰컝由????덉뒿?덈떎. ?⑥닚 ?댁슜 ?뺤씤???꾨땲???쇰━ 援ъ“ ?꾩껜瑜??뚯븙?댁빞 ?⑸땲??</p>
          </div>
          <div class="field">
            <label for="count">臾몄젣 ??/label>
            <select id="count">
              <option value="5">5臾몄젣</option>
              <option value="10">10臾몄젣</option>
              <option value="15">15臾몄젣</option>
            </select>
          </div>
          <div class="field span-12">
            <span class="label">臾몄젣 ?좏삎</span>
            <div class="check-grid">${types}</div>
          </div>
          <label class="check"><input id="includeShortAnswer" type="checkbox" checked /> 二쇨????ы븿</label>
          <label class="check"><input id="useTimer" type="checkbox" /> 臾몄젣???쒗븳 ?쒓컙 ?ъ슜</label>
          <label class="check"><input id="difficultyBoost" type="checkbox" /> ?쒖씠??媛뺥솕 ?앹꽦</label>
          <div class="field">
            <label for="secondsPerQuestion">?쒗븳 ?쒓컙</label>
            <input id="secondsPerQuestion" type="number" min="10" max="300" value="60" />
          </div>
        </div>
        <div class="actions" style="margin-top:18px">
          <button class="btn primary" data-start-ai>AI媛 留뚮뱺 ?쒕뜡 臾몄젣濡??쒖옉</button>
          <button class="btn" data-regenerate-ai>媛숈? ?ㅼ젙?쇰줈 AI 臾몄젣 ?ㅼ떆 ?앹꽦</button>
          <button class="btn danger" data-start-ai-boost>???대졄寃??앹꽦</button>
          <button class="btn" data-start-saved>??λ맂 AI 臾몄젣濡??쒖옉</button>
          <button class="btn" data-start-sample>?섑뵆 臾몄젣濡??쒖옉</button>
        </div>
        <p id="aiGenerationStatus" class="muted" style="margin-top:10px">AI ?앹꽦? Supabase Edge Function generate-questions瑜??듯빐 ?ㅽ뻾?⑸땲??</p>
      </div>
    </section>
  `;
  const difficultySelect = document.querySelector("#difficulty");
  const description = document.querySelector("#difficultyDescription");
  const expertWarning = document.querySelector("#expertWarning");
  const updateDifficultyDescription = () => {
    const value = difficultySelect?.value || "normal";
    if (description) description.textContent = DIFFICULTY_DESCRIPTIONS[value] || DIFFICULTY_DESCRIPTIONS.normal;
    if (expertWarning) expertWarning.style.display = value === "expert" ? "block" : "none";
  };
  difficultySelect?.addEventListener("change", updateDifficultyDescription);
  updateDifficultyDescription();
  document.querySelector("[data-start-ai]")?.addEventListener("click", () => startTest("ai"));
  document.querySelector("[data-regenerate-ai]")?.addEventListener("click", () => startTest("ai"));
  document.querySelector("[data-start-ai-boost]")?.addEventListener("click", () => {
    const boost = document.querySelector("#difficultyBoost");
    if (boost) boost.checked = true;
    startTest("ai", true);
  });
  document.querySelector("[data-start-saved]")?.addEventListener("click", () => startTest("saved"));
  document.querySelector("[data-start-sample]")?.addEventListener("click", () => startTest("sample"));
  document.querySelector("[data-resume-test]")?.addEventListener("click", () => {
    testState = loadCurrentTest();
    if (testState) {
      showNotice("吏꾪뻾 以묒씤 ?뚯뒪?몃? 蹂듦뎄?덉뒿?덈떎.", "info");
      showView("test");
    }
  });
}

function renderTest() {
  if (!testState) {
    testState = loadCurrentTest();
    if (!testState) return renderSettings();
  }
  if (testState.isFinished || testState.currentIndex >= testState.questions.length) return finishTest();
  const q = testState.questions[testState.currentIndex];
  const number = testState.currentIndex + 1;
  const total = testState.questions.length;
  const progress = Math.round((number / total) * 100);
  const questionSource = testState.settings?.questionSource || window.LAST_QUESTION_SOURCE || "sample";
  const aiFailureReason = testState.settings?.aiFailureReason || "";
  const aiProvider = testState.settings?.aiProvider || (questionSource === "ai-live" ? window.LAST_AI_PROVIDER : "");
  const aiModel = testState.settings?.aiModel || (questionSource === "ai-live" ? window.LAST_AI_MODEL : "");
  const aiDifficulty = testState.settings?.difficulty || q.difficulty || "";
  const aiMetaText = questionSource.startsWith("ai")
    ? [
      aiProvider ? `provider=${aiProvider}` : "",
      aiModel ? `model=${aiModel}` : "",
      aiDifficulty ? `difficulty=${aiDifficulty}` : ""
    ].filter(Boolean).join(" · ")
    : "";
  window.LAST_QUESTION_SOURCE = questionSource;
  app.innerHTML = `
    <section class="section test-layout">
      <div class="card">
        <div class="row between">
          <div>
            <h2>${number} / ${total}踰?臾몄젣</h2>
            <p class="muted">臾몄젣 異쒖쿂: ${escapeHtml(questionSourceLabel(questionSource))}</p>
            ${aiMetaText ? `<p class="muted">AI 정보: ${escapeHtml(aiMetaText)}</p>` : ""}
            ${aiFailureReason ? `<p class="notice-inline warning">AI ?ㅽ뙣 ?먯씤: ${escapeHtml(aiFailureReason)}</p>` : ""}
            <div class="badges">
              <span class="badge ${q.difficulty}">${DIFFICULTY_LABELS[q.difficulty] || q.difficulty}</span>
              <span class="badge">${TYPE_LABELS[q.type] || q.type}</span>
              <span class="badge ${q.answerType}">${q.answerType === "multiple_choice" ? "객관식" : "주관식"}</span>
            </div>
          </div>
          <div class="timer" id="timerBox">${testState.settings.useTimer ? `남은 시간 ${testState.timeLeft}초` : "시간 제한 없음"}</div>
        </div>
        <div class="progress" style="margin-top:14px"><span style="width:${progress}%"></span></div>
      </div>
      <article class="card">
        <h3>吏臾?/h3>
        <p class="passage">${escapeHtml(q.passage)}</p>
      </article>
      <div class="card">
        <h3>${escapeHtml(q.question)}</h3>
        <div id="answerArea" style="margin-top:14px"></div>
        <div class="actions" style="margin-top:18px">
          <button class="btn primary" data-next>${number === total ? "寃곌낵 蹂닿린" : "?ㅼ쓬 臾몄젣"}</button>
          <button class="btn ghost" data-finish>?뚯뒪??醫낅즺</button>
        </div>
      </div>
    </section>
  `;
  const area = document.querySelector("#answerArea");
  if (q.answerType === "multiple_choice") {
    area.innerHTML = `<div class="options">${q.options.map((option, index) => `
      <button class="option ${testState.selectedAnswer === index ? "selected" : ""}" data-option="${index}">${escapeHtml(option)}</button>
    `).join("")}</div>`;
    area.querySelectorAll("[data-option]").forEach((button) => {
      button.addEventListener("click", () => {
        testState.selectedAnswer = Number(button.dataset.option);
        saveCurrentTest();
        renderTest();
      });
    });
  } else {
    area.innerHTML = `
      <textarea id="shortAnswer" placeholder="?듭븞???낅젰?섏꽭??">${escapeHtml(testState.currentAnswer || "")}</textarea>
      <p class="muted">?뺣떟 臾몄옣怨??꾩쟾??媛숈? ?딆븘???듭떖 ?섎?? ?ㅼ썙?쒓? 留욎쑝硫??뺣떟?쇰줈 ?몄젙?⑸땲??</p>
    `;
    area.querySelector("#shortAnswer").addEventListener("input", (event) => {
      testState.currentAnswer = event.target.value;
      saveCurrentTest();
    });
  }
  const nextButton = document.querySelector("[data-next]");
  nextButton?.addEventListener("click", () => submitCurrentAnswer(false));
  document.querySelector("[data-finish]")?.addEventListener("click", () => {
    if (confirm("?꾩옱 ?뚯뒪?몃? 以묐떒?좉퉴?? 吏꾪뻾 以묒씤 ?듭븞? ??λ릺吏 ?딆쓣 ???덉뒿?덈떎.")) {
      clearCurrentTest();
      showNotice("?뚯뒪?몃? 以묐떒?덉뒿?덈떎.", "info");
      showView("settings");
    }
  });
  startTimer();
}

function startTimer() {
  clearInterval(timerId);
  if (!testState?.settings.useTimer) return;
  const timerBox = document.querySelector("#timerBox");
  timerId = setInterval(() => {
    if (!testState || isSubmittingAnswer) return;
    testState.timeLeft -= 1;
    if (timerBox) timerBox.textContent = `남은 시간 ${testState.timeLeft}초`;
    saveCurrentTest();
    if (testState.timeLeft <= 0) {
      clearInterval(timerId);
      submitCurrentAnswer(true);
    }
  }, 1000);
}

function renderResult() {
  currentResult = currentResult || getStorage(STORAGE_KEYS.lastResult, null);
  if (!currentResult) {
    app.innerHTML = `<div class="empty">?꾩쭅 寃곌낵媛 ?놁뒿?덈떎. ?뚯뒪?몃? 癒쇱? 吏꾪뻾??二쇱꽭??</div>`;
    return;
  }
  currentResult = {
    details: [],
    score: 0,
    maxScore: 0,
    scorePercent: 0,
    grade: "湲곕줉 ?놁쓬",
    correctCount: 0,
    partialCount: 0,
    wrongCount: 0,
    timeoutCount: 0,
    totalTime: 0,
    averageTime: 0,
    multipleChoiceAccuracy: 0,
    shortAnswerAccuracy: 0,
    strongType: "湲곕줉 ?놁쓬",
    weakType: "湲곕줉 ?놁쓬",
    advice: "湲곕줉??異⑸텇?섏? ?딆뒿?덈떎. ?뚯뒪?몃? ??踰???吏꾪뻾??蹂댁꽭??",
    ...currentResult
  };
  app.innerHTML = `
    <section class="section">
      <div class="card">
        <div class="row between">
          <div>
            <h2>결과</h2>
            <p class="muted">주관식 자동 채점은 키워드와 문장 유사도를 기준으로 판단하므로 실제 사람 평가와 다를 수 있습니다.</p>
          </div>
          <button class="btn primary" data-go="ranking">랭킹 보기</button>
        </div>
      </div>
      <div class="grid">
        ${statCard("총점", `${currentResult.score} / ${currentResult.maxScore}`, "span-3")}
        ${statCard("점수 비율", `${currentResult.scorePercent}%`, "span-3")}
        ${statCard("등급", currentResult.grade, "span-3")}
        ${statCard("총 풀이 시간", secondsLabel(currentResult.totalTime), "span-3")}
        ${statCard("정답 / 부분 / 오답", `${currentResult.correctCount} / ${currentResult.partialCount} / ${currentResult.wrongCount}`, "span-4")}
        ${statCard("시간 초과", `${currentResult.timeoutCount}개`, "span-4")}
        ${statCard("평균 풀이 시간", secondsLabel(currentResult.averageTime), "span-4")}
        ${statCard("객관식 정답률", `${currentResult.multipleChoiceAccuracy}%`, "span-3")}
        ${statCard("주관식 정답률", `${currentResult.shortAnswerAccuracy}%`, "span-3")}
        ${statCard("강한 유형", currentResult.strongType, "span-3")}
        ${statCard("약한 유형", currentResult.weakType, "span-3")}
      </div>
      <div class="card"><h3>맞춤 조언</h3><p>${escapeHtml(currentResult.advice)}</p></div>
      <div class="card">
        <h3>리플레이 저장</h3>
        <p class="muted">기본값은 비공개입니다. 공개 체크를 해야 공개 리플레이 목록에 표시됩니다.</p>
        <div class="form-grid" style="margin-top:12px">
          <label class="check"><input id="saveReplayPublic" type="checkbox" /> 공개 리플레이로 저장</label>
          <input id="saveReplayTitle" placeholder="공개 제목 또는 리플레이 제목" value="${escapeHtml(`${currentResult.nickname || "익명"} ${currentResult.gradeCode || ""} 리플레이`)}" />
        </div>
        <div class="actions" style="margin-top:12px">
          <button class="btn primary" data-save-replay>리플레이 저장</button>
          <button class="btn" data-go="replays">내 리플레이 보기</button>
        </div>
      </div>
      <div class="card">
        <h3>臾몄젣蹂?寃곌낵</h3>
        <div class="table-list">
          ${(currentResult.details || []).map(resultItemHtml).join("") || `<div class="empty">臾몄젣蹂?寃곌낵媛 ?놁뒿?덈떎.</div>`}
        </div>
      </div>
    </section>
  `;
  bindGoButtons();
  document.querySelector("[data-save-replay]")?.addEventListener("click", saveCurrentResultReplay);
  document.querySelectorAll("[data-manual]").forEach((button) => {
    button.addEventListener("click", () => applyManualGrade(Number(button.dataset.index), button.dataset.manual));
  });
  document.querySelectorAll("[data-ai-analysis]").forEach((button) => {
    button.addEventListener("click", () => requestAiAnalysis(Number(button.dataset.aiAnalysis)));
  });
}

function resultItemHtml(item, index) {
  const grade = item.grade || {};
  const statusClass = grade.isCorrect ? "result-good" : grade.isPartial ? "result-partial" : "result-bad";
  const status = grade.isCorrect ? "?뺣떟" : grade.isPartial ? "遺遺??뺣떟" : "?ㅻ떟";
  const q = item.question || {};
  const analysis = window.AnalysisService?.buildQuestionAnalysis?.(item) || {};
  const passage = analysis.passage || {};
  const performance = analysis.performance || {};
  const questionAnalysis = analysis.question || {};
  return `
    <article class="result-item">
      <div class="row between">
        <strong class="${statusClass}">${index + 1}. ${status} (${grade.earnedPoints || 0}점)</strong>
        <div class="badges"><span class="badge">${TYPE_LABELS[q.type] || q.type}</span><span class="badge ${q.answerType}">${q.answerType === "multiple_choice" ? "객관식" : "주관식"}</span></div>
      </div>
      <p><strong>질문:</strong> ${escapeHtml(q.question)}</p>
      <p><strong>내 답:</strong> ${escapeHtml(q.answerType === "multiple_choice" ? (q.options || [])[item.userAnswer] ?? "미선택" : item.userAnswer || "미입력")}</p>
      <p><strong>해설:</strong> ${escapeHtml(q.explanation)}</p>
      <div class="grid">
        ${statCard("글자/문장/문단", `${passage.charCount || 0}자 · ${passage.sentenceCount || 0}문장 · ${passage.paragraphCount || 0}문단`, "span-4")}
        ${statCard("평균 문장 길이", `${passage.averageSentenceLength || 0}자`, "span-4")}
        ${statCard("예상 읽기/실제 풀이", `${secondsLabel(passage.estimatedReadingTime || 0)} / ${secondsLabel(item.elapsed || 0)}`, "span-4")}
        ${statCard("난이도 추정", `${passage.difficultyScore || 0}점 · ${passage.vocabularyLevel || "basic"}`, "span-4")}
        ${statCard("추론 단계", `${questionAnalysis.requiredReasoningSteps || 0}단계`, "span-4")}
        ${statCard("복습 추천", performance.recommendedReviewType || "기록 없음", "span-4")}
      </div>
      ${!grade.isCorrect ? `<p class="muted"><strong>오답 원인:</strong> ${escapeHtml(buildLocalMistakeFeedback(item, analysis))}</p>` : ""}
      <div class="actions">
        <button class="btn ghost" data-ai-analysis="${index}">AI ?곸꽭 ?댁꽕 蹂닿린</button>
      </div>
      <div id="aiAnalysis-${index}" class="note-item" style="display:none"></div>
      ${q.answerType === "short_answer" ? `
        <p class="muted">?좎궗??${grade.similarity ?? 0}, ?ㅼ썙???먯닔 ${grade.keywordScore ?? 0}, ?쇱튂 ?ㅼ썙?? ${(grade.matchedKeywords || []).map(escapeHtml).join(", ") || "-"}</p>
        <div class="actions">
          <button class="btn success" data-manual="correct" data-index="${index}">?뺣떟?쇰줈 ?몄젙?섍린</button>
          <button class="btn" data-manual="partial" data-index="${index}">遺遺??뺣떟?쇰줈 ?몄젙?섍린</button>
          <button class="btn danger" data-manual="wrong" data-index="${index}">?ㅻ떟?쇰줈 ?섏젙?섍린</button>
        </div>
      ` : ""}
    </article>
  `;
}

function buildLocalMistakeFeedback(item, analysis = {}) {
  const q = item.question || {};
  const grade = item.grade || {};
  if (q.answerType === "multiple_choice") {
    const selected = (q.options || [])[grade.selectedAnswer] || "미선택";
    const correct = (q.options || [])[q.answer] || "정답 없음";
    return `선택한 보기 "${selected}"보다 정답 "${correct}"가 지문의 핵심과 더 직접적으로 연결됩니다. 선택지가 지문보다 과장되었거나 원인과 결과가 바뀌었는지 확인해 보세요.`;
  }
  const missing = analysis.performance?.missingKeywords || [];
  return `필수 키워드 ${missing.length ? missing.join(", ") : "일부"}가 부족하거나 논증 구조가 충분히 드러나지 않았습니다. 주장, 근거, 결론의 관계를 함께 써 보세요.`;
}

async function saveCurrentResultReplay() {
  if (!currentResult) return showNotice("??ν븷 寃곌낵媛 ?놁뒿?덈떎.", "warning");
  const isPublic = Boolean(document.querySelector("#saveReplayPublic")?.checked);
  const title = document.querySelector("#saveReplayTitle")?.value?.trim() || "";
  try {
    await window.UserRemoteService?.getOrCreateUser?.(getNickname() || "?듬챸");
    const saved = await window.ReplayService.saveReplay(
      { ...currentResult, mode: "solo" },
      currentResult.details || [],
      { isPublic, publicTitle: isPublic ? title : null, title }
    );
    showNotice(saved.remote ? "由ы뵆?덉씠瑜?Supabase????ν뻽?듬땲??" : "Supabase ?ㅼ젙???놁뼱 由ы뵆?덉씠瑜?濡쒖뺄????ν뻽?듬땲??", saved.remote ? "success" : "info");
  } catch (error) {
    console.error("saveCurrentResultReplay failed:", error);
    showNotice("由ы뵆?덉씠 ???以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.", "error");
  }
}

async function requestAiAnalysis(index) {
  const item = currentResult?.details?.[index];
  const target = document.querySelector(`#aiAnalysis-${index}`);
  if (!item || !target) return;
  target.style.display = "block";
  target.textContent = "AI ?곸꽭 ?댁꽕??遺덈윭?ㅻ뒗 以?..";
  try {
    const passageAnalysis = window.AnalysisService?.analyzePassage?.(item.question?.passage || {}) || {};
    const response = await fetch("/api/analyze-result", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: item.question,
        userAnswer: item.userAnswer,
        gradingResult: item.grade,
        passageAnalysis
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "AI ?곸꽭 ?댁꽕 ?앹꽦???ㅽ뙣?덉뒿?덈떎.");
    target.innerHTML = `
      <h3>AI ?곸꽭 ?댁꽕</h3>
      <p><strong>?듭떖 ?붿빟:</strong> ${escapeHtml(data.summary || "-")}</p>
      <p><strong>?뺣떟 洹쇨굅:</strong> ${escapeHtml(data.answerReason || "-")}</p>
      <p><strong>?ㅼ닔 遺꾩꽍:</strong> ${escapeHtml(data.userMistakeAnalysis || "-")}</p>
      <p><strong>????꾨왂:</strong> ${escapeHtml(data.solvingStrategy || "-")}</p>
      <div class="table-list">${(data.reasoningSteps || []).map((step, stepIndex) => `<div class="history-item">${stepIndex + 1}. ${escapeHtml(step)}</div>`).join("")}</div>
    `;
  } catch (error) {
    console.error("requestAiAnalysis failed:", error);
    target.innerHTML = `<p class="result-bad">AI ?곸꽭 ?댁꽕??遺덈윭?ㅼ? 紐삵뻽?듬땲?? API ?ㅼ젙???뺤씤??二쇱꽭??</p>`;
  }
}

function sortRankings(rows, sortMode) {
  return [...rows].sort((a, b) => {
    if (sortMode === "time") return Number(a.totalTime || 0) - Number(b.totalTime || 0) || Number(b.score || 0) - Number(a.score || 0) || new Date(b.date || 0) - new Date(a.date || 0);
    if (sortMode === "latest") return new Date(b.date) - new Date(a.date);
    return Number(b.score || 0) - Number(a.score || 0) || Number(a.totalTime || 0) - Number(b.totalTime || 0) || new Date(b.date || 0) - new Date(a.date || 0);
  });
}

function renderRanking() {
  const rankings = Array.isArray(getStorage(STORAGE_KEYS.rankings, [])) ? getStorage(STORAGE_KEYS.rankings, []) : [];
  app.innerHTML = `
    <section class="section">
      <div class="card"><h2>??궧</h2><p class="muted">??궧???쒖쐞?쒖? ?붾줈 ?뚯뒪??湲곕줉???④퍡 ?뺤씤?⑸땲??</p></div>
      ${supabaseStatusHtml()}
      <div class="card">
        <div class="row between">
          <h3>??궧???쒖쐞??/h3>
          <button class="btn" data-refresh-ranked-board ${isOnlineFeatureAvailable() ? "" : "disabled"}>?덈줈怨좎묠</button>
        </div>
        <div id="rankedBoard" class="table-list" style="margin-top:12px">
          ${isOnlineFeatureAvailable() ? `<div class="empty">??궧???쒖쐞?쒕? 遺덈윭?ㅻ뒗 以묒엯?덈떎.</div>` : `<div class="empty">Supabase ?ㅼ젙 ????궧???쒖쐞?쒕? 蹂????덉뒿?덈떎.</div>`}
        </div>
      </div>
      <div class="card form-grid">
        <select id="rankRange"><option value="all">?꾩껜 ??궧</option><option value="today">?ㅻ뒛 ??궧</option><option value="week">二쇨컙 ??궧</option></select>
        <select id="rankDifficulty"><option value="all">?꾩껜 ?쒖씠??/option><option value="easy">easy</option><option value="normal">normal</option><option value="hard">hard</option><option value="expert">expert</option></select>
        <input id="rankSearch" placeholder="?됰꽕??寃?? />
        <select id="rankSort"><option value="score">?먯닔 ?믪? ??/option><option value="time">????쒓컙 吏㏃? ??/option><option value="latest">理쒖떊??/option></select>
        <label class="check"><input id="rankMine" type="checkbox" /> ??湲곕줉留?蹂닿린</label>
      </div>
      <div class="card"><div id="rankingList" class="table-list"></div></div>
    </section>
  `;
  const renderList = () => {
    let rows = [...rankings];
    const range = document.querySelector("#rankRange").value;
    const difficulty = document.querySelector("#rankDifficulty").value;
    const search = document.querySelector("#rankSearch").value.trim();
    const mine = document.querySelector("#rankMine").checked;
    const now = new Date();
    if (range === "today") rows = rows.filter((row) => String(row.date || "").slice(0, 10) === todayKey());
    if (range === "week") rows = rows.filter((row) => row.date && (now - new Date(row.date)) / 86400000 <= 7);
    if (difficulty !== "all") rows = rows.filter((row) => row.difficulty === difficulty);
    if (search) rows = rows.filter((row) => row.nickname.includes(search));
    if (mine) rows = rows.filter((row) => row.nickname === getNickname());
    rows = sortRankings(rows, document.querySelector("#rankSort").value);
    document.querySelector("#rankingList").innerHTML = rows.length ? rows.map((row, index) => `
      <div class="rank-item top-${index + 1}">
        <div class="row between"><strong>${index + 1}??${escapeHtml(row.nickname || "?듬챸")}</strong><span class="badge">${escapeHtml(row.grade || "-")}</span></div>
        <p>${Number(row.score || 0)}??쨌 ${escapeHtml(row.difficulty || "-")} 쨌 ${Number(row.totalQuestions || 0)}臾몄젣 쨌 ${secondsLabel(row.totalTime)} 쨌 ${row.date ? new Date(row.date).toLocaleString() : "?좎쭨 ?놁쓬"}</p>
      </div>
    `).join("") : `<div class="empty">??궧 ?곗씠?곌? ?놁뒿?덈떎.</div>`;
  };
  ["rankRange", "rankDifficulty", "rankSearch", "rankSort", "rankMine"].forEach((id) => {
    document.querySelector(`#${id}`).addEventListener("input", renderList);
  });
  document.querySelector("[data-refresh-ranked-board]")?.addEventListener("click", renderRankedBoard);
  renderList();
  if (isOnlineFeatureAvailable()) renderRankedBoard();
}

async function renderRankedBoard() {
  const target = document.querySelector("#rankedBoard");
  if (!target) return;
  try {
    target.innerHTML = `<div class="empty">??궧???쒖쐞?쒕? 遺덈윭?ㅻ뒗 以묒엯?덈떎.</div>`;
    const profiles = await window.RankedMatchService.getRankingProfiles();
    const rows = window.RatingUtils.decorateProfilesWithPercentTiers(profiles);
    await window.RankedMatchService.recalculateAllTiers().catch((error) => console.warn("tier recalculation skipped:", error));
    const ranked = rows.filter((row) => Number(row.ranked_games || 0) > 0);
    const unranked = rows.filter((row) => Number(row.ranked_games || 0) === 0);
    const rowHtml = (row, index) => {
      const games = Number(row.ranked_games || 0);
      const winRate = games ? Math.round((Number(row.wins || 0) / games) * 100) : 0;
      return `<div class="rank-item top-${index + 1}">
        <div class="row between">
          <strong>${row.rank_position ? `${row.rank_position}??` : ""}${tierNick(row.nickname, row)}</strong>
          <span class="badge">${escapeHtml(row.tier || "??궧?놁쓬")}</span>
        </div>
        <p>?곸쐞 ${row.percentile == null ? "-" : `${Number(row.percentile).toFixed(1)}%`} 쨌 Rating ${Number(row.rating || 0)} 쨌 ${Number(row.wins || 0)}??${Number(row.losses || 0)}??${Number(row.draws || 0)}臾?쨌 ?밸쪧 ${winRate}% 쨌 ${games}??/p>
      </div>`;
    };
    target.innerHTML = `
      ${ranked.length ? ranked.map(rowHtml).join("") : `<div class="empty">??궧?꾩쓣 ?꾨즺???좎?媛 ?놁뒿?덈떎.</div>`}
      ${unranked.length ? `<div class="empty">??궧?놁쓬 ${unranked.length}紐? ${unranked.slice(0, 8).map((row) => escapeHtml(row.nickname || "?듬챸")).join(", ")}${unranked.length > 8 ? "..." : ""}</div>` : ""}
    `;
  } catch (error) {
    console.error("ranked board failed:", error);
    target.innerHTML = `<div class="empty">??궧???쒖쐞?쒕? 遺덈윭?ㅼ? 紐삵뻽?듬땲?? ${escapeHtml(friendlyOnlineError(error))}</div>`;
  }
}

function renderProfile() {
  const histories = Array.isArray(getStorage(STORAGE_KEYS.histories, [])) ? getStorage(STORAGE_KEYS.histories, []) : [];
  const stats = aggregateStats(histories);
  const guestNickname = window.UserRemoteService?.getOrCreateGuestNickname?.() || getNickname() || "Guest";
  const guestId = window.UserRemoteService?.getOrCreateTestGuestId?.() || "";
  app.innerHTML = `
    <section class="section">
      <div class="card">
        <div class="row between">
          <h2>???뺣낫</h2>
          <button class="btn" data-change-nickname>?됰꽕??蹂寃?/button>
        </div>
      </div>
      <div class="card">
        <div class="row between">
          <div data-auth-status>
            <strong>테스트 모드</strong>
            <p class="muted">현재 닉네임: ${escapeHtml(guestNickname)}</p>
            <p class="muted">브라우저/기기별 guest ID로 랭킹전과 대결 방을 이용합니다. ${escapeHtml(guestId)}</p>
          </div>
          <div class="actions">
            <button class="btn" data-change-nickname-inline>닉네임 변경</button>
          </div>
        </div>
      </div>
      <div class="grid">
        ${statCard("닉네임", getNickname() || "Guest", "span-3")}
        ${statCard("총 테스트 횟수", `${stats.count}회`, "span-3")}
        ${statCard("최고 / 평균 점수", `${stats.best} / ${stats.avg}`, "span-3")}
        ${statCard("평균 등급", stats.averageGrade, "span-3")}
        ${statCard("누적 정답 / 부분 / 오답", `${stats.correct} / ${stats.partial} / ${stats.wrong}`, "span-4")}
        ${statCard("전체 정답률", `${stats.accuracy}%`, "span-4")}
        ${statCard("객관식 / 주관식", `${stats.mcAccuracy}% / ${stats.shortAccuracy}%`, "span-4")}
        ${statCard("강한 유형", stats.strongType, "span-6")}
        ${statCard("약한 유형", stats.weakType, "span-6")}
      </div>
      <div class="card">
        <h3>최근 테스트 기록 5개</h3>
        <div class="table-list">${histories.slice(-5).reverse().map((item) => `<div class="history-item">${Number(item.scorePercent || 0)}점 · ${escapeHtml(item.grade || "기록 없음")} · ${item.date ? new Date(item.date).toLocaleString() : "날짜 없음"}</div>`).join("") || `<div class="empty">기록이 없습니다.</div>`}</div>
      </div>
    </section>
  `;
  document.querySelector("[data-change-nickname]").addEventListener("click", () => {
    nicknameInput.value = getNickname();
    nicknameDialog.showModal();
  });
  document.querySelector("[data-change-nickname-inline]")?.addEventListener("click", () => {
    nicknameInput.value = getNickname();
    nicknameDialog.showModal();
  });
  window.UserRemoteService?.renderAuthStatus?.();
}

function renderWrongNote() {
  const notes = Array.isArray(getStorage(STORAGE_KEYS.wrongNotes, [])) ? getStorage(STORAGE_KEYS.wrongNotes, []) : [];
  app.innerHTML = `
    <section class="section">
      <div class="card row between"><h2>?ㅻ떟?명듃</h2><button class="btn danger" data-clear-notes>?꾩껜 珥덇린??/button></div>
      <div class="card form-grid">
        <select id="noteType"><option value="all">?꾩껜 ?좏삎</option>${Object.entries(TYPE_LABELS).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select>
        <select id="noteDifficulty"><option value="all">?꾩껜 ?쒖씠??/option><option value="easy">easy</option><option value="normal">normal</option><option value="hard">hard</option><option value="expert">expert</option></select>
        <select id="noteAnswerType"><option value="all">媛앷???二쇨????꾩껜</option><option value="multiple_choice">媛앷???/option><option value="short_answer">二쇨???/option></select>
      </div>
      <div class="card"><div id="noteList" class="table-list"></div></div>
    </section>
  `;
  const renderList = () => {
    const type = document.querySelector("#noteType").value;
    const difficulty = document.querySelector("#noteDifficulty").value;
    const answerType = document.querySelector("#noteAnswerType").value;
    let rows = notes.filter((note) =>
      (type === "all" || note.type === type) &&
      (difficulty === "all" || note.difficulty === difficulty) &&
      (answerType === "all" || note.answerType === answerType)
    ).sort((a, b) => b.wrongCount - a.wrongCount);
    document.querySelector("#noteList").innerHTML = rows.length ? rows.map((note) => `
      <article class="note-item">
        <div class="row between">
          <strong>${escapeHtml(note.question)}</strong>
          <div class="badges"><span class="badge">${TYPE_LABELS[note.type] || "?좏삎 ?놁쓬"}</span><span class="badge">${Number(note.wrongCount || 0)}???由?/span>${note.isMastered ? `<span class="badge easy">?숇떖 ?꾨즺</span>` : ""}</div>
        </div>
        <p class="passage">${escapeHtml(note.passage)}</p>
        <p><strong>?댁꽕:</strong> ${escapeHtml(note.explanation)}</p>
        <div class="actions">
          <button class="btn success" data-master="${note.questionId}">?숇떖 ?꾨즺 ?쒖떆</button>
          <button class="btn danger" data-delete-note="${note.questionId}">媛쒕퀎 ??젣</button>
        </div>
      </article>
    `).join("") : `<div class="empty">?ㅻ떟?명듃 ?곗씠?곌? ?놁뒿?덈떎.</div>`;
    document.querySelectorAll("[data-master]").forEach((button) => button.addEventListener("click", () => updateNote(button.dataset.master, { isMastered: true })));
    document.querySelectorAll("[data-delete-note]").forEach((button) => button.addEventListener("click", () => deleteNote(button.dataset.deleteNote)));
  };
  ["noteType", "noteDifficulty", "noteAnswerType"].forEach((id) => document.querySelector(`#${id}`).addEventListener("input", renderList));
  document.querySelector("[data-clear-notes]").addEventListener("click", () => {
    if (confirm("?ㅻ떟?명듃瑜?紐⑤몢 珥덇린?뷀븷源뚯슂?")) {
      setStorage(STORAGE_KEYS.wrongNotes, []);
      renderWrongNote();
    }
  });
  renderList();
}

function updateNote(id, patch) {
  const notes = getStorage(STORAGE_KEYS.wrongNotes, []).map((note) => note.questionId === id ? { ...note, ...patch } : note);
  setStorage(STORAGE_KEYS.wrongNotes, notes);
  renderWrongNote();
}

function deleteNote(id) {
  setStorage(STORAGE_KEYS.wrongNotes, getStorage(STORAGE_KEYS.wrongNotes, []).filter((note) => note.questionId !== id));
  renderWrongNote();
}

function renderStats() {
  const histories = Array.isArray(getStorage(STORAGE_KEYS.histories, [])) ? getStorage(STORAGE_KEYS.histories, []) : [];
  const stats = aggregateStats(histories);
  const details = histories.flatMap((item) => item.details || []);
  const difficultyRows = ["easy", "normal", "hard", "expert"].map((difficulty) => {
    const rows = histories.filter((item) => item.difficulty === difficulty);
    return { label: difficulty, value: rows.length ? Math.round(rows.reduce((sum, item) => sum + Number(item.scorePercent || 0), 0) / rows.length) : 0 };
  });
  const typeRows = Object.entries(TYPE_LABELS).map(([type, label]) => ({ label, value: typeAccuracy(details, type) || 0 }));
  const gradeRows = ["S", "A", "B", "C", "D", "E"].map((grade) => ({ label: grade, value: histories.filter((item) => item.gradeCode === grade).length }));
  const wrongTypes = getStorage(STORAGE_KEYS.wrongNotes, []).reduce((acc, note) => {
    acc[note.type] = (acc[note.type] || 0) + Number(note.wrongCount || 0);
    return acc;
  }, {});
  const mostWrong = Object.entries(wrongTypes).sort((a, b) => b[1] - a[1])[0]?.[0];
  app.innerHTML = `
    <section class="section">
      <div class="card"><h2>통계</h2></div>
      <div class="grid">
        ${statCard("총 테스트 횟수", `${stats.count}회`, "span-3")}
        ${statCard("최고 점수", `${stats.best}점`, "span-3")}
        ${statCard("평균 점수", `${stats.avg}점`, "span-3")}
        ${statCard("전체 정답률", `${stats.accuracy}%`, "span-3")}
        ${statCard("객관식 / 주관식", `${stats.mcAccuracy}% / ${stats.shortAccuracy}%`, "span-4")}
        ${statCard("가장 많이 틀린 유형", mostWrong ? TYPE_LABELS[mostWrong] : "-", "span-4")}
        ${statCard("최근 5개 점수", histories.slice(-5).map((item) => item.scorePercent).join(" / ") || "-", "span-4")}
      </div>
      <div class="grid">
        <div class="card span-6"><h3>난이도별 평균 점수</h3>${barChart(difficultyRows, 100)}</div>
        <div class="card span-6"><h3>문제 유형별 정답률</h3>${barChart(typeRows, 100)}</div>
        <div class="card span-12"><h3>등급 분포</h3>${barChart(gradeRows, Math.max(1, ...gradeRows.map((r) => r.value)))}</div>
      </div>
    </section>
  `;
}

function barChart(rows, max) {
  return `<div class="bar-chart">${rows.map((row) => `
    <div class="bar-row"><span>${escapeHtml(row.label)}</span><div class="bar"><span style="width:${Math.min(100, (row.value / max) * 100)}%"></span></div><strong>${row.value}</strong></div>
  `).join("")}</div>`;
}

function getDailyQuestion() {
  const saved = getSavedAIQuestions();
  if (!saved.length) return null;
  const key = todayKey();
  const savedToday = getStorage(STORAGE_KEYS.today, null);
  if (savedToday?.date === key) return savedToday;
  const index = [...key].reduce((sum, char) => sum + char.charCodeAt(0), 0) % saved.length;
  const today = { date: key, question: shuffleOptions(saved[index]), answered: false, result: null };
  setStorage(STORAGE_KEYS.today, today);
  return today;
}

function renderToday() {
  const today = getDailyQuestion();
  if (!today) {
    app.innerHTML = `<section class="section"><div class="empty">癒쇱? AI 臾몄젣瑜??앹꽦??二쇱꽭??</div><button class="btn primary" data-go="settings">?뚯뒪???ㅼ젙?쇰줈 ?대룞</button></section>`;
    bindGoButtons();
    return;
  }
  const q = today.question;
  app.innerHTML = `
    <section class="section">
      <div class="card"><h2>오늘의 문제</h2><p class="muted">같은 날짜에는 같은 문제가 선택됩니다.</p></div>
      <article class="card">
        <div class="badges"><span class="badge ${q.difficulty}">${q.difficulty}</span><span class="badge">${TYPE_LABELS[q.type]}</span><span class="badge ${q.answerType}">${q.answerType === "multiple_choice" ? "객관식" : "주관식"}</span></div>
        <p class="passage" style="margin-top:14px">${escapeHtml(q.passage)}</p>
        <h3>${escapeHtml(q.question)}</h3>
        <div id="todayAnswer" style="margin-top:14px"></div>
        <div class="actions" style="margin-top:16px"><button class="btn primary" data-submit-today ${today.answered ? "disabled" : ""}>오늘 문제 제출</button></div>
        <div id="todayResult" style="margin-top:14px">${today.result ? `<strong>${today.result.isCorrect ? "정답" : today.result.isPartial ? "부분 정답" : "오답"}</strong> · ${escapeHtml(q.explanation)}` : ""}</div>
      </article>
    </section>
  `;
  const area = document.querySelector("#todayAnswer");
  if (q.answerType === "multiple_choice") {
    area.innerHTML = `<div class="options">${q.options.map((option, index) => `<button class="option" data-today-option="${index}">${escapeHtml(option)}</button>`).join("")}</div>`;
    area.querySelectorAll("[data-today-option]").forEach((button) => {
      button.addEventListener("click", () => {
        area.querySelectorAll(".option").forEach((node) => node.classList.remove("selected"));
        button.classList.add("selected");
        area.dataset.answer = button.dataset.todayOption;
      });
    });
  } else {
    area.innerHTML = `<textarea id="todayText" placeholder="?ㅻ뒛???듭븞???낅젰?섏꽭??"></textarea><p class="muted">二쇨??앹? ?좎궗?꾩? ?ㅼ썙?쒕줈 ?먮룞 梨꾩젏?⑸땲??</p>`;
  }
  document.querySelector("[data-submit-today]")?.addEventListener("click", () => {
    const answer = q.answerType === "multiple_choice" ? area.dataset.answer : document.querySelector("#todayText").value;
    const result = gradeAnswer({ question: q, userAnswer: answer });
    setStorage(STORAGE_KEYS.today, { ...today, answered: true, result });
    renderToday();
  });
}

function renderRooms() {
  const configured = isOnlineFeatureAvailable();
  console.log("[ROOMS] Supabase diagnostics", window.SUPABASE_DIAGNOSTICS);
  console.log("[ROOMS] SUPABASE_ONLINE_READY", window.SUPABASE_ONLINE_READY);
  app.innerHTML = `
    <section class="section">
      <div class="card">
        <h2>?寃?諛?/h2>
        <p class="muted">諛⑹쓣 留뚮뱾嫄곕굹 ?湲?以묒씤 諛⑹뿉 李멸???媛숈? 臾몄젣 ?명듃濡?寃쎌웳?⑸땲??</p>
      </div>
      ${supabaseStatusHtml()}
      ${configured ? "" : onlineDisabledHtml()}
      <div class="grid">
        <div class="card span-6">
          <h3>諛?留뚮뱾湲?/h3>
          <div class="form-grid" style="margin-top:12px">
            <select id="roomDifficulty"><option value="easy">easy</option><option value="normal" selected>normal</option><option value="hard">hard</option><option value="expert">expert</option></select>
            <select id="roomCount"><option value="5">5臾몄젣</option><option value="10">10臾몄젣</option><option value="15">15臾몄젣</option></select>
            <select id="roomQuestionSource"><option value="ai" selected>AI 臾몄젣 ?ъ슜</option><option value="saved">??λ맂 臾몄젣 ?ъ슜</option><option value="sample">?섑뵆 臾몄젣 ?ъ슜</option></select>
            <label class="check"><input id="roomShort" type="checkbox" checked /> 二쇨????ы븿</label>
            <label class="check"><input id="roomTimer" type="checkbox" checked /> ?쒓컙 ?쒗븳</label>
          </div>
          <div class="actions" style="margin-top:12px"><button class="btn primary" data-create-room ${configured ? "" : "disabled"}>諛?留뚮뱾湲?/button></div>
        </div>
        <div class="card span-6">
          <h3>諛?肄붾뱶濡??낆옣</h3>
          <input id="roomCodeInput" placeholder="6?먮━ 諛?肄붾뱶" maxlength="6" />
          <div class="actions" style="margin-top:12px"><button class="btn" data-join-room ${configured ? "" : "disabled"}>?낆옣</button></div>
        </div>
      </div>
      <div class="card">
        <div class="row between">
          <h3>공개 대기 방</h3>
          <button class="btn" data-refresh-rooms ${configured ? "" : "disabled"}>새로고침</button>
        </div>
        <div id="openRoomList" class="room-list" style="margin-top:12px">
          <div class="empty">대기 방을 불러오는 중입니다.</div>
        </div>
      </div>
    </section>
  `;
  document.querySelector("[data-create-room]")?.addEventListener("click", async () => {
    if (isCreatingRoom) return;
    const button = document.querySelector("[data-create-room]");
    try {
      isCreatingRoom = true;
      if (button) {
        button.disabled = true;
        button.textContent = "방 생성 중...";
      }
      showNotice("방을 생성하는 중입니다...", "info", 0);
      await ensureSupabaseReadyForAction("방 만들기");
      const settings = {
        difficulty: document.querySelector("#roomDifficulty")?.value || "normal",
        count: Number(document.querySelector("#roomCount")?.value || 5),
        includeShortAnswer: Boolean(document.querySelector("#roomShort")?.checked),
        useTimer: Boolean(document.querySelector("#roomTimer")?.checked),
        questionSource: document.querySelector("#roomQuestionSource")?.value || "ai",
        secondsPerQuestion: 60,
        selectedTypes: Object.keys(TYPE_LABELS)
      };
      const user = await window.UserRemoteService.getOrCreateUser(getNickname() || "Guest");
      const questionSet = await getQuestionSetForMultiplayer(settings);
      if (!questionSet.length) throw new Error("question_set 생성 실패: 출제 가능한 문제가 없습니다.");
      const { room, player } = await window.RoomService.createRoom(settings, user, questionSet);
      showNotice(`방 생성 성공: ${room.room_code}`, "success");
      renderRoomLobby(room, [player]);
    } catch (error) {
      console.error("방 만들기 실패:", error);
      showNotice(`방 만들기 실패: ${friendlyOnlineError(error)}`, "error", 0);
    } finally {
      isCreatingRoom = false;
      if (button) {
        button.disabled = false;
        button.textContent = "방 만들기";
      }
    }
  });
  document.querySelector("[data-join-room]")?.addEventListener("click", async () => {
    const code = window.RoomCodeUtils?.normalizeRoomCode?.(document.querySelector("#roomCodeInput")?.value) || "";
    joinRoomByCode(code, document.querySelector("[data-join-room]"));
  });
  document.querySelector("[data-refresh-rooms]")?.addEventListener("click", renderOpenRoomList);
  if (configured) {
    window.RoomService.cleanupStaleRooms?.().catch((error) => console.error("stale room cleanup failed:", error));
    renderOpenRoomList();
    window.RoomService.subscribeOpenRooms?.(() => {
      if ((location.hash.replace("#", "") || "home") === "rooms") renderOpenRoomList();
    });
  }
}

async function renderOpenRoomList() {
  const list = document.querySelector("#openRoomList");
  if (!list) return;
  try {
    list.innerHTML = `<div class="empty">대기 방을 불러오는 중입니다.</div>`;
    await window.RoomService.cleanupStaleRooms?.();
    const rooms = await window.RoomService.getOpenRooms();
    list.innerHTML = rooms.length ? rooms.map((room) => {
      const players = room.players || [];
      const host = players.find((player) => player.is_host);
      return `
        <article class="room-card">
          <div class="row between">
            <strong>방 코드: ${escapeHtml(room.room_code)}</strong>
            <span class="badge normal">대기 중</span>
          </div>
          <p>방장: ${escapeHtml(host?.nickname || "익명")} · 난이도 ${escapeHtml(room.difficulty || "-")} · 문제 수 ${Number(room.question_count || 0)}</p>
          <p class="muted">참가자 ${players.length}/4 · 주관식 ${room.include_short_answer ? "포함" : "제외"} · 시간 제한 ${room.time_limit_enabled ? `${room.time_per_question || 60}초` : "없음"}</p>
          <div class="actions"><button class="btn" data-join-room-list="${escapeHtml(room.room_code)}">입장하기</button></div>
        </article>
      `;
    }).join("") : `<div class="empty">현재 대기 중인 방이 없습니다.</div>`;
    document.querySelectorAll("[data-join-room-list]").forEach((button) => {
      button.addEventListener("click", () => joinRoomByCode(button.dataset.joinRoomList, button));
    });
  } catch (error) {
    console.error("open rooms failed:", error);
    list.innerHTML = `<div class="empty">방 목록을 불러오지 못했습니다. ${escapeHtml(friendlyOnlineError(error))}</div>`;
  }
}

async function joinRoomByCode(code, button = null) {
  if (isJoiningRoom) return;
  try {
    isJoiningRoom = true;
    if (button) {
      button.disabled = true;
      button.textContent = "?낆옣 以?..";
    }
    await ensureSupabaseReadyForAction("諛??낆옣");
    if (!code) return showNotice("諛?肄붾뱶瑜??낅젰??二쇱꽭??", "warning");
    const user = await window.UserRemoteService.getOrCreateUser(getNickname() || "?듬챸");
    const room = await window.RoomService.findRoomByCode(code);
    if (!room) throw new Error("waiting ?곹깭??諛⑹쓣 李얠쓣 ???놁뒿?덈떎.");
    const player = await window.RoomService.joinRoom(room, user, false);
    showNotice(`諛?${code}???낆옣?덉뒿?덈떎.`, "success");
    renderRoomLobby(room, [player]);
  } catch (error) {
    console.error("諛??낆옣 ?ㅽ뙣:", error);
    showNotice(`諛??낆옣 ?ㅽ뙣: ${friendlyOnlineError(error)}`, "error", 0);
  } finally {
    isJoiningRoom = false;
    if (button) {
      button.disabled = false;
      button.textContent = button.dataset.joinRoomList ? "?낆옣?섍린" : "?낆옣";
    }
  }
}

async function renderRoomLobbyById(roomId) {
  if (!roomId) return showView("rooms");
  const room = await window.RoomService.getRoom(roomId);
  if (!room) {
    app.innerHTML = `<section class="section"><div class="empty">諛⑹쓣 李얠쓣 ???놁뒿?덈떎.</div></section>`;
    return;
  }
  if (room.status === "playing") return renderRoomPlay(room);
  if (room.status === "finished") return renderRoomResult(room);
  if (room.status === "cancelled") {
    clearCurrentRoomSession();
    showNotice("痍⑥냼??諛⑹엯?덈떎.", "warning");
    return showView("rooms");
  }
  renderRoomLobby(room);
}

async function renderRoomLobby(room, initialPlayers = []) {
  if (!room?.id) return showView("rooms");
  room = await window.RoomService.getRoom(room.id);
  if (!room) {
    showNotice("諛??뺣낫瑜?李얠쓣 ???놁뒿?덈떎.", "warning");
    clearCurrentRoomSession();
    return showView("rooms");
  }
  if (room.status === "playing") return renderRoomPlay(room);
  if (room.status === "finished") return renderRoomResult(room);
  if (room.status === "cancelled") {
    showNotice("諛⑹옣???섍???諛⑹씠 痍⑥냼?섏뿀?듬땲??", "warning", 0);
    clearCurrentRoomSession();
    return showView("rooms");
  }
  const user = await window.UserRemoteService.getOrCreateUser(getNickname() || "?듬챸");
  let players = await window.RoomService.getRoomPlayers(room.id);
  const profiles = await window.RankedMatchService?.getRankingProfiles?.().catch(() => []);
  const decoratedProfiles = window.RatingUtils.decorateProfilesWithPercentTiers(profiles || []);
  const profileByUserId = new Map(decoratedProfiles.map((profile) => [profile.user_id, profile]));
  const me = players.find((player) => player.user_id === user.id);
  activeRoomContext = { roomId: room.id, view: "lobby" };
  saveCurrentRoomSession(room.id, user.id, "waiting");
  window.RoomService.unsubscribeOpenRooms?.();
  if (location.hash !== `#room-lobby:${room.id}`) location.hash = `room-lobby:${room.id}`;

  app.innerHTML = `
    <section class="section">
      <div class="card">
        <div class="row between">
          <div>
            <h2>諛??湲곗떎</h2>
            <p class="muted">諛⑹옣???쒖옉?섎㈃ 紐⑤뱺 李멸??먭? 媛숈? 臾몄젣濡??먮룞 ?대룞?⑸땲??</p>
          </div>
          <button class="btn ghost" data-leave-room>나가기</button>
        </div>
        <div class="room-code-box">
          <span>방 코드</span>
          <strong>${escapeHtml(room.room_code)}</strong>
          <input readonly value="${escapeHtml(room.room_code)}" aria-label="방 코드" />
          <div class="actions">
            <button class="btn primary" data-copy-room-code="${escapeHtml(room.room_code)}">코드 복사</button>
            <button class="btn" data-copy-room-share="${escapeHtml(room.room_code)}">공유 문구 복사</button>
          </div>
        </div>
      </div>
      ${supabaseStatusHtml()}
      <div class="grid">
        ${statCard("상태", room.status || "waiting", "span-3")}
        ${statCard("난이도", room.difficulty || "-", "span-3")}
        ${statCard("문제 수", `${room.question_count || 0}`, "span-3")}
        ${statCard("시간 제한", room.time_limit_enabled ? `${room.time_per_question || 60}초` : "없음", "span-3")}
      </div>
      <div class="card">
        <h3>참가자</h3>
        <div class="table-list" id="roomPlayersList">
          ${roomPlayersHtml(players, profileByUserId)}
        </div>
      </div>
      <div class="card" id="roomLobbyActions">
        ${roomLobbyActionsHtml(room, players, user, me)}
      </div>
    </section>
  `;
  document.querySelector("[data-copy-room-code]")?.addEventListener("click", () => copyRoomCode(room.room_code, false));
  document.querySelector("[data-copy-room-share]")?.addEventListener("click", () => copyRoomCode(room.room_code, true));
  bindRoomLobbyDynamicActions(room, user);
  document.querySelector("[data-leave-room]")?.addEventListener("click", async () => {
    try {
      await window.RoomService.leaveRoom(room.id, user.id);
      clearCurrentRoomSession();
      window.RoomService.unsubscribeRoom();
      showView("rooms");
    } catch (error) {
      console.error("leave room failed:", error);
      showNotice(`諛??섍?湲??ㅽ뙣: ${friendlyOnlineError(error)}`, "error", 0);
    }
  });
  window.RoomService.subscribeRoom(room.id, {
    onRoomChange: async () => {
      if (activeRoomContext?.roomId !== room.id) return;
      await handleRoomRealtimeStatus(room.id, user);
    }
  });
  window.RoomService.subscribeRoomPlayers(room.id, async () => {
    if (activeRoomContext?.roomId !== room.id) return;
    if (activeRoomContext.view === "lobby") await updateRoomLobbyPanels(room, user);
  });
}

function getRankedDisabledReason({ configured, user, profile, rankedLoadError, profileError } = {}) {
  if (!configured) return "Supabase is not ready.";
  if (rankedLoadError) return "Ranked table access failed: " + friendlyOnlineError(rankedLoadError);
  if (!user?.user_id && !user?.id) return "Guest user is not ready.";
  if (!user?.nickname) return "Nickname is required.";
  if (profileError) return "ranking_profiles access failed: " + friendlyOnlineError(profileError);
  if (!profile) return "ranking profile is not loaded yet.";
  return "";
}

async function renderRanked() {
  const configured = isOnlineFeatureAvailable();
  let rankedLoadError = null;
  let profileError = null;
  const user = configured ? await window.UserRemoteService.getOrCreateUser(getNickname() || "anonymous").catch((error) => {
    rankedLoadError = error;
    console.error("[ranked] user load failed", error);
    return null;
  }) : null;
  const profile = configured && user ? await window.UserRemoteService.createRankingProfileIfNeeded(user).catch((error) => {
    profileError = error;
    console.error("[ranked] ranking profile create/load failed", error);
    return null;
  }) : null;
  const profiles = configured ? await window.RankedMatchService?.getRankingProfiles?.().catch((error) => {
    rankedLoadError = rankedLoadError || error;
    console.error("[ranked] ranking profiles select failed", error);
    return [];
  }) : [];
  const rankedDisabledReason = getRankedDisabledReason({ configured, user, profile, rankedLoadError, profileError });
  const canStartRanked = !rankedDisabledReason;
  console.log("[ranked] disabled reason", rankedDisabledReason || "");
  const decorated = window.RatingUtils.decorateProfilesWithPercentTiers(profiles || []);
  const myProfile = decorated.find((row) => row.user_id === (user?.user_id || user?.id)) || profile || {};
  const rankedGames = Number(myProfile.ranked_games ?? (Number(myProfile.wins || 0) + Number(myProfile.losses || 0) + Number(myProfile.draws || 0)));
  app.innerHTML = `
    <section class="section">
      <div class="card">
        <h2>테스트 랭킹전</h2>
        <p class="muted">현재는 로그인 없이 게스트 ID 기준으로 기록합니다. 브라우저를 바꾸거나 데이터를 삭제하면 다른 유저로 인식될 수 있습니다.</p>
      </div>
      ${supabaseStatusHtml()}
      ${configured ? "" : onlineDisabledHtml()}
      <div class="grid">
        ${statCard("닉네임", tierNick(user?.nickname || getNickname() || "Guest", myProfile), "span-3")}
        ${statCard("Rating", `${myProfile?.rating || 1000}`, "span-3")}
        ${statCard("티어", `${myProfile?.tier || "랭킹없음"}`, "span-3")}
        ${statCard("상위 퍼센트", myProfile?.percentile == null ? "-" : `${Number(myProfile.percentile).toFixed(1)}%`, "span-3")}
        ${statCard("승/패/무", `${myProfile?.wins || 0}/${myProfile?.losses || 0}/${myProfile?.draws || 0}`, "span-3")}
        ${statCard("랭킹전 판수", `${rankedGames}판`, "span-3")}
        ${statCard("전체 순위", myProfile?.rank_position ? `${myProfile.rank_position} / ${myProfile.total_ranked_players}` : "-", "span-3")}
        ${statCard("승패 기준", "정답 수 -> 부분 정답 수 -> 풀이 시간", "span-3")}
      </div>
      <div class="card">
        <div class="actions"><button class="btn primary" data-start-ranked ${canStartRanked ? "" : "disabled"}>랭킹전 시작</button></div>
        ${canStartRanked ? "" : `<p class="muted">${escapeHtml(rankedDisabledReason)}</p>`}
      </div>
      <div class="card">
        <h3>티어 기준</h3>
        <p class="muted">랭킹없음: 0판 · 브론즈: 상위 100% · 실버: 60% · 골드: 40% · 플래티넘: 23% · 다이아몬드: 11% · 마스터: 4% · 그랜드마스터: 1% · 챌린저: 0.1%</p>
      </div>
    </section>
  `;
  document.querySelector("[data-start-ranked]")?.addEventListener("click", startRankedMatch);
}

async function startRankedMatch() {
  if (isStartingRankedQueue) return;
  const button = document.querySelector("[data-start-ranked]");
  try {
    isStartingRankedQueue = true;
    if (button) {
      button.disabled = true;
      button.textContent = "매칭 중...";
    }
    showNotice("랭킹전 매칭을 준비하는 중입니다...", "info", 0);
    await ensureSupabaseReadyForAction("랭킹전");
    const user = await window.UserRemoteService.requireAuthUser();
    const profile = await window.UserRemoteService.createRankingProfileIfNeeded(user);
    if (!profile) throw new Error("랭킹 프로필 생성 실패");
    const settings = {
      difficulty: "normal",
      count: 5,
      includeShortAnswer: true,
      selectedTypes: Object.keys(TYPE_LABELS),
      questionSource: "ai",
      questionSet: await getQuestionSetForMultiplayer({
        difficulty: "normal",
        count: 5,
        includeShortAnswer: true,
        selectedTypes: Object.keys(TYPE_LABELS),
        questionSource: "ai"
      })
    };
    if (!settings.questionSet.length) throw new Error("question_set 생성 실패");
    const result = await window.RankedMatchService.findOrCreateMatch(user, profile, settings);
    if (result.match.status === "playing") {
      showNotice("매칭 완료! 대결을 시작합니다.", "success");
      renderRankedPlay(result.match, user, profile);
    } else {
      renderRankedQueue(result.match, user, profile);
      showNotice(result.reused ? "기존 매칭 대기 화면으로 이동합니다." : "랭킹전 대기열에 등록했습니다.", "success");
    }
  } catch (error) {
    console.error("랭킹전 시작 실패:", error);
    showNotice(`랭킹전 시작 실패: ${friendlyOnlineError(error)}`, "error", 0);
  } finally {
    isStartingRankedQueue = false;
    if (button) {
      button.disabled = false;
      button.textContent = "랭킹전 시작";
    }
  }
}

async function renderRankedQueueById(matchId) {
  const user = await window.UserRemoteService.requireAuthUser();
  const profile = await window.UserRemoteService.createRankingProfileIfNeeded(user);
  const match = await window.RankedMatchService.getMatch(matchId);
  if (!match) return showView("ranked");
  if (match.status === "playing") return renderRankedPlay(match, user, profile);
  if (match.status === "finished") return renderRankedResult(match, user);
  if (match.status === "cancelled") {
    showNotice("??궧??留ㅼ묶??痍⑥냼?섏뿀?듬땲??", "info");
    return showView("ranked");
  }
  renderRankedQueue(match, user, profile);
}

function renderRankedQueue(match, user, profile) {
  activeRankedContext = { matchId: match.id, view: "queue" };
  if (location.hash !== `#ranked-queue:${match.id}`) location.hash = `ranked-queue:${match.id}`;
  app.innerHTML = `
    <section class="section">
      <div class="card">
        <h2>상대를 찾는 중...</h2>
        <p class="muted">매치 ID: ${escapeHtml(match.id)}</p>
      </div>
      ${supabaseStatusHtml()}
      <div class="grid">
        ${statCard("상태", match.status || "matching", "span-3")}
        ${statCard("난이도", match.difficulty || "normal", "span-3")}
        ${statCard("문제 수", `${match.question_count || 5}`, "span-3")}
        ${statCard("내 정보", `${window.RatingUtils.getTierIcon(profile?.tier || "랭킹없음")} ${profile?.rating || 1000}`, "span-3")}
      </div>
      <div class="card">
        <div class="actions"><button class="btn danger" data-cancel-ranked>매칭 취소</button></div>
      </div>
    </section>
  `;
  document.querySelector("[data-cancel-ranked]")?.addEventListener("click", async () => {
    await window.RankedMatchService.cancelMatch(match.id, user.user_id || user.id);
    window.RankedMatchService.unsubscribeRankedMatch();
    showNotice("랭킹전 매칭을 취소했습니다.", "info");
    showView("ranked");
  });
  window.RankedMatchService.subscribeRankedMatch(match.id, async () => {
    if (activeRankedContext?.matchId !== match.id) return;
    const latest = await window.RankedMatchService.getMatch(match.id);
    if (latest?.status === "playing" && activeRankedContext.view !== "play") {
      showNotice("매칭 완료! 대결을 시작합니다.", "success");
      renderRankedPlay(latest, user, profile);
    }
    if (latest?.status === "cancelled") {
      showNotice("??궧??留ㅼ묶??痍⑥냼?섏뿀?듬땲??", "info");
      showView("ranked");
    }
  });
  if (match.status === "matching" && ((match.player1_user_id || match.player_a_id) === (user.user_id || user.id))) {
    window.RankedMatchService.waitForHumanOrStartBot(match.id, { waitMs: 10000 }).then((latest) => {
      if (latest?.status === "playing" && activeRankedContext?.matchId === match.id && activeRankedContext.view !== "play") {
        showNotice("No human opponent found. Starting an AI bot match.", "info");
        renderRankedPlay(latest, user, profile);
      }
    });
  }
}

async function copyRoomCode(roomCode, share = false) {
  const text = share
    ? `臾명빐??梨뚮┛吏 ?寃?諛⑹뿉 李몄뿬?섏꽭?? 諛?肄붾뱶: ${roomCode}`
    : roomCode;
  try {
    await navigator.clipboard.writeText(text);
    showNotice(share ? "怨듭쑀 臾멸뎄瑜?蹂듭궗?덉뒿?덈떎." : "諛?肄붾뱶瑜?蹂듭궗?덉뒿?덈떎.", "success");
  } catch {
    showNotice("?대┰蹂대뱶 蹂듭궗???ㅽ뙣?덉뒿?덈떎. ?붾㈃??諛?肄붾뱶瑜?吏곸젒 蹂듭궗??二쇱꽭??", "warning");
  }
}

async function renderRoomPlayById(roomId) {
  const room = await window.RoomService.getRoom(roomId);
  if (!room) return showView("rooms");
  if (room.status === "waiting") return renderRoomLobby(room);
  if (room.status === "finished") return renderRoomResult(room);
  if (room.status === "cancelled") {
    clearCurrentRoomSession();
    showNotice("痍⑥냼??諛⑹엯?덈떎.", "warning");
    return showView("rooms");
  }
  renderRoomPlay(room);
}

async function renderRoomPlay(room) {
  room = await window.RoomService.getRoom(room.id);
  if (!room) return showView("rooms");
  if (room.status === "waiting") return renderRoomLobby(room);
  if (room.status === "finished") return renderRoomResult(room);
  if (room.status === "cancelled") {
    clearCurrentRoomSession();
    showNotice("諛⑹옣???섍???諛⑹씠 痍⑥냼?섏뿀?듬땲??", "warning", 0);
    return showView("rooms");
  }
  const user = await window.UserRemoteService.getOrCreateUser(getNickname() || "?듬챸");
  activeRoomContext = { roomId: room.id, view: "play" };
  saveCurrentRoomSession(room.id, user.id, "playing");
  if (location.hash !== `#room-play:${room.id}`) location.hash = `room-play:${room.id}`;
  if (!multiplayerState || multiplayerState.mode !== "room" || multiplayerState.room?.id !== room.id || multiplayerState.isFinished) {
    multiplayerState = createMultiplayerState({ mode: "room", room, user });
  }
  renderMultiplayerQuestion();
  window.RoomService.subscribeRoom(room.id, {
    onRoomChange: async () => {
      if (activeRoomContext?.roomId !== room.id) return;
      const latestRoom = await window.RoomService.getRoom(room.id);
      if (latestRoom?.status === "finished" && activeRoomContext.view !== "result") renderRoomResult(latestRoom);
      if (latestRoom?.status === "cancelled") {
        showNotice("諛⑹씠 痍⑥냼?섏뿀?듬땲??", "warning", 0);
        clearCurrentRoomSession();
        showView("rooms");
      }
    }
  });
  window.RoomService.subscribeRoomPlayers(room.id, async () => {
    if (activeRoomContext?.roomId !== room.id) return;
    await updateRoomProgressPanel(room.id, multiplayerState?.questions?.length || room.question_count || 0);
  });
}

async function renderRankedPlayById(matchId) {
  const user = await window.UserRemoteService.requireAuthUser();
  const profile = await window.UserRemoteService.createRankingProfileIfNeeded(user);
  const match = await window.RankedMatchService.getMatch(matchId);
  if (!match) return showView("ranked");
  if (match.status === "finished") return renderRankedResult(match, user);
  if (match.status === "cancelled") {
    showNotice("??궧??留ㅼ튂媛 痍⑥냼?섏뿀?듬땲??", "info");
    return showView("ranked");
  }
  renderRankedPlay(match, user, profile);
}

function renderRankedPlay(match, user, profile) {
  activeRankedContext = { matchId: match.id, view: "play" };
  if (location.hash !== `#ranked-play:${match.id}`) location.hash = `ranked-play:${match.id}`;
  if (!multiplayerState || multiplayerState.mode !== "ranked" || multiplayerState.match?.id !== match.id || multiplayerState.isFinished) {
    multiplayerState = createMultiplayerState({ mode: "ranked", match, user, profile });
  }
  renderMultiplayerQuestion();
  window.RankedMatchService.subscribeRankedMatch(match.id, async () => {
    if (activeRankedContext?.matchId !== match.id) return;
    const latest = await window.RankedMatchService.getMatch(match.id);
    if (latest?.status === "finished" && activeRankedContext.view !== "result") renderRankedResult(latest, user);
    if (latest?.status === "cancelled") {
      showNotice("??궧??留ㅼ튂媛 痍⑥냼?섏뿀?듬땲??", "info");
      showView("ranked");
    }
  });
}

function renderMultiplayerQuestion() {
  const state = multiplayerState;
  if (!state?.questions?.length) {
    app.innerHTML = `<section class="section"><div class="empty">?寃곗뿉 ?ъ슜??臾몄젣 ?명듃媛 ?놁뒿?덈떎.</div></section>`;
    return;
  }
  if (state.currentIndex >= state.questions.length) {
    finishMultiplayerTest();
    return;
  }
  const q = state.questions[state.currentIndex];
  const number = state.currentIndex + 1;
  const total = state.questions.length;
  const summary = multiplayerSummary(state);
  app.innerHTML = `
    <section class="section test-layout">
      <div class="card">
        <div class="row between">
          <div>
            <h2>${state.mode === "ranked" ? "랭킹전" : "방 대결"} ${number} / ${total}번</h2>
            <div class="badges">
              <span class="badge ${q.difficulty}">${DIFFICULTY_LABELS[q.difficulty] || q.difficulty}</span>
              <span class="badge">${TYPE_LABELS[q.type] || q.type}</span>
              <span class="badge ${q.answerType}">${q.answerType === "multiple_choice" ? "객관식" : "주관식"}</span>
            </div>
          </div>
          <div class="timer" id="timerBox">${state.settings.useTimer ? `남은 시간 ${state.timeLeft}초` : "시간 제한 없음"}</div>
        </div>
        <div class="progress" style="margin-top:14px"><span style="width:${Math.round((number / total) * 100)}%"></span></div>
        <p class="muted" style="margin-top:10px">현재 정답 ${summary.correct_count} · 부분 ${summary.partial_count} · 풀이 시간 ${secondsLabel(summary.total_time)}</p>
      </div>
      <article class="card">
        <h3>지문</h3>
        <p class="passage">${escapeHtml(q.passage)}</p>
      </article>
      <div class="card">
        <h3>${escapeHtml(q.question)}</h3>
        <div id="answerArea" style="margin-top:14px"></div>
        <div class="actions" style="margin-top:18px">
          <button class="btn primary" data-submit-multi>${number === total ? "결과 제출" : "다음 문제"}</button>
        </div>
      </div>
      ${state.mode === "room" ? `
        <div class="card">
          <h3>참가자 진행률</h3>
          <div id="roomProgressList" class="table-list" style="margin-top:12px">
            <div class="empty">참가자 진행률을 불러오는 중입니다.</div>
          </div>
        </div>
      ` : ""}
    </section>
  `;
  const area = document.querySelector("#answerArea");
  if (q.answerType === "multiple_choice") {
    area.innerHTML = `<div class="options">${q.options.map((option, index) => `
      <button class="option ${state.selectedAnswer === index ? "selected" : ""}" data-multi-option="${index}">${escapeHtml(option)}</button>
    `).join("")}</div>`;
    area.querySelectorAll("[data-multi-option]").forEach((button) => {
      button.addEventListener("click", () => {
        state.selectedAnswer = Number(button.dataset.multiOption);
        renderMultiplayerQuestion();
      });
    });
  } else {
    area.innerHTML = `<textarea id="multiShortAnswer" placeholder="답안을 입력하세요">${escapeHtml(state.currentAnswer || "")}</textarea>`;
    area.querySelector("#multiShortAnswer").addEventListener("input", (event) => {
      state.currentAnswer = event.target.value;
    });
  }
  document.querySelector("[data-submit-multi]")?.addEventListener("click", () => submitMultiplayerAnswer(false));
  if (state.mode === "room") updateRoomProgressPanel(state.room.id, total).catch((error) => console.error("room progress refresh failed:", error));
  startMultiplayerTimer();
}

function startMultiplayerTimer() {
  clearInterval(timerId);
  const state = multiplayerState;
  if (!state?.settings?.useTimer) return;
  const timerBox = document.querySelector("#timerBox");
  timerId = setInterval(() => {
    if (!multiplayerState || isSubmittingAnswer) return;
    multiplayerState.timeLeft -= 1;
    if (timerBox) timerBox.textContent = `남은 시간 ${multiplayerState.timeLeft}초`;
    if (multiplayerState.timeLeft <= 0) {
      clearInterval(timerId);
      submitMultiplayerAnswer(true);
    }
  }, 1000);
}

async function submitMultiplayerAnswer(timedOut = false) {
  const state = multiplayerState;
  if (!state || state.isFinished || isSubmittingAnswer) return;
  const question = state.questions[state.currentIndex];
  const rawAnswer = question.answerType === "multiple_choice" ? state.selectedAnswer : state.currentAnswer;
  if (!timedOut) {
    if (question.answerType === "multiple_choice" && rawAnswer === null) return showNotice("蹂닿린瑜??좏깮??二쇱꽭??", "warning");
    if (question.answerType === "short_answer" && String(rawAnswer || "").trim().length < 2) return showNotice("二쇨????듭븞? 2湲???댁긽 ?낅젰??二쇱꽭??", "warning");
  }
  try {
    isSubmittingAnswer = true;
    clearInterval(timerId);
    const submittedAt = Date.now();
    const elapsedTime = timedOut && state.settings.useTimer
      ? Number(state.settings.secondsPerQuestion || 60)
      : Math.max(1, Math.round((submittedAt - Number(state.questionStartedAt || submittedAt)) / 1000));
    const grade = timedOut
      ? { isCorrect: false, isPartial: false, isTimeout: true, scoreRatio: 0, earnedPoints: 0, feedback: "?쒓컙??珥덇낵?섏뿀?듬땲??" }
      : gradeAnswer({ question, userAnswer: rawAnswer });
    state.answers.push({
      questionIndex: state.currentIndex,
      questionId: question.id,
      question,
      userAnswer: timedOut ? "" : rawAnswer,
      grade,
      result: grade,
      startedAt: new Date(Number(state.questionStartedAt || submittedAt)).toISOString(),
      submittedAt: new Date(submittedAt).toISOString(),
      elapsedTime,
      isCorrect: Boolean(grade.isCorrect),
      isPartial: Boolean(grade.isPartial),
      earnedPoints: Number(grade.earnedPoints || 0),
      isTimeout: Boolean(timedOut)
    });
    state.currentIndex += 1;
    state.selectedAnswer = null;
    state.currentAnswer = "";
    state.questionStartedAt = Date.now();
    state.timeLeft = state.settings.secondsPerQuestion;
    await updateMultiplayerProgress(false);
    if (state.currentIndex >= state.questions.length) {
      finishMultiplayerTest();
      return;
    }
    isSubmittingAnswer = false;
    renderMultiplayerQuestion();
  } catch (error) {
    console.error("multiplayer answer failed:", error);
    isSubmittingAnswer = false;
    showNotice("?듭븞???쒖텧?섎뒗 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.", "error");
  }
}

async function updateMultiplayerProgress(finished) {
  const state = multiplayerState;
  const summary = multiplayerSummary(state);
  if (state.mode === "room") {
    await window.RoomService.updateRoomPlayerProgress(state.room.id, state.user.user_id || state.user.id, {
      current_index: Math.min(state.currentIndex, state.questions.length),
      current_score: summary.current_score,
      correct_count: summary.correct_count,
      partial_count: summary.partial_count,
      wrong_count: summary.wrong_count,
      total_time: summary.total_time,
      status: finished ? "finished" : "playing",
      finished_at: finished ? new Date().toISOString() : null
    });
  }
}

async function finishMultiplayerTest() {
  const state = multiplayerState;
  if (!state || state.submitted) return;
  try {
    clearInterval(timerId);
    state.isFinished = true;
    state.submitted = true;
    isSubmittingAnswer = false;
    const summary = multiplayerSummary(state, { rating: state.profile?.rating || 1000 });
    if (state.mode === "room") {
      await window.RoomService.finishRoomPlayer(state.room.id, state.user.user_id || state.user.id, {
        current_index: Math.min(state.currentIndex, state.questions.length),
        current_score: summary.current_score,
        correct_count: summary.correct_count,
        partial_count: summary.partial_count,
        wrong_count: summary.wrong_count,
        total_time: summary.total_time
      });
      const latestRoom = await window.RoomService.getRoom(state.room.id);
      if (latestRoom?.status === "finished") renderRoomResult(latestRoom);
      else renderRoomResult(latestRoom || state.room);
    } else {
      const updated = await window.RankedMatchService.submitResult(state.match, state.user, summary);
      const finalized = await window.RankedMatchService.finalizeIfReady(updated.id);
      if (finalized?.status === "finished") renderRankedResult(finalized, state.user);
      else renderRankedWaitingForOpponent(updated, state.user);
    }
  } catch (error) {
    console.error("finish multiplayer failed:", error);
    showNotice(`대결 결과 저장 실패: ${friendlyOnlineError(error)}`, "error", 0);
    state.submitted = false;
  }
}

async function renderRoomResultById(roomId) {
  const room = await window.RoomService.getRoom(roomId);
  if (!room) return showView("rooms");
  if (room.status === "cancelled") {
    clearCurrentRoomSession();
    return showView("rooms");
  }
  renderRoomResult(room);
}

async function renderRoomResult(room) {
  activeRoomContext = { roomId: room.id, view: "result" };
  const user = await window.UserRemoteService.requireAuthUser();
  saveCurrentRoomSession(room.id, user.id, "result");
  if (location.hash !== `#room-result:${room.id}`) location.hash = `room-result:${room.id}`;
  const players = await window.RoomService.getRoomPlayers(room.id);
  const sorted = [...players].sort((a, b) => window.RatingUtils.compareMultiplayerResults(a, b));
  const top = sorted[0];
  const tied = sorted.length > 1 && window.RatingUtils.compareMultiplayerResults(sorted[0], sorted[1]) === 0;
  const allFinished = players.length > 0 && players.every((player) => player.status === "finished" || player.status === "left");
  app.innerHTML = `
    <section class="section">
      <div class="card">
        <h2>${allFinished ? "방 대결 결과" : "결과 대기 중"}</h2>
        <p class="muted">승패 기준: 정답 수 -> 부분 정답 수 -> 풀이 시간 -> 점수</p>
      </div>
      <div class="card">
        <h3>${allFinished ? (tied ? "무승부" : `승자: ${escapeHtml(top?.nickname || "익명")}`) : "다른 참가자의 완료를 기다리는 중입니다."}</h3>
      </div>
      <div class="card table-list">
        ${sorted.map((player, index) => `
          <div class="history-item">
            <div class="row between"><strong>${index + 1}위 ${escapeHtml(player.nickname || "익명")}</strong><span class="badge">${player.status || "-"}</span></div>
            <p>정답 ${Number(player.correct_count || 0)} · 부분 ${Number(player.partial_count || 0)} · 오답 ${Number(player.wrong_count || 0)} · 점수 ${Number(player.current_score || 0)} · 시간 ${secondsLabel(player.total_time || 0)}</p>
          </div>
        `).join("") || `<div class="empty">결과가 아직 없습니다.</div>`}
      </div>
      <div class="actions"><button class="btn" data-go="rooms" data-clear-room-session>방 목록으로</button></div>
    </section>
  `;
  bindGoButtons();
  document.querySelector("[data-clear-room-session]")?.addEventListener("click", clearCurrentRoomSession);
  window.RoomService.subscribeRoom(room.id, {
    onRoomChange: async () => {
      if (activeRoomContext?.roomId !== room.id || activeRoomContext.view !== "result") return;
      const latestRoom = await window.RoomService.getRoom(room.id);
      if (latestRoom?.status === "cancelled") {
        clearCurrentRoomSession();
        showView("rooms");
        return;
      }
      renderRoomResult(latestRoom);
    }
  });
  window.RoomService.subscribeRoomPlayers(room.id, async () => {
    if (activeRoomContext?.roomId !== room.id || activeRoomContext.view !== "result") return;
    renderRoomResult(await window.RoomService.getRoom(room.id));
  });
}

function renderRankedWaitingForOpponent(match, user) {
  activeRankedContext = { matchId: match.id, view: "play" };
  app.innerHTML = `
    <section class="section">
      <div class="card">
        <h2>寃곌낵 ?쒖텧 ?꾨즺</h2>
        <p class="muted">?곷?媛 臾몄젣瑜?紐⑤몢 ?硫??뱁뙣? rating 蹂?붽? ?쒖떆?⑸땲??</p>
      </div>
      ${supabaseStatusHtml()}
      <div class="empty">?곷? 寃곌낵瑜?湲곕떎由щ뒗 以묒엯?덈떎.</div>
    </section>
  `;
  window.RankedMatchService.subscribeRankedMatch(match.id, async () => {
    const latest = await window.RankedMatchService.getMatch(match.id);
    if (latest?.status === "finished") renderRankedResult(latest, user);
  });
}

async function renderRankedResultById(matchId) {
  const user = await window.UserRemoteService.requireAuthUser();
  const match = await window.RankedMatchService.getMatch(matchId);
  if (!match) return showView("ranked");
  renderRankedResult(match, user);
}

async function renderRankedResult(match, user) {
  activeRankedContext = { matchId: match.id, view: "result" };
  if (location.hash !== `#ranked-result:${match.id}`) location.hash = `ranked-result:${match.id}`;
  const latestMatch = match.status === "finished" ? match : await window.RankedMatchService.finalizeIfReady(match.id);
  const isA = (latestMatch.player1_user_id || latestMatch.player_a_id) === (user.user_id || user.id);
  const mine = isA ? (latestMatch.player1_result || latestMatch.player_a_result) : (latestMatch.player2_result || latestMatch.player_b_result);
  const opponent = isA ? (latestMatch.player2_result || latestMatch.player_b_result || latestMatch.bot_result) : (latestMatch.player1_result || latestMatch.player_a_result);
  const delta = isA ? latestMatch.rating_delta_a : latestMatch.rating_delta_b;
  const opponentLabel = latestMatch.is_bot_match ? `AI Bot: ${latestMatch.bot_nickname || opponent?.nickname || "AI Bot"}` : "Opponent result";
  const compare = window.RatingUtils.compareMultiplayerResults(mine, opponent);
  const outcome = compare === 0 ? "무승부" : compare < 0 ? "승리!" : "패배";
  const profiles = await window.RankedMatchService.getRankingProfiles().catch(() => []);
  const decorated = window.RatingUtils.decorateProfilesWithPercentTiers(profiles);
  const myProfile = decorated.find((profile) => profile.user_id === (user.user_id || user.id));
  app.innerHTML = `
    <section class="section">
      <div class="card">
        <h2>${outcome}</h2>
        <p class="muted">승패 기준: 정답 수 -> 부분 정답 수 -> 풀이 시간 -> 점수</p>
      </div>
      <div class="grid">
        ${statCard("Rating 변화", `${delta >= 0 ? "+" : ""}${delta || 0}`, "span-3")}
        ${statCard("현재 티어", myProfile ? window.RatingUtils.tierLabel(myProfile) : "-", "span-3")}
        ${statCard("전체 순위", myProfile?.rank_position ? `${myProfile.rank_position} / ${myProfile.total_ranked_players}` : "-", "span-3")}
        ${statCard("상위 퍼센트", myProfile?.percentile == null ? "-" : `${Number(myProfile.percentile).toFixed(1)}%`, "span-3")}
      </div>
      <div class="grid">
        <div class="card span-6">
          <h3>내 결과</h3>
          <p>정답 ${Number(mine?.correct_count || 0)} · 부분 ${Number(mine?.partial_count || 0)} · 점수 ${Number(mine?.current_score || 0)} · 시간 ${secondsLabel(mine?.total_time || 0)}</p>
        </div>
        <div class="card span-6">
          <h3>${escapeHtml(opponentLabel)}</h3>
          <p>정답 ${Number(opponent?.correct_count || 0)} · 부분 ${Number(opponent?.partial_count || 0)} · 점수 ${Number(opponent?.current_score || 0)} · 시간 ${secondsLabel(opponent?.total_time || 0)}</p>
        </div>
      </div>
      <div class="actions"><button class="btn primary" data-go="ranked">??궧?꾩쑝濡?/button></div>
    </section>
  `;
  bindGoButtons();
}

async function renderReplays() {
  const replays = await window.ReplayService.getMyReplays().catch((error) => {
    console.error(error);
    showNotice("由ы뵆?덉씠 紐⑸줉??遺덈윭?ㅼ? 紐삵뻽?듬땲??", "error");
    return [];
  });
  app.innerHTML = `
    <section class="section">
      <div class="card">
        <h2>??由ы뵆?덉씠</h2>
        <p class="muted">鍮꾧났媛?怨듦컻 由ы뵆?덉씠瑜?紐⑤몢 蹂????덉뒿?덈떎. 湲곕낯 ????꾩튂??Supabase ?ㅼ젙 ?щ????곕씪 ?먭꺽 ?먮뒗 localStorage?낅땲??</p>
      </div>
      <div class="card table-list">
        ${replays.length ? replays.map(replayCardHtml).join("") : `<div class="empty">??λ맂 由ы뵆?덉씠媛 ?놁뒿?덈떎.</div>`}
      </div>
    </section>
  `;
  bindReplayButtons();
}

async function renderPublicReplays() {
  if (!isOnlineFeatureAvailable()) {
    const localPublic = await window.ReplayService.getPublicReplays();
    app.innerHTML = `
      <section class="section">
        <div class="card"><h2>怨듦컻 由ы뵆?덉씠</h2></div>
        ${onlineDisabledHtml()}
        <div class="card table-list">${localPublic.length ? localPublic.map(replayCardHtml).join("") : `<div class="empty">怨듦컻 由ы뵆?덉씠媛 ?놁뒿?덈떎.</div>`}</div>
      </section>
    `;
    bindReplayButtons();
    return;
  }
  const replays = await window.ReplayService.getPublicReplays().catch(() => []);
  app.innerHTML = `
    <section class="section">
      <div class="card"><h2>怨듦컻 由ы뵆?덉씠</h2><p class="muted">is_public = true??由ы뵆?덉씠留??쒖떆?⑸땲??</p></div>
      <div class="card form-grid">
        <select id="publicReplayMode"><option value="all">?꾩껜 紐⑤뱶</option><option value="solo">solo</option><option value="room">room</option><option value="ranked">ranked</option><option value="today">today</option></select>
        <select id="publicReplayDifficulty"><option value="all">?꾩껜 ?쒖씠??/option><option value="easy">easy</option><option value="normal">normal</option><option value="hard">hard</option><option value="expert">expert</option></select>
        <select id="publicReplaySort"><option value="latest">理쒖떊??/option><option value="score">?먯닔??/option><option value="views">議고쉶?섏닚</option><option value="likes">醫뗭븘?붿닚</option></select>
        <input id="publicReplaySearch" placeholder="?됰꽕??寃?? />
      </div>
      <div class="card table-list" id="publicReplayList"></div>
    </section>
  `;
  const renderList = () => {
    let rows = [...replays].filter((replay) => replay.is_public !== false);
    const mode = document.querySelector("#publicReplayMode").value;
    const difficulty = document.querySelector("#publicReplayDifficulty").value;
    const search = document.querySelector("#publicReplaySearch").value.trim();
    const sort = document.querySelector("#publicReplaySort").value;
    if (mode !== "all") rows = rows.filter((replay) => replay.mode === mode);
    if (difficulty !== "all") rows = rows.filter((replay) => replay.difficulty === difficulty);
    if (search) rows = rows.filter((replay) => String(replay.nickname || "").includes(search));
    rows.sort((a, b) => {
      if (sort === "score") return Number(b.score || 0) - Number(a.score || 0);
      if (sort === "views") return Number(b.view_count || 0) - Number(a.view_count || 0);
      if (sort === "likes") return Number(b.like_count || 0) - Number(a.like_count || 0);
      return new Date(b.created_at) - new Date(a.created_at);
    });
    document.querySelector("#publicReplayList").innerHTML = rows.length ? rows.map(replayCardHtml).join("") : `<div class="empty">怨듦컻 由ы뵆?덉씠媛 ?놁뒿?덈떎.</div>`;
    bindReplayButtons();
  };
  ["publicReplayMode", "publicReplayDifficulty", "publicReplaySort", "publicReplaySearch"].forEach((id) => {
    document.querySelector(`#${id}`).addEventListener("input", renderList);
  });
  renderList();
}

function replayCardHtml(replay) {
  const accuracy = replay.total_questions ? Math.round(((Number(replay.correct_count || 0) + Number(replay.partial_count || 0) * 0.5) / replay.total_questions) * 100) : 0;
  return `
    <article class="history-item">
      <div class="row between">
        <strong>${escapeHtml(replay.public_title || replay.title || "리플레이")}</strong>
        <span class="badge">${replay.is_public ? "공개" : "비공개"}</span>
      </div>
      <p>${escapeHtml(replay.nickname || "익명")} · ${escapeHtml(replay.mode || "solo")} · ${escapeHtml(replay.difficulty || "-")} · ${Number(replay.score || 0)} / ${Number(replay.max_score || 0)} · 정답률 ${accuracy}% · ${secondsLabel(replay.total_time || 0)}</p>
      <p class="muted">조회 ${Number(replay.view_count || 0)} · 좋아요 ${Number(replay.like_count || 0)} · ${replay.created_at ? new Date(replay.created_at).toLocaleString() : "날짜 없음"}</p>
      <div class="actions">
        <button class="btn" data-view-replay="${replay.id}">상세 보기</button>
        <button class="btn ghost" data-toggle-replay="${replay.id}" data-public="${replay.is_public ? "false" : "true"}">${replay.is_public ? "비공개로 전환" : "공개로 전환"}</button>
      </div>
    </article>
  `;
}

function bindReplayButtons() {
  document.querySelectorAll("[data-view-replay]").forEach((button) => {
    button.addEventListener("click", () => {
      location.hash = `replay-detail:${button.dataset.viewReplay}`;
      renderReplayDetail(button.dataset.viewReplay);
    });
  });
  document.querySelectorAll("[data-toggle-replay]").forEach((button) => {
    button.addEventListener("click", async () => {
      const makePublic = button.dataset.public === "true";
      const title = makePublic ? prompt("怨듦컻 ?쒕ぉ???낅젰?섏꽭??", "臾명빐??由ы뵆?덉씠") : "";
      await window.ReplayService.updateReplayVisibility(button.dataset.toggleReplay, makePublic, title || "");
      showNotice(makePublic ? "由ы뵆?덉씠瑜?怨듦컻濡??꾪솚?덉뒿?덈떎." : "由ы뵆?덉씠瑜?鍮꾧났媛쒕줈 ?꾪솚?덉뒿?덈떎.", "success");
      showView("replays");
    });
  });
}

async function renderReplayDetail(replayId = null) {
  const id = replayId || location.hash.split(":")[1];
  const replay = await window.ReplayService.getReplayById(id).catch(() => null);
  if (!replay) {
    app.innerHTML = `<div class="empty">由ы뵆?덉씠瑜?蹂????놁뒿?덈떎. 鍮꾧났媛?由ы뵆?덉씠???묒꽦?먮쭔 蹂????덉뒿?덈떎.</div>`;
    return;
  }
  await window.ReplayService.incrementReplayViewCount(id).catch(() => {});
  const items = replay.items || [];
  app.innerHTML = `
    <section class="section">
      <div class="card">
        <h2>${escapeHtml(replay.public_title || replay.title || "由ы뵆?덉씠 ?곸꽭")}</h2>
        <p class="muted">${escapeHtml(replay.nickname || "?듬챸")} 쨌 ${escapeHtml(replay.mode || "solo")} 쨌 ${escapeHtml(replay.difficulty || "-")} 쨌 ${Number(replay.score || 0)} / ${Number(replay.max_score || 0)}</p>
      </div>
      <div class="grid">
        ${statCard("?깃툒", replay.grade || "-", "span-3")}
        ${statCard("?뺣떟/遺遺??ㅻ떟", `${replay.correct_count || 0}/${replay.partial_count || 0}/${replay.wrong_count || 0}`, "span-3")}
        ${statCard("珥?????쒓컙", secondsLabel(replay.total_time || 0), "span-3")}
        ${statCard("?됯퇏 ????쒓컙", secondsLabel(replay.average_time || 0), "span-3")}
      </div>
      <div class="card table-list">
        ${items.length ? items.map((item) => replayItemHtml(item)).join("") : `<div class="empty">臾몄젣蹂?湲곕줉???놁뒿?덈떎.</div>`}
      </div>
    </section>
  `;
}

function replayItemHtml(item) {
  const q = item.question_snapshot || {};
  const analysis = item.analysis_snapshot || {};
  return `
    <article class="result-item">
      <div class="row between"><strong>${Number(item.question_index || 0) + 1}. ${escapeHtml(q.question || "질문 없음")}</strong><span class="badge">${item.is_correct ? "정답" : item.is_partial ? "부분" : "오답"}</span></div>
      <p class="passage">${escapeHtml(q.passage || "")}</p>
      <p><strong>내 답:</strong> ${escapeHtml(item.user_answer?.value ?? "미입력")}</p>
      <p><strong>해설:</strong> ${escapeHtml(item.explanation_snapshot || q.explanation || "")}</p>
      <div class="grid">
        ${statCard("문장/문단", `${analysis.passage?.sentenceCount || 0}문장 · ${analysis.passage?.paragraphCount || 0}문단`, "span-4")}
        ${statCard("난이도 점수", `${analysis.passage?.difficultyScore || 0}`, "span-4")}
        ${statCard("풀이 시간", secondsLabel(item.elapsed_time || 0), "span-4")}
      </div>
    </article>
  `;
}

function diagnosticsPanelHtml() {
  return `
    <div class="card">
      <div class="row between">
        <h3>Supabase diagnostics</h3>
        <span class="badge info">test-guest-mode-v1</span>
      </div>
      <div class="actions" style="margin-top:12px">
        <button class="btn" data-diagnostics-action="supabase">Supabase connection</button>
        <button class="btn" data-diagnostics-action="realtime">Realtime channel</button>
        <button class="btn" data-diagnostics-action="ai">AI Edge Function 吏곸젒 ?뚯뒪??/button>
        <button class="btn" data-diagnostics-action="checklist">Checklist</button>
        <button class="btn" data-diagnostics-action="rooms">Refresh rooms</button>
        <button class="btn" data-diagnostics-action="cleanup">Cleanup stale rooms</button>
        <button class="btn" data-diagnostics-action="storage">localStorage state</button>
        <button class="btn" data-diagnostics-action="profile">User/ranked profile</button>
      </div>
      <pre id="diagnosticsOutput" class="debug-panel">Select a diagnostics action.</pre>
    </div>
  `;
}

function setDiagnosticsOutput(payload) {
  const output = document.querySelector("#diagnosticsOutput");
  if (!output) return;
  output.textContent = typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);
}

async function testAIEdgeFunction({ alertResult = true } = {}) {
  const supabase = window.SupabaseService?.getSupabaseClient?.();
  if (!supabase) throw new Error("Supabase client媛 ?놁뒿?덈떎.");

  const body = {
    difficulty: "easy",
    count: 1,
    includeShortAnswer: false,
    selectedTypes: ["main_idea"],
    difficultyBoost: false
  };

  console.log("[AI TEST] request", body);

  const { data, error } = await supabase.functions.invoke("generate-questions", {
    body
  });
  const errorDetail = error ? await extractFunctionErrorDetail(error) : null;

  console.log("[AI TEST] data", data);
  console.error("[AI TEST] error", error);
  if (errorDetail) console.error("[AI TEST] error detail", errorDetail);

  const result = {
    ok: !error && data?.ok !== false,
    provider: data?.provider || errorDetail?.provider || "",
    model: data?.model || errorDetail?.model || "",
    error: error?.message || data?.error || errorDetail?.error || "",
    errorMessage: error?.message || data?.error || errorDetail?.error || "",
    detail: data?.detail || errorDetail?.detail || errorDetail || "",
    questions: { length: data?.questions?.length || 0 },
    questionsLength: data?.questions?.length || 0,
    firstQuestion: data?.questions?.[0]?.question || "",
    firstPassage: data?.questions?.[0]?.passage || "",
    raw: { data, error, errorDetail }
  };

  window.LAST_AI_TEST_RESULT = result;
  setDiagnosticsOutput(result);
  if (alertResult) alert(JSON.stringify(result, null, 2));
  return result;
}

window.testAIEdgeFunction = testAIEdgeFunction;

function getLocalStorageDiagnostics() {
  const snapshot = {};
  Object.entries(STORAGE_KEYS).forEach(([name, key]) => {
    snapshot[name] = safeParse(localStorage.getItem(key), localStorage.getItem(key));
  });
  return {
    version: window.DEPLOY_VERSION || "test-guest-mode-v1",
    hash: location.hash,
    nickname: getNickname(),
    supabaseConfigured: window.SupabaseService?.hasSupabaseConfig?.() || null,
    currentRoom: {
      roomId: localStorage.getItem(STORAGE_KEYS.currentRoomId),
      userId: localStorage.getItem(STORAGE_KEYS.currentRoomUserId),
      mode: localStorage.getItem(STORAGE_KEYS.currentRoomMode)
    },
    storage: snapshot
  };
}

async function runDiagnosticsAction(action) {
  if (action === "supabase") {
    const status = await window.SupabaseService.checkSupabaseDiagnostics();
    return { action, status, config: window.APP_CONFIG };
  }
  if (action === "realtime") {
    const supabase = window.SupabaseService.getSupabaseClient();
    return await new Promise((resolve) => {
      const channelName = `diagnostics-realtime-${Date.now()}`;
      const channel = supabase.channel(channelName);
      const timeoutId = setTimeout(() => {
        supabase.removeChannel(channel);
        resolve({ action, channel: channelName, status: "timeout" });
      }, 5000);
      channel.subscribe((status, error) => {
        if (status === "SUBSCRIBED" || status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          clearTimeout(timeoutId);
          supabase.removeChannel(channel);
          resolve({ action, channel: channelName, status, error: error?.message || null });
        }
      });
    });
  }
  if (action === "ai") {
    const result = await testAIEdgeFunction({ alertResult: true });
    return {
      action,
      ...result,
      supabaseUrl: window.APP_CONFIG?.SUPABASE_URL || null,
      guestUserId: window.UserRemoteService?.getOrCreateTestGuestId?.() || null
    };
  }
  if (action === "checklist") {
    const supabase = window.SupabaseService.getSupabaseClient();
    const checks = {
      deployVersion: window.DEPLOY_VERSION,
      supabaseConfigLoaded: window.SupabaseService?.hasSupabaseConfig?.()?.ok || false,
      currentUserId: window.UserRemoteService?.getAnonymousUserId?.() || null,
      currentRoomId: localStorage.getItem(STORAGE_KEYS.currentRoomId),
      lastAIError: window.LAST_AI_ERROR?.message || String(window.LAST_AI_ERROR || ""),
      lastRoomError: window.LAST_ROOM_ERROR?.message || String(window.LAST_ROOM_ERROR || ""),
      lastRankedError: window.LAST_RANKED_ERROR?.message || String(window.LAST_RANKED_ERROR || "")
    };
    for (const table of ["rooms", "room_players", "ranked_matches"]) {
      const { error } = await supabase.from(table).select("*").limit(1);
      checks[`${table}Select`] = error ? `failed: ${error.message}` : "ok";
    }
    return { action, checks };
  }
  if (action === "rooms") {
    const rooms = await window.RoomService.getOpenRooms();
    return { action, count: rooms.length, rooms };
  }
  if (action === "cleanup") {
    const cleaned = await window.RoomService.cleanupStaleRooms();
    return { action, cleanedCount: cleaned.length, cleaned };
  }
  if (action === "storage") {
    return getLocalStorageDiagnostics();
  }
  if (action === "profile") {
    const user = await window.UserRemoteService.getOrCreateUser(getNickname() || "anonymous");
    const profile = await window.UserRemoteService.getRankingProfile(user.user_id || user.id);
    return { action, testGuestMode: true, user, profile };
  }
  throw new Error(`Unknown diagnostics action: ${action}`);
}

function bindAdminDiagnostics() {
  document.querySelectorAll("[data-diagnostics-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      const action = button.dataset.diagnosticsAction;
      const originalLabel = button.textContent;
      try {
        button.disabled = true;
        button.textContent = "Running...";
        setDiagnosticsOutput(`Running ${action} diagnostics...`);
        const result = await runDiagnosticsAction(action);
        console.log("[Diagnostics]", action, result);
        setDiagnosticsOutput(result);
        showNotice(`${action} diagnostics completed.`, "success");
      } catch (error) {
        console.error(`[Diagnostics] ${action} failed:`, error);
        setDiagnosticsOutput({
          action,
          ok: false,
          message: window.SupabaseService?.getFriendlySupabaseErrorMessage?.(error) || error?.message || String(error)
        });
        showNotice(`${action} diagnostics failed.`, "error", 0);
      } finally {
        button.disabled = false;
        button.textContent = originalLabel;
      }
    });
  });
}

function renderAdmin() {
  const authed = getStorage(STORAGE_KEYS.adminAuthed, false);
  if (!authed) {
    app.innerHTML = `
      <section class="section">
        <div class="card admin-warning"><h2>愿由ъ옄</h2><p>媛쒕컻???꾩떆 愿由ъ옄 湲곕뒫?낅땲?? ?ㅼ젣 ?쒕퉬?ㅼ뿉?쒕뒗 ??諛⑹떇???덉쟾?섏? ?딆뒿?덈떎.</p></div>
        <div class="card field"><label>鍮꾨?踰덊샇</label><input id="adminPassword" type="password" /><button class="btn primary" data-admin-login>?묒냽</button></div>
      </section>
    `;
    document.querySelector("[data-admin-login]").addEventListener("click", () => {
      if (document.querySelector("#adminPassword").value === "admin1234") {
        setStorage(STORAGE_KEYS.adminAuthed, true);
        renderAdmin();
      } else {
        showNotice("愿由ъ옄 鍮꾨?踰덊샇媛 ??몄뒿?덈떎.", "error");
      }
    });
    return;
  }
  const aiQuestions = getSavedAIQuestions();
  app.innerHTML = `
    <section class="section">
      <div class="card admin-warning"><h2>愿由ъ옄</h2><p>媛쒕컻???꾩떆 愿由ъ옄 湲곕뒫?낅땲?? ?ㅼ젣 ?쒕퉬?ㅼ뿉?쒕뒗 ?쒕쾭 ?몄쬆?쇰줈 援먯껜?댁빞 ?⑸땲??</p></div>
      <div class="card actions">
        <button class="btn danger" data-clear="rankings">??궧 珥덇린??/button>
        <button class="btn danger" data-clear="histories">?ъ슜??湲곕줉 珥덇린??/button>
        <button class="btn danger" data-clear="wrongNotes">?ㅻ떟?명듃 珥덇린??/button>
        <button class="btn danger" data-clear="aiQuestions">??λ맂 AI 臾몄젣 珥덇린??/button>
        <button class="btn" data-backup>?꾩껜 localStorage 諛깆뾽 JSON ?ㅼ슫濡쒕뱶</button>
        <label class="btn">JSON 媛?몄삤湲?input id="importJson" type="file" accept="application/json" hidden /></label>
      </div>
      ${diagnosticsPanelHtml()}
      <div class="card">
        <h3>??λ맂 AI 臾몄젣 紐⑸줉 (${aiQuestions.length})</h3>
        <div class="table-list">${aiQuestions.map((q) => `<div class="history-item">${escapeHtml(q.id)} 쨌 ${escapeHtml(TYPE_LABELS[q.type] || q.type)} 쨌 ${escapeHtml(q.question)}</div>`).join("") || `<div class="empty">??λ맂 AI 臾몄젣媛 ?놁뒿?덈떎.</div>`}</div>
      </div>
    </section>
  `;
  document.querySelectorAll("[data-clear]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!confirm("?좏깮???곗씠?곕? 珥덇린?뷀븷源뚯슂?")) return;
      const key = STORAGE_KEYS[button.dataset.clear];
      setStorage(key, []);
      renderAdmin();
    });
  });
  document.querySelector("[data-backup]").addEventListener("click", backupLocalStorage);
  document.querySelector("#importJson").addEventListener("change", importLocalStorage);
  bindAdminDiagnostics();
}

function backupLocalStorage() {
  const data = {};
  Object.values(STORAGE_KEYS).forEach((key) => {
    data[key] = safeParse(localStorage.getItem(key), localStorage.getItem(key));
  });
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `literacy-backup-${todayKey()}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function importLocalStorage(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const data = safeParse(reader.result, null);
    if (!data || typeof data !== "object") {
      showNotice("JSON 媛?몄삤湲곗뿉 ?ㅽ뙣?덉뒿?덈떎.", "error");
      return;
    }
    Object.entries(data).forEach(([key, value]) => setStorage(key, value));
    toast("JSON ?곗씠?곕? 媛?몄솕?듬땲??");
    renderAdmin();
  };
  reader.readAsText(file);
}

function bindGoButtons() {
  document.querySelectorAll("[data-go]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.hasAttribute("data-clear-room-session")) clearCurrentRoomSession();
      showView(button.dataset.go);
    });
  });
}

async function restoreCurrentRoomSession() {
  if (!isOnlineFeatureAvailable()) return false;
  const currentHash = location.hash.replace("#", "") || "home";
  if (currentHash.startsWith("room-")) return false;
  const roomId = localStorage.getItem(STORAGE_KEYS.currentRoomId);
  if (!roomId) return false;
  try {
    const room = await window.RoomService.getRoom(roomId);
    if (!room || room.status === "cancelled") {
      clearCurrentRoomSession();
      if (room?.status === "cancelled") showNotice("?댁쟾??李멸??섎뜕 諛⑹씠 痍⑥냼?섏뿀?듬땲??", "info");
      return false;
    }
    if (room.status === "waiting") {
      renderRoomLobby(room);
      return true;
    }
    if (room.status === "playing") {
      renderRoomPlay(room);
      return true;
    }
    if (room.status === "finished") {
      renderRoomResult(room);
      return true;
    }
  } catch (error) {
    console.error("room session restore failed:", error);
    clearCurrentRoomSession();
  }
  return false;
}

function init() {
  navButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      showView(button.dataset.nav);
    });
  });

  nicknameForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const value = nicknameInput.value.trim();
    const error = validateNickname(value);
    if (error) {
      nicknameError.textContent = error;
      return;
    }
    try {
      await window.UserRemoteService?.updateGuestNickname?.(value);
      setStorage(STORAGE_KEYS.nickname, value);
      nicknameDialog.close();
      showView(location.hash.replace("#", "") || "home");
    } catch (error) {
      console.error("guest nickname update failed:", error);
      nicknameError.textContent = friendlyOnlineError(error);
    }
  });

  window.addEventListener("hashchange", () => showView(location.hash.replace("#", "") || "home"));
  window.addEventListener("supabase-status-change", () => {
    const current = location.hash.replace("#", "") || "home";
    if (["home", "rooms", "ranked", "public-replays"].includes(current)) {
      showView(current);
    }
  });
  showView(location.hash.replace("#", "") || "home");
  window.SupabaseService?.testSupabaseConnection?.().catch((error) => {
    console.error("Supabase bootstrap test failed:", error);
  });
  window.UserRemoteService?.initAuth?.().catch((error) => {
    console.error("guest bootstrap failed:", error);
    if (isOnlineFeatureAvailable()) showNotice("Guest bootstrap failed: " + friendlyOnlineError(error), "warning");
  });
  setTimeout(() => {
    restoreCurrentRoomSession().catch((error) => console.error("room session restore failed:", error));
  }, 400);
  setTimeout(ensureNickname, 200);
}

init();
