# Broad Match Cost Controller

Monitors the cost share of broad match keywords across your account. Alerts when broad match spending exceeds a threshold and can optionally pause the most expensive broad keywords.

## What it does

1. Queries all keyword costs via GAQL, broken down by match type
2. Calculates broad match as a percentage of total keyword spend
3. Sends an email alert if the threshold is exceeded
4. Optionally pauses individual broad keywords exceeding a per-keyword cost cap

## Setup

1. Copy `main_en.gs` (or `main_fr.gs`) into a new Google Ads Script
2. Update `CONFIG.EMAIL` and adjust thresholds
3. Run in TEST_MODE first to review the report
4. Schedule daily or weekly

## CONFIG reference

| Parameter | Default | Description |
|---|---|---|
| `TEST_MODE` | `true` | Log only — no keywords paused |
| `EMAIL` | `you@example.com` | Email recipient |
| `MAX_BROAD_COST_PERCENT` | `30` | Alert threshold (% of total spend) |
| `PAUSE_EXCESS_BROAD` | `false` | Pause keywords exceeding per-keyword cap |
| `MAX_BROAD_KEYWORD_COST` | `500` | Per-keyword cost cap ($) for pause |
| `DATE_RANGE` | `LAST_30_DAYS` | Analysis window |

## How it works

Uses `AdsApp.search()` with GAQL on `keyword_view` to pull cost by match type. Compares broad match cost against total spend and triggers an alert if the percentage exceeds `MAX_BROAD_COST_PERCENT`. When `PAUSE_EXCESS_BROAD` is enabled, pauses individual broad keywords above the cost cap.

## Requirements

- Google Ads account with active Search campaigns
- Permission to send emails (MailApp)

## License

MIT — Thibault Fayol Consulting
