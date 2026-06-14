import { useState, useCallback } from "react";

// ─── Elo + Poisson + Dixon-Coles hybrid forecaster ───────────────────────────

const DEFAULT_ELO = 1500;
const K = 32;

// Convert Elo difference to win probability
function eloProbability(ratingA, ratingB) {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

// Poisson PMF
function poissonPMF(lambda, k) {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  let logP = k * Math.log(lambda) - lambda;
  for (let i = 1; i <= k; i++) logP -= Math.log(i);
  return Math.exp(logP);
}

// Dixon-Coles low-score correction
function dixonColesRho(i, j, mu, nu, rho) {
  if (i === 0 && j === 0) return 1 - mu * nu * rho;
  if (i === 0 && j === 1) return 1 + mu * rho;
  if (i === 1 && j === 0) return 1 + nu * rho;
  if (i === 1 && j === 1) return 1 - rho;
  return 1;
}

// Compute score distribution up to maxGoals
function scoreMatrix(lambdaHome, lambdaAway, maxGoals = 8, rho = 0.1) {
  const matrix = [];
  for (let i = 0; i <= maxGoals; i++) {
    matrix[i] = [];
    for (let j = 0; j <= maxGoals; j++) {
      const dc = dixonColesRho(i, j, lambdaHome, lambdaAway, rho);
      matrix[i][j] = poissonPMF(lambdaHome, i) * poissonPMF(lambdaAway, j) * dc;
    }
  }
  // Normalize
  let total = 0;
  for (let i = 0; i <= maxGoals; i++)
    for (let j = 0; j <= maxGoals; j++) total += matrix[i][j];
  for (let i = 0; i <= maxGoals; i++)
    for (let j = 0; j <= maxGoals; j++) matrix[i][j] /= total;
  return matrix;
}

function computeProbabilities(params) {
  const {
    eloHome, eloAway,
    homeGoalsAvg, awayGoalsAvg,
    homeGoalsAllowedAvg, awayGoalsAllowedAvg,
    homeAdvantage, neutralVenue,
    recentFormHome, recentFormAway,
    injuryPenaltyHome, injuryPenaltyAway,
  } = params;

  // Adjust Elo for home advantage
  const haBonus = neutralVenue ? 0 : homeAdvantage;
  const adjEloHome = eloHome + haBonus;

  // Base Poisson lambdas: geometric mean of attack vs defence
  const leagueAvg = (homeGoalsAvg + awayGoalsAvg) / 2;
  const homeAttack = homeGoalsAvg / leagueAvg;
  const awayAttack = awayGoalsAvg / leagueAvg;
  const homeDefence = homeGoalsAllowedAvg / leagueAvg;
  const awayDefence = awayGoalsAllowedAvg / leagueAvg;

  let lambdaHome = homeAttack * awayDefence * leagueAvg * (neutralVenue ? 1 : 1.15);
  let lambdaAway = awayAttack * homeDefence * leagueAvg;

  // Elo adjustment: scale lambdas toward Elo-implied ratio
  const eloPWin = eloProbability(adjEloHome, eloAway);
  const eloFactor = eloPWin / 0.5; // relative to neutral
  lambdaHome *= Math.pow(eloFactor, 0.4);
  lambdaAway *= Math.pow(1 / eloFactor, 0.4);

  // Form adjustment (recent 5 matches, 0–15 pts each)
  lambdaHome *= 1 + (recentFormHome - 7.5) * 0.012;
  lambdaAway *= 1 + (recentFormAway - 7.5) * 0.012;

  // Injury penalty
  lambdaHome *= 1 - injuryPenaltyHome / 100;
  lambdaAway *= 1 - injuryPenaltyAway / 100;

  lambdaHome = Math.max(0.2, lambdaHome);
  lambdaAway = Math.max(0.2, lambdaAway);

  const mat = scoreMatrix(lambdaHome, lambdaAway);
  const maxG = mat.length - 1;

  let pHome = 0, pDraw = 0, pAway = 0;
  for (let i = 0; i <= maxG; i++)
    for (let j = 0; j <= maxG; j++) {
      if (i > j) pHome += mat[i][j];
      else if (i === j) pDraw += mat[i][j];
      else pAway += mat[i][j];
    }

  // Most likely scoreline
  let bestScore = "", bestP = 0;
  for (let i = 0; i <= maxG; i++)
    for (let j = 0; j <= maxG; j++)
      if (mat[i][j] > bestP) { bestP = mat[i][j]; bestScore = `${i}–${j}`; }

  // Over/Under 2.5
  let pOver = 0;
  for (let i = 0; i <= maxG; i++)
    for (let j = 0; j <= maxG; j++)
      if (i + j > 2) pOver += mat[i][j];

  // BTTS
  let pBTTS = 0;
  for (let i = 1; i <= maxG; i++)
    for (let j = 1; j <= maxG; j++)
      pBTTS += mat[i][j];

  return {
    pHome: +(pHome * 100).toFixed(1),
    pDraw: +(pDraw * 100).toFixed(1),
    pAway: +(pAway * 100).toFixed(1),
    lambdaHome: +lambdaHome.toFixed(2),
    lambdaAway: +lambdaAway.toFixed(2),
    mostLikelyScore: bestScore,
    mostLikelyScoreP: +(bestP * 100).toFixed(1),
    pOver25: +(pOver * 100).toFixed(1),
    pBTTS: +(pBTTS * 100).toFixed(1),
    matrix: mat,
  };
}

// ─── UI Components ────────────────────────────────────────────────────────────

const FIELD_GROUPS = [
  {
    label: "Team Ratings",
    fields: [
      { key: "homeTeam", label: "Home Team Name", type: "text", default: "Team A" },
      { key: "awayTeam", label: "Away Team Name", type: "text", default: "Team B" },
      { key: "eloHome", label: "Home Elo Rating", type: "number", min: 800, max: 2200, default: 1550, tip: "World avg ~1500. Top nations: ~1800–2000" },
      { key: "eloAway", label: "Away Elo Rating", type: "number", min: 800, max: 2200, default: 1500 },
    ]
  },
  {
    label: "Scoring Stats (last 10 matches)",
    fields: [
      { key: "homeGoalsAvg", label: "Home Goals Scored / game", type: "number", min: 0, max: 6, step: 0.1, default: 1.6 },
      { key: "awayGoalsAvg", label: "Away Goals Scored / game", type: "number", min: 0, max: 6, step: 0.1, default: 1.3 },
      { key: "homeGoalsAllowedAvg", label: "Home Goals Conceded / game", type: "number", min: 0, max: 6, step: 0.1, default: 1.1 },
      { key: "awayGoalsAllowedAvg", label: "Away Goals Conceded / game", type: "number", min: 0, max: 6, step: 0.1, default: 1.4 },
    ]
  },
  {
    label: "Context",
    fields: [
      { key: "homeAdvantage", label: "Home Elo Advantage (pts)", type: "number", min: 0, max: 200, default: 70, tip: "~70 pts for club football. Neutral venue = 0" },
      { key: "neutralVenue", label: "Neutral Venue?", type: "checkbox", default: false },
      { key: "recentFormHome", label: "Home Recent Form (0–15 pts)", type: "number", min: 0, max: 15, default: 8, tip: "Points from last 5 matches (max 15)" },
      { key: "recentFormAway", label: "Away Recent Form (0–15 pts)", type: "number", min: 0, max: 15, default: 7 },
      { key: "injuryPenaltyHome", label: "Home Injury Impact (%)", type: "number", min: 0, max: 25, default: 0, tip: "% strength reduction from key absences" },
      { key: "injuryPenaltyAway", label: "Away Injury Impact (%)", type: "number", min: 0, max: 25, default: 0 },
    ]
  }
];

const DEFAULT_PARAMS = {};
FIELD_GROUPS.forEach(g => g.fields.forEach(f => { DEFAULT_PARAMS[f.key] = f.default; }));

function ProbBar({ label, value, color }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#c8d6e5" }}>{label}</span>
        <span style={{ fontSize: 15, fontWeight: 800, color }}>{value}%</span>
      </div>
      <div style={{ height: 8, background: "#1a2535", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${value}%`, background: color, borderRadius: 4, transition: "width 0.5s ease" }} />
      </div>
    </div>
  );
}

function HeatmapCell({ value, max }) {
  const intensity = max > 0 ? value / max : 0;
  const bg = `rgba(0,210,180,${intensity * 0.85 + 0.04})`;
  return (
    <td style={{
      width: 32, height: 28, textAlign: "center", fontSize: 9.5, fontWeight: 600,
      background: bg, color: intensity > 0.5 ? "#000" : "#8ecfca", border: "1px solid #0e1e2e",
      cursor: "default"
    }} title={`${(value * 100).toFixed(1)}%`}>
      {value > 0.005 ? (value * 100).toFixed(1) : ""}
    </td>
  );
}

export default function SoccerForecaster() {
  const [params, setParams] = useState(DEFAULT_PARAMS);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [aiInsight, setAiInsight] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const set = (key, val) => setParams(p => ({ ...p, [key]: val }));

  const compute = useCallback(() => {
    setLoading(true);
    setResult(null);
    setAiInsight("");
    setTimeout(() => {
      const r = computeProbabilities(params);
      setResult(r);
      setLoading(false);
    }, 200);
  }, [params]);

  const fetchAiInsight = async (r) => {
    setAiLoading(true);
    try {
      const prompt = `You are a quantitative soccer analyst. Given these match probability forecasts, provide a sharp 3-bullet strategic insight for a forecasting competition (Jump Trading Probability Cup). Be specific and cite the numbers.

Match: ${params.homeTeam} vs ${params.awayTeam}
Home Win: ${r.pHome}%, Draw: ${r.pDraw}%, Away Win: ${r.pAway}%
Expected Goals: Home ${r.lambdaHome}, Away ${r.lambdaAway}
Most Likely Score: ${r.mostLikelyScore} (${r.mostLikelyScoreP}%)
Over 2.5 Goals: ${r.pOver25}%
Both Teams to Score: ${r.pBTTS}%
Home Elo: ${params.eloHome}, Away Elo: ${params.eloAway}
Home Form: ${params.recentFormHome}/15, Away Form: ${params.recentFormAway}/15
Injuries: Home ${params.injuryPenaltyHome}%, Away ${params.injuryPenaltyAway}%

Give 3 concise bullets on: (1) where the edge/value in this forecast is, (2) key uncertainty drivers, (3) how to express this probabilistically in a competition context.`;

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }]
        })
      });
      const data = await res.json();
      const text = data.content?.find(b => b.type === "text")?.text || "";
      setAiInsight(text);
    } catch (e) {
      setAiInsight("Could not load AI insight. Check your connection.");
    }
    setAiLoading(false);
  };

  const maxCell = result ? Math.max(...result.matrix.flat()) : 1;

  const inputStyle = {
    width: "100%", padding: "7px 10px", background: "#0e1e2e",
    border: "1px solid #1e3a5a", borderRadius: 6, color: "#e0eaf5",
    fontSize: 13, outline: "none", boxSizing: "border-box"
  };

  return (
    <div style={{
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      background: "#070f1a", minHeight: "100vh", color: "#e0eaf5", padding: "0 0 48px"
    }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #0a1628 0%, #0d2040 50%, #071525 100%)",
        borderBottom: "1px solid #1a3050", padding: "28px 32px 22px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: "linear-gradient(135deg, #00d2b4, #0090ff)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18
          }}>⚽</div>
          <div>
            <div style={{ fontSize: 11, color: "#00d2b4", fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>
              Probability Cup Toolkit
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: -0.5 }}>
              Soccer Match Forecaster
            </div>
          </div>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: "#6a8faf", maxWidth: 560 }}>
          Elo + Poisson + Dixon-Coles hybrid model. Input team stats to generate calibrated win/draw/loss probabilities and scoreline distributions for the Jump Trading Probability Cup.
        </p>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 20px", display: "grid", gridTemplateColumns: "360px 1fr", gap: 24, alignItems: "start" }}>

        {/* Left: Inputs */}
        <div>
          {FIELD_GROUPS.map(group => (
            <div key={group.label} style={{
              background: "#0b1929", border: "1px solid #1a3050",
              borderRadius: 12, padding: "18px 18px 14px", marginBottom: 16
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#00d2b4", letterSpacing: 2, textTransform: "uppercase", marginBottom: 14 }}>
                {group.label}
              </div>
              {group.fields.map(f => (
                <div key={f.key} style={{ marginBottom: 13 }}>
                  <label style={{ fontSize: 12, color: "#6a8faf", display: "block", marginBottom: 4 }}>
                    {f.label}
                    {f.tip && <span style={{ color: "#2a5a7a", marginLeft: 6 }}>ℹ</span>}
                  </label>
                  {f.tip && (
                    <div style={{ fontSize: 10, color: "#2a6a8a", marginBottom: 4 }}>{f.tip}</div>
                  )}
                  {f.type === "checkbox" ? (
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={params[f.key]}
                        onChange={e => set(f.key, e.target.checked)}
                        style={{ accentColor: "#00d2b4", width: 16, height: 16 }}
                      />
                      <span style={{ fontSize: 12, color: "#8ab" }}>{params[f.key] ? "Yes" : "No"}</span>
                    </label>
                  ) : f.type === "text" ? (
                    <input
                      type="text"
                      value={params[f.key]}
                      onChange={e => set(f.key, e.target.value)}
                      style={inputStyle}
                    />
                  ) : (
                    <input
                      type="number"
                      value={params[f.key]}
                      min={f.min} max={f.max} step={f.step || 1}
                      onChange={e => set(f.key, parseFloat(e.target.value) || 0)}
                      style={inputStyle}
                    />
                  )}
                </div>
              ))}
            </div>
          ))}

          <button
            onClick={compute}
            disabled={loading}
            style={{
              width: "100%", padding: "13px", borderRadius: 10, border: "none",
              background: loading ? "#1a3050" : "linear-gradient(135deg, #00d2b4, #0090ff)",
              color: "#000", fontWeight: 800, fontSize: 15, cursor: loading ? "not-allowed" : "pointer",
              letterSpacing: 0.5, transition: "opacity 0.2s"
            }}
          >
            {loading ? "Computing…" : "Generate Forecast"}
          </button>
        </div>

        {/* Right: Results */}
        <div>
          {!result && !loading && (
            <div style={{
              background: "#0b1929", border: "1px solid #1a3050", borderRadius: 12,
              padding: "48px 24px", textAlign: "center", color: "#2a5a7a"
            }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>Enter match parameters and click Generate Forecast</div>
              <div style={{ fontSize: 12, marginTop: 8 }}>
                The model uses Poisson regression with Elo weighting and Dixon-Coles score correction
              </div>
            </div>
          )}

          {result && (
            <>
              {/* Match header */}
              <div style={{
                background: "#0b1929", border: "1px solid #1a3050", borderRadius: 12, padding: "18px 22px", marginBottom: 16
              }}>
                <div style={{ fontSize: 12, color: "#00d2b4", fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>
                  Match Forecast
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                  <div style={{ textAlign: "center", flex: 1 }}>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>{params.homeTeam}</div>
                    <div style={{ fontSize: 11, color: "#6a8faf" }}>Elo {params.eloHome} · xG {result.lambdaHome}</div>
                  </div>
                  <div style={{ fontSize: 13, color: "#2a5a7a", fontWeight: 700 }}>vs</div>
                  <div style={{ textAlign: "center", flex: 1 }}>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>{params.awayTeam}</div>
                    <div style={{ fontSize: 11, color: "#6a8faf" }}>Elo {params.eloAway} · xG {result.lambdaAway}</div>
                  </div>
                </div>

                <ProbBar label={`${params.homeTeam} Win`} value={result.pHome} color="#00d2b4" />
                <ProbBar label="Draw" value={result.pDraw} color="#f0a500" />
                <ProbBar label={`${params.awayTeam} Win`} value={result.pAway} color="#e05a8a" />
              </div>

              {/* Key metrics */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
                {[
                  { label: "Most Likely Score", value: result.mostLikelyScore, sub: `${result.mostLikelyScoreP}% probability`, color: "#00d2b4" },
                  { label: "Over 2.5 Goals", value: `${result.pOver25}%`, sub: `Under: ${(100 - result.pOver25).toFixed(1)}%`, color: "#9b7fe8" },
                  { label: "Both Teams Score", value: `${result.pBTTS}%`, sub: `No BTTS: ${(100 - result.pBTTS).toFixed(1)}%`, color: "#f0a500" },
                ].map(m => (
                  <div key={m.label} style={{
                    background: "#0b1929", border: "1px solid #1a3050", borderRadius: 10, padding: "14px 16px"
                  }}>
                    <div style={{ fontSize: 10, color: "#6a8faf", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{m.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: m.color }}>{m.value}</div>
                    <div style={{ fontSize: 11, color: "#2a5a7a", marginTop: 3 }}>{m.sub}</div>
                  </div>
                ))}
              </div>

              {/* Heatmap */}
              <div style={{
                background: "#0b1929", border: "1px solid #1a3050", borderRadius: 12, padding: "16px 18px", marginBottom: 16, overflowX: "auto"
              }}>
                <div style={{ fontSize: 11, color: "#00d2b4", fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>
                  Scoreline Probability Heatmap (%)
                </div>
                <div style={{ fontSize: 10, color: "#2a5a7a", marginBottom: 8 }}>
                  Rows = {params.homeTeam} goals · Columns = {params.awayTeam} goals
                </div>
                <table style={{ borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <td style={{ width: 28, fontSize: 9, color: "#2a5a7a" }}></td>
                      {Array.from({ length: 7 }, (_, j) => (
                        <td key={j} style={{ width: 32, textAlign: "center", fontSize: 10, color: "#2a5a7a", paddingBottom: 4 }}>{j}</td>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 7 }, (_, i) => (
                      <tr key={i}>
                        <td style={{ fontSize: 10, color: "#2a5a7a", paddingRight: 4, textAlign: "right" }}>{i}</td>
                        {Array.from({ length: 7 }, (_, j) => (
                          <HeatmapCell key={j} value={result.matrix[i]?.[j] || 0} max={maxCell} />
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Competition tip */}
              <div style={{
                background: "#0b1929", border: "1px solid #1a3050", borderRadius: 12, padding: "16px 18px", marginBottom: 16
              }}>
                <div style={{ fontSize: 11, color: "#00d2b4", fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>
                  Competition Strategy Notes
                </div>
                <div style={{ fontSize: 12, color: "#8ab4cc", lineHeight: 1.7 }}>
                  <p style={{ margin: "0 0 8px" }}>
                    <strong style={{ color: "#e0eaf5" }}>Calibration over confidence:</strong> In Brier-scored competitions, a forecast of 55% that's correct beats an overconfident 90% that loses. Express genuine uncertainty.
                  </p>
                  <p style={{ margin: "0 0 8px" }}>
                    <strong style={{ color: "#e0eaf5" }}>Update with new info:</strong> Re-run this model when team news drops (injuries, lineup leaks). Adjust the injury penalty sliders accordingly.
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong style={{ color: "#e0eaf5" }}>Model edges:</strong> This model tends to underfit upsets in knockout rounds — weight draw probabilities slightly higher in tight Elo matchups (&lt;50 pts gap).
                  </p>
                </div>

                <button
                  onClick={() => fetchAiInsight(result)}
                  disabled={aiLoading}
                  style={{
                    marginTop: 14, padding: "9px 18px", borderRadius: 8, border: "1px solid #00d2b4",
                    background: "transparent", color: "#00d2b4", fontWeight: 700, fontSize: 12,
                    cursor: aiLoading ? "not-allowed" : "pointer", opacity: aiLoading ? 0.6 : 1
                  }}
                >
                  {aiLoading ? "Analyzing…" : "✦ Get AI Strategic Insight"}
                </button>

                {aiInsight && (
                  <div style={{
                    marginTop: 14, padding: "14px 16px", background: "#071525",
                    border: "1px solid #1a4060", borderRadius: 8, fontSize: 12.5,
                    color: "#c0d8ee", lineHeight: 1.75, whiteSpace: "pre-wrap"
                  }}>
                    {aiInsight}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
