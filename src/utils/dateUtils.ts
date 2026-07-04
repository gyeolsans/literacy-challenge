export function getTodayString(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function isSameDay(dateA: string | Date, dateB: string | Date) {
  const a = new Date(dateA).toISOString().slice(0, 10);
  const b = new Date(dateB).toISOString().slice(0, 10);
  return a === b;
}

export function getWeekKey(date = new Date()) {
  const current = new Date(date);
  const firstDay = new Date(current.getFullYear(), 0, 1);
  const pastDaysOfYear = (current.valueOf() - firstDay.valueOf()) / 86400000;
  const weekNumber = Math.ceil((pastDaysOfYear + firstDay.getDay() + 1) / 7);
  return `${current.getFullYear()}-W${weekNumber}`;
}

export function isThisWeek(date: string | Date) {
  return getWeekKey(new Date(date)) === getWeekKey();
}

export function getDaysBetween(dateA: string | Date, dateB: string | Date) {
  const a = new Date(dateA);
  const b = new Date(dateB);
  const diff = Math.abs(a.valueOf() - b.valueOf());
  return Math.floor(diff / 86400000);
}

export function formatDate(date: string | Date) {
  const target = new Date(date);
  return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}-${String(target.getDate()).padStart(2, "0")}`;
}

export function formatTime(seconds: number) {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min > 0 ? `${min}분 ` : ""}${sec}초`;
}
