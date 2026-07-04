import type { Difficulty, ProblemTypeStats, Question, QuestionResult, RankingRecord, WrongNoteItem } from "@/lib/types";
import { generateId } from "@/lib/utils";

const shuffle = <T>(items: T[]) => {
  return [...items].sort(() => Math.random() - 0.5);
};

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^가-힣a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .join(" ");

const isShortAnswerCorrect = (answer: string, sampleAnswers: string[], keywords: string[], requiredKeywords: string[]) => {
  const normalizedAnswer = normalizeText(answer);
  if (!normalizedAnswer) return false;

  const sampleMatches = sampleAnswers.some((sample) => normalizeText(sample).includes(normalizedAnswer) || normalizedAnswer.includes(normalizeText(sample)));
  if (sampleMatches) return true;

  const requiredMatchCount = requiredKeywords.filter((keyword) => normalizedAnswer.includes(normalizeText(keyword))).length;
  if (requiredKeywords.length > 0 && requiredMatchCount === requiredKeywords.length) return true;

  return keywords.some((keyword) => normalizedAnswer.includes(normalizeText(keyword)));
};

export const selectQuestions = (allQuestions: Question[], difficulty: Difficulty, limit = 10): Question[] => {
  const filtered = allQuestions.filter((question) => question.difficulty === difficulty);
  const shuffled = shuffle(filtered);
  return shuffled.slice(0, Math.min(limit, shuffled.length));
};

export const calculateScore = (correctCount: number) => correctCount * 10;

export const calculateGrade = (score: number) => {
  if (score >= 90) return "A";
  if (score >= 70) return "B";
  if (score >= 50) return "C";
  return "D";
};

export const getTitleByLevel = (level: number) => {
  if (level >= 50) return "문해력 지배자";
  if (level >= 30) return "문해력 고수";
  if (level >= 20) return "추론 마스터";
  if (level >= 10) return "핵심 포착러";
  if (level >= 5) return "문장 탐험가";
  return "독해 입문자";
};

export const createQuestionResults = (
  questions: Question[],
  selectedAnswers: string[],
  averageTime: number,
): QuestionResult[] => {
  return questions.map((question, index) => {
    const selectedAnswer = selectedAnswers[index] ?? "";
    const isMultipleChoice = question.answerType === "multiple_choice";
    const correctAnswer = isMultipleChoice
      ? question.options[question.answer]
      : question.sampleAnswers?.[0] ?? "";
    const isCorrect = isMultipleChoice
      ? selectedAnswer === correctAnswer
      : isShortAnswerCorrect(selectedAnswer, question.sampleAnswers ?? [], question.keywords ?? [], question.requiredKeywords ?? []);

    return {
      questionId: question.id,
      passage: question.passage,
      question: question.question,
      difficulty: question.difficulty,
      type: question.type,
      answerType: question.answerType,
      selectedAnswer,
      correctAnswer,
      sampleAnswers: question.answerType === "short_answer" ? question.sampleAnswers : undefined,
      keywords: question.answerType === "short_answer" ? question.keywords : undefined,
      requiredKeywords: question.answerType === "short_answer" ? question.requiredKeywords : undefined,
      explanation: question.explanation,
      timeSpent: averageTime,
      isCorrect,
      isPartial: false,
      earnedPoints: isCorrect ? question.points : 0,
      scoreRatio: isCorrect ? 1 : 0,
      feedback: isCorrect ? "좋습니다!" : "다시 한 번 확인해보세요.",
    };
  });
};

export const createProblemTypeStats = (questionResults: QuestionResult[]): ProblemTypeStats => {
  return questionResults.reduce<ProblemTypeStats>((acc, item) => {
    const stats = acc[item.type] ?? { correctCount: 0, totalCount: 0 };
    stats.totalCount += 1;
    if (item.isCorrect) stats.correctCount += 1;
    acc[item.type] = stats;
    return acc;
  }, {});
};

export const buildRankingRecord = (
  nickname: string,
  difficulty: Difficulty,
  questionResults: QuestionResult[],
  totalTime: number,
): RankingRecord => {
  const correctCount = questionResults.filter((item) => item.isCorrect).length;
  const score = calculateScore(correctCount);
  const maxScore = questionResults.length * 10;
  const averageTime = questionResults.length ? Math.round(totalTime / questionResults.length) : 0;
  return {
    id: generateId("rank"),
    nickname,
    score,
    maxScore,
    grade: calculateGrade(score),
    difficulty,
    totalQuestions: questionResults.length,
    correctCount,
    wrongCount: questionResults.length - correctCount,
    totalTime,
    averageTime,
    date: new Date().toISOString(),
    problemTypeStats: createProblemTypeStats(questionResults),
  };
};

export const buildQuizResult = (
  rankingRecord: RankingRecord,
  earnedExperience: number,
  levelBefore: number,
  levelAfter: number,
  strongType: string,
  weakType: string,
  advice: string,
  achievements: string[],
) => {
  return {
    ...rankingRecord,
    earnedExperience,
    levelBefore,
    levelAfter,
    leveledUp: levelAfter > levelBefore,
    strongType,
    weakType,
    advice,
    achievements,
  };
};

export const createWrongNoteItems = (questionResults: QuestionResult[]): WrongNoteItem[] => {
  return questionResults
    .filter((item) => !item.isCorrect)
    .map((item) => ({
      questionId: item.questionId,
      passage: item.passage,
      question: item.question,
      options: item.options,
      correctAnswer: item.correctAnswer,
      selectedAnswer: item.selectedAnswer,
      explanation: item.explanation,
      difficulty: item.difficulty,
      type: item.type,
      wrongCount: 1,
      lastWrongDate: new Date().toISOString(),
      isMastered: false,
    }));
};
