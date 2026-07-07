const WIDGET_KEY = "linelens.liveWidget.v1";

const state = {
    payload: window.__LIVE_SCORES__ || { metadata: { source_status: "missing" }, games: [] },
    teams: window.__TEAM_METADATA__ || { teams: [] },
    mlbPayload: window.__MLB_PREDICTIONS__ || null,
    mlbBacktestPayload: window.__MLB_BACKTEST_PREDICTIONS__ || null,
    nflPayload: window.__NFL_PREDICTIONS__ || window.__PREDICTIONS__ || null,
    predictionLog: window.__MODEL_PREDICTIONS_LOG__ || null,
    modelRecord: window.__MODEL_RECORD__ || null,
    games: [],
    sport: "All",
    mode: "Today",
    selectedDate: null,
    selectedIndex: 0,
    expanded: false,
    workMode: false,
    refreshInterval: 30,
    refreshing: false,
    refreshStatus: "Loading local schedule...",
    timer: null,
};

const $ = selector => document.querySelector(selector);

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

function formatEdge(value) {
    const numeric = safeNumber(value);
    if (numeric === null) return "No edge";
    return `${numeric >= 0 ? "+" : ""}${(numeric * 100).toFixed(1)} pts`;
}

function formatTimestamp(value) {
    if (!value) return "Not refreshed";
    if (String(value).startsWith("unix:")) {
        const seconds = Number(String(value).slice(5));
        return Number.isFinite(seconds) ? new Date(seconds * 1000).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : value;
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatDateLabel(value) {
    const date = parseLocalDate(value);
    if (!date) return "No date";
    const today = parseLocalDate(todayIso());
    const diff = Math.round((date - today) / 86400000);
    if (diff === -1) return "Yesterday";
    if (diff === 0) return "Today";
    if (diff === 1) return "Tomorrow";
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function parseLocalDate(value) {
    const iso = toIsoDate(value);
    if (!iso) return null;
    const [year, month, day] = iso.split("-").map(Number);
    return new Date(year, month - 1, day);
}

function toIsoDate(value) {
    if (!value) return "";
    const raw = String(value);
    const direct = raw.match(/^(\d{4}-\d{2}-\d{2})/);
    if (direct) return direct[1];
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function todayIso() {
    return new Date().toISOString().slice(0, 10);
}

function addDaysIso(value, days) {
    const date = parseLocalDate(value || todayIso()) || new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
}

function isTauri() {
    return Boolean(window.__TAURI__?.core?.invoke || window.__TAURI__?.invoke);
}

function tauriInvoke(command, payload = {}) {
    const invoker = window.__TAURI__?.core?.invoke || window.__TAURI__?.invoke;
    if (!invoker) return Promise.reject(new Error("Tauri invoke is unavailable."));
    return invoker(command, payload);
}

function savePrefs() {
    localStorage.setItem(WIDGET_KEY, JSON.stringify({
        sport: state.sport,
        mode: state.mode,
        selectedDate: state.selectedDate,
        selectedIndex: state.selectedIndex,
        expanded: state.expanded,
        workMode: state.workMode,
        refreshInterval: state.refreshInterval,
    }));
}

function loadPrefs() {
    try {
        const saved = JSON.parse(localStorage.getItem(WIDGET_KEY) || "{}");
        Object.assign(state, {
            sport: saved.sport || state.sport,
            mode: saved.mode || state.mode,
            selectedDate: saved.selectedDate || state.selectedDate,
            selectedIndex: safeNumber(saved.selectedIndex, state.selectedIndex),
            expanded: Boolean(saved.expanded),
            workMode: Boolean(saved.workMode),
            refreshInterval: safeNumber(saved.refreshInterval, state.refreshInterval),
        });
    } catch (_error) {
        savePrefs();
    }
}

function showToast(message) {
    const toast = $("#widget-toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.setTimeout(() => toast.classList.remove("is-visible"), 2400);
}

async function fetchJson(url) {
    const response = await fetch(url, { cache: "no-cache" });
    if (!response.ok) throw new Error(`${url} returned ${response.status}`);
    return response.json();
}

async function loadJson(url, globalName) {
    let payload = window[globalName] || null;
    if (window.location.protocol !== "file:") {
        try {
            payload = await fetchJson(url);
        } catch (_error) {
            // Keep script-tag/global data if a JSON fetch is unavailable.
        }
    }
    return payload;
}

async function loadLocalData(status = "Loading local schedule...") {
    state.refreshStatus = status;
    render();
    const [live, mlb, nfl, predictionLog, modelRecord] = await Promise.all([
        loadJson("data/live/live_scores.json", "__LIVE_SCORES__"),
        loadJson("data/predictions/mlb_predictions.json", "__MLB_PREDICTIONS__"),
        loadJson("data/predictions/nfl_predictions.json", "__NFL_PREDICTIONS__"),
        loadJson("data/tracking/model_predictions_log.json", "__MODEL_PREDICTIONS_LOG__"),
        loadJson("data/tracking/model_record.json", "__MODEL_RECORD__"),
    ]);
    state.payload = live || state.payload;
    state.mlbPayload = mlb || state.mlbPayload;
    state.nflPayload = nfl || state.nflPayload;
    state.predictionLog = predictionLog || state.predictionLog;
    state.modelRecord = modelRecord || state.modelRecord;
    state.games = buildUnifiedGames();
    if (!state.games.length) {
        state.mlbBacktestPayload = await loadJson("data/predictions/mlb_backtest_predictions.json", "__MLB_BACKTEST_PREDICTIONS__") || state.mlbBacktestPayload;
        state.games = buildUnifiedGames();
    }
    ensureSelectedDate();
    clampSelectedIndex();
    state.refreshStatus = state.games.length
        ? sourceStatusLabel()
        : "No local schedule found. Run npm run refresh:live or npm run refresh:mlb.";
    render();
}

function normalizeTeam(value) {
    return String(value || "UNK").trim().toUpperCase();
}

function gameDate(game) {
    return toIsoDate(game.game_date || game.game_time || game.start_time || game.generated_at);
}

function gameTimestamp(game) {
    const raw = game.game_time || game.start_time || game.game_date;
    const date = new Date(raw);
    if (!Number.isNaN(date.getTime())) return date.getTime();
    const iso = gameDate(game);
    return iso ? new Date(`${iso}T12:00:00`).getTime() : Number.MAX_SAFE_INTEGER;
}

function isLiveGame(game) {
    const status = String(game.status || game.status_detail || "").toLowerCase();
    return status.includes("progress") || status.includes("live") || status.includes("warmup");
}

function isFinalGame(game) {
    const status = String(game.status || game.status_detail || "").toLowerCase();
    return status.includes("final") || status.includes("completed");
}

function hasPrediction(game) {
    return Boolean(game.model?.prediction_available || game.model?.pick || game.model_pick);
}

function predictionModel(game, sport = "MLB") {
    if (!game || !game.model_pick) {
        return {
            prediction_available: false,
            label: "No model pick",
            prediction_status: "no_prediction",
        };
    }
    const homeProbability = safeNumber(game.home_win_probability ?? game.home_cover_probability ?? game.model_home_win ?? game.model_home_cover);
    const awayProbability = safeNumber(game.away_win_probability ?? game.away_cover_probability);
    const confidenceScore = safeNumber(game.confidence_score, homeProbability === null && awayProbability === null ? null : Math.max(homeProbability || 0, awayProbability || 0));
    const edge = safeNumber(game.edge, confidenceScore === null ? null : Math.abs(confidenceScore - 0.5));
    return {
        prediction_available: true,
        pick: game.model_pick,
        home_win_probability: homeProbability,
        away_win_probability: awayProbability,
        edge,
        confidence: game.confidence,
        confidence_score: confidenceScore,
        confidence_label: game.confidence || modelTier(confidenceScore, edge),
        top_factor: game.top_factor_label || game.top_factor || game.explanation?.top_factors?.[0]?.label || (sport === "NFL" ? "Spread model" : "Model signal"),
        source: "LineLens prediction export",
        prediction_status: "prediction_joined",
    };
}

function modelTier(confidence, edge) {
    const value = safeNumber(confidence, 0.5);
    const absEdge = Math.abs(safeNumber(edge, Math.abs(value - 0.5)));
    if (value >= 0.65 || absEdge >= 0.15) return "Hot Pick";
    if (value >= 0.60 || absEdge >= 0.10) return "Strong Edge";
    if (value >= 0.55 || absEdge >= 0.05) return "Model Lean";
    return "Normal";
}

function normalizeLiveGame(game) {
    const model = game.model || predictionModel(game, game.sport || "MLB");
    return {
        ...game,
        sport: game.sport || "MLB",
        away: normalizeTeam(game.away),
        home: normalizeTeam(game.home),
        data_mode: game.data_mode || (model?.prediction_available ? "prediction_joined" : "schedule_only"),
        source_status: game.source_status || state.payload?.metadata?.source_status || "live_cached",
        model: model?.pick || model?.prediction_available ? model : { ...model, prediction_available: false, label: "No model pick" },
    };
}

function predictionGame(game, sport, sourceStatus = "prediction_export") {
    const model = predictionModel(game, sport);
    return {
        sport,
        game_id: String(game.game_id || game.id || ""),
        game_date: game.game_date || game.date || game.generated_at,
        game_time: game.game_time || game.start_time || game.game_date,
        status: game.status || (game.completed ? "Final" : "Scheduled"),
        status_detail: game.status || game.result || game.model_result || (game.completed ? "Final" : "Scheduled"),
        source: sport === "NFL" ? "LineLens NFL prediction export" : "LineLens MLB prediction export",
        source_status: sourceStatus,
        data_mode: model.prediction_available ? "prediction_joined" : (game.prediction_mode || "schedule_only"),
        away: normalizeTeam(game.away),
        home: normalizeTeam(game.home),
        away_display: game.away_display || game.away,
        home_display: game.home_display || game.home,
        away_score: game.away_score,
        home_score: game.home_score,
        season: game.season,
        week: game.week,
        probable_pitchers: {
            away: game.away_probable_pitcher,
            home: game.home_probable_pitcher,
        },
        latest_play: null,
        plays: [],
        model,
        model_result: game.model_result,
        live_note: model.prediction_available ? "Showing exported LineLens model pick." : "Schedule-only row. No model pick.",
    };
}

function logGame(row) {
    return {
        sport: row.sport || "MLB",
        game_id: String(row.game_id || ""),
        game_date: row.game_date || row.generated_at,
        game_time: row.game_date || row.generated_at,
        status: row.result_status === "scored" ? "Final" : "Logged Prediction",
        status_detail: row.result_status || "logged prediction",
        source: "LineLens prediction log",
        source_status: "prediction_log",
        data_mode: "logged_prediction",
        away: normalizeTeam(row.away),
        home: normalizeTeam(row.home),
        away_score: row.away_score,
        home_score: row.home_score,
        model: {
            prediction_available: Boolean(row.model_pick),
            pick: row.model_pick,
            home_win_probability: safeNumber(row.home_win_probability),
            away_win_probability: safeNumber(row.away_win_probability),
            edge: safeNumber(row.edge),
            confidence_score: safeNumber(row.confidence),
            confidence_label: modelTier(row.confidence, row.edge),
            source: "LineLens prediction log",
            prediction_status: "prediction_joined",
        },
        model_result: row.model_result,
        latest_play: null,
        plays: [],
        live_note: "Logged model prediction row.",
    };
}

function buildUnifiedGames() {
    const liveGames = (state.payload?.games || []).map(normalizeLiveGame);
    const mlbGames = (state.mlbPayload?.games || []).map(game => predictionGame(game, "MLB", "mlb_prediction_export"));
    const nflGames = (state.nflPayload?.games || []).map(game => predictionGame(game, "NFL", "nfl_prediction_export")).slice(0, 40);
    const logged = (state.predictionLog?.predictions || []).map(logGame).slice(0, 40);
    const primary = dedupeGames([...liveGames, ...mlbGames, ...nflGames, ...logged]);
    if (primary.length) return sortGames(primary);
    const backtest = (state.mlbBacktestPayload?.games || [])
        .filter(game => game.model_pick)
        .sort((a, b) => String(b.game_date || "").localeCompare(String(a.game_date || "")))
        .slice(0, 40)
        .map(game => predictionGame(game, "MLB", "mlb_backtest_export"));
    return sortGames(dedupeGames(backtest));
}

function gameIdentity(game) {
    if (game.game_id) return `${game.sport}:id:${game.game_id}`;
    return `${game.sport}:${gameDate(game)}:${game.away}:${game.home}`;
}

function dedupeGames(games) {
    const seen = new Set();
    return games.filter(game => {
        const key = gameIdentity(game);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function sortGames(games) {
    return [...games].sort((a, b) => {
        const liveDiff = Number(isLiveGame(b)) - Number(isLiveGame(a));
        if (liveDiff) return liveDiff;
        return gameTimestamp(a) - gameTimestamp(b);
    });
}

function availableDates() {
    return [...new Set(state.games.map(gameDate).filter(Boolean))].sort();
}

function ensureSelectedDate() {
    const dates = availableDates();
    if (!dates.length) {
        state.selectedDate = state.selectedDate || todayIso();
        return;
    }
    if (state.selectedDate && dates.includes(state.selectedDate)) return;
    const today = todayIso();
    state.selectedDate = dates.includes(today)
        ? today
        : dates.find(date => date > today) || dates.at(-1) || today;
    savePrefs();
}

function scopedGamesForDate(date = state.selectedDate) {
    return state.games.filter(game => gameDate(game) === date && (state.sport === "All" || game.sport === state.sport));
}

function filteredGames() {
    const games = state.games.filter(game => state.sport === "All" || game.sport === state.sport);
    const today = todayIso();
    if (state.mode === "Live") return games.filter(isLiveGame);
    if (state.mode === "Today") return games.filter(game => gameDate(game) === today);
    if (state.mode === "Upcoming") return games.filter(game => !isFinalGame(game) && gameDate(game) >= (state.selectedDate || today));
    if (state.mode === "Finals") return scopedGamesForDate().filter(isFinalGame);
    if (state.mode === "Predictions") return scopedGamesForDate().filter(hasPrediction);
    return scopedGamesForDate();
}

function displayGames() {
    const filtered = filteredGames();
    if (filtered.length) return filtered;
    if (state.mode === "Live") {
        const todayRows = state.games.filter(game => gameDate(game) === todayIso() && (state.sport === "All" || game.sport === state.sport));
        if (todayRows.length) return todayRows;
        const upcoming = state.games.filter(game => !isFinalGame(game) && (state.sport === "All" || game.sport === state.sport));
        if (upcoming.length) return upcoming;
    }
    return filtered;
}

function clampSelectedIndex() {
    const count = displayGames().length || 1;
    state.selectedIndex = Math.max(0, Math.min(state.selectedIndex, count - 1));
}

function selectedGame() {
    const source = displayGames();
    if (!source.length) return null;
    clampSelectedIndex();
    return source[state.selectedIndex];
}

function statusChip(game) {
    const status = game?.status || game?.status_detail || "Pending";
    const tone = isLiveGame(game) ? "live" : isFinalGame(game) ? "final" : "scheduled";
    return `<span class="status-chip status-chip--${tone}">${escapeHtml(status)}</span>`;
}

function dataModeChip(game) {
    const label = game?.model?.prediction_available
        ? "Prediction"
        : game?.data_mode === "backtest"
            ? "Backtest"
            : "Schedule only";
    return `<span class="model-chip">${escapeHtml(label)}</span>`;
}

function scoreValue(value, game) {
    const score = safeNumber(value);
    if (score === null && !isLiveGame(game) && !isFinalGame(game)) return "";
    return score === null ? "-" : String(score);
}

function scoreRow(game) {
    return `
        <div class="score-row">
            <div class="team-score"><span>${escapeHtml(game.away || "AWAY")}</span><strong>${scoreValue(game.away_score, game)}</strong></div>
            <div class="score-at">@</div>
            <div class="team-score"><span>${escapeHtml(game.home || "HOME")}</span><strong>${scoreValue(game.home_score, game)}</strong></div>
        </div>
    `;
}

function gameTimeLabel(game) {
    const raw = game.game_time || game.game_date;
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return game.status_detail || "Time TBD";
    if (String(raw).length <= 10) return formatDateLabel(raw);
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function countLine(game) {
    if (!game) return "Status unavailable";
    if (isFinalGame(game)) return finalScoreLine(game) || "Final";
    const parts = [];
    if (game.inning_state || game.inning) parts.push(`${game.inning_state || ""} ${game.inning || ""}`.trim());
    if (safeNumber(game.outs) !== null) parts.push(`${game.outs} out${Number(game.outs) === 1 ? "" : "s"}`);
    if (safeNumber(game.balls) !== null && safeNumber(game.strikes) !== null) parts.push(`${game.balls}-${game.strikes} count`);
    if (parts.length) return parts.join(" · ");
    if (game.status === "Scheduled" || game.status === "Pre-Game") return `${formatDateLabel(gameDate(game))} · ${gameTimeLabel(game)}`;
    return game.status_detail || game.status || "Status unavailable";
}

function finalScoreLine(game) {
    const away = safeNumber(game.away_score);
    const home = safeNumber(game.home_score);
    if (away === null || home === null) return "";
    return `${game.away} ${away}, ${game.home} ${home}`;
}

function basesLine(game) {
    const bases = game.bases || {};
    const occupied = [
        bases.first ? "1st" : null,
        bases.second ? "2nd" : null,
        bases.third ? "3rd" : null,
    ].filter(Boolean);
    if (!isLiveGame(game)) return game.probable_pitchers ? pitcherLine(game) : "Schedule only";
    return occupied.length ? `Runners: ${occupied.join(" + ")}` : "Bases empty / unavailable";
}

function pitcherLine(game) {
    const pitchers = game.probable_pitchers || {};
    const away = pitchers.away || "TBD";
    const home = pitchers.home || "TBD";
    return `${away} vs ${home}`;
}

function pickProbability(game) {
    const model = game.model || {};
    if (!model.pick) return null;
    if (model.pick === game.home) return safeNumber(model.home_win_probability);
    if (model.pick === game.away) return safeNumber(model.away_win_probability);
    return safeNumber(model.confidence_score, Math.max(safeNumber(model.home_win_probability, 0), safeNumber(model.away_win_probability, 0)));
}

function modelLine(game) {
    const model = game.model || {};
    if (!model.pick) return `<span class="model-line"><strong>No model pick</strong> · schedule only</span>`;
    return `<span class="model-line">Model: <strong>${escapeHtml(model.pick)}</strong> ${formatProbability(pickProbability(game))} · ${formatEdge(model.edge)}</span>`;
}

function resultLine(game) {
    const result = game.model_result || game.result_status;
    if (!result) return "";
    const normalized = String(result).toLowerCase();
    const label = normalized === "win" ? "Won" : normalized === "loss" ? "Lost" : normalized === "push" ? "Push" : result;
    const tone = normalized.includes("win") ? "win" : normalized.includes("loss") ? "loss" : normalized.includes("push") ? "push" : "pending";
    return `<span class="result-chip result-chip--${tone}">${escapeHtml(label)}</span>`;
}

function latestPlay(game) {
    if (game.latest_play) return game.latest_play;
    if (isFinalGame(game)) return game.model_result ? `Pick ${game.model?.pick || "-"}: ${game.model_result}` : "Final score loaded. No logged pick.";
    if (!game.model?.pick) return "No model pick for this game.";
    return game.live_note || "Pitch-by-pitch unavailable for this game.";
}

function widgetTitle(game) {
    if (isLiveGame(game)) return "LineLens Live";
    if (isFinalGame(game)) return "Final";
    return "LineLens Today";
}

function renderCompact(game) {
    if (!game) return renderEmpty();
    return `
        <section class="widget-frame is-compact ${state.workMode ? "is-work-mode" : ""}" data-tauri-drag-region>
            ${renderHeader(game)}
            <article class="featured-game">
                ${scoreRow(game)}
                <div class="status-line"><span class="live-dot ${isLiveGame(game) ? "" : "is-muted"}"></span> <strong>${escapeHtml(countLine(game))}</strong> ${statusChip(game)} ${dataModeChip(game)} ${resultLine(game)}</div>
                <div class="latest-play">${isLiveGame(game) ? "Last play" : "Note"}: ${escapeHtml(latestPlay(game))}</div>
                ${modelLine(game)}
            </article>
            <div class="compact-controls">
                <button class="widget-icon-btn" data-prev-game>Prev</button>
                <button class="widget-icon-btn" data-next-game>Next</button>
                <span class="base-line">${escapeHtml(basesLine(game))}</span>
                <button class="widget-icon-btn" data-toggle-expanded>Expand</button>
            </div>
        </section>
    `;
}

function renderHeader(game = null) {
    return `
        <header class="widget-header" data-tauri-drag-region>
            <div class="widget-title">
                <strong>${escapeHtml(game ? widgetTitle(game) : "LineLens Live")}</strong>
                <span>${escapeHtml(state.refreshStatus || sourceStatusLabel())}</span>
            </div>
            <div class="widget-actions">
                <button class="widget-icon-btn" data-refresh-live title="Refresh live scores">Refresh</button>
                <button class="widget-icon-btn" data-toggle-work>${state.workMode ? "Work On" : "Work"}</button>
                <button class="widget-icon-btn" data-toggle-expanded>${state.expanded ? "Compact" : "Expand"}</button>
            </div>
        </header>
    `;
}

function renderFilters() {
    return `
        <div class="widget-segments">
            ${["All", "MLB", "NFL"].map(value => `<button data-sport="${value}" class="${state.sport === value ? "is-active" : ""}">${value}</button>`).join("")}
        </div>
        <div class="widget-segments widget-segments--modes">
            ${["All", "Live", "Today", "Upcoming", "Finals", "Predictions"].map(value => `<button data-mode="${value}" class="${state.mode === value ? "is-active" : ""}">${value}</button>`).join("")}
        </div>
        ${renderDateNav()}
    `;
}

function renderDateNav() {
    return `
        <div class="widget-date-nav">
            <button class="widget-icon-btn" data-date-step="-1" title="Previous day">&lsaquo;</button>
            <input type="date" data-widget-date value="${escapeHtml(state.selectedDate || todayIso())}" />
            <button class="widget-icon-btn" data-date-today>Today</button>
            <button class="widget-icon-btn" data-date-step="1" title="Next day">&rsaquo;</button>
        </div>
    `;
}

function renderIntervalSelect() {
    const options = [
        [30, "30s"],
        [60, "60s"],
        [120, "2m"],
        [0, "Off"],
    ];
    return `
        <select class="widget-interval" data-refresh-interval aria-label="Auto refresh interval">
            ${options.map(([value, label]) => `<option value="${value}" ${state.refreshInterval === value ? "selected" : ""}>${label}</option>`).join("")}
        </select>
    `;
}

function emptyScopeMessage() {
    if (state.mode === "Predictions") return "No model picks for this date.";
    if (state.mode === "Finals") return "No final games found for this date.";
    if (state.mode === "Live") return "No live games right now. Showing cached schedule when available.";
    return `No ${state.sport === "All" ? "" : `${state.sport} `}games found for ${formatDateLabel(state.selectedDate)}.`;
}

function renderGameList(games) {
    if (!games.length) return `<div class="widget-empty widget-empty--inline"><strong>${escapeHtml(emptyScopeMessage())}</strong><span>Try another date or run npm run refresh:live.</span></div>`;
    return `
        <div class="game-list">
            ${games.map((game, index) => `
                <button class="game-row ${index === state.selectedIndex ? "is-active" : ""}" data-select-game="${index}">
                    <strong>${escapeHtml(game.away || "AWAY")} @ ${escapeHtml(game.home || "HOME")}</strong>
                    ${statusChip(game)}
                    <span>${escapeHtml(countLine(game))}</span>
                    <span>${escapeHtml(game.model?.pick ? `Pick ${game.model.pick}` : "No model pick")}</span>
                </button>
            `).join("")}
        </div>
    `;
}

function renderDetail(game) {
    if (!game) return renderEmpty();
    return `
        <section class="game-detail">
            <article class="featured-game">
                ${scoreRow(game)}
                <div class="status-line"><span class="live-dot ${isLiveGame(game) ? "" : "is-muted"}"></span> <strong>${escapeHtml(countLine(game))}</strong> ${statusChip(game)} ${dataModeChip(game)} ${resultLine(game)}</div>
                <div class="base-line">${escapeHtml(basesLine(game))}</div>
                <div class="latest-play">${isLiveGame(game) ? "Latest" : "Note"}: ${escapeHtml(latestPlay(game))}</div>
                ${modelLine(game)}
            </article>
            <div class="detail-grid">
                <div class="detail-cell"><span>Pitchers</span><strong>${escapeHtml(game.sport === "MLB" ? pitcherLine(game) : "NFL live feed unavailable")}</strong></div>
                <div class="detail-cell"><span>Model status</span><strong>${escapeHtml(game.model?.pick ? game.model.confidence_label || "Prediction joined" : "No model pick")}</strong></div>
                <div class="detail-cell"><span>Data status</span><strong>${escapeHtml(game.source_status || state.payload?.metadata?.source_status || "cached")}</strong></div>
                <div class="detail-cell"><span>Refreshed</span><strong>${escapeHtml(formatTimestamp(state.payload?.metadata?.generated_at))}</strong></div>
            </div>
            ${renderPlayFeed(game)}
        </section>
    `;
}

function renderPlayFeed(game) {
    const plays = Array.isArray(game.plays) ? game.plays : [];
    if (!plays.length) {
        return `<div class="widget-empty widget-empty--inline"><strong>Play feed unavailable</strong><span>${escapeHtml(game.live_error || game.live_note || "Showing schedule/score/model data only for this game.")}</span></div>`;
    }
    return `
        <div class="play-feed">
            ${plays.slice(0, 20).map(play => `
                <div class="play-row">
                    <span>${escapeHtml([play.half, play.inning ? `Inning ${play.inning}` : "", play.count, safeNumber(play.outs) !== null ? `${play.outs} out${Number(play.outs) === 1 ? "" : "s"}` : ""].filter(Boolean).join(" · "))}</span>
                    <strong>${escapeHtml(play.description || play.event || "Play update")}</strong>
                </div>
            `).join("")}
        </div>
    `;
}

function renderExpanded(game, games) {
    return `
        <section class="widget-frame ${state.workMode ? "is-work-mode" : ""}" data-tauri-drag-region>
            ${renderHeader(game)}
            ${renderFilters()}
            <section class="expanded-layout">
                ${renderGameList(games)}
                ${renderDetail(game)}
            </section>
            <footer class="widget-footer">
                <button data-open-full>Open Full App</button>
                <button data-refresh-live>Refresh Now</button>
                ${renderIntervalSelect()}
                <button data-toggle-expanded>Compact Mode</button>
            </footer>
        </section>
    `;
}

function renderEmpty() {
    const manual = isTauri()
        ? "Refresh live scores to load today games."
        : "Live refresh runs in the Tauri desktop app. Browser mode can run npm run refresh:live manually.";
    return `
        <section class="widget-frame ${state.workMode ? "is-work-mode" : ""}">
            ${renderHeader()}
            ${renderFilters()}
            <div class="widget-empty">
                <strong>No real schedule or prediction rows loaded</strong>
                <span>${escapeHtml(manual)}</span>
                <code>npm run refresh:live</code>
                <code>npm run refresh:mlb</code>
            </div>
        </section>
    `;
}

function sourceStatusLabel() {
    const metadata = state.payload?.metadata || {};
    const count = state.games.length || (Array.isArray(state.payload?.games) ? state.payload.games.length : 0);
    return `${metadata.source_status || "cached"} · ${count} games · ${formatTimestamp(metadata.generated_at)}`;
}

function render() {
    const root = $("#widget-root");
    if (!root) return;
    const games = displayGames();
    const game = selectedGame();
    root.innerHTML = state.expanded ? renderExpanded(game, games) : renderCompact(game);
    root.classList.toggle("is-work-mode", state.workMode);
}

async function refreshLive(options = {}) {
    if (state.refreshing) return;
    state.refreshing = true;
    state.refreshStatus = options.background ? "Refreshing live scores..." : "Refreshing live scores...";
    render();
    try {
        if (isTauri()) {
            if (!options.background) showToast("Refreshing live scores...");
            await tauriInvoke("run_refresh_command", { commandName: "live_scores" });
        } else if (!options.background) {
            showToast("Browser mode: run npm run refresh:live for live updates.");
        }
        await loadLocalData("Reloading live schedule...");
        if (!options.background) showToast("Live scores loaded");
    } catch (error) {
        state.refreshStatus = `Showing cached schedule - live refresh failed`;
        if (!options.background) showToast(String(error?.message || error || "Live refresh failed"));
        render();
    } finally {
        state.refreshing = false;
    }
}

async function openFullApp() {
    if (isTauri()) {
        try {
            await tauriInvoke("focus_main_window", {});
            return;
        } catch (_error) {
            // Fall through to browser navigation.
        }
    }
    window.location.href = "index.html";
}

function bindEvents() {
    document.addEventListener("click", event => {
        const sport = event.target.closest("[data-sport]");
        if (sport) {
            state.sport = sport.dataset.sport;
            state.selectedIndex = 0;
            savePrefs();
            render();
        }
        const mode = event.target.closest("[data-mode]");
        if (mode) {
            state.mode = mode.dataset.mode;
            state.selectedIndex = 0;
            savePrefs();
            render();
        }
        const select = event.target.closest("[data-select-game]");
        if (select) {
            state.selectedIndex = safeNumber(select.dataset.selectGame, 0);
            savePrefs();
            render();
        }
        const dateStep = event.target.closest("[data-date-step]");
        if (dateStep) {
            state.selectedDate = addDaysIso(state.selectedDate || todayIso(), safeNumber(dateStep.dataset.dateStep, 0));
            state.mode = state.mode === "Live" ? "All" : state.mode;
            state.selectedIndex = 0;
            savePrefs();
            render();
        }
        if (event.target.closest("[data-date-today]")) {
            state.selectedDate = todayIso();
            state.mode = "Today";
            state.selectedIndex = 0;
            savePrefs();
            render();
        }
        if (event.target.closest("[data-prev-game]")) {
            const count = (displayGames().length || 1);
            state.selectedIndex = (state.selectedIndex - 1 + count) % count;
            savePrefs();
            render();
        }
        if (event.target.closest("[data-next-game]")) {
            const count = (displayGames().length || 1);
            state.selectedIndex = (state.selectedIndex + 1) % count;
            savePrefs();
            render();
        }
        if (event.target.closest("[data-toggle-expanded]")) {
            state.expanded = !state.expanded;
            savePrefs();
            render();
        }
        if (event.target.closest("[data-toggle-work]")) {
            state.workMode = !state.workMode;
            savePrefs();
            render();
        }
        if (event.target.closest("[data-refresh-live]")) refreshLive();
        if (event.target.closest("[data-open-full]")) openFullApp();
    });
    document.addEventListener("change", event => {
        const interval = event.target.closest("[data-refresh-interval]");
        if (interval) {
            state.refreshInterval = safeNumber(interval.value, 30);
            savePrefs();
            startAutoRefresh();
        }
        const dateInput = event.target.closest("[data-widget-date]");
        if (dateInput) {
            state.selectedDate = dateInput.value || todayIso();
            state.mode = state.mode === "Live" ? "All" : state.mode;
            state.selectedIndex = 0;
            savePrefs();
            render();
        }
    });
}

function startAutoRefresh() {
    window.clearInterval(state.timer);
    if (!state.refreshInterval) return;
    state.timer = window.setInterval(() => {
        if (isTauri()) refreshLive({ background: true });
        else loadLocalData("Reloading cached live data...");
    }, Math.max(15, state.refreshInterval) * 1000);
}

document.addEventListener("DOMContentLoaded", async () => {
    loadPrefs();
    bindEvents();
    render();
    await loadLocalData("Loading local schedule...");
    startAutoRefresh();
    if (isTauri()) window.setTimeout(() => refreshLive({ background: true }), 750);
});
