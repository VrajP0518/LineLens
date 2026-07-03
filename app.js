const APP_VERSION = "v0.2.0";
const TRACKER_KEY = "linelens.tracker.v1";
const SETTINGS_KEY = "linelens.settings.v1";

const DATA_SOURCES = {
    app: ["data/app_metadata.json"],
    teams: ["data/team_metadata.json"],
    reports: ["data/reports/model_report.json"],
    refresh: ["data/refresh_status.json"],
    nfl: ["data/predictions/nfl_predictions.json", "data/predictions.json"],
    mlb: ["data/predictions/mlb_predictions.json"],
};

const state = {
    app: window.__APP_METADATA__ || { app: "LineLens Sports", version: APP_VERSION },
    teamPayload: window.__TEAM_METADATA__ || { teams: [] },
    report: window.__MODEL_REPORT__ || null,
    refreshStatus: window.__REFRESH_STATUS__ || null,
    refreshRuntime: { available: false, active: false, message: "Checking refresh availability..." },
    nfl: { payload: window.__NFL_PREDICTIONS__ || window.__PREDICTIONS__ || null, games: [], error: null },
    mlb: { payload: window.__MLB_PREDICTIONS__ || null, games: [], error: null },
    selected: { nfl: null, mlb: null, teamSport: "MLB", teamCode: "TOR", reportSport: "MLB" },
    tracker: [],
    charts: {},
};

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

function safeNumber(value, fallback = null) {
    if (value === null || value === undefined || value === "") return fallback;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function formatProbability(value) {
    const numeric = safeNumber(value);
    return numeric === null ? "-" : `${(numeric * 100).toFixed(1)}%`;
}

function formatNumber(value, digits = 2) {
    const numeric = safeNumber(value);
    return numeric === null ? "-" : numeric.toFixed(digits);
}

function formatEdge(value) {
    const numeric = safeNumber(value);
    if (numeric === null) return "Model confidence only";
    return `${numeric >= 0 ? "+" : ""}${(numeric * 100).toFixed(1)} pts`;
}

function formatLine(value, sport) {
    const numeric = safeNumber(value);
    if (numeric === null) return "-";
    if (sport === "MLB") return numeric > 0 ? `+${numeric}` : `${numeric}`;
    return numeric > 0 ? `+${numeric.toFixed(1)}` : numeric.toFixed(1);
}

function formatDate(value) {
    if (!value) return "-";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function timestamp(value) {
    if (!value) return "-";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function normalizeMeta(payload) {
    return payload?.metadata || payload?.meta || {};
}

function normalizeGames(payload) {
    return Array.isArray(payload?.games) ? payload.games : [];
}

async function fetchJson(url) {
    const response = await fetch(url, { cache: "no-cache" });
    if (!response.ok) throw new Error(`${url} returned ${response.status}`);
    return response.json();
}

async function loadOptional(kind, globals = []) {
    for (const name of globals) {
        if (window[name]) return window[name];
    }
    if (window.location.protocol === "file:") return null;
    for (const url of DATA_SOURCES[kind] || []) {
        try {
            return await fetchJson(url);
        } catch (_error) {
            // Try the next source. The UI renders clean missing states.
        }
    }
    return null;
}

function setStatus(message, variant = "info") {
    const el = $("#data-status");
    if (!el) return;
    el.textContent = message;
    el.dataset.variant = variant;
    el.hidden = !message;
}

function showToast(message) {
    const toast = $("#toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.setTimeout(() => toast.classList.remove("is-visible"), 2200);
}

function persistSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.selected));
}

function loadSettings() {
    try {
        const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
        state.selected = { ...state.selected, ...saved };
    } catch (_error) {
        state.selected = { ...state.selected };
    }
}

function loadTracker() {
    try {
        state.tracker = JSON.parse(localStorage.getItem(TRACKER_KEY) || "[]");
    } catch (_error) {
        state.tracker = [];
    }
}

function saveTracker() {
    localStorage.setItem(TRACKER_KEY, JSON.stringify(state.tracker));
}

function buildTeamIndex() {
    const index = new Map();
    (state.teamPayload?.teams || []).forEach(team => {
        index.set(`${team.sport}:${team.abbreviation}`, team);
    });
    return index;
}

let teamIndex = new Map();

function getTeamMeta(sport, code, display) {
    const normalized = String(code || "").toUpperCase();
    const aliases = {
        "MLB:SDP": "MLB:SD",
        "MLB:SFN": "MLB:SF",
        "MLB:CHW": "MLB:CWS",
        "NFL:WSH": "NFL:WAS",
    };
    const key = aliases[`${sport}:${normalized}`] || `${sport}:${normalized}`;
    return teamIndex.get(key) || {
        sport,
        abbreviation: normalized || "---",
        full_name: display || normalized || "Unknown Team",
        city: "",
        primary: sport === "MLB" ? "#2E86AB" : "#55c2ff",
        secondary: "#f3c969",
        logo_url: "",
    };
}

function renderTeamLogo(sport, code, size = "sm", display) {
    const meta = getTeamMeta(sport, code, display);
    const alt = escapeHtml(`${meta.full_name} logo`);
    return `
        <span class="team-logo team-logo--${size}" style="--team-color:${meta.primary}">
            <img src="${escapeHtml(meta.logo_url || "")}" alt="${alt}" loading="lazy" onerror="this.hidden=true; this.nextElementSibling.hidden=false;" />
            <span ${meta.logo_url ? "hidden" : ""}>${escapeHtml(meta.abbreviation)}</span>
        </span>
    `;
}

function teamCell(sport, code, display) {
    const meta = getTeamMeta(sport, code, display);
    return `
        <button class="team-link" data-team-sport="${sport}" data-team-code="${escapeHtml(meta.abbreviation)}">
            ${renderTeamLogo(sport, meta.abbreviation, "sm", meta.full_name)}
            <span>${escapeHtml(display || meta.full_name)}</span>
        </button>
    `;
}

function getGameProbability(game, sport) {
    if (sport === "NFL") return safeNumber(game.model_home_cover);
    return safeNumber(game.home_win_probability);
}

function getGamePick(game, sport) {
    if (game.model_pick) return game.model_pick;
    const probability = getGameProbability(game, sport);
    if (probability === null) return "-";
    return probability >= 0.5 ? game.home : game.away;
}

function getGameConfidence(game, sport) {
    if (game.confidence) return game.confidence;
    const probability = getGameProbability(game, sport);
    if (probability === null) return "Pending";
    const distance = Math.abs(probability - 0.5);
    if (distance >= 0.12) return "High";
    if (distance >= 0.05) return "Medium";
    return "Low";
}

function confidenceClass(confidence) {
    return `tag--${String(confidence || "pending").toLowerCase().replaceAll(" ", "-")}`;
}

function confidenceTag(confidence) {
    const label = confidence || "Pending";
    return `<span class="tag ${confidenceClass(label)}">${escapeHtml(label)}</span>`;
}

function getGameEdge(game, sport) {
    const explicit = safeNumber(game.edge);
    if (explicit !== null) return explicit;
    const probability = getGameProbability(game, sport);
    return probability === null ? null : Math.abs(probability - 0.5);
}

function getLineMovementSummary(game, sport) {
    if (game.movement_label) return game.movement_label;
    if (sport === "NFL") {
        const open = safeNumber(game.spread_open);
        const current = safeNumber(game.spread_current ?? game.spread_line);
        const close = safeNumber(game.spread_close);
        if (open === null || current === null) return "Line movement unavailable. Add odds provider later.";
        const moved = current - open;
        const direction = moved > 0 ? "toward away" : moved < 0 ? "toward home" : "flat";
        return close === null ? `Market moved ${direction} (${formatNumber(Math.abs(moved), 1)} pts).` : `Closed at ${formatLine(close, sport)}.`;
    }
    const open = safeNumber(game.moneyline_home_open);
    const current = safeNumber(game.moneyline_home_current ?? game.moneyline_home);
    if (open === null || current === null) return "Line movement unavailable. Add odds provider later.";
    return current < open ? "Market moved toward home." : current > open ? "Market moved away from home." : "Market held steady.";
}

function getCLVSummary(game) {
    if (game.clv_label) return game.clv_label;
    const clv = safeNumber(game.clv);
    if (clv === null) return "CLV unavailable";
    if (clv > 0) return `Beat close by ${formatNumber(clv, 2)}`;
    if (clv < 0) return `Lost value by ${formatNumber(Math.abs(clv), 2)}`;
    return "Matched close";
}

function isDemoPayload(payload) {
    const meta = normalizeMeta(payload);
    return Boolean(meta.demo) || meta.mode === "demo" || meta.model_type === "sample_fallback";
}

function dataMode(payload, games) {
    if (!payload) return "missing";
    if (isDemoPayload(payload)) return "demo";
    return games.length ? "real" : "missing";
}

function allGames() {
    return [
        ...state.nfl.games.map(game => ({ ...game, sport: "NFL" })),
        ...state.mlb.games.map(game => ({ ...game, sport: "MLB" })),
    ];
}

function topEdges(limit = 5) {
    return allGames()
        .map(game => ({
            game,
            edge: getGameEdge(game, game.sport),
            probability: getGameProbability(game, game.sport),
            confidence: getGameConfidence(game, game.sport),
            pick: getGamePick(game, game.sport),
        }))
        .filter(row => row.probability !== null)
        .sort((a, b) => (b.edge ?? 0) - (a.edge ?? 0))
        .slice(0, limit);
}

async function loadAll() {
    setStatus("Loading prediction exports...", "info");
    loadSettings();
    loadTracker();
    const [app, teams, report, refresh, nfl, mlb] = await Promise.all([
        loadOptional("app", ["__APP_METADATA__"]),
        loadOptional("teams", ["__TEAM_METADATA__"]),
        loadOptional("reports", ["__MODEL_REPORT__"]),
        loadOptional("refresh", ["__REFRESH_STATUS__"]),
        loadOptional("nfl", ["__NFL_PREDICTIONS__", "__PREDICTIONS__"]),
        loadOptional("mlb", ["__MLB_PREDICTIONS__"]),
    ]);

    state.app = app || state.app;
    state.teamPayload = teams || state.teamPayload;
    state.report = report || state.report;
    state.refreshStatus = refresh || state.refreshStatus;
    state.nfl.payload = nfl;
    state.nfl.games = normalizeGames(nfl);
    state.nfl.error = nfl ? null : "No NFL predictions found. Run the NFL export command.";
    state.mlb.payload = mlb;
    state.mlb.games = normalizeGames(mlb);
    state.mlb.error = mlb ? null : "No MLB predictions found. Run the MLB export command.";
    teamIndex = buildTeamIndex();

    $("#sidebar-version").textContent = state.app.version || APP_VERSION;
    $("#app-version-chip").textContent = state.app.version || APP_VERSION;
    renderAll();

    const modes = [`NFL ${dataMode(state.nfl.payload, state.nfl.games)}`, `MLB ${dataMode(state.mlb.payload, state.mlb.games)}`];
    setStatus(`Ready. ${modes.join(" / ")}.`, allGames().length ? "success" : "warning");
    if (!state.refreshRuntime.checked) {
        state.refreshRuntime.checked = true;
        state.refreshRuntime.available = isTauriRefreshAvailable();
        state.refreshRuntime.message = state.refreshRuntime.available
            ? "Desktop auto-refresh is available."
            : "Automatic desktop refresh is available in the Tauri app. Browser/static mode uses existing exported data.";
        renderAll();
        if (state.refreshRuntime.available) {
            refreshData("all", { background: true });
        }
    }
}

function isTauriRefreshAvailable() {
    return Boolean(window.__TAURI__?.core?.invoke || window.__TAURI__?.invoke);
}

function tauriInvoke(command, payload) {
    const invoker = window.__TAURI__?.core?.invoke || window.__TAURI__?.invoke;
    if (!invoker) return Promise.reject(new Error("Tauri invoke is unavailable."));
    return invoker(command, payload);
}

async function refreshData(sport = "all", options = {}) {
    if (!isTauriRefreshAvailable()) {
        state.refreshRuntime.message = "Automatic desktop refresh is available in the Tauri app. Browser/static mode uses existing exported data.";
        showToast(state.refreshRuntime.message);
        renderAll();
        return;
    }
    state.refreshRuntime.available = true;
    state.refreshRuntime.active = true;
    state.refreshRuntime.message = `Refreshing ${sport.toUpperCase()} data...`;
    if (!options.background) showToast("Refreshing data...");
    renderAll();
    try {
        const message = await tauriInvoke("refresh_sports_data", { sport });
        state.refreshRuntime.message = message || "Data refreshed.";
        showToast("Data refreshed");
        await loadAllAfterRefresh();
    } catch (error) {
        state.refreshRuntime.message = String(error?.message || error || "Refresh failed; showing cached data.");
        showToast("Refresh failed; showing cached data");
    } finally {
        state.refreshRuntime.active = false;
        renderAll();
    }
}

async function loadAllAfterRefresh() {
    const [refresh, nfl, mlb] = await Promise.all([
        loadOptional("refresh", ["__REFRESH_STATUS__"]),
        loadOptional("nfl", []),
        loadOptional("mlb", []),
    ]);
    if (refresh) {
        state.refreshStatus = refresh;
        window.__REFRESH_STATUS__ = refresh;
    }
    if (nfl) {
        state.nfl.payload = nfl;
        state.nfl.games = normalizeGames(nfl);
    }
    if (mlb) {
        state.mlb.payload = mlb;
        state.mlb.games = normalizeGames(mlb);
    }
}

function switchView(view) {
    state.selected.view = view;
    persistSettings();
    $$(".view").forEach(el => el.classList.toggle("is-active", el.id === `view-${view}`));
    $$(".nav__item").forEach(btn => btn.classList.toggle("is-active", btn.dataset.view === view));
    const titles = {
        home: ["LineLens Sports", "sports prediction command center"],
        nfl: ["NFL Spread Predictor", "spread module"],
        mlb: ["MLB Moneyline Predictor", "moneyline module"],
        reports: ["Model Reports", "calibration and comparison"],
        teams: ["Team Profiles", "team-level model context"],
        tracking: ["Tracking", "local analysis ledger"],
        settings: ["Settings / Data Status", "environment and exports"],
    };
    const [title, kicker] = titles[view] || titles.home;
    $("#view-title").textContent = title;
    $("#view-kicker").textContent = kicker;
}

function card(label, value, note, extraClass = "") {
    return `<article class="summary-card ${extraClass}"><span>${label}</span><strong>${value}</strong><small>${note}</small></article>`;
}

function renderHome() {
    const top = topEdges(5);
    const latest = [normalizeMeta(state.nfl.payload).generated_at, normalizeMeta(state.mlb.payload).generated_at, state.report?.metadata?.generated_at].filter(Boolean).sort().at(-1);
    const best = top[0];
    $("#view-home").innerHTML = `
        <section class="hero-panel panel">
            <div>
                <p class="eyebrow">LineLens Sports ${escapeHtml(state.app.version || APP_VERSION)}</p>
                <h2>Desktop-grade model edge command center for NFL and MLB.</h2>
                <p class="muted">Track predictions, inspect calibration, compare model families, review team profiles, and keep a local analysis ledger without requiring paid odds APIs.</p>
            </div>
            <div class="hero-actions">
                <button class="btn btn--primary" data-view-link="mlb">Open MLB</button>
                <button class="btn" data-view-link="nfl">Open NFL</button>
                <button class="btn" data-view-link="reports">Reports</button>
                <button class="btn" data-view-link="tracking">Tracking</button>
            </div>
        </section>
        <section class="summary-grid">
            ${card("NFL games loaded", state.nfl.games.length, dataMode(state.nfl.payload, state.nfl.games))}
            ${card("MLB games loaded", state.mlb.games.length, dataMode(state.mlb.payload, state.mlb.games))}
            ${card("Odds status", oddsStatusLabel(), oddsStatusMessage())}
            ${card("Strong edges", top.filter(row => row.edge >= 0.1).length, "confidence distance from 50%")}
            ${card("Best current pick", best ? `${best.pick}` : "-", best ? `${best.game.away} @ ${best.game.home}` : "no picks loaded", "summary-card--accent")}
            ${card("Latest export", latest ? formatDate(latest) : "-", latest ? timestamp(latest) : "no export timestamp")}
            ${card("Active modules", "2", "NFL spread / MLB moneyline")}
        </section>
        ${renderRefreshPanel("home")}
        <section class="dashboard-grid">
            <article class="panel">
                <header class="section-header"><div><p class="eyebrow">Top model edges</p><h2>Best leans</h2></div><span class="chip">${top.length ? "ranked" : "empty"}</span></header>
                ${top.length ? renderEdgeList(top) : emptyState("No model probabilities found", "Run an export command or use the included MLB demo payload.")}
            </article>
            <article class="panel">
                <header class="section-header"><div><p class="eyebrow">Today / Upcoming</p><h2>Board watch</h2></div></header>
                ${renderUpcoming()}
            </article>
        </section>
    `;
}

function oddsStatusLabel() {
    const odds = state.refreshStatus?.odds;
    if (!odds) return "unknown";
    if (odds.enabled) return "enabled";
    if (!odds.key_present) return "missing key";
    return "unavailable";
}

function oddsStatusMessage() {
    const odds = state.refreshStatus?.odds;
    if (!odds) return "refresh status pending";
    if (odds.enabled) return `${odds.provider} / ${odds.markets}`;
    return "add ODDS_API_KEY for lines";
}

function refreshSportStatus(sport) {
    return state.refreshStatus?.sports?.[sport] || {
        status: "cached",
        message: `No ${sport} runtime refresh has run yet.`,
        last_success_at: null,
        used_cache: true,
    };
}

function renderRefreshPanel(context = "home") {
    const nfl = refreshSportStatus("NFL");
    const mlb = refreshSportStatus("MLB");
    const disabled = state.refreshRuntime.available ? "" : "disabled";
    return `
        <section class="panel refresh-panel">
            <header class="section-header">
                <div>
                    <p class="eyebrow">Runtime data refresh</p>
                    <h2>${context === "settings" ? "Data refresh controls" : "Cached first, refresh in background"}</h2>
                    <p class="muted">${escapeHtml(state.refreshRuntime.message || "Loading cached predictions first.")}</p>
                </div>
                <div class="report-actions">
                    <button class="btn btn--primary" data-refresh-sport="all" ${disabled}>Refresh All Data</button>
                    <button class="btn" data-refresh-sport="nfl" ${disabled}>Refresh NFL</button>
                    <button class="btn" data-refresh-sport="mlb" ${disabled}>Refresh MLB</button>
                </div>
            </header>
            <div class="summary-grid summary-grid--compact">
                ${card("Last refresh", timestamp(state.refreshStatus?.generated_at), state.refreshRuntime.active ? "refreshing" : "runtime status")}
                ${card("NFL refresh", nfl.status, nfl.used_cache ? "using cache" : "fresh export")}
                ${card("MLB refresh", mlb.status, mlb.used_cache ? "using cache" : "fresh schedule")}
                ${card("Tauri command", state.refreshRuntime.available ? "Available" : "Browser/static", state.refreshRuntime.available ? "desktop app" : "exported data only")}
            </div>
            <div class="refresh-log">
                <div><strong>NFL</strong><span>${escapeHtml(nfl.message)}</span></div>
                <div><strong>MLB</strong><span>${escapeHtml(mlb.message)}</span></div>
            </div>
        </section>
    `;
}

function renderEdgeList(rows) {
    return `<div class="edge-list">${rows.map(row => {
        const game = row.game;
        return `
            <div class="edge-row">
                <div class="edge-row__teams">
                    ${teamCell(game.sport, game.away, game.away_display || game.away)}
                    <span>@</span>
                    ${teamCell(game.sport, game.home, game.home_display || game.home)}
                </div>
                <div><strong>${escapeHtml(row.pick)}</strong><span>${formatProbability(row.probability)} home-side probability</span></div>
                ${confidenceTag(row.confidence)}
            </div>
        `;
    }).join("")}</div>`;
}

function renderUpcoming() {
    const mlb = state.mlb.games.slice(0, 4);
    const nflMessage = state.nfl.games.length ? `${state.nfl.games.length} NFL rows loaded.` : "NFL module ready. No current export loaded, likely offseason or no latest run.";
    return `
        <div class="mini-board">
            ${mlb.length ? mlb.map(game => `
                <div class="mini-game">
                    <span>${formatDate(game.game_date)}</span>
                    <strong>${escapeHtml(game.away)} @ ${escapeHtml(game.home)}</strong>
                    <small>${escapeHtml(getGamePick(game, "MLB"))} ${formatProbability(game.home_win_probability)}</small>
                </div>
            `).join("") : emptyState("No MLB board", "Run the MLB export command.")}
            <div class="mini-game mini-game--muted"><span>NFL</span><strong>Spread module</strong><small>${escapeHtml(nflMessage)}</small></div>
        </div>
    `;
}

function emptyState(title, copy) {
    return `<div class="empty-state"><strong>${escapeHtml(title)}</strong><p>${escapeHtml(copy)}</p></div>`;
}

function sportSummaryCards(sport, games, payload) {
    const top = games.map(game => ({ game, edge: getGameEdge(game, sport), confidence: getGameConfidence(game, sport) })).sort((a, b) => (b.edge ?? 0) - (a.edge ?? 0));
    return `
        <section class="summary-grid summary-grid--compact">
            ${card("Games loaded", games.length, dataMode(payload, games))}
            ${card("High confidence", top.filter(row => row.confidence === "High").length, "current export")}
            ${card("Best edge", top[0] ? formatEdge(top[0].edge) : "-", top[0] ? `${top[0].game.away} @ ${top[0].game.home}` : "none")}
            ${card("Latest export", timestamp(normalizeMeta(payload).generated_at), normalizeMeta(payload).model_type || "not available")}
        </section>
    `;
}

function renderNFL() {
    const games = state.nfl.games;
    const selected = state.selected.nfl || games[0] || null;
    state.selected.nfl = selected;
    $("#view-nfl").innerHTML = `
        <section class="module-header panel">
            <div><p class="eyebrow">NFL Spread Predictor</p><h2>Spread, injury, CLV, and line movement workspace</h2><p class="muted">NFL data source: ${escapeHtml(refreshSportStatus("NFL").status)}. ${games.length ? "Cached/exported rows loaded." : "NFL is currently off-season or no upcoming games are available."}</p></div>
            <div class="report-actions"><button class="btn" data-refresh-sport="nfl" ${state.refreshRuntime.available ? "" : "disabled"}>Refresh NFL</button>
            <span class="chip">${dataMode(state.nfl.payload, games)}</span>
            </div>
        </section>
        ${sportSummaryCards("NFL", games, state.nfl.payload)}
        <section class="dashboard-grid">
            <article class="panel panel--wide">
                <header class="section-header"><div><p class="eyebrow">Board</p><h2>All NFL games</h2></div></header>
                ${games.length ? renderGameTable("NFL", games) : emptyState("No NFL predictions found", "Run the NFL export command. Existing NFL model files are preserved.")}
            </article>
            <article class="panel">${renderMatchupDetail("NFL", selected)}</article>
        </section>
    `;
}

function renderMLB() {
    const games = state.mlb.games;
    const selected = state.selected.mlb || games[0] || null;
    state.selected.mlb = selected;
    $("#view-mlb").innerHTML = `
        <section class="module-header panel">
            <div><p class="eyebrow">MLB Moneyline Predictor</p><h2>Daily moneyline board with pitcher and market-readiness context</h2><p class="muted">MLB schedule source: MLB Stats API. Model status: ${escapeHtml(mlbModelStatus())}.</p></div>
            <div class="report-actions"><button class="btn" data-refresh-sport="mlb" ${state.refreshRuntime.available ? "" : "disabled"}>Refresh MLB</button>
            <span class="chip">${dataMode(state.mlb.payload, games)}</span>
            </div>
        </section>
        ${sportSummaryCards("MLB", games, state.mlb.payload)}
        <section class="dashboard-grid">
            <article class="panel panel--wide">
                <header class="section-header"><div><p class="eyebrow">Today / Upcoming</p><h2>MLB board</h2></div></header>
                ${games.length ? renderGameTable("MLB", games) : emptyState("No MLB predictions found", "Run the MLB export command or use sample payloads.")}
            </article>
            <article class="panel">${renderMatchupDetail("MLB", selected)}</article>
        </section>
    `;
}

function mlbModelStatus() {
    const meta = normalizeMeta(state.mlb.payload);
    if (!state.mlb.payload) return "missing";
    if (meta.prediction_mode === "schedule_only" || meta.model_type === "schedule_only") return "Schedule loaded, model pending";
    if (isDemoPayload(state.mlb.payload)) return "Demo predictions";
    return "Model predictions available";
}

function renderGameTable(sport, games) {
    return `
        <div class="table-wrapper">
            <table class="data-table">
                <thead><tr><th>Date</th><th>Away</th><th>Home</th><th>Pick</th><th>Prob</th><th>Edge</th><th>Confidence</th><th>CLV</th></tr></thead>
                <tbody>
                    ${games.map((game, index) => `
                        <tr class="selectable-row" data-select-game="${sport}" data-game-index="${index}" data-game-id="${escapeHtml(game.game_id || game.id || "")}">
                            <td>${formatDate(game.game_date || game.week || game.season)}</td>
                            <td>${teamCell(sport, game.away, game.away_display || game.away)}</td>
                            <td>${teamCell(sport, game.home, game.home_display || game.home)}</td>
                            <td><strong>${escapeHtml(getGamePick(game, sport))}</strong></td>
                            <td>${formatProbability(getGameProbability(game, sport))}</td>
                            <td>${formatEdge(getGameEdge(game, sport))}</td>
                            <td>${confidenceTag(getGameConfidence(game, sport))}</td>
                            <td><span class="chip chip--soft">${escapeHtml(getCLVSummary(game))}</span></td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;
}

function renderMatchupDetail(sport, game) {
    if (!game) return emptyState(`No ${sport} matchup selected`, `Load ${sport} predictions to inspect matchup detail.`);
    const homeMeta = getTeamMeta(sport, game.home, game.home_display);
    const awayMeta = getTeamMeta(sport, game.away, game.away_display);
    const homeProb = getGameProbability(game, sport);
    const awayProb = homeProb === null ? null : 1 - homeProb;
    const isNfl = sport === "NFL";
    return `
        <div class="matchup-card">
            <div class="matchup-head">
                <div>${renderTeamLogo(sport, awayMeta.abbreviation, "md", awayMeta.full_name)}<strong>${escapeHtml(awayMeta.full_name)}</strong></div>
                <span>@</span>
                <div>${renderTeamLogo(sport, homeMeta.abbreviation, "md", homeMeta.full_name)}<strong>${escapeHtml(homeMeta.full_name)}</strong></div>
            </div>
            <div class="metric-grid">
                <div><span>Pick</span><strong>${escapeHtml(getGamePick(game, sport))}</strong></div>
                <div><span>${isNfl ? "Home cover" : "Home win"}</span><strong>${formatProbability(homeProb)}</strong></div>
                <div><span>${isNfl ? "Away cover/fail" : "Away win"}</span><strong>${formatProbability(awayProb)}</strong></div>
                <div><span>Confidence</span>${confidenceTag(getGameConfidence(game, sport))}</div>
            </div>
            <div class="prob-row"><div class="prob-row__header"><span>${escapeHtml(homeMeta.abbreviation)}</span><strong>${formatProbability(homeProb)}</strong></div><div class="prob-bar"><span style="width:${homeProb === null ? 0 : homeProb * 100}%;background:${homeMeta.primary}"></span></div></div>
            <div class="prob-row"><div class="prob-row__header"><span>${escapeHtml(awayMeta.abbreviation)}</span><strong>${formatProbability(awayProb)}</strong></div><div class="prob-bar"><span style="width:${awayProb === null ? 0 : awayProb * 100}%;background:${awayMeta.primary}"></span></div></div>
            <div class="detail-grid">
                ${isNfl ? renderNFLImpact(game) : renderMLBImpact(game)}
                ${renderLineMovement(game, sport)}
                ${renderCLV(game, sport)}
                <div class="detail-card"><span>Result status</span><strong>${escapeHtml(game.result || game.status || "Pending")}</strong></div>
            </div>
            <button class="btn btn--primary full-width" data-add-tracker="${sport}" data-game-id="${escapeHtml(game.game_id || game.id || "")}">Add to Tracker</button>
        </div>
    `;
}

function renderNFLImpact(game) {
    return `
        <div class="detail-card"><span>Injury impact</span><strong>${escapeHtml(game.injury_note || "Injury impact unavailable")}</strong><small>Home ${escapeHtml(game.home_injury_impact || "Unknown")} / Away ${escapeHtml(game.away_injury_impact || "Unknown")}</small></div>
        <div class="detail-card"><span>Key injuries</span><strong>${escapeHtml((game.key_home_injuries || []).join(", ") || "No key home injuries loaded")}</strong><small>${escapeHtml((game.key_away_injuries || []).join(", ") || "No key away injuries loaded")}</small></div>
    `;
}

function renderMLBImpact(game) {
    return `
        <div class="detail-card"><span>Starting pitchers</span><strong>${escapeHtml(game.away_probable_pitcher || "TBD")} vs ${escapeHtml(game.home_probable_pitcher || "TBD")}</strong><small>${escapeHtml(game.pitcher_data_status === "missing" ? "Probable pitcher data unavailable. Using team-level model only." : game.pitcher_edge || "Pitcher edge pending")}</small></div>
        <div class="detail-card"><span>Pitcher edge</span><strong>${escapeHtml(game.pitcher_edge || "Unknown")}</strong><small>${escapeHtml(game.home_pitcher_summary || "Pitcher summary pending")}</small></div>
    `;
}

function renderLineMovement(game, sport) {
    const values = sport === "NFL"
        ? `${formatLine(game.spread_open, sport)} / ${formatLine(game.spread_current ?? game.spread_line, sport)} / ${formatLine(game.spread_close, sport)}`
        : `${formatLine(game.moneyline_home_open, sport)} / ${formatLine(game.moneyline_home_current ?? game.moneyline_home, sport)} / ${formatLine(game.moneyline_home_close, sport)}`;
    return `<div class="detail-card"><span>Line movement</span><strong>${values}</strong><small>${escapeHtml(getLineMovementSummary(game, sport))}</small></div>`;
}

function renderCLV(game, sport) {
    const pickLine = sport === "NFL" ? game.spread_current ?? game.spread_line : game.moneyline_home_current ?? game.moneyline_home;
    const closeLine = sport === "NFL" ? game.spread_close : game.moneyline_home_close;
    return `<div class="detail-card"><span>Closing line value</span><strong>${escapeHtml(getCLVSummary(game))}</strong><small>Pick ${formatLine(pickLine, sport)} / Close ${formatLine(closeLine, sport)}</small></div>`;
}

function renderReports() {
    const sport = state.selected.reportSport || "MLB";
    const report = state.report?.sports?.[sport] || {};
    $("#view-reports").innerHTML = `
        <section class="module-header panel">
            <div><p class="eyebrow">Reports / Backtesting</p><h2>Calibration, confidence buckets, and model comparison</h2><p class="muted">Calibration checks whether games predicted around 60% actually win around 60% of the time.</p></div>
            <select id="report-sport-select"><option ${sport === "MLB" ? "selected" : ""}>MLB</option><option ${sport === "NFL" ? "selected" : ""}>NFL</option></select>
        </section>
        <section class="dashboard-grid">
            <article class="panel">
                <header class="section-header"><div><p class="eyebrow">Calibration</p><h2>${sport} calibration</h2></div><span class="chip">${state.report?.metadata?.demo ? "demo" : "real"}</span></header>
                <div class="trend-chart"><canvas id="calibration-chart"></canvas></div>
                ${renderCalibrationTable(report.calibration || [])}
            </article>
            <article class="panel">
                <header><p class="eyebrow">Model comparison</p><h2>Model leaderboard</h2></header>
                ${renderModelComparison(report.model_comparison || [])}
            </article>
        </section>
        <section class="dashboard-grid">
            <article class="panel"><header><p class="eyebrow">Confidence buckets</p><h2>Performance by tag</h2></header>${renderConfidenceBuckets(report.confidence_buckets || [])}</article>
            <article class="panel"><header><p class="eyebrow">Auto report</p><h2>Generated report text</h2></header><div class="report-actions"><button class="btn" data-generate-report="NFL">Generate NFL Weekly Report</button><button class="btn" data-generate-report="MLB">Generate MLB Daily Report</button><button class="btn btn--primary" id="copy-report-btn">Copy Report</button></div><textarea id="generated-report" readonly>${escapeHtml(generateReportText(sport))}</textarea></article>
        </section>
    `;
    renderCalibrationChart(report.calibration || []);
}

function renderCalibrationTable(rows) {
    if (!rows.length) return emptyState("No calibration rows", "Run or export a model report.");
    return `<div class="table-wrapper"><table class="data-table"><thead><tr><th>Bucket</th><th>Pred avg</th><th>Actual</th><th>Games</th><th>Diff</th></tr></thead><tbody>${rows.map(row => `<tr><td>${row.bucket}</td><td>${formatProbability(row.predicted_avg)}</td><td>${formatProbability(row.actual_rate)}</td><td>${row.games}</td><td>${formatEdge(row.difference)}</td></tr>`).join("")}</tbody></table></div>`;
}

function renderModelComparison(rows) {
    if (!rows.length) return emptyState("No comparison rows", "Model comparison export is missing.");
    const bestAccuracy = Math.max(...rows.map(row => safeNumber(row.accuracy, 0)));
    return `<div class="table-wrapper"><table class="data-table"><thead><tr><th>Model</th><th>Status</th><th>Accuracy</th><th>ROC AUC</th><th>Log loss</th><th>Brier</th><th>N</th></tr></thead><tbody>${rows.map(row => `<tr><td><strong>${escapeHtml(row.model)}</strong> ${safeNumber(row.accuracy) === bestAccuracy ? '<span class="tag tag--high">Best acc</span>' : ""}</td><td>${escapeHtml(row.status)}</td><td>${formatProbability(row.accuracy)}</td><td>${formatNumber(row.roc_auc, 3)}</td><td>${formatNumber(row.log_loss, 3)}</td><td>${formatNumber(row.brier_score, 3)}</td><td>${row.sample_size || 0}</td></tr>`).join("")}</tbody></table></div>`;
}

function renderConfidenceBuckets(rows) {
    if (!rows.length) return emptyState("No confidence buckets", "Export model reports to populate this section.");
    return `<div class="stat-list">${rows.map(row => `<div><strong>${escapeHtml(row.bucket)}</strong><span>${escapeHtml(row.record)} / ${formatProbability(row.accuracy)} / ${row.sample_size} games</span></div>`).join("")}</div>`;
}

function renderCalibrationChart(rows) {
    const canvas = $("#calibration-chart");
    if (!canvas || typeof Chart === "undefined" || !rows.length) return;
    state.charts.calibration?.destroy?.();
    state.charts.calibration = new Chart(canvas.getContext("2d"), {
        type: "line",
        data: {
            labels: rows.map(row => row.bucket),
            datasets: [
                { label: "Predicted", data: rows.map(row => row.predicted_avg), borderColor: "#55c2ff", backgroundColor: "#55c2ff33", tension: 0.25 },
                { label: "Actual", data: rows.map(row => row.actual_rate), borderColor: "#f3c969", backgroundColor: "#f3c96933", tension: 0.25 },
            ],
        },
        options: chartOptions(),
    });
}

function chartOptions() {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: "#f5f6ff" } } },
        scales: {
            x: { ticks: { color: "#9aa1b8" }, grid: { color: "rgba(255,255,255,0.06)" } },
            y: { ticks: { color: "#9aa1b8", callback: value => `${Math.round(value * 100)}%` }, grid: { color: "rgba(255,255,255,0.06)" }, min: 0.45, max: 0.8 },
        },
    };
}

function generateReportText(sport) {
    const rows = topEdges(5).filter(row => row.game.sport === sport);
    const meta = sport === "NFL" ? normalizeMeta(state.nfl.payload) : normalizeMeta(state.mlb.payload);
    const report = state.report?.sports?.[sport];
    const lines = [
        `LineLens Sports ${sport === "MLB" ? "MLB Daily" : "NFL Weekly"} Report`,
        `Generated: ${new Date().toLocaleString()}`,
        "",
        "Top model leans:",
        ...(rows.length ? rows.map((row, idx) => `${idx + 1}. ${row.pick} in ${row.game.away} @ ${row.game.home} - ${formatProbability(row.probability)} home-side probability (${row.confidence})`) : ["No model leans loaded."]),
        "",
        "Data notes:",
        `- Prediction mode: ${dataMode(sport === "NFL" ? state.nfl.payload : state.mlb.payload, sport === "NFL" ? state.nfl.games : state.mlb.games)}.`,
        `- Odds data: ${meta.odds_status || "Optional/unavailable."}`,
        sport === "MLB" ? "- Probable pitcher data may be partial; missing pitcher data falls back to team-level model only." : "- Injury impact depends on exported injury fields; missing injuries are labeled unknown.",
        `- Report metrics mode: ${report?.status || (state.report?.metadata?.demo ? "demo" : "missing")}.`,
    ];
    return lines.join("\n");
}

function renderTeams() {
    const teams = (state.teamPayload?.teams || []).filter(team => team.sport === state.selected.teamSport);
    const selected = teams.find(team => team.abbreviation === state.selected.teamCode) || teams[0];
    if (selected) {
        state.selected.teamSport = selected.sport;
        state.selected.teamCode = selected.abbreviation;
    }
    $("#view-teams").innerHTML = `
        <section class="module-header panel">
            <div><p class="eyebrow">Team Profiles</p><h2>Team-level context from prediction exports</h2></div>
            <div class="select-row"><select id="team-sport-select"><option ${state.selected.teamSport === "MLB" ? "selected" : ""}>MLB</option><option ${state.selected.teamSport === "NFL" ? "selected" : ""}>NFL</option></select><select id="team-select">${teams.map(team => `<option value="${team.abbreviation}" ${team.abbreviation === state.selected.teamCode ? "selected" : ""}>${team.full_name}</option>`).join("")}</select></div>
        </section>
        ${selected ? renderTeamProfile(selected) : emptyState("No team metadata", "Team metadata file is missing.")}
    `;
}

function renderTeamProfile(team) {
    const games = (team.sport === "NFL" ? state.nfl.games : state.mlb.games).filter(game => game.home === team.abbreviation || game.away === team.abbreviation);
    const probabilityValues = games
        .map(game => {
            const prob = getGameProbability(game, team.sport);
            if (prob === null) return null;
            return game.home === team.abbreviation ? prob : 1 - prob;
        })
        .filter(value => value !== null);
    const avgProb = probabilityValues.length ? probabilityValues.reduce((sum, value) => sum + value, 0) / probabilityValues.length : null;
    return `
        <section class="team-profile panel">
            <div class="team-profile__hero" style="--team-color:${team.primary}">
                ${renderTeamLogo(team.sport, team.abbreviation, "lg", team.full_name)}
                <div><p class="eyebrow">${team.sport}</p><h2>${escapeHtml(team.full_name)}</h2><p class="muted">${escapeHtml(team.city)} profile generated from loaded prediction exports.</p></div>
            </div>
            <div class="summary-grid summary-grid--compact">
                ${card("Loaded games", games.length, "prediction rows")}
                ${card("Average model probability", formatProbability(avgProb), "team perspective")}
                ${card(team.sport === "MLB" ? "Run differential" : "ATS context", team.sport === "MLB" ? formatNumber(games[0]?.trend?.home?.[1] ?? games[0]?.trend?.away?.[1]) : "Export dependent", "from available rows")}
                ${card("Data status", games.length ? "Available" : "Limited", team.sport === "MLB" ? "pitcher data optional" : "injury data optional")}
            </div>
            <article class="panel panel--nested"><header><p class="eyebrow">Last 5 loaded games</p><h2>Team game context</h2></header>${games.length ? renderGameTable(team.sport, games.slice(0, 5)) : emptyState("No games for this team", "Load a prediction export containing this team.")}</article>
        </section>
    `;
}

function renderTracking() {
    const stats = calculateTrackerStats();
    $("#view-tracking").innerHTML = `
        <section class="module-header panel">
            <div><p class="eyebrow">Betting Slip / Unit Tracker</p><h2>Local analysis ledger</h2><p class="muted">For analysis and tracking only. Predictions are experimental and not financial advice.</p></div>
            <div class="report-actions"><button class="btn" id="export-tracker-btn">Export CSV</button><button class="btn btn--danger" id="clear-tracker-btn">Clear Tracker</button></div>
        </section>
        <section class="summary-grid summary-grid--compact">
            ${card("Tracked picks", state.tracker.length, "localStorage")}
            ${card("Total units", formatNumber(stats.totalUnits, 2), "risked")}
            ${card("ROI", `${formatNumber(stats.roi * 100, 1)}%`, "manual results")}
            ${card("Win rate", formatProbability(stats.winRate), `${stats.wins}-${stats.losses}-${stats.pushes}`)}
            ${card("Average confidence", stats.avgConfidence || "-", "saved picks")}
        </section>
        <section class="panel">
            ${state.tracker.length ? renderTrackerTable() : emptyState("No saved tracker picks", "Open NFL or MLB, select a matchup, and click Add to Tracker.")}
        </section>
    `;
}

function calculateTrackerStats() {
    const totalUnits = state.tracker.reduce((sum, pick) => sum + safeNumber(pick.units, 0), 0);
    const wins = state.tracker.filter(pick => pick.result === "Win").length;
    const losses = state.tracker.filter(pick => pick.result === "Loss").length;
    const pushes = state.tracker.filter(pick => pick.result === "Push").length;
    const profit = state.tracker.reduce((sum, pick) => sum + safeNumber(pick.profit, 0), 0);
    const decided = wins + losses;
    const avgConfidence = state.tracker.length ? state.tracker.map(pick => pick.confidence).filter(Boolean)[0] || "Mixed" : "-";
    return { totalUnits, wins, losses, pushes, profit, roi: totalUnits ? profit / totalUnits : 0, winRate: decided ? wins / decided : null, avgConfidence };
}

function renderTrackerTable() {
    return `<div class="table-wrapper"><table class="data-table"><thead><tr><th>Date</th><th>Sport</th><th>Game</th><th>Pick</th><th>Prob</th><th>Conf</th><th>Units</th><th>Result</th><th>P/L</th><th>Notes</th></tr></thead><tbody>${state.tracker.map((pick, index) => `<tr><td>${formatDate(pick.date)}</td><td>${pick.sport}</td><td>${escapeHtml(pick.game)}</td><td>${escapeHtml(pick.pick)}</td><td>${formatProbability(pick.probability)}</td><td>${confidenceTag(pick.confidence)}</td><td><input class="cell-input" data-tracker-field="units" data-tracker-index="${index}" type="number" step="0.25" value="${pick.units ?? 1}"></td><td><select class="cell-input" data-tracker-field="result" data-tracker-index="${index}">${["Pending", "Win", "Loss", "Push"].map(value => `<option ${pick.result === value ? "selected" : ""}>${value}</option>`).join("")}</select></td><td><input class="cell-input" data-tracker-field="profit" data-tracker-index="${index}" type="number" step="0.01" value="${pick.profit ?? 0}"></td><td><input class="cell-input" data-tracker-field="notes" data-tracker-index="${index}" value="${escapeHtml(pick.notes || "")}"></td></tr>`).join("")}</tbody></table></div>`;
}

function addToTracker(sport, gameId) {
    const game = (sport === "NFL" ? state.nfl.games : state.mlb.games).find(row => String(row.game_id || row.id || "") === String(gameId));
    if (!game) return;
    state.tracker.unshift({
        id: `${Date.now()}-${sport}-${gameId}`,
        date: game.game_date || new Date().toISOString().slice(0, 10),
        sport,
        game: `${game.away} @ ${game.home}`,
        pick: getGamePick(game, sport),
        line: sport === "NFL" ? game.spread_line : game.moneyline_home,
        probability: getGameProbability(game, sport),
        confidence: getGameConfidence(game, sport),
        units: 1,
        result: "Pending",
        profit: 0,
        notes: "",
    });
    saveTracker();
    showToast("Added to tracker");
    renderTracking();
}

function exportTrackerCsv() {
    const header = ["date", "sport", "game", "pick", "line", "probability", "confidence", "units", "result", "profit", "notes"];
    const rows = state.tracker.map(pick => header.map(key => `"${String(pick[key] ?? "").replaceAll('"', '""')}"`).join(","));
    const blob = new Blob([[header.join(","), ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "linelens-tracker.csv";
    link.click();
    URL.revokeObjectURL(url);
}

function renderSettings() {
    const modes = [
        ["App version", state.app.version || APP_VERSION, "Visible release metadata"],
        ["NFL data mode", dataMode(state.nfl.payload, state.nfl.games), "data/predictions/nfl_predictions.json"],
        ["MLB data mode", dataMode(state.mlb.payload, state.mlb.games), "data/predictions/mlb_predictions.json"],
        ["MLB Stats API", "No key required", "schedule/probable pitchers/status/scores"],
        ["NFL data", "nfl-data-py/cached pipeline", "exported NFL predictions or offseason cache"],
        ["Odds API", oddsStatusLabel(), "optional The Odds API via ODDS_API_KEY"],
        ["Reports mode", state.report?.metadata?.demo ? "demo" : state.report ? "real" : "missing", "data/reports/model_report.json"],
        ["Team metadata", state.teamPayload?.teams?.length ? `${state.teamPayload.teams.length} teams` : "missing", "data/team_metadata.json"],
        ["Desktop build", "GitHub Actions", ".github/workflows/tauri-windows-build.yml"],
        ["Refresh runtime", state.refreshRuntime.available ? "Available in desktop app" : "Not available in browser/static mode", state.refreshRuntime.message],
    ];
    $("#view-settings").innerHTML = `
        <section class="module-header panel">
            <div><p class="eyebrow">Settings / Data Status</p><h2>Environment, data files, and build path</h2><p class="muted">Local native Tauri build is optional. This work machine can use GitHub Actions for Windows bundles.</p></div>
            <span class="chip">${escapeHtml(state.app.version || APP_VERSION)}</span>
        </section>
        ${renderRefreshPanel("settings")}
        <section class="panel"><div class="settings-grid">${modes.map(([label, status, note]) => `<div class="setting-row"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(status)}</span><code>${escapeHtml(note)}</code></div>`).join("")}</div></section>
        <section class="panel"><p class="data-status" data-variant="warning">Python data refresh is not available from the desktop shell yet. Run CLI commands from terminal. Tracking data is stored locally in <code>${TRACKER_KEY}</code>.</p><p class="muted">For analysis and tracking only. Predictions are experimental and not financial advice.</p></section>
    `;
}

function renderAll() {
    renderHome();
    renderNFL();
    renderMLB();
    renderReports();
    renderTeams();
    renderTracking();
    renderSettings();
    switchView(state.selected.view || "home");
}

function bindEvents() {
    document.addEventListener("click", event => {
        const viewLink = event.target.closest("[data-view-link]");
        if (viewLink) switchView(viewLink.dataset.viewLink);

        const nav = event.target.closest(".nav__item");
        if (nav) switchView(nav.dataset.view);

        const team = event.target.closest("[data-team-code]");
        if (team) {
            state.selected.teamSport = team.dataset.teamSport;
            state.selected.teamCode = team.dataset.teamCode;
            persistSettings();
            renderTeams();
            switchView("teams");
        }

        const row = event.target.closest("[data-select-game]");
        if (row && !event.target.closest("[data-team-code]")) {
            const sport = row.dataset.selectGame;
            const source = sport === "NFL" ? state.nfl.games : state.mlb.games;
            const game = source.find(item => String(item.game_id || item.id || "") === row.dataset.gameId) || source[Number(row.dataset.gameIndex)];
            state.selected[sport.toLowerCase()] = game;
            persistSettings();
            sport === "NFL" ? renderNFL() : renderMLB();
        }

        const tracker = event.target.closest("[data-add-tracker]");
        if (tracker) addToTracker(tracker.dataset.addTracker, tracker.dataset.gameId);

        if (event.target.id === "copy-report-btn") {
            navigator.clipboard?.writeText($("#generated-report")?.value || "");
            showToast("Report copied");
        }
        const generator = event.target.closest("[data-generate-report]");
        if (generator) {
            $("#generated-report").value = generateReportText(generator.dataset.generateReport);
        }
        if (event.target.id === "export-tracker-btn") exportTrackerCsv();
        const refreshButton = event.target.closest("[data-refresh-sport]");
        if (refreshButton) refreshData(refreshButton.dataset.refreshSport);
        if (event.target.id === "clear-tracker-btn" && confirm("Clear all locally tracked picks?")) {
            state.tracker = [];
            saveTracker();
            renderTracking();
        }
    });

    document.addEventListener("change", event => {
        if (event.target.id === "report-sport-select") {
            state.selected.reportSport = event.target.value;
            persistSettings();
            renderReports();
        }
        if (event.target.id === "team-sport-select") {
            state.selected.teamSport = event.target.value;
            state.selected.teamCode = (state.teamPayload.teams || []).find(team => team.sport === event.target.value)?.abbreviation || "";
            persistSettings();
            renderTeams();
        }
        if (event.target.id === "team-select") {
            state.selected.teamCode = event.target.value;
            persistSettings();
            renderTeams();
        }
        const trackerInput = event.target.closest("[data-tracker-field]");
        if (trackerInput) {
            const index = Number(trackerInput.dataset.trackerIndex);
            const field = trackerInput.dataset.trackerField;
            state.tracker[index][field] = ["units", "profit"].includes(field) ? safeNumber(trackerInput.value, 0) : trackerInput.value;
            saveTracker();
            renderTracking();
        }
    });

    $("#refresh-btn").addEventListener("click", () => loadAll());
}

document.addEventListener("DOMContentLoaded", () => {
    bindEvents();
    loadAll();
});
