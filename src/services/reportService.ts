import { getStorage, setStorage } from "@/utils/storageUtils";
import type { ReportRecord } from "@/lib/types";

const REPORT_KEY = "munhae_reports";

export const getReports = (): ReportRecord[] => {
  return getStorage<ReportRecord[]>(REPORT_KEY, []);
};

export const addReport = (report: ReportRecord) => {
  setStorage(REPORT_KEY, [report, ...getReports()]);
};

export const updateReportStatus = (reportId: string, status: ReportRecord["status"]) => {
  setStorage(
    REPORT_KEY,
    getReports().map((item) => (item.id === reportId ? { ...item, status } : item)),
  );
};

export const clearReports = () => {
  setStorage(REPORT_KEY, []);
};
