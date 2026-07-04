import type { RankingRecord, UserInfo } from "@/lib/types";
import { generateId, loadStorage, saveStorage } from "@/lib/utils";

const USER_KEY = "munhae_user";

export const getUser = (): UserInfo | null => {
  const raw = loadStorage<UserInfo | null>(USER_KEY, null);
  if (!raw || !raw.nickname) return null;
  return raw;
};

export const saveUser = (user: UserInfo) => {
  saveStorage(USER_KEY, user);
};

export const updateNickname = (nickname: string): boolean => {
  const trimmed = nickname.trim();
  if (!trimmed || trimmed.length > 10) return false;
  const user = getUser() ?? {
    id: generateId("user"),
    nickname: trimmed,
    level: 1,
    experience: 0,
    totalExperience: 0,
    title: getTitleByLevel(1),
    testCount: 0,
    totalCorrect: 0,
    totalWrong: 0,
    totalTime: 0,
    lastPlayedAt: "",
    testRecords: [],
  };
  const next = { ...user, nickname: trimmed, lastPlayedAt: new Date().toISOString() };
  saveUser(next);
  return true;
};

export const addTestRecord = (record: RankingRecord) => {
  const user = getUser() ?? {
    id: generateId("user"),
    nickname: "게스트",
    level: 1,
    experience: 0,
    totalExperience: 0,
    title: getTitleByLevel(1),
    testCount: 0,
    totalCorrect: 0,
    totalWrong: 0,
    totalTime: 0,
    lastPlayedAt: "",
    testRecords: [],
  };

  const nextRecords = [record, ...user.testRecords].slice(0, 50);
  const next: UserInfo = {
    ...user,
    testRecords: nextRecords,
    testCount: user.testCount + 1,
    totalCorrect: user.totalCorrect + record.correctCount,
    totalWrong: user.totalWrong + record.wrongCount,
    totalTime: user.totalTime + record.totalTime,
    lastPlayedAt: record.date,
  };

  saveUser(next);
  return next;
};

export const getUserStats = () => {
  const user = getUser();
  if (!user) {
    return {
      nickname: "게스트",
      level: 1,
      experience: 0,
      nextLevelExp: 100,
      title: getTitleByLevel(1),
      totalTests: 0,
      bestScore: 0,
      averageScore: 0,
      averageGrade: "-",
      recentGrade: "-",
      totalCorrect: 0,
      totalWrong: 0,
      accuracy: 0,
      mostPlayedDifficulty: "-",
      strongestType: "-",
      weakestType: "-",
      recentRecords: [] as RankingRecord[],
    };
  }

  const entries = user.testRecords;
  const totalTests = user.testCount;
  const bestScore = entries.reduce((max, record) => Math.max(max, record.score), 0);
  const averageScore = totalTests ? Math.round(entries.reduce((sum, record) => sum + record.score, 0) / totalTests) : 0;
  const averageGrade = entries.length ? getTitleByLevel(Math.round(entries.reduce((sum, record) => sum + gradeValue(record.grade), 0) / entries.length)) : "-";
  const recentGrade = entries[0]?.grade ?? "-";
  const accuracy = user.totalCorrect + user.totalWrong ? Math.round((user.totalCorrect / (user.totalCorrect + user.totalWrong)) * 100) : 0;
  const difficultyCount = entries.reduce<Record<string, number>>((acc, record) => {
    acc[record.difficulty] = (acc[record.difficulty] ?? 0) + 1;
    return acc;
  }, {});
  const mostPlayedDifficulty = Object.entries(difficultyCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "-";
  const typeStats = entries.reduce<Record<string, { correct: number; total: number }>>((acc, record) => {
    Object.entries(record.problemTypeStats).forEach(([type, stat]) => {
      const total = acc[type]?.total ?? 0;
      const correct = acc[type]?.correct ?? 0;
      acc[type] = {
        total: total + stat.totalCount,
        correct: correct + stat.correctCount,
      };
    });
    return acc;
  }, {});
  const typeAccuracy = Object.entries(typeStats).map(([type, stat]) => ({
    type,
    accuracy: stat.total > 0 ? stat.correct / stat.total : 0,
  }));
  const strongestType = typeAccuracy.sort((a, b) => b.accuracy - a.accuracy)[0]?.type ?? "-";
  const weakestType = typeAccuracy.sort((a, b) => a.accuracy - b.accuracy)[0]?.type ?? "-";

  return {
    nickname: user.nickname,
    level: user.level,
    experience: user.experience,
    nextLevelExp: user.level * 100,
    title: user.title,
    totalTests,
    bestScore,
    averageScore,
    averageGrade,
    recentGrade,
    totalCorrect: user.totalCorrect,
    totalWrong: user.totalWrong,
    accuracy,
    mostPlayedDifficulty,
    strongestType,
    weakestType,
    recentRecords: entries.slice(0, 5),
  };
};

const gradeValue = (grade: string) => {
  if (grade === "A") return 4;
  if (grade === "B") return 3;
  if (grade === "C") return 2;
  return 1;
};

export const addExperience = (score: number) => {
  const user = getUser();
  if (!user) return null;

  let gain = 20;
  if (score >= 60) gain += 10;
  if (score >= 80) gain += 20;
  if (score >= 90) gain += 30;
  if (score === 100) gain += 50;

  let experience = user.experience + gain;
  let level = user.level;
  while (experience >= level * 100) {
    experience -= level * 100;
    level += 1;
  }

  const next: UserInfo = {
    ...user,
    level,
    experience,
    totalExperience: user.totalExperience + gain,
    title: getTitleByLevel(level),
  };

  saveUser(next);
  return next;
};

export const getTitleByLevel = (level: number) => {
  if (level >= 50) return "문해력 지배자";
  if (level >= 30) return "문해력 고수";
  if (level >= 20) return "추론 마스터";
  if (level >= 10) return "핵심 포착러";
  if (level >= 5) return "문장 탐험가";
  return "독해 입문자";
};

export const resetUserData = () => {
  const user = getUser();
  if (!user) return null;
  const next: UserInfo = {
    ...user,
    level: 1,
    experience: 0,
    totalExperience: 0,
    title: getTitleByLevel(1),
    testCount: 0,
    totalCorrect: 0,
    totalWrong: 0,
    totalTime: 0,
    lastPlayedAt: "",
    testRecords: [],
  };
  saveUser(next);
  return next;
};
