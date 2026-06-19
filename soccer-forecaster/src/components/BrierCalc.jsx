import { useState } from 'react'
import { brierScore, relativePoints } from '../lib/engine'

export function BrierCalc({ defaultPred = 50 }) {
  const [pred,       setPred]       = useState(defaultPred)
  const [fieldAvg,   setFieldAvg]   = useState(50)
  const [outcome,    setOutcome]    = useState('yes')
  const [multiplier, setMultiplier] = useState(1)

  const outcomeVal = outcome === 'yes' ? 1 : 0
  const myBS       = brierScore(pred, outcomeVal)
  const fieldBS    = brierScore(fieldAvg, outcomeVal)
  const pts        = relativePoints(myBS, fieldBS, multiplier)
  const ptsColor   = pts >= 0 ? 'text-teal-400' : 'text-rose-400'

  return (
    <div className="bg-pitch-800 border border-pitch-600 rounded-2xl p-5">
      <h3 className="text-xs font-bold tracking-widest uppercase text-teal-400 mb-4">Brier Score Calculator</h3>

      <div className="grid grid-cols-2 gap-3 mb-3">
        {[
          { label: 'Your prediction (%)', val: pred,     set: setPred,     min: 1, max: 99 },
          { label: 'Est. field average (%)', val: fieldAvg, set: setFieldAvg, min: 1, max: 99 },
        ].map(f => (
          <label key={f.label} className="block">
            <span className="text-xs text-pitch-400 mb-1 block">{f.label}</span>
            <input
              type="number" min={f.min} max={f.max} value={f.val}
              onChange={e => f.set(Math.min(f.max, Math.max(f.min, Number(e.target.value))))}
              className="w-full bg-pitch-700 border border-pitch-600 rounded-lg px-3 py-2 text-sm font-mono text-slate-200 outline-none focus:border-teal-400 transition-colors"
            />
          </label>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <label className="block">
          <span className="text-xs text-pitch-400 mb-1 block">Outcome</span>
          <select value={outcome} onChange={e => setOutcome(e.target.value)}
            className="w-full bg-pitch-700 border border-pitch-600 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-teal-400 transition-colors">
            <option value="yes">YES — happened</option>
            <option value="no">NO — didn't happen</option>
          </select>
        </label>
        <label className="block">
          <span className="text-xs text-pitch-400 mb-1 block">Stage</span>
          <select value={multiplier} onChange={e => setMultiplier(Number(e.target.value))}
            className="w-full bg-pitch-700 border border-pitch-600 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-teal-400 transition-colors">
            <option value={1}>1× Group Stage</option>
            <option value={2}>2× Elimination</option>
            <option value={3}>3× Final</option>
          </select>
        </label>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Your Brier', val: myBS,   color: myBS < 0.1 ? 'text-teal-400' : myBS < 0.25 ? 'text-amber-400' : 'text-rose-400' },
          { label: 'Field Brier', val: fieldBS, color: 'text-slate-400' },
          { label: 'Raw edge',    val: pts > 0 ? `+${pts}` : pts, color: ptsColor },
          { label: `Pts (${multiplier}×)`, val: pts > 0 ? `+${pts}` : pts, color: ptsColor },
        ].map(m => (
          <div key={m.label} className="bg-pitch-900 rounded-lg p-3 text-center">
            <p className="text-[9px] text-pitch-500 uppercase tracking-wider mb-1">{m.label}</p>
            <p className={`font-mono text-lg font-bold ${m.color}`}>{m.val}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
