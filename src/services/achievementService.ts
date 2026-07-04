import { getStorage, setStorage } from "@/utils/storageUtils";
import type { AchievementRecord, RankingRecord, AttendanceData, TodayQuestionRecord, WrongNoteItem } from "@/lib/types";

const ACHIEVEMENT_KEY = "munhae_achievements";

const initialAchievements: AchievementRecord[] = [
  { id: "first_test", title: "첫 도전", description: "첫 테스트를 완료했습니다.", achieved: false, achievedAt: null },
  { id: "five_tests", title: "꾸준한 도전자", description: "테스트 5회를 완료했습니다.", achieved: false, achievedAt: null },
  { id: "ten_tests", title: "열정의 10회", description: "테스트 10회를 완료했습니다.", achieved: false, achievedAt: null },
  { id: "thirty_tests", title: "30회 달성", description: "테스트 30회를 완료했습니다.", achieved: false, achievedAt: null },
  { id: "score_80", title: "A급 도약", description: "80점 이상을 달성했습니다.", achieved: false, achievedAt: null },
  { id: "score_90", title: "S급 도전", description: "90점 이상을 달성했습니다.", achieved: false, achievedAt: null },
  { id: "perfect_score", title: "완벽의 순간", description: "100점을 달성했습니다.", achieved: false, achievedAt: null },
  { id: "hard_complete", title: "어려움 정복", description: "hard 난이도를 완료했습니다.", achieved: false, achievedAt: null },
  { id: "expert_complete", title: "고난도 마스터", description: "expert 난이도를 완료했습니다.", achieved: false, achievedAt: null },
  { id: "short_answer", title: "주관식 정복", description: "주관식 문제를 정답 처리했습니다.", achieved: false, achievedAt: null },
  { id: "partial", title: "부분 정답", description: "부분 정답을 받았습니다.", achieved: false, achievedAt: null },
  { id: "wrong_note_10", title: "오답노트 10개", description: "오답노트에 10문제를 등록했습니다.", achieved: false, achievedAt: null },
  { id: "mastered_5", title: "숙달 5회", description: "오답노트 문제 5개를 숙달 완료했습니다.", achieved: false, achievedAt: null },
  { id: "three_days_streak", title: "3일 연속 출석", description: "3일 연속 출석에 성공했습니다.", achieved: false, achievedAt: null },
  { id: "seven_days_streak", title: "7일 연속 출석", description: "7일 연속 출석에 성공했습니다.", achieved: false, achievedAt: null },
  { id: "today_question", title: "오늘의 문제 해결", description: "오늘의 문제에 성공했습니다.", achieved: false, achievedAt: null },
  { id: "challenge_complete", title: "챌린지 클리어", description: "고난도 챌린지 모드를 완료했습니다.", achieved: false, achievedAt: null },
];

export const getAchievements = (): AchievementRecord[] => {
  return getStorage<AchievementRecord[]>(ACHIEVEMENT_KEY, initialAchievements);
};

export const saveAchievements = (items: AchievementRecord[]) => {
  setStorage(ACHIEVEMENT_KEY, items);
};

export const unlockAchievement = (id: string) => {
  const items = getAchievements();
  const next = items.map((item) => (item.id === id && !item.achieved ? { ...item, achieved: true, achievedAt: new Date().toISOString() } : item));
  saveAchievements(next);
  return next.find((item) => item.id === id) ?? null;
};

export const resetAchievements = () => {
  saveAchievements(initialAchievements);
};

export const checkAchievements = (
  totalTests: number,
  record: RankingRecord,
  wrongNotes: WrongNoteItem[],
  attendance: AttendanceData,
  todayQuestion?: TodayQuestionRecord | null,
) => {
  const current = getAchievements();
  const next = current.map((item) => {
    if (item.achieved) return item;
    let shouldUnlock = false;
    switch (item.id) {
      case "first_test":
        shouldUnlock = totalTests >= 1;
        break;
      case "five_tests":
        shouldUnlock = totalTests >= 5;
        break;
      case "ten_tests":
        shouldUnlock = totalTests >= 10;
        break;
      case "thirty_tests":
        shouldUnlock = totalTests >= 30;
        break;
      case "score_80":
        shouldUnlock = record.score >= 80;
        break;
      case "score_90":
        shouldUnlock = record.score >= 90;
        break;
      case "perfect_score":
        shouldUnlock = record.score === 100;
        break;
      case "hard_complete":
        shouldUnlock = record.difficulty === "hard";
        break;
      case "expert_complete":
        shouldUnlock = record.difficulty === "expert";
        break;
      case "short_answer":
        shouldUnlock = record.partialCount === 0 && record.totalQuestions > 0 && record.mode !== "quick";
        break;
      case "partial":
        shouldUnlock = record.partialCount > 0;
        break;
      case "wrong_note_10":
        shouldUnlock = wrongNotes.length >= 10;
        break;
      case "mastered_5":
        shouldUnlock = wrongNotes.filter((note) => note.isMastered).length >= 5;
        break;
      case "three_days_streak":
        shouldUnlock = attendance.streak >= 3;
        break;
      case "seven_days_streak":
        shouldUnlock = attendance.streak >= 7;
        break;
      case "today_question":
        shouldUnlock = todayQuestion?.correct === true;
        break;
      case "challenge_complete":
        shouldUnlock = record.mode === "challenge";
        break;
      default:
        shouldUnlock = false;
    }
    return shouldUnlock ? { ...item, achieved: true, achievedAt: new Date().toISOString() } : item;
  });
  saveAchievements(next);
  return next.filter((item) => item.achieved && !current.find((currentItem) => currentItem.id === item.id && currentItem.achieved));
};
