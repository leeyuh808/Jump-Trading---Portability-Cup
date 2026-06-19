import { useEffect, useMemo, useState } from 'react'
import {
  BarChart3,
  Brain,
  Calculator,
  ChevronRight,
  Info,
  Search,
  ShieldAlert,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import { fetchMatchInsight, fetchTeamStats } from './lib/api'
import { runModel } from './lib/engine'
import { BrierCalc } from './components/BrierCalc'
import { Heatmap } from './components/Heatmap'
import { ProbBar } from './components/ProbBar'
import { Spinner } from './components/Spinner'
import { StatCard } from './components/StatCard'

const tabs = ['Forecast', 'Adjust', 'Brier Calc']

const sampleMatchData = {
  home: {
    name: 'Home Team',
    elo: 1550,
    goalsFor: 1.7,
    goalsAgainst: 1.1,
    form: 9,
    injuries: 'None known'
  },
  away: {
    name: 'Away Team',
    elo: 1520,
    goalsFor: 1.4,
    goalsAgainst: 1.3,
    form: 8,
    injuries: 'None known'
  },
  context: {
    competition: 'League Match',
    neutralVenue: false,
    homeAdvantage: 45,
    confidence: 'medium'
  },
  note: 'Sample data ready for demo use.'
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function injuryScore(text = '') {
  if (!text || /none known/i.test(text)) return 0
  const numbers = text.match(/\d+/g)
  if (numbers?.length) return Math.min(15, Number(numbers[0]))
  return 3
}

function toStats(matchData) {
  return {
    eloHome: matchData.home.elo,
    eloAway: matchData.away.elo,
    homeAdvantage: matchData.context.homeAdvantage,
    neutralVenue: matchData.context.neutralVenue,
    homeGoalsAvg: matchData.home.goalsFor,
    awayGoalsAvg: matchData.away.goalsFor,
    homeGoalsAllowedAvg: matchData.home.goalsAgainst,
    awayGoalsAllowedAvg: matchData.away.goalsAgainst,
    recentFormHome: matchData.home.form,
    recentFormAway: matchData.away.form,
    injuryHome: injuryScore(matchData.home.injuries),
    injuryAway: injuryScore(matchData.away.injuries),
  }
}

function App() {
  const [activeTab, setActiveTab] = useState('Forecast')
  const [homeInput, setHomeInput] = useState('Manchester United')
  const [awayInput, setAwayInput] = useState('Liverpool')
  const [neutralVenue, setNeutralVenue] = useState(false)
  const [matchData, setMatchData] = useState(sampleMatchData)
  const [baseStats, setBaseStats] = useState(toStats(sampleMatchData))
  const [adjustedStats, setAdjustedStats] = useState(toStats(sampleMatchData))
  const [model, setModel] = useState(runModel(toStats(sampleMatchData)))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [insight, setInsight] = useState('')
  const [insightLoading, setInsightLoading] = useState(false)

  useEffect(() => {
    setAdjustedStats(baseStats)
  }, [baseStats])

  useEffect(() => {
    setModel(runModel(adjustedStats))
  }, [adjustedStats])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!homeInput.trim() || !awayInput.trim()) return

    setLoading(true)
    setError('')
    setInsight('')

    try {
      const data = await fetchTeamStats(homeInput.trim(), awayInput.trim(), neutralVenue)
      const stats = toStats(data)
      setMatchData(data)
      setBaseStats(stats)
      setAdjustedStats(stats)
      setModel(runModel(stats))
    } catch (err) {
      console.error(err)
      setError('Unable to fetch live team data right now. Showing the sample forecast instead.')
      const stats = toStats(sampleMatchData)
      setMatchData(sampleMatchData)
      setBaseStats(stats)
      setAdjustedStats(stats)
      setModel(runModel(stats))
    } finally {
      setLoading(false)
    }
  }

  const updateAdjusted = (key, value) => {
    setAdjustedStats(prev => ({
      ...prev,
      [key]: Number(value),
    }))
  }

  const handleInsight = async () => {
    if (!matchData) return
    setInsightLoading(true)
    try {
      const text = await fetchMatchInsight(matchData, model)
      setInsight(text)
    } catch (err) {
      console.error(err)
      setInsight('AI insight unavailable right now.')
    } finally {
      setInsightLoading(false)
    }
  }

  const probabilityCards = useMemo(() => [
    {
      label: 'Home Win',
      value: `${model.homeWin}%`,
      color: 'text-teal-400',
      accent: 'from-teal-400/20 to-transparent'
    },
    {
      label: 'Draw',
      value: `${model.draw}%`,
      color: 'text-violet-400',
      accent: 'from-violet-400/20 to-transparent'
    },
    {
      label: 'Away Win',
      value: `${model.awayWin}%`,
      color: 'text-rose-400',
      accent: 'from-rose-400/20 to-transparent'
    },
  ], [model])

  return (
    <div className="min-h-screen bg-pitch-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.45em] text-teal-400">Probability Cup</p>
            <h1 className="mt-1 text-3xl font-semibold">Soccer Forecaster</h1>
          </div>
          <button
            onClick={handleInsight}
            disabled={insightLoading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-teal-400/30 bg-teal-400/10 px-4 py-2.5 text-sm font-medium text-teal-300 transition hover:bg-teal-400/15"
          >
            <Brain className="h-4 w-4" />
            {insightLoading ? 'Thinking…' : 'AI insight'}
          </button>
        </header>

        <section className="rounded-3xl border border-pitch-600 bg-gradient-to-br from-pitch-900 via-pitch-800 to-pitch-900 p-5 shadow-2xl shadow-black/20">
          <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-[1.1fr_1.1fr_auto_auto]">
            <label className="block">
              <span className="mb-1 block text-xs uppercase tracking-[0.3em] text-pitch-400">Home</span>
              <input
                value={homeInput}
                onChange={(e) => setHomeInput(e.target.value)}
                className="w-full rounded-xl border border-pitch-600 bg-pitch-900 px-4 py-3 text-sm outline-none transition focus:border-teal-400"
                placeholder="Home team"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs uppercase tracking-[0.3em] text-pitch-400">Away</span>
              <input
                value={awayInput}
                onChange={(e) => setAwayInput(e.target.value)}
                className="w-full rounded-xl border border-pitch-600 bg-pitch-900 px-4 py-3 text-sm outline-none transition focus:border-teal-400"
                placeholder="Away team"
              />
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-pitch-600 bg-pitch-900 px-4 py-3 text-sm">
              <input
                type="checkbox"
                checked={neutralVenue}
                onChange={(e) => setNeutralVenue(e.target.checked)}
                className="h-4 w-4 rounded border-pitch-500 bg-pitch-800 text-teal-400"
              />
              Neutral venue
            </label>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-400 px-5 py-3 text-sm font-semibold text-pitch-950 transition hover:bg-teal-500"
            >
              <Search className="h-4 w-4" />
              {loading ? 'Loading…' : 'Run forecast'}
            </button>
          </form>
        </section>

        {error && (
          <div className="mt-4 rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200">
            {error}
          </div>
        )}

        <div className="mt-5 flex gap-2 rounded-2xl border border-pitch-600 bg-pitch-900 p-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                activeTab === tab ? 'bg-teal-400 text-pitch-950' : 'text-slate-300 hover:bg-pitch-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'Forecast' && (
          <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-3xl border border-pitch-600 bg-pitch-900 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-pitch-400">Forecast</p>
                  <h2 className="mt-2 text-2xl font-semibold">{matchData.home.name} vs {matchData.away.name}</h2>
                </div>
                <span className="rounded-full bg-pitch-800 px-3 py-1 text-xs text-pitch-400">{matchData.context.competition}</span>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {probabilityCards.map((card) => (
                  <div key={card.label} className={`rounded-2xl border border-pitch-600 bg-gradient-to-br ${card.accent} p-4`}>
                    <p className="text-xs uppercase tracking-[0.3em] text-pitch-400">{card.label}</p>
                    <p className={`mt-2 font-mono text-3xl font-bold ${card.color}`}>{card.value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-pitch-600 bg-pitch-800 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-pitch-400">Model output</p>
                  <div className="mt-4 space-y-3">
                    <ProbBar label="Home Win" value={model.homeWin} colorClass="text-teal-400" />
                    <ProbBar label="Draw" value={model.draw} colorClass="text-violet-400" />
                    <ProbBar label="Away Win" value={model.awayWin} colorClass="text-rose-400" />
                  </div>
                </div>
                <div className="rounded-2xl border border-pitch-600 bg-pitch-800 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-pitch-400">Key metrics</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <StatCard label="xG Home" value={`${model.xgHome}`} accent="text-teal-400" />
                    <StatCard label="xG Away" value={`${model.xgAway}`} accent="text-rose-400" />
                    <StatCard label="Best score" value={model.bestScore} accent="text-violet-400" sub={`${model.bestScoreP}%`} />
                    <StatCard label="Over 2.5" value={`${model.over25}%`} accent="text-amber-400" />
                  </div>
                </div>
              </div>
            </section>

            <aside className="space-y-5">
              <section className="rounded-3xl border border-pitch-600 bg-pitch-900 p-6">
                <div className="flex items-center gap-2 text-sm text-pitch-400">
                  <ShieldAlert className="h-4 w-4" />
                  Match context
                </div>
                <div className="mt-4 space-y-3">
                  <StatCard label="Venue" value={matchData.context.neutralVenue ? 'Neutral' : 'Home'} accent="text-slate-200" />
                  <StatCard label="Home adv." value={`${matchData.context.homeAdvantage}`} accent="text-teal-400" />
                  <StatCard label="Confidence" value={matchData.context.confidence} accent="text-violet-400" />
                </div>
              </section>

              <section className="rounded-3xl border border-pitch-600 bg-pitch-900 p-6">
                <div className="flex items-center gap-2 text-sm text-pitch-400">
                  <TrendingUp className="h-4 w-4" />
                  Team snapshot
                </div>
                <div className="mt-4 grid gap-3">
                  <StatCard label="Home Elo" value={matchData.home.elo} accent="text-teal-400" sub={matchData.home.injuries} />
                  <StatCard label="Away Elo" value={matchData.away.elo} accent="text-rose-400" sub={matchData.away.injuries} />
                  <StatCard label="Form" value={`${matchData.home.form} / ${matchData.away.form}`} accent="text-violet-400" sub="points from last 5" />
                </div>
              </section>
            </aside>
          </div>
        )}

        {activeTab === 'Adjust' && (
          <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_1.3fr]">
            <section className="rounded-3xl border border-pitch-600 bg-pitch-900 p-6">
              <div className="flex items-center gap-2 text-sm text-pitch-400">
                <BarChart3 className="h-4 w-4" />
                Adjust inputs
              </div>
              <div className="mt-4 space-y-4">
                {[
                  ['eloHome', 'Home Elo'],
                  ['eloAway', 'Away Elo'],
                  ['homeAdvantage', 'Home advantage'],
                  ['homeGoalsAvg', 'Home GF avg'],
                  ['awayGoalsAvg', 'Away GF avg'],
                  ['homeGoalsAllowedAvg', 'Home GA avg'],
                  ['awayGoalsAllowedAvg', 'Away GA avg'],
                  ['recentFormHome', 'Home form'],
                  ['recentFormAway', 'Away form'],
                  ['injuryHome', 'Home injuries'],
                  ['injuryAway', 'Away injuries'],
                ].map(([key, label]) => (
                  <label key={key} className="block">
                    <span className="mb-1 block text-xs uppercase tracking-[0.25em] text-pitch-400">{label}</span>
                    <input
                      type="number"
                      step={key.includes('injury') ? 1 : 0.1}
                      value={adjustedStats[key]}
                      onChange={(e) => updateAdjusted(key, e.target.value)}
                      className="w-full rounded-xl border border-pitch-600 bg-pitch-800 px-3 py-2.5 text-sm outline-none transition focus:border-teal-400"
                    />
                  </label>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-pitch-600 bg-pitch-900 p-6">
              <div className="flex items-center gap-2 text-sm text-pitch-400">
                <Sparkles className="h-4 w-4" />
                Live recalculation
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {probabilityCards.map((card) => (
                  <div key={card.label} className={`rounded-2xl border border-pitch-600 bg-gradient-to-br ${card.accent} p-4`}>
                    <p className="text-xs uppercase tracking-[0.3em] text-pitch-400">{card.label}</p>
                    <p className={`mt-2 font-mono text-3xl font-bold ${card.color}`}>{card.value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-pitch-600 bg-pitch-800 p-5">
                  <p className="text-xs uppercase tracking-[0.3em] text-pitch-400">Expected goals</p>
                  <div className="mt-3 flex items-end justify-between">
                    <div>
                      <p className="text-xs text-pitch-500">Home</p>
                      <p className="font-mono text-3xl font-semibold text-teal-400">{model.xgHome}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-pitch-500" />
                    <div>
                      <p className="text-xs text-pitch-500">Away</p>
                      <p className="font-mono text-3xl font-semibold text-rose-400">{model.xgAway}</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-pitch-600 bg-pitch-800 p-5">
                  <p className="text-xs uppercase tracking-[0.3em] text-pitch-400">Score matrix</p>
                  <Heatmap matrix={model.matrix} homeTeam={matchData.home.name} awayTeam={matchData.away.name} />
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'Brier Calc' && (
          <div className="mt-5 max-w-4xl">
            <BrierCalc defaultPred={model.homeWin} />
          </div>
        )}

        {insight && (
          <section className="mt-5 rounded-3xl border border-pitch-600 bg-pitch-900 p-6">
            <div className="flex items-center gap-2 text-sm text-pitch-400">
              <Info className="h-4 w-4" />
              AI insight
            </div>
            <div className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-300">{insight}</div>
          </section>
        )}
      </div>
    </div>
  )
}

export default App
