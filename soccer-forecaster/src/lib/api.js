async function callClaude(system, userMessage) {
  const res = await fetch('/api/anthropic', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system,
      messages: [{ role: 'user', content: userMessage }],
    }),
  })
  const data = await res.json()
  return data.content?.find(b => b.type === 'text')?.text || ''
}

export async function fetchTeamStats(homeTeam, awayTeam, neutralVenue) {
  const system = `You are a football data API. Return ONLY valid JSON, no markdown, no explanation.`

  const prompt = `Return current statistics for a match between "${homeTeam}" (home) and "${awayTeam}" (away).

Output exactly this JSON shape:
{
  "home": {
    "name": string,
    "elo": number (800–2100),
    "goalsFor": number (avg per game last 10),
    "goalsAgainst": number (avg per game last 10),
    "form": number (0–15, points from last 5 matches),
    "injuries": string (key absences or "None known")
  },
  "away": {
    "name": string,
    "elo": number,
    "goalsFor": number,
    "goalsAgainst": number,
    "form": number,
    "injuries": string
  },
  "context": {
    "competition": string,
    "neutralVenue": ${neutralVenue},
    "homeAdvantage": number (recommended Elo bonus 0–100),
    "confidence": "high" | "medium" | "low"
  },
  "note": string (one sentence on data recency)
}`

  const raw   = await callClaude(system, prompt)
  const clean = raw.replace(/```json|```/g, '').trim()
  return JSON.parse(clean)
}

export async function fetchMatchInsight(matchData, modelResult) {
  const system = `You are a quantitative soccer analyst specialising in Brier-scored forecasting competitions. Be concise and specific.`

  const prompt = `Match: ${matchData.home.name} vs ${matchData.away.name}
Competition: ${matchData.context.competition}
Data confidence: ${matchData.context.confidence}

MODEL OUTPUT:
Home Win ${modelResult.homeWin}% | Draw ${modelResult.draw}% | Away Win ${modelResult.awayWin}%
xG: Home ${modelResult.xgHome} / Away ${modelResult.xgAway}
Most likely score: ${modelResult.bestScore} (${modelResult.bestScoreP}%)
Over 2.5: ${modelResult.over25}% | BTTS: ${modelResult.btts}%
Home injuries: ${matchData.home.injuries}
Away injuries: ${matchData.away.injuries}

Give exactly 4 labelled bullets:
- SUBMIT: Exact probabilities to submit for Home Win / Draw / Away Win. Never exceed 92% even if very confident.
- EDGE: Where this model has an advantage or where the crowd is likely wrong.
- RISK: The single biggest factor that could invalidate this forecast.
- BRIER TIP: One specific calibration adjustment for this exact matchup.`

  return callClaude(system, prompt)
}
