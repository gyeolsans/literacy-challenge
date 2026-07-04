"use client";

import { useEffect, useState } from "react";

const ATTENDANCE_KEY = "munhae_attendance";

type AttendanceState = {
  totalDays: number;
  streak: number;
  lastCheckIn: string;
  lastDate: string;
};

const defaultState: AttendanceState = {
  totalDays: 0,
  streak: 0,
  lastCheckIn: "",
  lastDate: "",
};

const readAttendance = (): AttendanceState => {
  if (typeof window === "undefined") return defaultState;
  const raw = window.localStorage.getItem(ATTENDANCE_KEY);
  if (!raw) return defaultState;
  try {
    return JSON.parse(raw) as AttendanceState;
  } catch {
    return defaultState;
  }
};

const writeAttendance = (state: AttendanceState) => {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(state));
  }
};

export default function AttendancePage() {
  const [attendance, setAttendance] = useState<AttendanceState>(defaultState);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setAttendance(readAttendance());
  }, []);

  const handleCheckIn = () => {
    const today = new Date().toISOString().slice(0, 10);
    const previous = readAttendance();

    if (previous.lastDate === today) {
      setMessage("오늘은 이미 출석 체크를 완료했습니다.");
      return;
    }

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const nextStreak = previous.lastDate === yesterday ? previous.streak + 1 : 1;
    const next = {
      totalDays: previous.totalDays + 1,
      streak: nextStreak,
      lastCheckIn: new Date().toISOString(),
      lastDate: today,
    };

    writeAttendance(next);
    setAttendance(next);
    setMessage(`${next.totalDays}일째 출석! ${next.streak}일 연속입니다.`);
  };

  return (
    <div className="space-y-8 pb-12">
      <section className="rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-xl shadow-slate-950/40">
        <p className="text-sm uppercase tracking-[0.24em] text-slate-400">출석 페이지</p>
        <h2 className="mt-2 text-3xl font-semibold text-white">매일 출석하면 보상을 쌓아요</h2>
        <p className="mt-3 text-slate-300">출석 체크를 하면 연속 기록과 누적 출석 일수를 확인할 수 있습니다.</p>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
          <p className="text-sm text-slate-400">오늘의 출석</p>
          <p className="mt-4 text-4xl font-semibold text-white">{attendance.totalDays}일</p>
          <p className="mt-3 text-slate-300">연속 출석 {attendance.streak}일</p>
          <button
            type="button"
            onClick={handleCheckIn}
            className="mt-6 rounded-2xl bg-accent px-5 py-3 text-sm font-semibold text-white"
          >
            출석 체크
          </button>
          {message ? <p className="mt-4 text-sm text-slate-300">{message}</p> : null}
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <p className="text-sm text-slate-400">출석 팁</p>
          <ul className="mt-4 space-y-3 text-sm text-slate-300">
            <li>• 오늘의 문제를 풀면 출석 보너스를 더 즐길 수 있어요.</li>
            <li>• 목표를 달성하면 학습 루틴이 더 오래 유지됩니다.</li>
            <li>• 연속 출석이 길어질수록 학습 동기부여가 올라갑니다.</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
