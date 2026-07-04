type Props = {
  value: number;
  max: number;
  label?: string;
};

export default function ProgressBar({ value, max, label }: Props) {
  const ratio = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="space-y-2">
      {label ? <p className="text-sm text-slate-400">{label}</p> : null}
      <div className="h-3 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500" style={{ width: `${ratio}%` }} />
      </div>
      <p className="text-xs text-slate-400">{ratio}%</p>
    </div>
  );
}
