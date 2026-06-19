export function ProbBar({ label, value, colorClass }) {
  return (
    <div className="mb-3">
      <div className="flex justify-between items-baseline mb-1.5">
        <span className="text-sm font-medium text-slate-300">{label}</span>
        <span className={`font-mono text-base font-bold ${colorClass}`}>{value}%</span>
      </div>
      <div className="h-1.5 bg-pitch-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${colorClass.replace('text-', 'bg-')}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}
