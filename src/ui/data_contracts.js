/* LineLens shared data contracts.
 *
 * These small, dependency-free helpers keep freshness, provenance, and market
 * state consistent across the Home desk, boards, and Trust Center. They do
 * not mutate official exports or expose provider credentials.
 */
(function () {
    "use strict";

    const CONTRACT_VERSION = "linelens.data.v1";
    const FRESHNESS = { live: 180, shared: 7 * 60 * 60, odds: 60 * 60, props: 60 * 60 };

    function meta(payload) { return payload?.metadata || payload?.meta || payload || {}; }
    function iso(value) {
        const parsed = Date.parse(String(value || ""));
        return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
    }
    function ageSeconds(value, now = Date.now()) {
        const parsed = Date.parse(String(value || ""));
        return Number.isFinite(parsed) ? Math.max(0, (now - parsed) / 1000) : null;
    }
    function freshness(value, kind = "shared", now = Date.now()) {
        const timestamp = value?.snapshot_at || value?.fetched_at || value?.generated_at || meta(value).generated_at;
        const age = ageSeconds(timestamp, now);
        const limit = FRESHNESS[kind] || FRESHNESS.shared;
        if (age === null) return { state: "unknown", age_seconds: null, max_age_seconds: limit, label: "Freshness unavailable" };
        const state = age <= limit ? "current" : age <= limit * 2 ? "aging" : "stale";
        return { state, age_seconds: age, max_age_seconds: limit, label: state === "current" ? "Current" : state === "aging" ? "Aging" : "Stale" };
    }
    function envelope(payload, kind = "shared", options = {}) {
        const metadata = meta(payload);
        const generated = iso(metadata.generated_at || payload?.generated_at);
        const fetched = iso(metadata.fetched_at || metadata.received_at || payload?.fetched_at) || generated;
        const source = metadata.source || metadata.provider || options.source || "unknown";
        const status = metadata.source_status || metadata.status || options.status || "unknown";
        return {
            schema_version: CONTRACT_VERSION,
            kind,
            generated_at: generated,
            fetched_at: fetched,
            source,
            status,
            freshness: freshness(payload, kind),
            provenance: {
                provider: metadata.provider || source,
                channel: metadata.channel || options.channel || "bundled-export",
                commit_sha: metadata.commit_sha || null,
                bundle_sha256: metadata.bundle_sha256 || null,
                fallback_source: metadata.fallback_source || metadata.last_successful_fallback || null,
            },
            warnings: Array.isArray(metadata.warnings) ? metadata.warnings : [],
            payload,
        };
    }
    function feedHealth(payload, runtime = {}) {
        const wrapped = envelope(payload, "live");
        const metadata = meta(payload);
        const providerHealth = metadata.provider_health || {};
        const attempts = Array.isArray(metadata.provider_attempts) ? metadata.provider_attempts : [];
        return {
            schema_version: CONTRACT_VERSION,
            feed: "live",
            state: wrapped.freshness.state,
            source_status: wrapped.status,
            source: wrapped.source,
            generated_at: wrapped.generated_at,
            age_seconds: wrapped.freshness.age_seconds,
            retry_count: Number(runtime.retryCount || metadata.retry_count || 0),
            next_retry_at: runtime.nextRetryAt || metadata.next_retry_at || null,
            last_error: runtime.lastError || metadata.last_error || null,
            provider_health: providerHealth,
            provider_attempts: attempts,
            fallback_source: wrapped.provenance.fallback_source,
            warnings: wrapped.warnings,
        };
    }
    function americanImplied(price) {
        const value = Number(price);
        if (!Number.isFinite(value) || value === 0) return null;
        return value > 0 ? 100 / (value + 100) : Math.abs(value) / (Math.abs(value) + 100);
    }
    function noVig(homePrice, awayPrice) {
        const home = americanImplied(homePrice);
        const away = americanImplied(awayPrice);
        if (home === null || away === null || home + away <= 0) return { home: null, away: null, overround: null };
        const total = home + away;
        return { home: home / total, away: away / total, overround: total - 1 };
    }
    function edgeAssessment(game, snapshot) {
        const side = String(game?.model_pick || game?.pick || "").toUpperCase() === String(game?.home || "").toUpperCase() ? "home" : "away";
        const model = Number(game?.home_win_probability ?? game?.model_home_win);
        const market = Number(snapshot?.[`market_implied_${side}`]);
        const current = freshness(snapshot, "odds");
        const valid = Number.isFinite(model) && Number.isFinite(market) && current.state !== "stale";
        return {
            schema_version: CONTRACT_VERSION,
            side,
            model_probability: Number.isFinite(model) ? (side === "home" ? model : 1 - model) : null,
            market_probability: Number.isFinite(market) ? (side === "home" ? market : 1 - market) : null,
            edge: valid ? (side === "home" ? model : 1 - model) - (side === "home" ? market : 1 - market) : null,
            freshness: current,
            suppressed: !valid,
            suppression_reason: !Number.isFinite(model) ? "model_probability_missing" : !Number.isFinite(market) ? "market_probability_missing" : current.state === "stale" ? "odds_stale" : null,
        };
    }

    window.LineLensContracts = { CONTRACT_VERSION, FRESHNESS, meta, freshness, envelope, feedHealth, americanImplied, noVig, edgeAssessment };
}());
