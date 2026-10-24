# Probability Cup | Soccer Forecaster

A soccer match forecasting dashboard built for the Jump Trading Portability Cup. Enter two teams, explore a model-driven match forecast, adjust the assumptions yourself, and compare a prediction with the Brier score.

The project combines a small, explainable probability model with an interactive React interface and an optional AI-assisted data and analysis flow. It is a forecasting prototype, not betting advice or a verified source of live sports data.

## What It Does

- Produces home-win, draw, and away-win probabilities, plus expected goals, the most likely score, over-2.5, and both-teams-to-score estimates.
- Displays the model's scoreline distribution as a heatmap.
- Lets you change Elo ratings, goal averages, recent form, home advantage, and injury adjustments, with results recalculated as you edit.
- Includes a Brier score calculator for comparing a binary prediction with an estimated field prediction and a match outcome.
- Can request team statistics and a concise, matchup-specific forecasting insight through the Anthropic API.
- Starts with sample teams and falls back to the sample forecast if a team-data request fails.

## Forecasting Approach

The model in `soccer-forecaster/src/lib/engine.js` is implemented in plain JavaScript:

1. Estimate each team's expected goals from scoring and conceding averages.
2. Adjust expected goals for Elo difference, home advantage, recent form, injuries, and neutral-venue status.
3. Compute independent Poisson score probabilities for scorelines from 0-0 through 9-9, apply a Dixon-Coles correction to low-scoring outcomes, then normalize the matrix.
4. Sum matrix probabilities into match outcomes and secondary metrics such as over 2.5 goals and both teams to score.

This makes the forecast inspectable and responsive to input changes. It is a compact heuristic model, not a trained or backtested predictor; its estimates depend on the quality of its inputs and assumptions.

The Brier calculator scores a single binary event: `score = (prediction - outcome)^2`, where the prediction is a probability from 0 to 1 and the outcome is 0 or 1. It compares that score with the entered field average and applies the selected competition-stage multiplier. It does not calculate a multiclass Brier score for all three match outcomes.

## Technical Skills Demonstrated

- **Frontend engineering:** React component composition, controlled inputs, state-driven views, asynchronous loading and error states, and derived forecast presentation.
- **Probability and domain modeling:** Elo win probability, Poisson probability mass functions, Dixon-Coles low-score adjustment, score-matrix aggregation, and proper scoring rules.
- **Full-stack integration:** A Vite development server, an Express API service, JSON requests, and a server-side Anthropic API call.
- **Data transformation:** Converting team and match context into model inputs, then mapping a score distribution into clear, decision-oriented metrics.
- **Interactive data visualization:** Probability bars, metric summaries, and a scoreline heatmap that responds to edited assumptions.
- **Configuration and tooling:** ES modules, npm scripts, Tailwind CSS, PostCSS, environment-based API configuration, and Vite's development proxy.
- **Product thinking:** Sample data for an immediate demo, fallback behavior for failed data requests, separate forecast and adjustment workflows, and a domain-specific Brier calculator.

## What I Enjoyed About This Project

What made this project enjoyable was the chance to connect the math to something people can actually explore. A change to a team's form or home advantage flows through expected goals into a full scoreline distribution, so the forecast is not just a number on a screen: the user can see how assumptions change the result.

I also enjoyed bringing together several different kinds of engineering in a focused app: probability modeling, interactive visualization, a small backend integration, and practical failure handling. The Brier calculator adds a useful twist by making forecast quality and calibration part of the experience, not only picking a likely winner.

## Tech Stack

| Area | Technology |
| --- | --- |
| UI | React 18 |
| Build and development | Vite 5 |
| Styling | Tailwind CSS 3, PostCSS, Autoprefixer |
| Icons | Lucide React |
| API service | Node.js, Express 4 |
| AI integration | Anthropic Messages API |
| Local configuration | dotenv |

## How It Fits Together

```text
Browser (React + Vite)
	├─ Forecast model and Brier scoring (src/lib/engine.js)
	├─ Team statistics and insight requests (src/lib/api.js)
	└─ /api requests during development
			 └─ Vite proxy → Express on localhost:3001
						└─ Anthropic Messages API
```

The prediction engine runs in the browser and does not require the AI service. The Express service is used for AI-backed team-stat requests and match insights; Vite proxies those requests locally so the client does not need direct access to the API key.

## Run Locally

### Requirements

- Node.js 18 or newer
- npm
- An Anthropic API key for AI-backed team statistics and insights

The sample forecast and local model work without an API key. AI-backed requests require a valid key.

### Install and start

```bash
cd soccer-forecaster
npm install
cp .env.example .env
```

Add your API key to `soccer-forecaster/.env`:

```dotenv
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

Start the Vite frontend and Express API together:

```bash
npm run dev
```

Open the local URL printed by Vite (usually `http://localhost:5173`). The API service listens on `http://localhost:3001`, and Vite forwards `/api` requests to it.

### Production build

```bash
cd soccer-forecaster
npm run build
```

The frontend build is written to `soccer-forecaster/dist/`. The `preview` script serves the built frontend; it does not start the Express API. A deployed version that uses AI features needs the API service running separately and a server or reverse proxy that routes `/api` requests to it.

## Project Layout

```text
soccer-forecaster/
├── server.js                 # Express endpoint for Anthropic requests
├── index.html                # Vite HTML entry point
├── vite.config.js            # React plugin and local API proxy
└── src/
		├── App.jsx               # Main screen, state, and workflows
		├── components/           # Forecast cards, heatmap, Brier calculator
		└── lib/
				├── api.js            # Client-side API request helpers
				└── engine.js         # Forecast model and Brier utilities
```

## Data, Security, and Limitations

- Team statistics are requested from an AI model using a prompt that asks for recent values; this project does not connect to a dedicated, independently verified sports-data provider. Treat returned values as estimates and check them before relying on a forecast.
- The sample match data is demo data. If the statistics request fails, the interface shows the sample forecast and an error message.
- The Poisson matrix is truncated at nine goals per team and renormalized. Model outputs are sensitive to the selected assumptions and are not evidence of predictive accuracy.
- Keep `ANTHROPIC_API_KEY` in the local `.env` file. Do not commit `.env` or expose the key in browser code. If a real API key was committed or shared, revoke it and create a replacement.
- The Express endpoint is a development-oriented API relay. Before exposing it publicly, add request validation, rate limiting, appropriate CORS restrictions, and production-grade error handling.
- Forecasts are for experimentation and education only, not betting or financial advice.

## Available Scripts

Run these commands from `soccer-forecaster/`:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start Vite and the Express API together |
| `npm run build` | Build the frontend for production |
| `npm run preview` | Preview the production frontend build |