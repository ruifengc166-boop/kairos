# KAIROS Timing Engine

Version: v0.1  
Status: Backend-ready MVP algorithm

## Purpose

The Timing Engine turns a user's question moment into a deterministic symbolic timing signal.

It is designed for:

- Quick Timing Check
- future Personal Timing Signal drafts
- consistent social/sample reading language

It does **not** claim to predict fate.

## Why this exists

The first frontend Quick Timing Check was useful for reducing friction, but it was too shallow. If different questions returned the same answer, users could lose trust.

This engine adds the missing rule:

> The time of the question is part of the reading.

When the user asks, KAIROS captures:

- timestamp
- local hour
- timezone
- Eastern double-hour layer
- seasonal rhythm layer
- Western lunar phase layer
- domain
- recent signal
- action
- emotional weather

## Input

```json
{
  "domain": "Love",
  "recentSignal": "They went silent",
  "action": "Text them",
  "feeling": "Urgency",
  "questionTime": "2026-06-30T08:15:00.000Z",
  "timezone": "America/Los_Angeles"
}
```

## Output

```json
{
  "signal": {
    "label": "Wait",
    "timingPattern": "Unstable opening",
    "confidence": "medium"
  },
  "presentMoment": {
    "recentSignal": "They went silent",
    "emotionalWeather": "Urgency",
    "consideredAction": "Text them"
  },
  "easternTiming": {
    "hour": "Zi hour",
    "branch": "子时",
    "element": "Water"
  },
  "westernTiming": {
    "moonPhase": "Waxing Crescent"
  },
  "reading": {
    "why": "...",
    "bestMove": "...",
    "avoid": "..."
  }
}
```

## Method

The engine combines four layers.

### 1. Present Moment Layer

This is the user's direct input:

- domain
- recent signal
- action
- emotional weather

This layer determines the base Timing Pattern.

Example:

- Love + They went silent = Unstable opening
- Career + I want to leave = Reaction window
- Decision + An opportunity appeared quickly = Open but unformed

### 2. Eastern Timing Layer

This uses the user's local question time to derive a 12 double-hour symbolic layer:

- Zi / 子时
- Chou / 丑时
- Yin / 寅时
- Mao / 卯时
- Chen / 辰时
- Si / 巳时
- Wu / 午时
- Wei / 未时
- Shen / 申时
- You / 酉时
- Xu / 戌时
- Hai / 亥时

Each hour has a symbolic tendency: inward, stored, emerging, opening, shaping, visible, intense, settling, decision, refining, closure, or retreat.

This is inspired by Eastern timing traditions, but it is not a full Huangli implementation.

### 3. Seasonal Rhythm Layer

This approximates seasonal rhythm from the day of year:

- Spring Wood
- Late Spring / Early Fire
- Summer Fire
- Autumn Metal
- Late Autumn / Early Water
- Winter Water

This gives a lightweight seasonal timing bias.

### 4. Western Lunar Phase Layer

The engine approximates moon age and phase:

- New / Dark Moon
- Waxing Crescent
- First Quarter
- Waxing Gibbous
- Full Moon
- Waning Gibbous
- Last Quarter
- Waning Crescent

Each phase has a symbolic tendency: intention, emergence, friction, refinement, exposure, integration, release, or rest.

## Deterministic rule

The engine is deterministic:

Same input + same timestamp = same result.

Different input or different question time can produce different results.

This avoids fake randomness and protects trust.

## Current limitation

This is not a complete traditional almanac. A true Huangli layer would require:

- lunar calendar conversion
- heavenly stems and earthly branches for year/month/day/hour
- solar terms
- traditional daily officer values
- auspicious/inauspicious activities
- a curated rule table or licensed almanac dataset

The current engine is a product-safe MVP: transparent, deterministic, time-aware, and upgradeable.

## API endpoint

File:

```text
api/quick-timing.js
```

Expected POST body:

```json
{
  "domain": "Love",
  "recentSignal": "They went silent",
  "action": "Text them",
  "feeling": "Urgency",
  "questionTime": "2026-06-30T08:15:00.000Z",
  "timezone": "America/Los_Angeles"
}
```

## Deployment note

GitHub Pages does not run backend functions. This API endpoint is ready for Vercel-style deployment. If the site remains on GitHub Pages, the frontend can keep using the inline fallback logic. To make the backend live, deploy the repo to Vercel or move this endpoint to Cloudflare Workers / another serverless runtime.
