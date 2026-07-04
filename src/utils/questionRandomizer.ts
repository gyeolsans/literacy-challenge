import type { Question, QuizSettings, PreparedQuestion } from "@/lib/types";

export function shuffleArray<T>(array: T[]) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function getRandomQuestions({
  questions,
  difficulty,
  count,
  selectedTypes,
  includeShortAnswer,
  onlyMultipleChoice,
}: {
  questions: Question[];
  difficulty: string;
  count: number;
  selectedTypes: string[];
  includeShortAnswer: boolean;
  onlyMultipleChoice: boolean;
}) {
  let pool = questions.filter((item) => item.difficulty === difficulty || difficulty === "all");
  if (selectedTypes.length) {
    pool = pool.filter((item) => selectedTypes.includes(item.type));
  }
  if (onlyMultipleChoice) {
    pool = pool.filter((item) => item.answerType === "multiple_choice");
  } else if (!includeShortAnswer) {
    pool = pool.filter((item) => item.answerType === "multiple_choice");
  }
  const shuffled = shuffleArray(pool);
  return shuffled.slice(0, count);
}

export function shuffleOptions(question: Question) {
  if (question.answerType !== "multiple_choice") {
    return {
      question,
      shuffledOptions: question.options,
      answerIndex: question.answer,
    };
  }
  const pairs = question.options.map((value, index) => ({ value, index }));
  const shuffled = shuffleArray(pairs);
  const answerIndex = shuffled.findIndex((item) => item.index === question.answer);
  return {
    question,
    shuffledOptions: shuffled.map((item) => item.value),
    answerIndex,
  };
}

export function prepareTestQuestions({ questions, settings }: { questions: Question[]; settings: QuizSettings }) {
  const selected = getRandomQuestions({
    questions,
    difficulty: settings.difficulty,
    count: settings.count,
    selectedTypes: settings.selectedTypes,
    includeShortAnswer: settings.includeShortAnswer,
    onlyMultipleChoice: settings.onlyMultipleChoice,
  });
  return shuffleArray(selected).map((question) => {
    if (question.answerType === "multiple_choice") {
      const { shuffledOptions, answerIndex } = shuffleOptions(question);
      return {
        ...question,
        options: shuffledOptions,
        answer: answerIndex,
      } as PreparedQuestion;
    }
    return question as PreparedQuestion;
  });
}
