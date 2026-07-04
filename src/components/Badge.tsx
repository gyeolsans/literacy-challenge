type Props = {
  label: string;
  variant?: "primary" | "success" | "warning" | "danger" | "neutral";
};

const styles: Record<string, string> = {
  primary: "bg-blue-500/15 text-blue-200 border border-blue-500/20",
  success: "bg-emerald-500/15 text-emerald-200 border border-emerald-500/20",
  warning: "bg-amber-500/15 text-amber-200 border border-amber-500/20",
  danger: "bg-rose-500/15 text-rose-200 border border-rose-500/20",
  neutral: "bg-slate-800 text-slate-200 border border-slate-700",
};

export default function Badge({ label, variant = "neutral" }: Props) {
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${styles[variant]}`}>{label}</span>;
}
