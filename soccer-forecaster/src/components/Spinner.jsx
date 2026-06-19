export function Spinner({ text = 'Loading…' }) {
  return (
    <div className="flex items-center gap-3 text-slate-500 text-sm py-2">
      <div className="flex gap-1">
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse-dot"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
      {text}
    </div>
  )
}
