import type { ShortAnswerQuestion, GradeResult } from "@/lib/types";

const koreanParticles = ["은", "는", "이", "가", "을", "를", "과", "와", "에", "에서", "에게", "로", "으로", "도", "만", "까지"];

export function normalizeKoreanText(text: string) {
  return text
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.,!?"'“”‘’]/g, "")
    .replace(/\(.*?\)/g, "")
    .toLowerCase();
}

export function tokenizeKoreanText(text: string) {
  const normalized = normalizeKoreanText(text);
  return normalized
    .split(/\s+/)
    .map((token) => koreanParticles.reduce((current, particle) => {
      const regex = new RegExp(`${particle}$`);
      return current.replace(regex, "");
    }, token))
    .filter(Boolean);
}

export function calculateJaccardSimilarity(a: string, b: string) {
  const setA = new Set(tokenizeKoreanText(a));
  const setB = new Set(tokenizeKoreanText(b));
  if (!setA.size || !setB.size) return 0;
  const intersection = [...setA].filter((value) => setB.has(value)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

export function calculateLevenshteinSimilarity(a: string, b: string) {
  const normalizedA = normalizeKoreanText(a);
  const normalizedB = normalizeKoreanText(b);
  const matrix = Array.from({ length: normalizedA.length + 1 }, () => Array(normalizedB.length + 1).fill(0));
  for (let i = 0; i <= normalizedA.length; i += 1) matrix[i][0] = i;
  for (let j = 0; j <= normalizedB.length; j += 1) matrix[0][j] = j;
  for (let i = 1; i <= normalizedA.length; i += 1) {
    for (let j = 1; j <= normalizedB.length; j += 1) {
      const cost = normalizedA[i - 1] === normalizedB[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }
  const distance = matrix[normalizedA.length][normalizedB.length];
  const maxLen = Math.max(normalizedA.length, normalizedB.length) || 1;
  return 1 - distance / maxLen;
}

export function calculateKeywordScore(userAnswer: string, keywords: string[]) {
  if (!keywords.length) return 0;
  const normalized = normalizeKoreanText(userAnswer);
  const matched = keywords.filter((keyword) => normalized.includes(normalizeKoreanText(keyword)));
  return matched.length / keywords.length;
}

export function hasRequiredKeywords(userAnswer: string, requiredKeywords: string[]) {
  if (!requiredKeywords.length) return true;
  const normalized = normalizeKoreanText(userAnswer);
  return requiredKeywords.every((keyword) => normalized.includes(normalizeKoreanText(keyword)));
}

export function gradeShortAnswer({
  userAnswer,
  sampleAnswers,
  keywords,
  requiredKeywords,
  points,
}: {
  userAnswer: string;
  sampleAnswers: string[];
  keywords: string[];
  requiredKeywords: string[];
  points: number;
}): GradeResult {
  const trimmed = userAnswer.trim();
  const similarity = Math.max(...sampleAnswers.map((sample) => calculateJaccardSimilarity(trimmed, sample)));
  const levenshtein = Math.max(...sampleAnswers.map((sample) => calculateLevenshteinSimilarity(trimmed, sample)));
  const keywordScore = calculateKeywordScore(trimmed, keywords);
  const requiredMatch = hasRequiredKeywords(trimmed, requiredKeywords);
  const adjustedSimilarity = Math.max(similarity, levenshtein);
  const isCorrect = requiredMatch && adjustedSimilarity >= 0.8;
  const isPartial = requiredMatch && adjustedSimilarity >= 0.6 && adjustedSimilarity < 0.8;
  const earnedPoints = isCorrect ? points : isPartial ? Math.round(points * 0.5) : 0;
  const feedback = isCorrect
    ? "핵심 의미가 잘 포함되어 있어 정답으로 처리되었습니다."
    : isPartial
    ? "핵심 요소는 포함되었으나 일부 표현이 부족합니다. 부분 정답으로 처리되었습니다."
    : "핵심 키워드 또는 의미가 부족하여 오답으로 처리되었습니다.";

  return {
    isCorrect,
    isPartial,
    scoreRatio: isCorrect ? 1 : isPartial ? 0.5 : 0,
    earnedPoints,
    similarity: adjustedSimilarity,
    keywordScore,
    matchedKeywords: keywords.filter((keyword) => normalizeKoreanText(trimmed).includes(normalizeKoreanText(keyword))),
    feedback,
  };
}

export function gradeAnswer({ question, userAnswer }: { question: ShortAnswerQuestion; userAnswer: string }) {
  return gradeShortAnswer({
    userAnswer,
    sampleAnswers: question.sampleAnswers,
    keywords: question.keywords,
    requiredKeywords: question.requiredKeywords,
    points: question.points,
  });
}
