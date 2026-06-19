export function StatCard({ label, value, sub, accent = 'text-teal-400' }) {
  return (
    <div className="bg-pitch-800 border border-pitch-600 rounded-xl p-4">
      <p className="text-xs font-semibold tracking-widest uppercase text-pitch-400 mb-2">{label}</p>
      <p className={`font-mono text-2xl font-bold ${accent}`}>{value}</p>
      {sub && <p className="text-xs text-pitch-500 mt-1">{sub}</p>}
    </div>
  )
}
