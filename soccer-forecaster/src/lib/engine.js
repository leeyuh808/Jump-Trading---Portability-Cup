function eloProbability(ratingA, ratingB) {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400))
}

function poissonPMF(lambda, k) {
  if (lambda <= 0) return k === 0 ? 1 : 0
  let logP = k * Math.log(lambda) - lambda
  for (let i = 1; i <= k; i++) logP -= Math.log(i)
  return Math.exp(logP)
}

function dixonColesCorrection(i, j, mu, nu, rho) {
  if (i === 0 && j === 0) return 1 - mu * nu * rho
  if (i === 0 && j === 1) return 1 + mu * rho
  if (i === 1 && j === 0) return 1 + nu * rho
  if (i === 1 && j === 1) return 1 - rho
  return 1
}

function buildScoreMatrix(lambdaHome, lambdaAway, maxGoals = 9, rho = 0.1) {
  const mat = []
  for (let i = 0; i <= maxGoals; i++) {
    mat[i] = []
    for (let j = 0; j <= maxGoals; j++) {
      const dc = dixonColesCorrection(i, j, lambdaHome, lambdaAway, rho)
      mat[i][j] = poissonPMF(lambdaHome, i) * poissonPMF(lambdaAway, j) * dc
    }
  }
  let total = 0
  for (let i = 0; i <= maxGoals; i++)
    for (let j = 0; j <= maxGoals; j++) total += mat[i][j]
  for (let i = 0; i <= maxGoals; i++)
    for (let j = 0; j <= maxGoals; j++) mat[i][j] /= total
  return mat
}

export function runModel(stats) {
  const {
    eloHome, eloAway, homeAdvantage, neutralVenue,
    homeGoalsAvg, awayGoalsAvg,
    homeGoalsAllowedAvg, awayGoalsAllowedAvg,
    recentFormHome, recentFormAway,
    injuryHome, injuryAway,
  } = stats

  const eloBonus   = neutralVenue ? 0 : homeAdvantage
  const adjEloHome = eloHome + eloBonus
  const leagueAvg  = (homeGoalsAvg + awayGoalsAvg) / 2

  let lH = (homeGoalsAvg / leagueAvg) * (awayGoalsAllowedAvg / leagueAvg) * leagueAvg * (neutralVenue ? 1 : 1.15)
  let lA = (awayGoalsAvg / leagueAvg) * (homeGoalsAllowedAvg / leagueAvg) * leagueAvg

  const eloFactor = eloProbability(adjEloHome, eloAway) / 0.5
  lH *= Math.pow(eloFactor, 0.4)
  lA *= Math.pow(1 / eloFactor, 0.4)

  lH *= 1 + (recentFormHome - 7.5) * 0.012
  lA *= 1 + (recentFormAway - 7.5) * 0.012
  lH *= 1 - injuryHome / 100
  lA *= 1 - injuryAway / 100
  lH = Math.max(0.2, lH)
  lA = Math.max(0.2, lA)

  const mat  = buildScoreMatrix(lH, lA)
  const maxG = mat.length - 1

  let pH = 0, pD = 0, pA = 0
  for (let i = 0; i <= maxG; i++)
    for (let j = 0; j <= maxG; j++) {
      if (i > j) pH += mat[i][j]
      else if (i === j) pD += mat[i][j]
      else pA += mat[i][j]
    }

  let bestScore = '', bestP = 0
  for (let i = 0; i <= maxG; i++)
    for (let j = 0; j <= maxG; j++)
      if (mat[i][j] > bestP) { bestP = mat[i][j]; bestScore = `${i}–${j}` }

  let pOver = 0, pBTTS = 0
  for (let i = 0; i <= maxG; i++)
    for (let j = 0; j <= maxG; j++) {
      if (i + j > 2) pOver += mat[i][j]
      if (i >= 1 && j >= 1) pBTTS += mat[i][j]
    }

  return {
    homeWin:    +(pH  * 100).toFixed(1),
    draw:       +(pD  * 100).toFixed(1),
    awayWin:    +(pA  * 100).toFixed(1),
    xgHome:     +lH.toFixed(2),
    xgAway:     +lA.toFixed(2),
    bestScore,
    bestScoreP: +(bestP * 100).toFixed(1),
    over25:     +(pOver * 100).toFixed(1),
    btts:       +(pBTTS * 100).toFixed(1),
    matrix:     mat,
  }
}

export function brierScore(predicted, outcome) {
  return +Math.pow(predicted / 100 - outcome, 2).toFixed(4)
}

export function relativePoints(yourBrier, fieldBrier, multiplier = 1) {
  return +((fieldBrier - yourBrier) * 100 * multiplier).toFixed(1)
}
