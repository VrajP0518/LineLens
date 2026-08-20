# Automatic API-backed data in the v6 desktop release

Repository secrets must never be copied into `.env`, JavaScript, Rust, a Tauri resource, or an installer. A desktop credential can ultimately be extracted even if it is minified or encrypted.

LineLens v6 instead uses the three repository secrets only inside GitHub Actions:

- `ODDS_API_KEY`
- `SHARP_ODDS_API_KEY`
- `PROPLINE_API_KEY`

The **Publish Shared Data Channel** workflow refreshes scores, odds, props, predictions, and records every six hours. It creates a JSON-only ZIP, checks every export for the configured secret values, generates SHA-256 hashes, attaches GitHub provenance, and publishes the assets at the stable `data-channel-v6` release tag.

Live scores do not wait six hours. The installed Tauri app and its Live widget query the keyless public scoreboards directly every 30 seconds while they are open. The shared channel supplies predictions, odds, records, and an offline score fallback; the direct feed supplies the changing score and game state. Model retraining remains a separate weekly review workflow.

Before each record publication, `refresh_pending_results.py` reads the prediction log, fetches authoritative MLB/ESPN results for every still-pending date, preserves a result-history cache, and runs scoring again. Postponed, canceled, suspended, and delayed games are excluded from model accuracy instead of being mislabeled as losses or left pending forever.

The installed app checks that channel automatically on startup and at a conservative background interval. It accepts only the pinned LineLens v6 release URL and an exact file allowlist, verifies the bundle hash plus every file hash and size, rejects unexpected paths, keeps a local backup, and then loads the new exports. If the network or workflow is unavailable, bundled data remains visible. End users do not need Python or API keys.

## One-time activation

1. Push the v6 workflows and source changes to GitHub.
2. Open **Actions → Publish Shared Data Channel → Run workflow**.
3. Confirm the `data-channel-v6` prerelease contains `linelens-shared-data-v6.zip` and `shared-data-manifest.json`.
4. Open the repository **Attestations** page and confirm the workflow provenance exists.
5. Run **Tauri Windows Build** or publish a `v6.0.0` tag after the data channel exists.

Future scheduled runs replace the two stable channel assets. New installers also refresh and bundle current sanitized exports before building, so first launch has a usable offline fallback.

## What GitHub secrets do and do not do

GitHub secrets are available to authorized Actions jobs; they are not automatically available to downloaded applications. That separation is what protects the provider credentials. The downloadable app receives only the derived exports that the workflow explicitly allows.

The local key fields in Settings remain as optional developer overrides for direct refresh testing. Normal installed clients use the shared channel.

Before public distribution, confirm that each provider plan permits redistribution of the exported odds or derived data. If a provider requires true real-time requests, user-specific authorization, or forbids public snapshots, use a hosted API proxy with authentication, caching, rate limits, and quota enforcement. A scheduled GitHub workflow is intentionally not a real-time API server.

## Model retraining

The weekly **Retrain Models** workflow also receives the repository secrets for market evidence. It retrains in Actions, generates drift alerts and signed provenance, and attempts to open a review pull request. If repository policy blocks PR creation, the workflow publishes the same review evidence plus a patch in its signed run artifact; it still does not publish an unreviewed candidate to installed clients.
