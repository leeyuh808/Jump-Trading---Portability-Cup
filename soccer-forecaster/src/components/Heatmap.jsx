export function Heatmap({ matrix, homeTeam, awayTeam }) {
  const flat   = matrix.flat()
  const maxVal = Math.max(...flat)
  const rows   = Math.min(7, matrix.length)

  return (
    <div className="overflow-x-auto">
      <p className="text-xs text-pitch-500 mb-3">
        Rows = {homeTeam} goals · Columns = {awayTeam} goals
      </p>
      <table className="border-collapse text-center">
        <thead>
          <tr>
            <td className="w-7" />
            {Array.from({ length: rows }, (_, j) => (
              <td key={j} className="w-9 pb-1 text-[10px] text-pitch-500">{j}</td>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, i) => (
            <tr key={i}>
              <td className="text-[10px] text-pitch-500 pr-1 text-right">{i}</td>
              {Array.from({ length: rows }, (_, j) => {
                const v         = matrix[i]?.[j] ?? 0
                const intensity = maxVal > 0 ? v / maxVal : 0
                const alpha     = intensity * 0.85 + 0.04
                return (
                  <td
                    key={j}
                    title={`${(v * 100).toFixed(1)}%`}
                    className="w-9 h-7 text-[9px] font-semibold border border-pitch-700 cursor-default"
                    style={{
                      background: `rgba(0,210,180,${alpha})`,
                      color: intensity > 0.55 ? '#000' : '#5ecfca',
                    }}
                  >
                    {v > 0.005 ? (v * 100).toFixed(1) : ''}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
