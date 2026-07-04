export type Difficulty = "easy" | "normal" | "hard" | "expert";

export type AnswerType = "multiple_choice" | "short_answer";

export type QuestionType =
  | "main_idea"
  | "title"
  | "summary"
  | "inference"
  | "vocabulary"
  | "context_meaning"
  | "critical_thinking"
  | "claim"
  | "evidence"
  | "attitude"
  | "blank"
  | "order";

export type BaseQuestion = {
  id: string;
  difficulty: Difficulty;
  type: QuestionType;
  answerType: AnswerType;
  passage: string;
  question: string;
  explanation: string;
  points: number;
};

export type MultipleChoiceQuestion = BaseQuestion & {
  answerType: "multiple_choice";
  options: string[];
  answer: number;
};

export type ShortAnswerQuestion = BaseQuestion & {
  answerType: "short_answer";
  sampleAnswers: string[];
  keywords: string[];
  requiredKeywords: string[];
};

export type Question = MultipleChoiceQuestion | ShortAnswerQuestion;

export type PreparedQuestion = Question & {
  options?: string[];
  answer?: number;
};

export type ProblemTypeStats = Record<
  string,
  {
    correctCount: number;
    totalCount: number;
  }
>;

export type QuestionResult = {
  questionId: string;
  passage: string;
  question: string;
  difficulty: Difficulty;
  type: QuestionType;
  answerType: AnswerType;
  selectedAnswer: string;
  correctAnswer: string;
  sampleAnswers?: string[];
  keywords?: string[];
  requiredKeywords?: string[];
  explanation: string;
  timeSpent: number;
  isCorrect: boolean;
  isPartial: boolean;
  earnedPoints: number;
  scoreRatio: number;
  feedback: string;
};

export type GradeResult = {
  isCorrect: boolean;
  isPartial: boolean;
  scoreRatio: number;
  earnedPoints: number;
  similarity: number;
  keywordScore: number;
  matchedKeywords: string[];
  feedback: string;
};

export type QuizResult = RankingRecord & {
  earnedExperience: number;
  levelBefore: number;
  levelAfter: number;
  leveledUp: boolean;
  strongType: string;
  weakType: string;
  advice: string;
  achievements: string[];
  questions: QuestionResult[];
};

export type RankingRecord = {
  id: string;
  nickname: string;
  score: number;
  maxScore: number;
  grade: string;
  difficulty: Difficulty;
  mode: string;
  totalQuestions: number;
  correctCount: number;
  partialCount: number;
  wrongCount: number;
  timeoutCount: number;
  totalTime: number;
  averageTime: number;
  date: string;
  problemTypeStats: ProblemTypeStats;
  modeLabel: string;
  isTodayChallenge?: boolean;
};

export type TestRecord = RankingRecord;

export type UserInfo = {
  id: string;
  nickname: string;
  level: number;
  experience: number;
  totalExperience: number;
  title: string;
  totalTests: number;
  bestScore: number;
  averageScore: number;
  totalCorrect: number;
  totalWrong: number;
  totalPartial: number;
  totalTime: number;
  createdAt: string;
  updatedAt: string;
  lastPlayedAt: string;
  testRecords: TestRecord[];
  attendance: AttendanceData;
  goals: Goal[];
  achievements: AchievementRecord[];
  todayQuestion: TodayQuestionRecord | null;
};

export type QuizSettings = {
  difficulty: Difficulty | "all";
  mode: "basic" | "quick" | "practice" | "review" | "timed" | "challenge";
  count: number;
  includeShortAnswer: boolean;
  onlyMultipleChoice: boolean;
  timeLimitEnabled: boolean;
  timePerQuestion: number;
  selectedTypes: QuestionType[];
};

export type CurrentTestSession = {
  id: string;
  settings: QuizSettings;
  questions: PreparedQuestion[];
  answers: Record<string, string>;
  startedAt: string;
  timeLeft: number;
  mode: string;
};

export type WrongNoteItem = {
  questionId: string;
  passage: string;
  question: string;
  options?: string[];
  correctAnswer: string;
  selectedAnswer: string;
  userAnswer?: string;
  sampleAnswers?: string[];
  explanation: string;
  difficulty: Difficulty;
  type: QuestionType;
  answerType: AnswerType;
  wrongCount: number;
  lastWrongDate: string;
  isMastered: boolean;
};

export type AchievementRecord = {
  id: string;
  title: string;
  description: string;
  achieved: boolean;
  achievedAt: string | null;
};

export type Goal = {
  id: string;
  title: string;
  description: string;
  target: number;
  progress: number;
  reward: number;
  type: "daily" | "weekly";
  completed: boolean;
};

export type AttendanceData = {
  totalDays: number;
  streak: number;
  lastCheckIn: string;
  rewardsClaimed: string[];
};

export type ReportRecord = {
  id: string;
  questionId: string;
  reason: string;
  detail: string;
  createdAt: string;
  status: "pending" | "reviewed" | "resolved";
};

export type TodayQuestionRecord = {
  date: string;
  questionId: string;
  solved: boolean;
  correct: boolean;
  answeredAt: string | null;
};

export type TodayQuestionResult = {
  questionId: string;
  answerType: AnswerType;
  userAnswer: string;
  isCorrect: boolean;
  earnedPoints: number;
};

export type BackupData = {
  user: UserInfo | null;
  rankings: RankingRecord[];
  wrongNotes: WrongNoteItem[];
  achievements: AchievementRecord[];
  attendance: AttendanceData;
  goals: Goal[];
  todayQuestionRecords: TodayQuestionRecord[];
  reports: ReportRecord[];
  questions: Question[];
};
