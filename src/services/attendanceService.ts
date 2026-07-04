import { getStorage, setStorage } from "@/utils/storageUtils";
import { getTodayString, isSameDay } from "@/utils/dateUtils";
import type { AttendanceData } from "@/lib/types";

const ATTENDANCE_KEY = "munhae_attendance";

const createDefaultAttendance = (): AttendanceData => ({
  totalDays: 0,
  streak: 0,
  lastCheckIn: "",
  rewardsClaimed: [],
});

export const getAttendance = (): AttendanceData => {
  return getStorage<AttendanceData>(ATTENDANCE_KEY, createDefaultAttendance());
};

export const saveAttendance = (data: AttendanceData) => {
  setStorage(ATTENDANCE_KEY, data);
};

export const canCheckInToday = () => {
  const attendance = getAttendance();
  return !attendance.lastCheckIn || !isSameDay(attendance.lastCheckIn, getTodayString());
};

export const checkIn = () => {
  if (!canCheckInToday()) return null;
  const attendance = getAttendance();
  const today = getTodayString();
  const nextStreak = attendance.lastCheckIn && isSameDay(new Date(new Date(attendance.lastCheckIn).valueOf() + 86400000), today)
    ? attendance.streak + 1
    : 1;
  const next: AttendanceData = {
    totalDays: attendance.totalDays + 1,
    streak: nextStreak,
    lastCheckIn: today,
    rewardsClaimed: attendance.rewardsClaimed,
  };
  saveAttendance(next);
  return next;
};

export const getAttendanceStreak = () => getAttendance().streak;

export const resetAttendance = () => {
  const defaultData = createDefaultAttendance();
  saveAttendance(defaultData);
  return defaultData;
};
