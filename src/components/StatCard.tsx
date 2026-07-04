type Props = {
  label: string;
  value: string | number;
  note?: string;
  accent?: boolean;
};

export default function StatCard({ label, value, note, accent }: Props) {
  return (
    <div className={`rounded-3xl border p-5 ${accent ? "border-accent bg-accent/10" : "border-slate-800 bg-slate-950"}`}>
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
      {note ? <p className="mt-2 text-sm text-slate-300">{note}</p> : null}
    </div>
  );
}
