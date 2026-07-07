const APP_VERSION = "v0.7.0";
const TRACKER_KEY = "linelens.tracker.v1";
const SETTINGS_KEY = "linelens.settings.v1";
const REFRESH_LOGS_KEY = "linelens.refreshLogs.v1";

const DATA_SOURCES = {
    app: ["data/app_metadata.json"],
    teams: ["data/team_metadata.json"],
    reports: ["data/reports/model_report.json"],
    modelComparison: ["data/reports/mlb_model_comparison.json"],
    featureSummary: ["data/reports/mlb_feature_summary.json"],
    modelRegistry: ["data/models/model_registry.json"],
    modelRecord: ["data/tracking/model_record.json"],
    predictionLog: ["data/tracking/model_predictions_log.json"],
    bootstrap: ["data/bootstrap_status.json"],
    startup: ["data/startup_status.json"],
    refresh: ["data/refresh_status.json"],
    live: ["data/live/live_scores.json"],
    nfl: ["data/predictions/nfl_predictions.json", "data/predictions.json"],
    mlb: ["data/predictions/mlb_predictions.json"],
    mlbBacktest: ["data/predictions/mlb_backtest_predictions.json"],
};

const state = {
    app: window.__APP_METADATA__ || { app: "LineLens Sports", version: APP_VERSION },
    teamPayload: window.__TEAM_METADATA__ || { teams: [] },
    report: window.__MODEL_REPORT__ || null,
    modelComparison: window.__MLB_MODEL_COMPARISON__ || null,
    featureSummary: window.__MLB_FEATURE_SUMMARY__ || null,
    modelRegistry: window.__MODEL_REGISTRY__ || null,
    modelRecord: window.__MODEL_RECORD__ || null,
    predictionLog: window.__MODEL_PREDICTIONS_LOG__ || null,
    bootstrapStatus: window.__BOOTSTRAP_STATUS__ || null,
    startupStatus: window.__STARTUP_STATUS__ || null,
    refreshStatus: window.__REFRESH_STATUS__ || null,
    live: { payload: window.__LIVE_SCORES__ || null, games: [], error: null },
    refreshRuntime: { available: false, active: false, message: "Checking refresh availability..." },
    nfl: { payload: window.__NFL_PREDICTIONS__ || window.__PREDICTIONS__ || null, games: [], error: null },
    mlb: { payload: window.__MLB_PREDICTIONS__ || null, games: [], error: null },
    mlbBacktest: { payload: window.__MLB_BACKTEST_PREDICTIONS__ || null, games: [], error: null },
    selected: {
        nfl: null,
        mlb: null,
        teamSport: "MLB",
        teamCode: "TOR",
        reportSport: "MLB",
        recordSport: "MLB",
        mlbFilter: "all",
        homeSport: "MLB",
        homeMlbDate: null,
        homeMlbRange: "today",
        homeNflSeason: null,
        homeNflWeek: null,
    },
    tracker: [],
    refreshLogs: [],
    charts: {},
};

const REFRESH_COMMANDS = {
    startup_auto: {
        label: "Startup Automation",
        manual: "npm run startup:auto",
        description: "Bootstrap Python, refresh MLB, and attempt NFL real-data recovery.",
    },
    bootstrap_env: {
        label: "Bootstrap Python Environment",
        manual: "py -3.11 scripts/bootstrap_env.py",
        description: "Create/use .venv, install requirements when needed, and verify imports.",
    },
    startup: {
        label: "Startup Refresh",
        manual: "npm run refresh:startup",
        description: "Refresh cached startup data for all sports.",
    },
    nfl_real: {
        label: "NFL Real Data",
        manual: "npm run refresh:nfl:real",
        description: "Rebuild/export the NFL real-data pipeline when source files are available.",
    },
    mlb_current: {
        label: "MLB Current Predictions",
        manual: "npm run refresh:mlb",
        description: "Refresh current MLB schedule and model predictions.",
    },
    mlb_all: {
        label: "MLB Full Train",
        manual: "npm run refresh:mlb:all",
        description: "Refresh MLB history, train, backtest, and current predictions.",
    },
    mlb_train: {
        label: "MLB Train Only",
        manual: "npm run refresh:mlb:train",
        description: "Train the MLB model and refresh backtest reports.",
    },
    data_real: {
        label: "All Real Data",
        manual: "npm run refresh:data:real",
        description: "Run real-data refresh for all supported sports.",
    },
    check_data: {
        label: "Check Data Status",
        manual: "npm run check:data",
        description: "Read local data/status files without downloading live data.",
    },
    score_models: {
        label: "Score Model Predictions",
        manual: "npm run score:models",
        description: "Score logged model predictions against completed results when available.",
    },
    live_scores: {
        label: "Live Scores",
        manual: "npm run refresh:live",
        description: "Refresh compact live score data for the LineLens Live desktop widget.",
    },
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
    if (String(value).startsWith("unix:")) {
        const seconds = Number(String(value).slice(5));
        if (Number.isFinite(seconds)) return new Date(seconds * 1000).toLocaleString();
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function firstPresent(...values) {
    return values.find(value => value !== null && value !== undefined && value !== "");
}

function gameDateRaw(game) {
    return firstPresent(
        game?.game_date,
        game?.date,
        game?.scheduled_date,
        game?.start_date,
        game?.game_datetime,
        game?.game_time,
        game?.start_time,
        game?.commence_time,
        game?.kickoff,
        game?.first_pitch
    );
}

function toIsoDate(value) {
    if (!value) return "";
    const raw = String(value);
    const direct = raw.match(/^(\d{4}-\d{2}-\d{2})/);
    if (direct) return direct[1];
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return "";
    return date.toISOString().slice(0, 10);
}

function isEpochLikeDate(value) {
    const iso = toIsoDate(value);
    if (!iso) return true;
    return Number(iso.slice(0, 4)) <= 1971;
}

function gameIsoDate(game) {
    const iso = toIsoDate(gameDateRaw(game));
    return iso && !isEpochLikeDate(iso) ? iso : "";
}

function gameTimestamp(game) {
    const raw = gameDateRaw(game);
    if (!raw) return null;
    const iso = toIsoDate(raw);
    const time = firstPresent(game?.game_time, game?.start_time, game?.commence_time, game?.kickoff, game?.first_pitch);
    const candidate = iso && time && !String(time).startsWith(iso) && /^\d{1,2}:\d{2}/.test(String(time))
        ? `${iso}T${time}`
        : String(raw).length <= 10 && iso ? `${iso}T12:00:00` : raw;
    const date = new Date(candidate);
    return Number.isNaN(date.getTime()) ? null : date.getTime();
}

function gameSeason(game, sport = game?.sport) {
    const explicit = safeNumber(game?.season ?? game?.season_year ?? game?.game_season);
    if (explicit !== null) return explicit;
    const iso = gameIsoDate(game);
    if (!iso) return null;
    let season = Number(iso.slice(0, 4));
    const month = Number(iso.slice(5, 7));
    if (sport === "NFL" && month <= 2) season -= 1;
    return season;
}

function gameWeek(game) {
    const explicit = safeNumber(game?.week ?? game?.game_week ?? game?.season_week ?? game?.week_number);
    return explicit === null ? null : explicit;
}

function uniqueSortedNumbers(values, direction = "asc") {
    const numbers = [...new Set(values.map(value => safeNumber(value)).filter(value => value !== null))];
    return numbers.sort((a, b) => direction === "desc" ? b - a : a - b);
}

function uniqueSortedStrings(values, direction = "asc") {
    const strings = [...new Set(values.filter(Boolean).map(String))];
    return strings.sort((a, b) => direction === "desc" ? b.localeCompare(a) : a.localeCompare(b));
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

function loadRefreshLogs() {
    try {
        state.refreshLogs = JSON.parse(localStorage.getItem(REFRESH_LOGS_KEY) || "[]");
    } catch (_error) {
        state.refreshLogs = [];
    }
}

function saveRefreshLogs() {
    localStorage.setItem(REFRESH_LOGS_KEY, JSON.stringify(state.refreshLogs.slice(0, 20)));
}

function appendRefreshLog(entry) {
    state.refreshLogs = [{ ...entry, id: entry.id || `${Date.now()}-${entry.command_name || "refresh"}` }, ...state.refreshLogs].slice(0, 20);
    saveRefreshLogs();
}

function tailLines(text, limit = 80) {
    return String(text || "")
        .split(/\r?\n/)
        .filter(line => line.trim().length)
        .slice(-limit)
        .join("\n");
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
    if (sport === "NFL") {
        return safeNumber(game.home_cover_probability ?? game.cover_probability ?? game.model_home_cover);
    }
    return safeNumber(game.home_win_probability ?? game.model_home_win);
}

function getConfidenceScore(game, sport) {
    const explicit = safeNumber(game?.confidence_score ?? game?.model_confidence);
    if (explicit !== null) return explicit > 1 ? explicit / 100 : explicit;
    const rawConfidence = safeNumber(game?.confidence);
    if (rawConfidence !== null) return rawConfidence > 1 ? rawConfidence / 100 : rawConfidence;
    const probability = getGameProbability(game, sport);
    return probability === null ? null : Math.max(probability, 1 - probability);
}

function getGamePick(game, sport) {
    if (game.model_pick) return game.model_pick;
    const probability = getGameProbability(game, sport);
    if (probability === null) return "-";
    return probability >= 0.5 ? game.home : game.away;
}

function getGameConfidence(game, sport) {
    const explicit = safeNumber(game?.confidence);
    if (game?.confidence && explicit === null) return game.confidence;
    const score = getConfidenceScore(game, sport);
    if (score === null) return "Pending";
    const distance = Math.abs(score - 0.5);
    if (score >= 0.65 || distance >= 0.15) return "High";
    if (score >= 0.58 || distance >= 0.08) return "Medium";
    return "Low";
}

function formatConfidencePercent(game, sport) {
    const score = getConfidenceScore(game, sport);
    return score === null ? "Pending" : `${(score * 100).toFixed(1)}% confidence`;
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

function dataMode(payload, games) {
    if (!payload) return "missing";
    const meta = normalizeMeta(payload);
    if (meta.real_data === false) return "missing";
    if (meta.prediction_mode === "schedule_only") return "schedule only";
    return games.length ? "real" : "missing";
}

function isScheduleOnly(game, payload) {
    return game?.prediction_mode === "schedule_only" || normalizeMeta(payload).prediction_mode === "schedule_only";
}

function allGames() {
    return [
        ...state.nfl.games.map(game => ({ ...game, sport: "NFL" })),
        ...state.mlb.games.map(game => ({ ...game, sport: "MLB" })),
        ...state.mlbBacktest.games.map(game => ({ ...game, sport: "MLB" })),
    ];
}

function currentGames() {
    return [
        ...state.nfl.games.map(game => ({ ...game, sport: "NFL" })),
        ...state.mlb.games.map(game => ({ ...game, sport: "MLB" })),
    ];
}

function topEdges(limit = 5, options = {}) {
    const source = options.includeBacktest ? allGames() : currentGames();
    return source
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

function selectedModelEntry(sport = "MLB") {
    const entries = state.modelRegistry?.models || [];
    return entries.find(model => model.sport === sport && model.selected) || entries.find(model => model.sport === sport) || null;
}

function getModelRecord(sport = "MLB") {
    return state.modelRecord?.sports?.[sport] || {};
}

function recordLine(record = {}) {
    const wins = safeNumber(record.wins, 0);
    const losses = safeNumber(record.losses, 0);
    const pushes = safeNumber(record.pushes, 0);
    const pending = safeNumber(record.pending, 0);
    return `${wins}-${losses}${pushes ? `-${pushes}` : ""}${pending ? ` / ${pending} pending` : ""}`;
}

function getLogEntries() {
    return Array.isArray(state.predictionLog?.predictions) ? state.predictionLog.predictions : [];
}

function logSummaryForSport(sport = "MLB") {
    const entries = getLogEntries().filter(row => row.sport === sport);
    const scored = entries.filter(row => ["win", "loss", "push"].includes(String(row.model_result || "").toLowerCase())).length;
    const pending = entries.filter(row => String(row.model_result || row.result_status || "").toLowerCase() === "pending").length;
    return { entries, scored, pending };
}

function getComparisonRows(sport = "MLB") {
    if (sport === "MLB" && Array.isArray(state.modelComparison?.models)) return state.modelComparison.models;
    return state.report?.sports?.[sport]?.model_comparison || [];
}

function gameKey(game) {
    return String(game?.game_id || game?.id || `${game?.sport || ""}-${gameIsoDate(game)}-${game?.away || ""}-${game?.home || ""}`);
}

function sortedGamesByTime(games, direction = "asc") {
    return [...games].sort((a, b) => {
        const aTime = gameTimestamp(a) ?? (direction === "asc" ? Number.MAX_SAFE_INTEGER : Number.MIN_SAFE_INTEGER);
        const bTime = gameTimestamp(b) ?? (direction === "asc" ? Number.MAX_SAFE_INTEGER : Number.MIN_SAFE_INTEGER);
        return direction === "asc" ? aTime - bTime : bTime - aTime;
    });
}

function nflSeasons() {
    return uniqueSortedNumbers(state.nfl.games.map(game => gameSeason(game, "NFL")), "desc");
}

function nflGamesForSeason(season) {
    const selectedSeason = safeNumber(season);
    return state.nfl.games.filter(game => gameSeason(game, "NFL") === selectedSeason);
}

function nflWeeksForSeason(season) {
    const seasonGames = nflGamesForSeason(season);
    const explicitWeeks = uniqueSortedNumbers(seasonGames.map(gameWeek), "asc");
    if (explicitWeeks.length) return explicitWeeks;
    const dates = uniqueSortedStrings(seasonGames.map(gameIsoDate), "asc");
    return dates.map((date, index) => ({ week: index + 1, date }));
}

function latestNflSeason() {
    return nflSeasons()[0] ?? null;
}

function latestNflWeek(season) {
    const weeks = nflWeeksForSeason(season);
    if (!weeks.length) return null;
    const last = weeks[weeks.length - 1];
    return typeof last === "object" ? last.week : last;
}

function ensureNflScope() {
    const seasons = nflSeasons();
    if (!seasons.length) return { season: null, week: null, weeks: [], games: [] };
    let season = safeNumber(state.selected.homeNflSeason);
    if (!seasons.includes(season)) season = latestNflSeason();
    const weeks = nflWeeksForSeason(season);
    const weekValues = weeks.map(item => typeof item === "object" ? item.week : item);
    let week = safeNumber(state.selected.homeNflWeek);
    if (!weekValues.includes(week)) week = latestNflWeek(season);
    state.selected.homeNflSeason = season;
    state.selected.homeNflWeek = week;
    const fallbackDate = weeks.find(item => typeof item === "object" && item.week === week)?.date;
    const games = nflGamesForSeason(season).filter(game => {
        const explicitWeek = gameWeek(game);
        if (explicitWeek !== null) return explicitWeek === week;
        return fallbackDate ? gameIsoDate(game) === fallbackDate : true;
    });
    return { season, week, weeks, games: sortedGamesByTime(games) };
}

function moveNflWeek(delta) {
    const scope = ensureNflScope();
    const values = scope.weeks.map(item => typeof item === "object" ? item.week : item);
    const index = values.indexOf(scope.week);
    if (index === -1) return scope;
    state.selected.homeNflWeek = values[Math.max(0, Math.min(values.length - 1, index + delta))];
    persistSettings();
    return ensureNflScope();
}

function defaultNflGame() {
    const scope = ensureNflScope();
    if (scope.games.length) return scope.games[0];
    const valid = state.nfl.games.filter(game => gameSeason(game, "NFL") !== null && !isEpochLikeDate(gameIsoDate(game)));
    return sortedGamesByTime(valid, "desc")[0] || state.nfl.games[0] || null;
}

function predictionLogRowsForMlb() {
    return getLogEntries().filter(row => row.sport === "MLB").map(row => ({
        ...row,
        sport: "MLB",
        source_label: "Prediction log",
        source_type: "prediction_log",
        home: row.home,
        away: row.away,
        game_date: row.game_date,
        status: row.status_at_prediction || row.result_status || "Pending",
        result: row.model_result ? String(row.model_result).replace(/^./, char => char.toUpperCase()) : "Pending",
    }));
}

function allMlbReviewRows() {
    const seen = new Set();
    const sources = [
        ...state.mlb.games.map(game => ({ ...game, sport: "MLB", source_label: "Current export", source_type: "current" })),
        ...state.mlbBacktest.games.map(game => ({ ...game, sport: "MLB", source_label: "Backtest", source_type: "backtest" })),
        ...predictionLogRowsForMlb(),
    ];
    return sources.filter(game => {
        const key = `${game.source_type}-${gameKey(game)}`;
        if (!gameIsoDate(game) || seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function mlbReviewDates() {
    return uniqueSortedStrings(allMlbReviewRows().map(gameIsoDate), "asc");
}

function defaultMlbReviewDate() {
    const dates = mlbReviewDates();
    if (!dates.length) return null;
    const today = new Date().toISOString().slice(0, 10);
    if (dates.includes(today)) return today;
    return dates.find(date => date > today) || dates[dates.length - 1];
}

function ensureMlbReviewDate() {
    const dates = mlbReviewDates();
    if (!dates.length) {
        state.selected.homeMlbDate = null;
        return null;
    }
    if (!dates.includes(state.selected.homeMlbDate)) state.selected.homeMlbDate = defaultMlbReviewDate();
    return state.selected.homeMlbDate;
}

function moveMlbReviewDate(delta) {
    const dates = mlbReviewDates();
    const current = ensureMlbReviewDate();
    const index = dates.indexOf(current);
    if (index === -1) return current;
    state.selected.homeMlbDate = dates[Math.max(0, Math.min(dates.length - 1, index + delta))];
    persistSettings();
    return state.selected.homeMlbDate;
}

function mlbRowsForDate(date = ensureMlbReviewDate()) {
    if (!date) return [];
    const priority = { current: 0, backtest: 1, prediction_log: 2 };
    const rows = allMlbReviewRows().filter(game => gameIsoDate(game) === date);
    const byGame = new Map();
    rows.sort((a, b) => (priority[a.source_type] ?? 9) - (priority[b.source_type] ?? 9)).forEach(game => {
        const key = gameKey(game);
        if (!byGame.has(key)) byGame.set(key, game);
    });
    return sortedGamesByTime([...byGame.values()]);
}

function homeScopedRows() {
    if ((state.selected.homeSport || "MLB") === "NFL") {
        return ensureNflScope().games.map(game => ({ ...game, sport: "NFL" }));
    }
    return mlbRowsForHomeRange().map(game => ({ ...game, sport: "MLB" }));
}

function rankRowsByEdge(games, limit = 8) {
    return games
        .map(game => ({
            game,
            edge: getGameEdge(game, game.sport),
            probability: getGameProbability(game, game.sport),
            confidence: getGameConfidence(game, game.sport),
            pick: getGamePick(game, game.sport),
        }))
        .filter(row => row.probability !== null && row.pick !== "-")
        .sort((a, b) => {
            const edgeSort = (b.edge ?? 0) - (a.edge ?? 0);
            if (edgeSort !== 0) return edgeSort;
            return (b.probability ?? 0.5) - (a.probability ?? 0.5);
        })
        .slice(0, limit);
}

function finalScoreLabel(game) {
    const awayScore = safeNumber(game?.away_score);
    const homeScore = safeNumber(game?.home_score);
    return awayScore === null || homeScore === null ? "" : `${game.away || "AWAY"} ${awayScore}, ${game.home || "HOME"} ${homeScore}`;
}

function gameDateDisplay(game, sport = game?.sport) {
    const iso = gameIsoDate(game);
    if (iso) return formatDate(iso);
    if (sport === "NFL") {
        const season = gameSeason(game, "NFL");
        const week = gameWeek(game);
        if (season && week) return `Season ${season} / Week ${week}`;
        if (season) return `Season ${season}`;
    }
    return "-";
}

function modelResultLabel(game) {
    const result = firstPresent(game?.model_result, game?.pick_result, game?.prediction_result);
    if (result) {
        const normalized = String(result).toLowerCase();
        if (normalized === "win") return "Won";
        if (normalized === "loss") return "Lost";
        if (normalized === "push") return "Push";
        if (normalized === "pending") return "Pending";
        if (normalized === "no_result" || normalized === "no result") return "No result";
        return String(result).replaceAll("_", " ").replace(/^./, char => char.toUpperCase());
    }
    if (getGamePick(game, game?.sport || "MLB") === "-") return "No logged pick";
    return String(game?.status || "").toLowerCase() === "final" ? "No logged pick" : "Pending";
}

function resultChip(label) {
    const normalized = String(label || "Pending").toLowerCase().replaceAll(" ", "-");
    let tone = "pending";
    if (normalized.includes("win") || normalized.includes("won")) tone = "win";
    if (normalized.includes("loss") || normalized.includes("lost")) tone = "loss";
    if (normalized.includes("push")) tone = "push";
    if (normalized.includes("no-logged")) tone = "none";
    return `<span class="result-chip result-chip--${tone}">${escapeHtml(label || "Pending")}</span>`;
}

function dailyRecord(rows) {
    return rows.reduce((record, game) => {
        const label = modelResultLabel(game).toLowerCase();
        if (label.includes("win") || label.includes("won")) record.wins += 1;
        else if (label.includes("loss") || label.includes("lost")) record.losses += 1;
        else if (label.includes("push")) record.pushes += 1;
        else if (label.includes("no logged")) record.noLogged += 1;
        else record.pending += 1;
        return record;
    }, { wins: 0, losses: 0, pushes: 0, pending: 0, noLogged: 0 });
}

function formatBoardRecord(record = {}) {
    const wins = safeNumber(record.wins, 0);
    const losses = safeNumber(record.losses, 0);
    const pushes = safeNumber(record.pushes, 0);
    const pending = safeNumber(record.pending, 0);
    const base = `${wins}-${losses}${pushes ? `-${pushes}` : ""}`;
    return pending ? `${base} / ${pending} pending` : base;
}

function hotPickTier(row) {
    if (!row) return { key: "normal", label: "Model Lean" };
    const game = row.game;
    const confidenceScore = getConfidenceScore(game, game.sport);
    const probabilityEdge = Math.abs(safeNumber(row.probability, 0.5) - 0.5);
    const edge = Math.abs(safeNumber(row.edge, probabilityEdge));
    if ((confidenceScore !== null && confidenceScore >= 0.65) || edge >= 0.15) return { key: "hot", label: "Hot Pick" };
    if ((confidenceScore !== null && confidenceScore >= 0.60) || edge >= 0.10) return { key: "strong", label: "Strong Edge" };
    if ((confidenceScore !== null && confidenceScore >= 0.55) || edge >= 0.05) return { key: "lean", label: "Model Lean" };
    return { key: "normal", label: "Normal" };
}

function bestPickFactors(game) {
    const factors = game?.explanation?.top_factors || [];
    const labels = factors
        .map(factor => factor.label || factor.feature)
        .filter(Boolean)
        .slice(0, 3);
    if (labels.length) return labels;
    return [game?.top_factor_label || game?.top_factor || "Model signal"].filter(Boolean).slice(0, 3);
}

function uniqueRowsByGame(rows) {
    const seen = new Set();
    return rows.filter(game => {
        const key = `${game?.sport || ""}-${gameKey(game)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function dateOffsetIso(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
}

function setHomeMlbRange(range) {
    state.selected.homeMlbRange = range;
    const dates = mlbReviewDates();
    const today = dateOffsetIso(0);
    const yesterday = dateOffsetIso(-1);
    if (range === "today") {
        state.selected.homeMlbDate = dates.includes(today) ? today : defaultMlbReviewDate();
    }
    if (range === "yesterday") {
        state.selected.homeMlbDate = dates.includes(yesterday)
            ? yesterday
            : [...dates].reverse().find(date => date < today) || defaultMlbReviewDate();
    }
    if (!state.selected.homeMlbDate || !dates.includes(state.selected.homeMlbDate)) {
        state.selected.homeMlbDate = defaultMlbReviewDate();
    }
    persistSettings();
}

function mlbRowsForHomeRange() {
    const range = state.selected.homeMlbRange || "today";
    const selected = ensureMlbReviewDate();
    if (!selected) return [];
    if (range === "this_week") {
        const anchor = new Date(`${selected}T12:00:00`);
        const start = new Date(anchor);
        start.setDate(anchor.getDate() - 6);
        const startIso = start.toISOString().slice(0, 10);
        return sortedGamesByTime(allMlbReviewRows().filter(game => {
            const iso = gameIsoDate(game);
            return iso >= startIso && iso <= selected;
        }), "desc");
    }
    if (range === "season") {
        const season = safeNumber(selected.slice(0, 4));
        return sortedGamesByTime(allMlbReviewRows().filter(game => gameSeason(game, "MLB") === season), "desc");
    }
    return mlbRowsForDate(selected);
}

function topGlobalFeatures(sport = "MLB") {
    if (sport === "MLB" && Array.isArray(state.modelComparison?.top_global_features)) {
        return state.modelComparison.top_global_features;
    }
    return state.report?.sports?.[sport]?.top_global_features || [];
}

function featureQualityForGame(game) {
    const quality = game?.explanation?.data_quality || game?.data_quality || {};
    return {
        pitcher: quality.pitcher_data || game?.pitcher_data_status || "missing",
        travel: quality.travel_data || "missing",
        missing: safeNumber(quality.feature_missing_count, 0),
    };
}

async function loadAll() {
    setStatus("Loading prediction exports...", "info");
    loadSettings();
    loadTracker();
    loadRefreshLogs();
    const [
        app,
        teams,
        report,
        modelComparison,
        featureSummary,
        modelRegistry,
        modelRecord,
        predictionLog,
        bootstrap,
        startup,
        refresh,
        live,
        nfl,
        mlb,
        mlbBacktest,
    ] = await Promise.all([
        loadOptional("app", ["__APP_METADATA__"]),
        loadOptional("teams", ["__TEAM_METADATA__"]),
        loadOptional("reports", ["__MODEL_REPORT__"]),
        loadOptional("modelComparison", ["__MLB_MODEL_COMPARISON__"]),
        loadOptional("featureSummary", ["__MLB_FEATURE_SUMMARY__"]),
        loadOptional("modelRegistry", ["__MODEL_REGISTRY__"]),
        loadOptional("modelRecord", ["__MODEL_RECORD__"]),
        loadOptional("predictionLog", ["__MODEL_PREDICTIONS_LOG__"]),
        loadOptional("bootstrap", ["__BOOTSTRAP_STATUS__"]),
        loadOptional("startup", ["__STARTUP_STATUS__"]),
        loadOptional("refresh", ["__REFRESH_STATUS__"]),
        loadOptional("live", ["__LIVE_SCORES__"]),
        loadOptional("nfl", ["__NFL_PREDICTIONS__", "__PREDICTIONS__"]),
        loadOptional("mlb", ["__MLB_PREDICTIONS__"]),
        loadOptional("mlbBacktest", ["__MLB_BACKTEST_PREDICTIONS__"]),
    ]);

    state.app = app || state.app;
    state.teamPayload = teams || state.teamPayload;
    state.report = report || state.report;
    state.modelComparison = modelComparison || state.modelComparison;
    state.featureSummary = featureSummary || state.featureSummary;
    state.modelRegistry = modelRegistry || state.modelRegistry;
    state.modelRecord = modelRecord || state.modelRecord;
    state.predictionLog = predictionLog || state.predictionLog;
    state.bootstrapStatus = bootstrap || state.bootstrapStatus;
    state.startupStatus = startup || state.startupStatus;
    state.refreshStatus = refresh || state.refreshStatus;
    state.live.payload = live;
    state.live.games = normalizeGames(live);
    state.live.error = live ? null : "No live widget export found. Run npm run refresh:live.";
    state.nfl.payload = nfl;
    state.nfl.games = normalizeGames(nfl);
    state.nfl.error = nfl ? null : "No NFL predictions found. Run the NFL export command.";
    state.mlb.payload = mlb;
    state.mlb.games = normalizeGames(mlb);
    state.mlb.error = mlb ? null : "No MLB predictions found. Run the MLB export command.";
    state.mlbBacktest.payload = mlbBacktest;
    state.mlbBacktest.games = normalizeGames(mlbBacktest);
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
            : "Command refresh is available only in the Tauri desktop app. Browser/static mode uses existing exported data and manual npm commands.";
        renderAll();
        if (state.refreshRuntime.available) {
            runStartupAutomation({ background: true });
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

function browserRefreshMessage(commandName) {
    const config = REFRESH_COMMANDS[commandName] || REFRESH_COMMANDS.startup;
    return `Command refresh is available only in the Tauri desktop app. Run this manually: ${config.manual}`;
}

function refreshCommandLabel(commandName) {
    return REFRESH_COMMANDS[commandName]?.label || commandName;
}

async function openLiveWidget() {
    if (!isTauriRefreshAvailable()) {
        showToast("Live widget is available in the Tauri desktop app. Browser mode: run npm run refresh:live.");
        return;
    }
    try {
        await tauriInvoke("open_live_widget", {});
        showToast("Opening LineLens Live widget");
    } catch (error) {
        showToast(String(error?.message || error || "Live widget could not be opened."));
    }
}

async function runRefreshCommand(commandName = "startup", options = {}) {
    const config = REFRESH_COMMANDS[commandName] || REFRESH_COMMANDS.startup;
    if (!isTauriRefreshAvailable()) {
        state.refreshRuntime.available = false;
        state.refreshRuntime.message = browserRefreshMessage(commandName);
        appendRefreshLog({
            command_name: commandName,
            command: config.manual,
            success: false,
            skipped: true,
            exit_code: null,
            stdout: "",
            stderr: state.refreshRuntime.message,
            started_at: new Date().toISOString(),
            finished_at: new Date().toISOString(),
            duration_ms: 0,
        });
        showToast(state.refreshRuntime.message);
        renderAll();
        return;
    }
    state.refreshRuntime.available = true;
    state.refreshRuntime.active = true;
    state.refreshRuntime.command = commandName;
    state.refreshRuntime.message = `Running ${config.label}: ${config.manual}`;
    if (!options.background) showToast(`Running ${config.label}...`);
    renderAll();
    try {
        const result = await tauriInvoke("run_refresh_command", { commandName });
        appendRefreshLog(result);
        state.refreshRuntime.message = result.success
            ? `${config.label} completed.`
            : `${config.label} failed with exit code ${result.exit_code ?? "unknown"}.`;
        showToast(result.success ? `${config.label} complete` : `${config.label} failed`);
        await loadAllAfterRefresh();
    } catch (error) {
        state.refreshRuntime.message = String(error?.message || error || "Refresh failed; showing cached data.");
        appendRefreshLog({
            command_name: commandName,
            command: config.manual,
            success: false,
            exit_code: null,
            stdout: "",
            stderr: state.refreshRuntime.message,
            started_at: new Date().toISOString(),
            finished_at: new Date().toISOString(),
            duration_ms: 0,
        });
        showToast("Refresh failed; showing cached data");
    } finally {
        state.refreshRuntime.active = false;
        renderAll();
    }
}

async function refreshData(sport = "all", options = {}) {
    const commandName = sport === "nfl" ? "nfl_real" : sport === "mlb" ? "mlb_current" : "startup";
    return runRefreshCommand(commandName, options);
}

async function runStartupRefresh(options = {}) {
    return runRefreshCommand("startup", options);
}

async function runStartupAutomation(options = {}) {
    if (!isTauriRefreshAvailable()) {
        return runRefreshCommand("startup_auto", options);
    }
    const config = REFRESH_COMMANDS.startup_auto;
    state.refreshRuntime.available = true;
    state.refreshRuntime.active = true;
    state.refreshRuntime.command = "startup_auto";
    state.refreshRuntime.message = "Running startup automation: bootstrap Python, refresh MLB, then attempt NFL.";
    if (!options.background) showToast("Running startup automation...");
    renderAll();
    try {
        const result = await tauriInvoke("run_startup_automation", {});
        appendRefreshLog(result);
        state.refreshRuntime.message = result.success ? "Startup automation finished." : "Startup automation failed; see command console.";
        showToast(result.success ? "Startup automation finished" : "Startup automation failed");
        await loadAllAfterRefresh();
    } catch (error) {
        state.refreshRuntime.message = String(error?.message || error || "Startup automation failed.");
        appendRefreshLog({
            command_name: "startup_auto",
            command: config.manual,
            success: false,
            exit_code: null,
            stdout: "",
            stderr: state.refreshRuntime.message,
            started_at: new Date().toISOString(),
            finished_at: new Date().toISOString(),
            duration_ms: 0,
        });
        showToast("Startup automation failed");
    } finally {
        state.refreshRuntime.active = false;
        renderAll();
    }
}

async function loadAllAfterRefresh() {
    const [bootstrap, startup, refresh, live, report, modelComparison, featureSummary, modelRegistry, modelRecord, predictionLog, nfl, mlb, mlbBacktest] = await Promise.all([
        loadOptional("bootstrap", []),
        loadOptional("startup", []),
        loadOptional("refresh", ["__REFRESH_STATUS__"]),
        loadOptional("live", ["__LIVE_SCORES__"]),
        loadOptional("reports", []),
        loadOptional("modelComparison", []),
        loadOptional("featureSummary", []),
        loadOptional("modelRegistry", []),
        loadOptional("modelRecord", []),
        loadOptional("predictionLog", []),
        loadOptional("nfl", []),
        loadOptional("mlb", []),
        loadOptional("mlbBacktest", []),
    ]);
    if (bootstrap) {
        state.bootstrapStatus = bootstrap;
        window.__BOOTSTRAP_STATUS__ = bootstrap;
    }
    if (startup) {
        state.startupStatus = startup;
        window.__STARTUP_STATUS__ = startup;
    }
    if (refresh) {
        state.refreshStatus = refresh;
        window.__REFRESH_STATUS__ = refresh;
    }
    if (live) {
        state.live.payload = live;
        state.live.games = normalizeGames(live);
        window.__LIVE_SCORES__ = live;
    }
    if (report) {
        state.report = report;
        window.__MODEL_REPORT__ = report;
    }
    if (modelComparison) {
        state.modelComparison = modelComparison;
        window.__MLB_MODEL_COMPARISON__ = modelComparison;
    }
    if (featureSummary) {
        state.featureSummary = featureSummary;
        window.__MLB_FEATURE_SUMMARY__ = featureSummary;
    }
    if (modelRegistry) {
        state.modelRegistry = modelRegistry;
        window.__MODEL_REGISTRY__ = modelRegistry;
    }
    if (modelRecord) {
        state.modelRecord = modelRecord;
        window.__MODEL_RECORD__ = modelRecord;
    }
    if (predictionLog) {
        state.predictionLog = predictionLog;
        window.__MODEL_PREDICTIONS_LOG__ = predictionLog;
    }
    if (nfl) {
        state.nfl.payload = nfl;
        state.nfl.games = normalizeGames(nfl);
    }
    if (mlb) {
        state.mlb.payload = mlb;
        state.mlb.games = normalizeGames(mlb);
    }
    if (mlbBacktest) {
        state.mlbBacktest.payload = mlbBacktest;
        state.mlbBacktest.games = normalizeGames(mlbBacktest);
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
        record: ["Model Record", "live and historical performance"],
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

function getGameTimeLabel(game) {
    const raw = firstPresent(game?.game_time, game?.start_time, game?.commence_time, game?.kickoff, game?.first_pitch, gameDateRaw(game));
    if (!raw) return "TBD";
    const iso = gameIsoDate(game);
    const candidate = iso && /^\d{1,2}:\d{2}/.test(String(raw)) ? `${iso}T${raw}` : raw;
    const date = new Date(candidate);
    if (Number.isNaN(date.getTime())) return String(raw);
    if (String(raw).length <= 10) return formatDate(raw);
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function isHistoricalBoardRow(game) {
    return game?.prediction_mode === "historical_backtest" || game?.mode === "historical_backtest";
}

function homeBoardGames() {
    return homeScopedRows();
}

function homeTopEdges(limit = 8) {
    return rankRowsByEdge(homeBoardGames(), limit);
}

function renderHomeTeamBadge(game, side) {
    const code = game?.[side] || "---";
    const display = game?.[`${side}_display`] || code;
    const sport = game?.sport || "MLB";
    return `
        <span class="ll-team-badge">
            ${renderTeamLogo(sport, code, "sm", display)}
            <span>${escapeHtml(display)}</span>
        </span>
    `;
}

function homeMetricCard(icon, label, value, note, tone = "blue") {
    return `
        <article class="metric-card-v2 metric-card-v2--${tone}">
            <div class="metric-card-v2__icon" aria-hidden="true">${escapeHtml(icon)}</div>
            <div>
                <span>${escapeHtml(label)}</span>
                <strong>${escapeHtml(value)}</strong>
                <small>${escapeHtml(note || "")}</small>
            </div>
        </article>
    `;
}

function renderHeroHologram() {
    return `
        <div class="hero-holo" aria-hidden="true">
            <svg viewBox="0 0 560 360" role="img" aria-label="Hologram stadium with baseball and football">
                <defs>
                    <radialGradient id="hero-holo-glow" cx="50%" cy="45%" r="68%">
                        <stop offset="0%" stop-color="#67e8f9" stop-opacity="0.50" />
                        <stop offset="38%" stop-color="#7c3aed" stop-opacity="0.20" />
                        <stop offset="100%" stop-color="#020617" stop-opacity="0" />
                    </radialGradient>
                    <linearGradient id="hero-holo-line" x1="0" x2="1">
                        <stop offset="0" stop-color="#19b7ff" />
                        <stop offset="0.55" stop-color="#a855f7" />
                        <stop offset="1" stop-color="#ff8a1f" />
                    </linearGradient>
                    <filter id="hero-holo-blur">
                        <feGaussianBlur stdDeviation="2.2" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                    <linearGradient id="hero-holo-field" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0" stop-color="#0f2d3a" stop-opacity="0.35" />
                        <stop offset="1" stop-color="#04111d" stop-opacity="0.92" />
                    </linearGradient>
                    <radialGradient id="hero-baseball-fill" cx="38%" cy="28%" r="70%">
                        <stop offset="0" stop-color="#f8fbff" stop-opacity="0.95" />
                        <stop offset="0.42" stop-color="#a7f3ff" stop-opacity="0.58" />
                        <stop offset="1" stop-color="#0ea5e9" stop-opacity="0.12" />
                    </radialGradient>
                    <radialGradient id="hero-football-fill" cx="34%" cy="24%" r="82%">
                        <stop offset="0" stop-color="#ffd166" stop-opacity="0.84" />
                        <stop offset="0.50" stop-color="#ff8a1f" stop-opacity="0.32" />
                        <stop offset="1" stop-color="#7c2d12" stop-opacity="0.08" />
                    </radialGradient>
                </defs>
                <rect width="560" height="360" fill="url(#hero-holo-glow)" />
                <g class="hero-holo__crowd">
                    <path d="M48 110 C146 54 416 54 512 110 L486 148 C396 108 166 108 74 148Z" fill="#0b1225" opacity="0.72" />
                    <path d="M74 124 C174 84 386 84 486 124" stroke="#67e8f9" stroke-opacity="0.20" stroke-width="2" fill="none" />
                    <path d="M98 136 C192 108 368 108 462 136" stroke="#a855f7" stroke-opacity="0.20" stroke-width="2" fill="none" />
                </g>
                <g class="hero-holo__lights" filter="url(#hero-holo-blur)">
                    <path d="M82 50 L152 218" stroke="#e0f2fe" stroke-opacity="0.20" stroke-width="28" />
                    <path d="M478 50 L400 220" stroke="#e0f2fe" stroke-opacity="0.18" stroke-width="30" />
                    <circle cx="82" cy="50" r="13" fill="#f8fafc" opacity="0.72" />
                    <circle cx="478" cy="50" r="13" fill="#f8fafc" opacity="0.60" />
                </g>
                <g class="hero-holo__field">
                    <path d="M54 306 C142 206 416 206 506 306 Z" fill="url(#hero-holo-field)" stroke="#67e8f9" stroke-opacity="0.22" />
                    <path d="M96 286 C176 226 384 226 464 286" stroke="#67e8f9" stroke-opacity="0.28" fill="none" />
                    <path d="M142 304 C200 260 360 260 420 304" stroke="#67e8f9" stroke-opacity="0.20" fill="none" />
                    <path d="M280 226 L280 320 M218 236 L172 316 M342 236 L388 316" stroke="#67e8f9" stroke-opacity="0.18" />
                    <path d="M124 266 H436 M158 246 H402 M200 232 H360" stroke="#67e8f9" stroke-opacity="0.13" />
                </g>
                <g class="hero-holo__rings" fill="none" stroke="url(#hero-holo-line)" filter="url(#hero-holo-blur)">
                    <ellipse cx="280" cy="238" rx="178" ry="48" stroke-opacity="0.62" />
                    <ellipse cx="280" cy="238" rx="126" ry="34" stroke-opacity="0.42" />
                    <ellipse cx="280" cy="238" rx="74" ry="20" stroke-opacity="0.34" />
                </g>
                <g class="hero-holo__baseball" transform="translate(120 76)" stroke-linecap="round">
                    <circle cx="78" cy="78" r="56" fill="url(#hero-baseball-fill)" stroke="#bff7ff" stroke-width="2.5" />
                    <circle cx="78" cy="78" r="63" fill="none" stroke="#67e8f9" stroke-opacity="0.32" stroke-width="1.5" />
                    <path d="M47 31 C72 56 72 100 47 125" stroke="#ff4664" stroke-width="2.6" fill="none" />
                    <path d="M109 31 C84 56 84 100 109 125" stroke="#ff4664" stroke-width="2.6" fill="none" />
                    <path d="M43 48 l13 6 M40 66 l15 3 M40 88 l15 -3 M43 108 l13 -6" stroke="#fecaca" stroke-width="2" />
                    <path d="M113 48 l-13 6 M116 66 l-15 3 M116 88 l-15 -3 M113 108 l-13 -6" stroke="#fecaca" stroke-width="2" />
                </g>
                <g class="hero-holo__football" transform="translate(302 96) rotate(-13 78 46)" stroke-linecap="round">
                    <path d="M8 46 C38 6 118 6 150 46 C118 86 38 86 8 46Z" fill="url(#hero-football-fill)" stroke="#ffb86c" stroke-width="2.8" />
                    <path d="M34 46 C62 28 96 28 124 46" stroke="#ffd166" stroke-width="2.4" fill="none" />
                    <path d="M79 31 L79 61" stroke="#fff7ed" stroke-width="2.5" />
                    <path d="M62 40 L96 40 M62 50 L96 50" stroke="#fff7ed" stroke-width="2" />
                    <path d="M22 46 H140" stroke="#fed7aa" stroke-opacity="0.28" stroke-width="1.5" />
                </g>
                <g class="hero-holo__sweep" stroke="url(#hero-holo-line)" stroke-width="2" stroke-opacity="0.38">
                    <path d="M84 74 C206 10 374 18 482 90" />
                    <path d="M76 122 C196 56 374 62 492 132" />
                </g>
            </svg>
        </div>
    `;
}

function renderBestPickMini(row) {
    if (!row) {
        return `
            <article class="top-edge-mini top-edge-mini--empty">
                <p class="eyebrow">Top edge right now</p>
                <h3>No model pick loaded</h3>
                <p class="muted">Run refresh/startup automation.</p>
            </article>
        `;
    }
    const game = row.game;
    const tier = hotPickTier(row);
    return `
        <article class="top-edge-mini top-edge-mini--${tier.key}">
            <p class="eyebrow">Top edge right now</p>
            <div class="top-edge-mini__matchup">
                ${renderHomeTeamBadge(game, "away")}
                <span>@</span>
                ${renderHomeTeamBadge(game, "home")}
            </div>
            <div class="top-edge-mini__pick">
                <span>${escapeHtml(tier.label)}</span>
                <strong>${escapeHtml(row.pick)}</strong>
                <em>${formatConfidencePercent(game, game.sport)}</em>
            </div>
            <div class="top-edge-mini__meta">
                <span>${escapeHtml(game.sport)}</span>
                <span>${formatEdge(row.edge)}</span>
                <span>${escapeHtml(modelResultLabel(game))}</span>
            </div>
        </article>
    `;
}

function renderBestPickFeatureV2(row) {
    if (!row) {
        return `
            <article class="panel best-pick-v2 best-pick-v2--empty">
                <p class="eyebrow">Best Pick Spotlight</p>
                <h2>No model pick loaded</h2>
                <p class="muted">Run startup automation or refresh predictions to populate the command center.</p>
                <button class="btn btn--primary" data-view-link="settings">Open Settings</button>
            </article>
        `;
    }
    const game = row.game;
    const probability = formatProbability(row.probability);
    const confidence = getGameConfidence(game, game.sport);
    const confidencePercent = formatConfidencePercent(game, game.sport);
    const factors = bestPickFactors(game);
    const tier = hotPickTier(row);
    const width = Math.max(4, Math.min(96, safeNumber(row.probability, 0.5) * 100)).toFixed(1);
    const score = finalScoreLabel(game);
    const record = formatBoardRecord((getModelRecord(game.sport).overall || {}));
    return `
        <article class="panel best-pick-v2 best-pick-v2--${tier.key}">
            <header class="section-header">
                <div>
                    <p class="eyebrow">Best Pick Spotlight</p>
                    <h2>${escapeHtml(game.away || "Away")} @ ${escapeHtml(game.home || "Home")}</h2>
                    <p class="muted">${escapeHtml(game.away_display || game.away)} @ ${escapeHtml(game.home_display || game.home)}</p>
                </div>
                <span class="hot-pick-badge hot-pick-badge--${tier.key}">${escapeHtml(tier.label)}</span>
            </header>
            <div class="best-pick-v2__matchup">
                ${renderHomeTeamBadge(game, "away")}
                <span>@</span>
                ${renderHomeTeamBadge(game, "home")}
            </div>
            <div class="best-pick-v2__hero-pick">
                <span>Pick</span>
                <strong>${escapeHtml(row.pick)}</strong>
                <em>${escapeHtml(confidence)} / ${confidencePercent}</em>
            </div>
            <div class="best-pick-v2__readout">
                <div><span>Probability</span><strong>${probability}</strong></div>
                <div><span>Edge</span><strong>${formatEdge(row.edge)}</strong></div>
                <div><span>Result</span><strong>${modelResultLabel(game)}</strong></div>
                <div><span>Record</span><strong>${escapeHtml(record)}</strong></div>
            </div>
            <div class="best-pick-v2__factor">
                <span>Why this pick?</span>
                <div class="best-pick-v2__chips">
                    ${factors.map(factor => `<strong>${escapeHtml(factor)}</strong>`).join("")}
                </div>
                ${score ? `<em>${escapeHtml(score)}</em>` : ""}
            </div>
            <div class="home-probability-bar" aria-label="Model probability ${probability}">
                <span style="width:${width}%"></span>
            </div>
            <button class="btn btn--primary best-pick-v2__cta" data-view-link="${game.sport === "NFL" ? "nfl" : "mlb"}">Open Full Analysis</button>
        </article>
    `;
}

function renderMlbDateControls(context = "home") {
    const date = ensureMlbReviewDate();
    const dayAttr = context === "home" ? "data-home-mlb-day" : "data-mlb-day";
    return `
        <div class="home-board-controls">
            <button class="icon-btn" type="button" ${dayAttr}="-1" aria-label="Previous MLB day">‹</button>
            <input id="${context}-mlb-date" type="date" value="${escapeHtml(date || "")}" />
            <button class="icon-btn" type="button" ${dayAttr}="1" aria-label="Next MLB day">›</button>
        </div>
    `;
}

function renderNflWeekControls(context = "home") {
    const scope = ensureNflScope();
    const seasons = nflSeasons();
    const weeks = scope.weeks.map(item => typeof item === "object" ? item.week : item);
    const weekAttr = context === "home" ? "data-home-nfl-week" : "data-nfl-week";
    return `
        <div class="home-board-controls">
            <select id="${context}-nfl-season" aria-label="NFL season">
                ${seasons.map(season => `<option value="${season}" ${season === scope.season ? "selected" : ""}>${season}</option>`).join("")}
            </select>
            <button class="icon-btn" type="button" ${weekAttr}="-1" aria-label="Previous NFL week">‹</button>
            <select id="${context}-nfl-week" aria-label="NFL week">
                ${weeks.map(week => `<option value="${week}" ${week === scope.week ? "selected" : ""}>Week ${week}</option>`).join("")}
            </select>
            <button class="icon-btn" type="button" ${weekAttr}="1" aria-label="Next NFL week">›</button>
        </div>
    `;
}

function renderHomeRangeTabs() {
    const selected = state.selected.homeMlbRange || "today";
    const tabs = [
        ["today", "Today"],
        ["yesterday", "Yesterday"],
        ["this_week", "This Week"],
        ["season", "Season"],
    ];
    return `
        <div class="home-range-tabs" role="tablist" aria-label="MLB review range">
            ${tabs.map(([value, label]) => `<button type="button" data-home-mlb-range="${value}" class="${selected === value ? "is-active" : ""}">${label}</button>`).join("")}
        </div>
    `;
}

function renderHomeSportTabs() {
    const sport = state.selected.homeSport || "MLB";
    return `
        <div class="home-sport-tabs" role="tablist" aria-label="Home board sport">
            ${["MLB", "NFL"].map(item => `<button type="button" data-home-sport="${item}" class="${sport === item ? "is-active" : ""}">${item}</button>`).join("")}
        </div>
    `;
}

function renderDailyRecordStrip(rows, sport) {
    if (sport === "NFL") {
        const scope = ensureNflScope();
        return `<div class="daily-record-strip"><span>Season ${escapeHtml(scope.season || "-")}</span><span>Week ${escapeHtml(scope.week || "-")}</span><span>${rows.length} games</span></div>`;
    }
    const record = dailyRecord(rows);
    const decided = record.wins + record.losses + record.pushes;
    const accuracy = decided ? `${((record.wins / decided) * 100).toFixed(1)}%` : "-";
    return `
        <div class="daily-record-strip">
            <span>${record.wins} W</span>
            <span>${record.losses} L</span>
            <span>${record.pushes} P</span>
            <span>${record.pending} pending</span>
            <span>${record.noLogged} no log</span>
            <strong>${accuracy}</strong>
        </div>
    `;
}

function renderHomeBoardRows(rows, sport) {
    if (!rows.length) {
        const copy = sport === "MLB"
            ? "No games found for this MLB date. Move the day selector or refresh predictions."
            : "No NFL rows found for this season/week. Try another week or refresh NFL data.";
        return emptyState("No scoped games loaded", copy);
    }
    return `
        <div class="home-board-list">
            ${rows.slice(0, 8).map(game => {
                const pick = getGamePick(game, sport);
                const factor = game.top_factor_label || game.explanation?.top_factors?.[0]?.label || "Model signal";
                const score = finalScoreLabel(game);
                const result = sport === "MLB" ? modelResultLabel(game) : (game.result || game.status || "Pending");
                return `
                    <button class="home-board-row" type="button" data-home-open-game="${sport}" data-game-id="${escapeHtml(gameKey(game))}">
                        <span class="home-board-row__matchup">${renderHomeTeamBadge(game, "away")} <em>@</em> ${renderHomeTeamBadge(game, "home")}</span>
                        <strong>Pick: ${escapeHtml(pick === "-" ? "No pick" : pick)}</strong>
                        <small>${formatProbability(getGameProbability(game, sport))} · ${formatEdge(getGameEdge(game, sport))}</small>
                        ${resultChip(result)}
                        ${score ? `<i>${escapeHtml(score)}</i>` : ""}
                        <b>${escapeHtml(factor)}</b>
                    </button>
                `;
            }).join("")}
        </div>
    `;
}

function renderHomeDailyBoard(rows) {
    const sport = state.selected.homeSport || "MLB";
    return `
        <article class="panel daily-board-v2">
            <header class="section-header">
                <div>
                    <p class="eyebrow">${sport === "MLB" ? "Daily Review" : "Weekly Board"}</p>
                    <h2>${sport === "MLB" ? formatDate(ensureMlbReviewDate()) : `NFL ${ensureNflScope().season} Week ${ensureNflScope().week}`}</h2>
                </div>
                ${renderHomeSportTabs()}
            </header>
            ${sport === "MLB" ? renderHomeRangeTabs() : ""}
            ${sport === "MLB" ? renderMlbDateControls("home") : renderNflWeekControls("home")}
            ${renderDailyRecordStrip(rows, sport)}
            ${renderHomeBoardRows(rows, sport)}
        </article>
    `;
}

function renderHomeReadoutV2(rows) {
    const selectedModel = selectedModelEntry("MLB");
    const mlbRecord = getModelRecord("MLB").overall || {};
    const leaderboardRows = rows.slice(1, 6);
    return `
        <article class="panel home-readout-v2">
            <header class="section-header">
                <div><p class="eyebrow">Model Readout</p><h2>Signal board</h2></div>
                <span class="chip">${escapeHtml(oddsStatusLabel())}</span>
            </header>
            <div class="readout-grid-v2">
                <div><span>MLB model</span><strong>${escapeHtml(selectedModel?.model_name || normalizeMeta(state.mlb.payload).model_type || "-")}</strong></div>
                <div><span>MLB record</span><strong>${escapeHtml(recordLine(mlbRecord))}</strong></div>
                <div><span>Latest export</span><strong>${escapeHtml(timestamp(normalizeMeta(state.mlb.payload).generated_at))}</strong></div>
                <div><span>Modules</span><strong>NFL / MLB</strong></div>
            </div>
            <div class="edge-leaderboard-v2">
                ${leaderboardRows.length ? leaderboardRows.map((row, index) => {
                    const game = row.game;
                    const pct = Math.max(6, Math.min(100, Math.abs(safeNumber(row.edge, 0)) * 180));
                    return `
                        <div class="edge-leaderboard-v2__row">
                            <span>${index + 1}</span>
                            <strong>${escapeHtml(row.pick)} <small>${escapeHtml(game.away)} @ ${escapeHtml(game.home)}</small></strong>
                            <div><i style="width:${pct}%"></i></div>
                            <em>${formatEdge(row.edge)}</em>
                        </div>
                    `;
                }).join("") : emptyState("No other edge rows", "The spotlight already owns the top pick.")}
            </div>
        </article>
    `;
}

function renderQuickActionsV2() {
    return `
        <div class="quick-actions-v2">
            <button class="btn btn--primary" data-open-live-widget>Open Live Widget</button>
            <button class="btn btn--primary" data-view-link="mlb">Open MLB</button>
            <button class="btn" data-view-link="nfl">Open NFL</button>
            <button class="btn" data-view-link="reports">Reports</button>
            <button class="btn" data-view-link="record">Record</button>
            <button class="btn" data-view-link="settings">Refresh Tools</button>
        </div>
    `;
}

function isLiveScoreGame(game) {
    const status = String(game?.status || game?.status_detail || "").toLowerCase();
    return status.includes("progress") || status.includes("live") || status.includes("warmup");
}

function liveWidgetPreviewData() {
    const games = state.live.games || [];
    const liveGames = games.filter(isLiveScoreGame);
    const modelGames = games.filter(game => game.model?.pick);
    const nextGame = liveGames[0] || games.find(game => !String(game.status || "").toLowerCase().includes("final")) || games[0] || null;
    const topModel = modelGames
        .map(game => ({
            game,
            edge: safeNumber(game.model?.edge, 0),
            probability: safeNumber(game.model?.home_win_probability ?? game.model?.away_win_probability, null),
        }))
        .sort((a, b) => Math.abs(b.edge) - Math.abs(a.edge))[0];
    return { games, liveGames, nextGame, topModel };
}

function renderLiveWidgetPreview() {
    const meta = normalizeMeta(state.live.payload);
    const { games, liveGames, nextGame, topModel } = liveWidgetPreviewData();
    const status = meta.source_status || (state.live.payload ? "cached" : "missing");
    return `
        <section class="panel home-live-widget-preview">
            <div>
                <p class="eyebrow">LineLens Live</p>
                <h2>${liveGames.length} live / ${games.length} loaded</h2>
                <p class="muted">${nextGame ? `${escapeHtml(nextGame.sport)} ${escapeHtml(nextGame.away)} @ ${escapeHtml(nextGame.home)} - ${escapeHtml(nextGame.status_detail || nextGame.status || "Status pending")}` : "No live widget export loaded."}</p>
            </div>
            <div class="home-live-widget-preview__pick">
                <span>${escapeHtml(status)}</span>
                <strong>${topModel ? `${escapeHtml(topModel.game.model.pick)} ${formatProbability(topModel.probability)}` : "No model pick"}</strong>
                <small>${topModel ? formatEdge(topModel.edge) : "Run npm run refresh:live"}</small>
            </div>
            <div class="home-live-widget-preview__actions">
                <button class="btn btn--primary" data-open-live-widget>Open Live Widget</button>
                <button class="btn" data-refresh-command="live_scores">Refresh Live</button>
            </div>
        </section>
    `;
}

function renderTickerItem(game) {
    const sport = game?.sport || "MLB";
    const pick = getGamePick(game, sport);
    const edge = formatEdge(getGameEdge(game, sport));
    const time = getGameTimeLabel(game);
    const score = finalScoreLabel(game);
    const result = sport === "MLB" ? modelResultLabel(game) : (game?.result || game?.status || "Pending");
    return `
        <button class="ticker-item-v2" type="button" data-ticker-open-game="${sport}" data-game-id="${escapeHtml(gameKey(game))}">
            <b>${escapeHtml(sport)}</b>
            <span>${escapeHtml(time)}</span>
            <strong>${escapeHtml(game?.away || "AWAY")} @ ${escapeHtml(game?.home || "HOME")}</strong>
            <em>${escapeHtml(pick)} ${edge}</em>
            ${resultChip(result)}
            ${score ? `<span>${escapeHtml(score)}</span>` : ""}
        </button>
    `;
}

function renderSportsTickerV2(rows) {
    const tickerGames = uniqueRowsByGame(homeBoardGames()).slice(0, 16);
    const fallbackGames = rows.map(row => row.game);
    const games = tickerGames.length ? tickerGames : uniqueRowsByGame(fallbackGames);
    if (!games.length) {
        return `
            <section class="sports-ticker-v2 sports-ticker-v2--empty">
                <span class="ticker-label-v2">LineLens Board</span>
                <div class="ticker-empty-v2">No current games loaded. Run startup automation or refresh predictions.</div>
            </section>
        `;
    }
    const items = games.map(renderTickerItem).join("");
    return `
        <section class="sports-ticker-v2" aria-label="Sports pulse ticker">
            <span class="ticker-label-v2"><i></i> LineLens Board</span>
            <div class="ticker-window-v2" tabindex="0">
                <div class="ticker-track-v2">${items}${items}</div>
            </div>
        </section>
    `;
}

function renderHome() {
    const scopedRows = homeBoardGames();
    const top = homeTopEdges(8);
    const latest = [normalizeMeta(state.nfl.payload).generated_at, normalizeMeta(state.mlb.payload).generated_at, state.report?.metadata?.generated_at].filter(Boolean).sort().at(-1);
    const best = top[0];
    const strongEdges = top.filter(row => safeNumber(row.edge, 0) >= 0.1).length;
    const mlbRecord = getModelRecord("MLB").overall || {};
    $("#view-home").innerHTML = `
        <section class="home-v2-shell">
            <section class="panel home-v2-hero">
                <div class="home-v2-hero__copy">
                    <p class="eyebrow">LineLens Sports ${escapeHtml(state.app.version || APP_VERSION)}</p>
                    <h2>Live Edge.<br><span>Model Clarity.</span></h2>
                    <p class="muted">Real MLB/NFL model signals, daily results, and prediction record tracking in one command center.</p>
                    ${renderQuickActionsV2()}
                </div>
                ${renderHeroHologram()}
                ${renderBestPickMini(best)}
            </section>
            <section class="metric-strip-v2">
                ${homeMetricCard("NFL", "NFL Games", String(state.nfl.games.length), dataMode(state.nfl.payload, state.nfl.games), "blue")}
                ${homeMetricCard("MLB", "MLB Games", String(state.mlb.games.length), dataMode(state.mlb.payload, state.mlb.games), "purple")}
                ${homeMetricCard("EDGE", "Strong Edges", String(strongEdges), "scoped board", "green")}
                ${homeMetricCard("REC", "Model Record", formatBoardRecord(mlbRecord), formatProbability(mlbRecord.accuracy), "orange")}
                ${homeMetricCard("TIME", "Latest Export", latest ? formatDate(latest) : "-", latest ? timestamp(latest) : "no timestamp", "blue")}
            </section>
            <section class="home-v2-grid">
                ${renderBestPickFeatureV2(best)}
                ${renderHomeDailyBoard(scopedRows)}
                ${renderHomeReadoutV2(top)}
            </section>
            ${renderLiveWidgetPreview()}
            <section class="home-v2-system-note">
                <span>${escapeHtml(refreshSportStatus(state.selected.homeSport || "MLB").status)} · Full refresh console is in Settings.</span>
                <button class="btn btn--small" data-view-link="settings">Open Settings</button>
            </section>
            ${renderSportsTickerV2(top)}
        </section>
    `;
}

function statusTone(status) {
    const normalized = String(status || "").toLowerCase();
    if (["env_ready", "real_fresh", "model_generated", "real_cached", "done"].includes(normalized)) return "success";
    if (["dependency_missing", "source_refused", "schedule_only", "manual only", "real_cached"].includes(normalized)) return "warning";
    if (["failed", "install_failed", "env_missing", "missing"].includes(normalized)) return "error";
    return "info";
}

function renderAutomationStep(label, status, copy) {
    const tone = statusTone(status);
    return `
        <div class="automation-step" data-variant="${tone}">
            <span></span>
            <div><strong>${escapeHtml(label)}</strong><small>${escapeHtml(status || "pending")} - ${escapeHtml(copy || "")}</small></div>
        </div>
    `;
}

function renderStartupAutomationCard() {
    const bootstrap = state.bootstrapStatus || {};
    const startup = state.startupStatus || {};
    const refresh = state.refreshStatus?.sports || {};
    const running = state.refreshRuntime.active && state.refreshRuntime.command === "startup_auto";
    const bootstrapCopy = bootstrap.python_version
        ? `${bootstrap.python_version} at ${bootstrap.python_path || "unknown path"}`
        : "Python environment has not been checked yet.";
    const mlbStatus = refresh.MLB?.status || (startup.mlb_ready ? "model_generated" : "pending");
    const nflStatus = refresh.NFL?.status || (startup.nfl_ready ? "real_cached" : "pending");
    return `
        <section class="panel startup-panel">
            <header class="section-header">
                <div>
                    <p class="eyebrow">Startup automation</p>
                    <h2>${running ? "Preparing environment and real data..." : "Python, models, and real-data refresh"}</h2>
                    <p class="muted">${escapeHtml(startup.error || bootstrap.error || "Desktop startup loads cached JSON first, then bootstraps Python and refreshes real data.")}</p>
                </div>
                <div class="report-actions">
                    <button class="btn btn--primary" data-refresh-command="startup_auto">Run Startup Automation Again</button>
                    <button class="btn" data-refresh-command="bootstrap_env">Bootstrap Python Environment</button>
                </div>
            </header>
            <div class="automation-steps">
                ${renderAutomationStep("Checking Python environment", bootstrap.status || "pending", bootstrapCopy)}
                ${renderAutomationStep("Creating virtual environment", bootstrap.venv_created ? "done" : bootstrap.venv_detected ? "real_cached" : "pending", bootstrap.venv_detected ? ".venv detected" : ".venv will be created when automation runs")}
                ${renderAutomationStep("Installing requirements", bootstrap.requirements_installed ? "done" : bootstrap.requirements_skipped ? "real_cached" : bootstrap.status === "install_failed" ? "install_failed" : "pending", bootstrap.requirements_skipped ? "requirements hash current; install skipped" : "installs only when missing or outdated")}
                ${renderAutomationStep("Refreshing MLB predictions", mlbStatus, refresh.MLB?.message || "Uses trained model when available; trains if missing during startup automation.")}
                ${renderAutomationStep("Rebuilding NFL data if needed", nflStatus, refresh.NFL?.message || "Attempts local import, processed parquet, nfl-data-py, and source fallbacks.")}
                ${renderAutomationStep("Done", startup.status || "pending", startup.status ? `Last startup status: ${startup.status}` : "Run the Tauri app or npm run startup:auto.")}
            </div>
            ${startup.nfl_requires_import || nflStatus === "source_refused" || dataMode(state.nfl.payload, state.nfl.games) === "missing" ? renderNflManualRecoveryCard("inline") : ""}
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

function renderCommandConsole(context = "compact") {
    const latest = state.refreshLogs[0];
    const logs = context === "settings" ? state.refreshLogs.slice(0, 6) : state.refreshLogs.slice(0, 2);
    if (!logs.length) {
        return `
            <section class="panel command-console">
                <header class="section-header"><div><p class="eyebrow">Command console</p><h2>Terminal output</h2></div><span class="chip">empty</span></header>
                ${emptyState("No refresh commands logged", "Run a Tauri desktop refresh command to capture stdout and stderr here.")}
            </section>
        `;
    }
    return `
        <section class="panel command-console">
            <header class="section-header">
                <div><p class="eyebrow">Command console</p><h2>${context === "settings" ? "Refresh command history" : "Latest terminal output"}</h2></div>
                <span class="chip ${latest?.success ? "chip--success" : "chip--warning"}">${latest?.success ? "last success" : latest?.skipped ? "manual mode" : "last failed"}</span>
            </header>
            <div class="command-log-list">
                ${logs.map(log => `
                    <article class="command-log-entry">
                        <div class="command-log-entry__head">
                            <strong>${escapeHtml(refreshCommandLabel(log.command_name))}</strong>
                            <span>${escapeHtml(log.success ? "Success" : log.skipped ? "Manual only" : "Failed")} / ${escapeHtml(timestamp(log.finished_at))} / ${escapeHtml(String(log.duration_ms ?? 0))} ms</span>
                        </div>
                        <code>${escapeHtml(log.command || REFRESH_COMMANDS[log.command_name]?.manual || log.command_name)}</code>
                        ${tailLines(log.stdout, 60) ? `<pre>${escapeHtml(tailLines(log.stdout, 60))}</pre>` : ""}
                        ${tailLines(log.stderr, 60) ? `<pre class="command-log-entry__stderr">${escapeHtml(tailLines(log.stderr, 60))}</pre>` : ""}
                    </article>
                `).join("")}
            </div>
        </section>
    `;
}

function renderRefreshPanel(context = "home") {
    const nfl = refreshSportStatus("NFL");
    const mlb = refreshSportStatus("MLB");
    const disabled = state.refreshRuntime.available ? "" : "";
    const commandButtons = context === "settings"
        ? [
            ["startup_auto", "Run Startup Automation Again", "btn--primary"],
            ["bootstrap_env", "Bootstrap Python Environment", ""],
            ["data_real", "Refresh All Real Data", ""],
            ["nfl_real", "Refresh NFL Real Data", ""],
            ["mlb_current", "Refresh MLB Current", ""],
            ["mlb_all", "Run MLB Full Train", ""],
            ["score_models", "Score Model Record", ""],
            ["check_data", "Check Data Status", ""],
        ]
        : [
            ["startup_auto", "Run Startup Automation Again", "btn--primary"],
            ["bootstrap_env", "Bootstrap Python Environment", ""],
            ["mlb_current", "Refresh MLB Current", ""],
            ["mlb_all", "Run MLB Full Train", ""],
            ["score_models", "Score Model Record", ""],
            ["nfl_real", "Refresh NFL Real Data", ""],
            ["check_data", "Check Data Status", ""],
        ];
    return `
        <section class="panel refresh-panel">
            <header class="section-header">
                <div>
                    <p class="eyebrow">Runtime data refresh</p>
                    <h2>${context === "settings" ? "Data refresh controls" : "Cached first, refresh in background"}</h2>
                    <p class="muted">${escapeHtml(state.refreshRuntime.message || "Loading cached predictions first.")}</p>
                </div>
                <div class="report-actions">
                    ${commandButtons.map(([command, label, cls]) => `<button class="btn ${cls}" data-refresh-command="${command}" ${disabled}>${escapeHtml(label)}</button>`).join("")}
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
            ${state.refreshRuntime.available ? "" : `<p class="data-status" data-variant="warning">Command refresh is available only in the Tauri desktop app. Browser/static mode uses cached exports. Manual examples: <code>${escapeHtml(REFRESH_COMMANDS.nfl_real.manual)}</code> or <code>${escapeHtml(REFRESH_COMMANDS.mlb_current.manual)}</code>.</p>`}
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

function renderNflManualRecoveryCard(extraClass = "") {
    return `
        <div class="empty-state manual-recovery ${extraClass}">
            <strong>NFL local import missing</strong>
            <p>Regeneration uses real sources only. If nfl-data-py/nflverse sources are blocked, import a known-good processed spread dataset:</p>
            <pre>mkdir data\\imports\\nfl
copy C:\\path\\to\\old\\spread_dataset.parquet data\\imports\\nfl\\spread_dataset.parquet
npm run refresh:nfl:real</pre>
        </div>
    `;
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
    const scope = ensureNflScope();
    const games = scope.games;
    const selectedStillVisible = games.some(game => gameKey(game) === gameKey(state.selected.nfl));
    const selected = selectedStillVisible ? state.selected.nfl : defaultNflGame();
    state.selected.nfl = selected;
    $("#view-nfl").innerHTML = `
        <section class="module-header panel">
            <div><p class="eyebrow">NFL Spread Predictor</p><h2>Spread, injury, CLV, and line movement workspace</h2><p class="muted">NFL data source: ${escapeHtml(refreshSportStatus("NFL").status)}. Showing latest valid season/week by default, not earliest historical rows.</p></div>
            <div class="report-actions"><button class="btn" data-refresh-command="nfl_real">Refresh NFL</button>
            <span class="chip">${dataMode(state.nfl.payload, state.nfl.games)}</span>
            </div>
        </section>
        ${sportSummaryCards("NFL", games, state.nfl.payload)}
        <section class="dashboard-grid">
            <article class="panel panel--wide">
                <header class="section-header">
                    <div><p class="eyebrow">Board</p><h2>Season ${escapeHtml(scope.season || "-")} / Week ${escapeHtml(scope.week || "-")}</h2></div>
                    ${renderNflWeekControls("nfl")}
                </header>
                ${games.length ? renderGameTable("NFL", games) : `${emptyState("No NFL predictions found", "Run the NFL real refresh command. Existing NFL model files are preserved.")}${renderNflManualRecoveryCard()}`}
            </article>
            <article class="panel">${renderMatchupDetail("NFL", selected)}</article>
        </section>
    `;
}

function filterMlbGames(games) {
    const filter = state.selected.mlbFilter || "all";
    return games.filter(game => {
        const probability = getGameProbability(game, "MLB");
        const confidence = probability === null ? 0 : Math.max(probability, 1 - probability);
        const quality = featureQualityForGame(game);
        const factors = game.explanation?.top_factors || [];
        const factorLabels = factors.map(factor => `${factor.label || ""} ${factor.feature || ""}`.toLowerCase()).join(" ");
        if (filter === "model") return probability !== null && !isScheduleOnly(game, state.mlb.payload);
        if (filter === "high55") return confidence >= 0.55;
        if (filter === "high60") return confidence >= 0.6;
        if (filter === "pitcher") return ["available", "proxy"].includes(String(quality.pitcher).toLowerCase());
        if (filter === "travel") return factorLabels.includes("travel") || safeNumber(game.feature_values?.travel_km_diff) !== null;
        if (filter === "fatigue") return factorLabels.includes("fatigue") || safeNumber(game.feature_values?.schedule_fatigue_diff) !== null;
        if (filter === "schedule") return isScheduleOnly(game, state.mlb.payload);
        return true;
    });
}

function renderMLB() {
    const selectedDate = ensureMlbReviewDate();
    const rawGames = mlbRowsForDate(selectedDate);
    const usingBacktest = rawGames.some(game => game.source_type === "backtest") && !rawGames.some(game => game.source_type === "current");
    const games = filterMlbGames(rawGames);
    const payload = usingBacktest ? state.mlbBacktest.payload : state.mlb.payload;
    const selectedStillVisible = games.some(game => gameKey(game) === gameKey(state.selected.mlb));
    const selected = selectedStillVisible ? state.selected.mlb : games[0] || null;
    state.selected.mlb = selected;
    $("#view-mlb").innerHTML = `
        <section class="module-header panel">
            <div><p class="eyebrow">MLB Moneyline Predictor</p><h2>Daily moneyline board with pitcher and market-readiness context</h2><p class="muted">MLB schedule source: MLB Stats API. Model status: ${escapeHtml(mlbModelStatus())}.${usingBacktest ? " Showing labeled historical backtest rows for this date." : ""}</p></div>
            <div class="report-actions"><button class="btn" data-refresh-command="mlb_current">Refresh MLB</button>
            <span class="chip">${usingBacktest ? "historical backtest" : dataMode(payload, games)}</span>
            </div>
        </section>
        ${sportSummaryCards("MLB", games, payload)}
        <section class="dashboard-grid">
            <article class="panel panel--wide">
                <header class="section-header">
                    <div><p class="eyebrow">${usingBacktest ? "Historical backtest" : "Daily review"}</p><h2>${escapeHtml(formatDate(selectedDate) || "MLB board")}</h2></div>
                    <div class="board-toolbar">${renderMlbDateControls("mlb")}${renderMlbFilter()}</div>
                </header>
                ${games.length ? renderGameTable("MLB", games, "MLB_REVIEW") : emptyState("No MLB rows match this filter", rawGames.length ? "Change the MLB filter or refresh current predictions." : "Run npm run refresh:mlb:all.")}
            </article>
            <article class="panel">${renderMatchupDetail("MLB", selected)}</article>
        </section>
    `;
}

function renderMlbFilter() {
    const options = [
        ["all", "All"],
        ["model", "Model picks"],
        ["high55", "55%+"],
        ["high60", "60%+"],
        ["pitcher", "Pitcher data"],
        ["travel", "Travel edge"],
        ["fatigue", "Fatigue edge"],
        ["schedule", "Schedule-only"],
    ];
    return `<select id="mlb-filter-select">${options.map(([value, label]) => `<option value="${value}" ${state.selected.mlbFilter === value ? "selected" : ""}>${label}</option>`).join("")}</select>`;
}

function mlbModelStatus() {
    const meta = normalizeMeta(state.mlb.payload);
    const backtestMeta = normalizeMeta(state.mlbBacktest.payload);
    if (backtestMeta.real_data === true && state.mlbBacktest.games.length) {
        if (meta.prediction_mode === "schedule_only" || meta.model_type === "schedule_only") {
            return "Model trained; current board is schedule only until current features refresh";
        }
        return "Model trained with historical backtest available";
    }
    if (!state.mlb.payload) return "missing";
    if (meta.prediction_mode === "schedule_only" || meta.model_type === "schedule_only") return "Schedule only - train model to generate predictions";
    return "Model predictions available";
}

function renderGameTable(sport, games, source = sport) {
    return `
        <div class="table-wrapper">
            <table class="data-table">
                <thead><tr><th>Date</th><th>Away</th><th>Home</th><th>Pick</th><th>Prob</th><th>Edge</th><th>Confidence</th><th>Top factor</th><th>CLV</th></tr></thead>
                <tbody>
                    ${games.map((game, index) => `
                        <tr class="selectable-row" data-select-game="${source}" data-game-index="${index}" data-game-id="${escapeHtml(gameKey({ ...game, sport }))}">
                            <td>${escapeHtml(gameDateDisplay(game, sport))}</td>
                            <td>${teamCell(sport, game.away, game.away_display || game.away)}</td>
                            <td>${teamCell(sport, game.home, game.home_display || game.home)}</td>
                            <td><strong>${escapeHtml(getGamePick(game, sport))}</strong></td>
                            <td>${formatProbability(getGameProbability(game, sport))}</td>
                            <td>${formatEdge(getGameEdge(game, sport))}</td>
                            <td>${confidenceTag(getGameConfidence(game, sport))}</td>
                            <td>${sport === "MLB" ? renderTopFactorCell(game) : "-"}</td>
                            <td><span class="chip chip--soft">${escapeHtml(getCLVSummary(game))}</span></td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;
}

function renderTopFactorCell(game) {
    const factor = game.top_factor_label || game.explanation?.top_factors?.[0]?.label;
    const quality = featureQualityForGame(game);
    return `
        <div class="factor-cell">
            <strong>${escapeHtml(factor || "Model drivers pending")}</strong>
            <span>${escapeHtml(`P:${quality.pitcher} / T:${quality.travel}`)}</span>
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
    const scheduleOnly = isScheduleOnly(game, sport === "MLB" ? state.mlb.payload : state.nfl.payload);
    const canTrack = !scheduleOnly && getGamePick(game, sport) !== "-" && homeProb !== null;
    const probabilityRows = scheduleOnly ? `<div class="empty-state"><strong>Schedule only</strong><p>Train the model to generate probabilities.</p></div>` : `
            <div class="prob-row"><div class="prob-row__header"><span>${escapeHtml(homeMeta.abbreviation)}</span><strong>${formatProbability(homeProb)}</strong></div><div class="prob-bar"><span style="width:${homeProb === null ? 0 : homeProb * 100}%;background:${homeMeta.primary}"></span></div></div>
            <div class="prob-row"><div class="prob-row__header"><span>${escapeHtml(awayMeta.abbreviation)}</span><strong>${formatProbability(awayProb)}</strong></div><div class="prob-bar"><span style="width:${awayProb === null ? 0 : awayProb * 100}%;background:${awayMeta.primary}"></span></div></div>`;
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
            ${probabilityRows}
            <div class="detail-grid">
                ${isNfl ? renderNFLImpact(game) : renderMLBImpact(game)}
                ${renderLineMovement(game, sport)}
                ${renderCLV(game, sport)}
                <div class="detail-card"><span>Result status</span><strong>${escapeHtml(game.result || game.status || "Pending")}</strong></div>
            </div>
            ${sport === "MLB" ? renderPredictionExplanation(game) : ""}
            <button class="btn btn--primary full-width" data-add-tracker="${sport}" data-game-id="${escapeHtml(game.game_id || game.id || "")}" ${canTrack ? "" : "disabled"}>${canTrack ? "Add to Tracker" : "No model prediction"}</button>
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
    const quality = featureQualityForGame(game);
    return `
        <div class="detail-card"><span>Starting pitchers</span><strong>${escapeHtml(game.away_probable_pitcher || "TBD")} vs ${escapeHtml(game.home_probable_pitcher || "TBD")}</strong><small>${escapeHtml(game.pitcher_data_status === "missing" ? "Probable pitcher data unavailable. Using team-level model only." : game.pitcher_edge || "Pitcher edge pending")}</small></div>
        <div class="detail-card"><span>Data quality</span><strong>${escapeHtml(game.pitcher_edge || "Unknown")}</strong><small>Pitcher ${escapeHtml(quality.pitcher)} / travel ${escapeHtml(quality.travel)} / missing ${escapeHtml(quality.missing)}</small></div>
    `;
}

function renderPredictionExplanation(game) {
    const explanation = game.explanation || {};
    const factors = explanation.top_factors || [];
    const quality = featureQualityForGame(game);
    const values = game.feature_values || {};
    return `
        <section class="explanation-card">
            <div class="explanation-card__head">
                <div>
                    <p class="eyebrow">Why this pick?</p>
                    <h3>${escapeHtml(explanation.summary || "Model explanation unavailable for this row.")}</h3>
                </div>
                <div class="quality-badges">
                    <span class="chip">pitcher ${escapeHtml(quality.pitcher)}</span>
                    <span class="chip">travel ${escapeHtml(quality.travel)}</span>
                    <span class="chip chip--soft">${escapeHtml(quality.missing)} missing</span>
                </div>
            </div>
            ${factors.length ? `<div class="factor-list">${factors.slice(0, 5).map(factor => renderFactorRow(factor)).join("")}</div>` : emptyState("No factor export found", "Run npm run refresh:mlb:all to regenerate explanations.")}
            <details class="feature-details">
                <summary>Model metadata and feature values</summary>
                <div class="metadata-grid">
                    <div><span>Model</span><strong>${escapeHtml(game.model_name || normalizeMeta(state.mlb.payload).model_type || "model")}</strong></div>
                    <div><span>Model id</span><strong>${escapeHtml(game.model_id || normalizeMeta(state.mlb.payload).model_id || "-")}</strong></div>
                    <div><span>Feature rows</span><strong>${escapeHtml(normalizeMeta(state.mlb.payload).feature_count || selectedModelEntry("MLB")?.feature_count || "-")}</strong></div>
                </div>
                ${renderFeatureValueList(values)}
            </details>
        </section>
    `;
}

function renderFactorRow(factor) {
    const impact = String(factor.impact || "").replaceAll("_", " ");
    return `
        <div class="factor-row">
            <div>
                <strong>${escapeHtml(factor.label || factor.feature || "Model factor")}</strong>
                <span>${escapeHtml(factor.feature || "")}</span>
            </div>
            <div><span>${escapeHtml(impact || "neutral")}</span><strong>${formatNumber(factor.strength, 3)}</strong></div>
            <div><span>Home</span><strong>${formatNumber(factor.home_value, 2)}</strong></div>
            <div><span>Away</span><strong>${formatNumber(factor.away_value, 2)}</strong></div>
        </div>
    `;
}

function renderFeatureValueList(values) {
    const entries = Object.entries(values || {}).filter(([, value]) => safeNumber(value) !== null).slice(0, 16);
    if (!entries.length) return emptyState("No feature values exported", "Feature values are added during MLB prediction export.");
    return `<div class="feature-list">${entries.map(([key, value]) => `<div><span>${escapeHtml(key)}</span><strong>${formatNumber(value, 3)}</strong></div>`).join("")}</div>`;
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
    const comparisonRows = getComparisonRows(sport);
    $("#view-reports").innerHTML = `
        <section class="module-header panel">
            <div><p class="eyebrow">Reports / Backtesting</p><h2>Model evaluation center</h2><p class="muted">Calibration checks whether games predicted around 60% actually win around 60% of the time. Use Record for live/historical performance tracking.</p></div>
            <div class="report-actions"><select id="report-sport-select"><option ${sport === "MLB" ? "selected" : ""}>MLB</option><option ${sport === "NFL" ? "selected" : ""}>NFL</option></select><button class="btn" data-view-link="record">Open Record</button></div>
        </section>
        <section class="dashboard-grid">
            <article class="panel">${renderCurrentModelPanel(sport)}</article>
            <article class="panel">${renderModelRecordPanel(sport)}</article>
        </section>
        <section class="dashboard-grid">
            <article class="panel">
                <header class="section-header"><div><p class="eyebrow">Calibration</p><h2>${sport} calibration</h2></div><span class="chip">${state.report?.metadata?.real_data === false ? "missing" : "real"}</span></header>
                <div class="trend-chart"><canvas id="calibration-chart"></canvas></div>
                ${renderCalibrationTable(report.calibration || [])}
            </article>
            <article class="panel">
                <header><p class="eyebrow">Model comparison</p><h2>Model leaderboard</h2></header>
                ${renderModelComparison(comparisonRows)}
            </article>
        </section>
        <section class="dashboard-grid">
            <article class="panel"><header><p class="eyebrow">Confidence buckets</p><h2>Performance by tag</h2></header>${renderConfidenceBuckets(report.confidence_buckets || [])}</article>
            <article class="panel">${renderTopGlobalFeatures(sport)}</article>
        </section>
        <section class="dashboard-grid">
            <article class="panel">${renderPredictionLogSummary(sport)}</article>
            <article class="panel">${renderFeatureSummary(sport)}</article>
        </section>
        <section class="dashboard-grid">
            <article class="panel">${renderModelRegistryPanel(sport)}</article>
            <article class="panel"><header><p class="eyebrow">Auto report</p><h2>Generated report text</h2></header><div class="report-actions"><button class="btn" data-generate-report="NFL">Generate NFL Weekly Report</button><button class="btn" data-generate-report="MLB">Generate MLB Daily Report</button><button class="btn btn--primary" id="copy-report-btn">Copy Report</button></div><textarea id="generated-report" readonly>${escapeHtml(generateReportText(sport))}</textarea></article>
        </section>
    `;
    renderCalibrationChart(report.calibration || []);
}

function renderRecord() {
    const sport = state.selected.recordSport || "MLB";
    $("#view-record").innerHTML = `
        <section class="module-header panel">
            <div>
                <p class="eyebrow">Record</p>
                <h2>Model Record</h2>
                <p class="muted">Track how LineLens has actually performed. Live records, backtests, and historical cached exports stay separated.</p>
            </div>
            <div class="segmented-control">
                ${["MLB", "NFL"].map(value => `<button class="${sport === value ? "is-active" : ""}" data-record-sport="${value}">${value}</button>`).join("")}
            </div>
        </section>
        ${sport === "MLB" ? renderMlbRecordView() : renderNflRecordView()}
    `;
}

function recordCard(label, record, note) {
    const accuracy = safeNumber(record?.accuracy);
    return card(label, recordLine(record || {}), `${accuracy === null ? "Accuracy pending" : formatProbability(accuracy)}${note ? ` / ${note}` : ""}`);
}

function renderMlbRecordView() {
    const record = getModelRecord("MLB");
    const live = record.live_record || record.overall || {};
    const backtest = record.backtest_record || {};
    const recentRows = record.recent_predictions || getLogEntries().filter(row => row.sport === "MLB").slice(0, 12);
    const scored = safeNumber(live.scored, 0);
    return `
        <section class="dashboard-grid">
            <article class="panel record-hero-card">
                <header><p class="eyebrow">MLB Live Record</p><h2>${recordLine(live)}</h2></header>
                <p class="muted">${escapeHtml(live.note || "Only logged LineLens MLB predictions are counted here. Schedule-only games do not count.")}</p>
                <div class="summary-grid summary-grid--compact">
                    ${card("Accuracy", formatProbability(live.accuracy), `${safeNumber(live.scored, 0)} scored`)}
                    ${card("Pending", safeNumber(live.pending, 0), "awaiting final score")}
                    ${card("Today", recordLine(record.today_record || {}), formatProbability(record.today_record?.accuracy))}
                    ${card("Yesterday", recordLine(record.yesterday_record || {}), formatProbability(record.yesterday_record?.accuracy))}
                </div>
                ${scored ? "" : emptyState("No completed live MLB predictions scored yet", "Predictions are being logged starting now. Run npm run score:models after games complete.")}
            </article>
            <article class="panel">
                <header><p class="eyebrow">Recent Form</p><h2>Last 7 / 30 days</h2></header>
                <div class="summary-grid summary-grid--compact">
                    ${recordCard("Last 7 days", record.recent_7_days || {}, "")}
                    ${recordCard("Last 30 days", record.recent_30_days || {}, "")}
                    ${card("Last scored", record.last_scored_game ? `${record.last_scored_game.away} @ ${record.last_scored_game.home}` : "-", record.last_scored_game?.model_result || "none yet")}
                    ${card("Last scoring run", timestamp(state.modelRecord?.metadata?.last_scoring_run || state.modelRecord?.metadata?.generated_at), "model_record.json")}
                </div>
            </article>
        </section>
        <section class="dashboard-grid">
            <article class="panel">
                <header><p class="eyebrow">Live Prediction Log</p><h2>Recent logged MLB picks</h2></header>
                ${recentRows.length ? renderRecordPredictionTable(recentRows, "MLB") : emptyState("No MLB prediction log rows", "Run npm run refresh:mlb, then npm run score:models.")}
            </article>
            <article class="panel">
                <header><p class="eyebrow">MLB Backtest Record</p><h2>${escapeHtml(backtest.label || "2025 Backtest")}</h2></header>
                <p class="muted">${escapeHtml(backtest.note || "Backtest results are separate from the live model record.")}</p>
                <div class="summary-grid summary-grid--compact">
                    ${card("Record", recordLine(backtest), formatProbability(backtest.accuracy))}
                    ${card("Rows", safeNumber(backtest.row_count, backtest.sample_size || 0), "backtest export")}
                    ${card("Model", backtest.model_type || backtest.metrics?.model_name || "-", `Season ${backtest.test_season || "-"}`)}
                    ${card("Log loss", formatNumber(backtest.metrics?.log_loss, 3), `Brier ${formatNumber(backtest.metrics?.brier_score, 3)}`)}
                </div>
            </article>
        </section>
    `;
}

function bestConfidenceBucket(rows = []) {
    const eligible = rows.filter(row => safeNumber(row.accuracy) !== null && safeNumber(row.scored, 0) > 0);
    return eligible.sort((a, b) => safeNumber(b.accuracy, 0) - safeNumber(a.accuracy, 0))[0] || null;
}

function renderNflRecordView() {
    const record = getModelRecord("NFL");
    const historical = record.historical_record || record.overall || {};
    const latest = record.latest_season_record || {};
    const bestBucket = bestConfidenceBucket(record.by_confidence || []);
    const missing = record.missing_fields || historical.missing_fields || [];
    const scorable = safeNumber(historical.scored, historical.rows_scored || 0);
    return `
        <section class="dashboard-grid">
            <article class="panel record-hero-card">
                <header><p class="eyebrow">NFL Historical Record</p><h2>${recordLine(historical)}</h2></header>
                <p class="muted">${escapeHtml(record.note || "NFL rows are historical/backtest exports, not current live NFL record.")}</p>
                <div class="summary-grid summary-grid--compact">
                    ${card("Accuracy", formatProbability(historical.accuracy), `${scorable} scored`)}
                    ${card("Rows found", safeNumber(historical.rows_found, 0), "nfl_predictions.json")}
                    ${card("Latest season", recordLine(latest), latest.label || "")}
                    ${card("Pushes", safeNumber(historical.pushes, 0), "spread ties")}
                </div>
                ${missing.length ? `<p class="data-status" data-variant="warning">NFL historical rows found, but some scoring fields are missing: <code>${escapeHtml(missing.join(", "))}</code>.</p>` : ""}
                ${scorable ? "" : emptyState("NFL rows are not scorable yet", "Run npm run score:models after exporting rows with model_result fields.")}
            </article>
            <article class="panel">
                <header><p class="eyebrow">Confidence</p><h2>${escapeHtml(bestBucket?.bucket || "No bucket yet")}</h2></header>
                <div class="summary-grid summary-grid--compact">
                    ${card("Best bucket", bestBucket ? recordLine(bestBucket) : "-", bestBucket ? formatProbability(bestBucket.accuracy) : "missing")}
                    ${card("Prediction mode", historical.prediction_mode || "-", historical.source || "")}
                    ${card("Rows scored", scorable, "real exported outcomes")}
                    ${card("Record label", historical.label || "Historical Backtest", "not live")}
                </div>
            </article>
        </section>
        <section class="dashboard-grid">
            <article class="panel">
                <header><p class="eyebrow">By Season</p><h2>NFL record by season</h2></header>
                ${renderRecordGroupTable(record.by_season || [], "season")}
            </article>
            <article class="panel">
                <header><p class="eyebrow">By Confidence</p><h2>NFL bucket record</h2></header>
                ${renderRecordGroupTable(record.by_confidence || [], "bucket")}
            </article>
        </section>
        <section class="panel">
            <header><p class="eyebrow">Recent Historical Rows</p><h2>Latest NFL export rows</h2></header>
            ${(record.recent_games || []).length ? renderRecordPredictionTable(record.recent_games, "NFL") : emptyState("No recent NFL rows", "NFL historical record depends on data/predictions/nfl_predictions.json.")}
        </section>
    `;
}

function renderRecordPredictionTable(rows, sport) {
    return `<div class="table-wrapper"><table class="data-table"><thead><tr><th>Date</th><th>Game</th><th>Pick</th><th>Probability</th><th>Result</th><th>Score</th></tr></thead><tbody>${rows.map(row => {
        const probability = safeNumber(row.confidence ?? row.confidence_score ?? Math.max(safeNumber(row.home_win_probability, 0), safeNumber(row.away_win_probability, 0)));
        const score = safeNumber(row.away_score) !== null && safeNumber(row.home_score) !== null ? `${row.away} ${row.away_score}, ${row.home} ${row.home_score}` : "-";
        return `<tr><td>${formatDate(row.game_date || row.generated_at)}</td><td>${escapeHtml(row.away || "-")} @ ${escapeHtml(row.home || "-")}</td><td><strong>${escapeHtml(row.model_pick || "-")}</strong></td><td>${formatProbability(probability)}</td><td>${resultChip(row.model_result || row.result_status || "pending")}</td><td>${escapeHtml(score)}</td></tr>`;
    }).join("")}</tbody></table></div>`;
}

function renderRecordGroupTable(rows, labelKey) {
    if (!rows.length) return emptyState("No grouped record rows", "Run npm run score:models.");
    return `<div class="table-wrapper"><table class="data-table"><thead><tr><th>${escapeHtml(labelKey.replaceAll("_", " "))}</th><th>Record</th><th>Accuracy</th><th>Scored</th><th>Pending</th></tr></thead><tbody>${rows.map(row => `<tr><td><strong>${escapeHtml(row[labelKey] ?? row.bucket ?? "-")}</strong></td><td>${recordLine(row)}</td><td>${formatProbability(row.accuracy)}</td><td>${safeNumber(row.scored, 0)}</td><td>${safeNumber(row.pending, 0)}</td></tr>`).join("")}</tbody></table></div>`;
}

function renderCurrentModelPanel(sport) {
    const selectedModel = selectedModelEntry(sport);
    const meta = sport === "MLB" ? normalizeMeta(state.mlb.payload) : normalizeMeta(state.nfl.payload);
    const report = state.report?.sports?.[sport] || {};
    const metrics = selectedModel?.metrics || report.metrics || {};
    return `
        <header><p class="eyebrow">Current ${sport} model</p><h2>${escapeHtml(selectedModel?.model_name || meta.model_type || report.metadata?.model_name || "Model not selected")}</h2></header>
        <div class="metric-grid">
            <div><span>Version</span><strong>${escapeHtml(selectedModel?.version || meta.version || state.app.version || APP_VERSION)}</strong></div>
            <div><span>Selected by</span><strong>${escapeHtml(selectedModel?.selected_by || "log loss / Brier")}</strong></div>
            <div><span>Features</span><strong>${escapeHtml(selectedModel?.feature_count || report.metadata?.feature_count || meta.feature_count || "-")}</strong></div>
            <div><span>Trained</span><strong>${escapeHtml(timestamp(selectedModel?.trained_at || report.metadata?.created_at))}</strong></div>
        </div>
        <div class="stat-list">
            <div><strong>Accuracy</strong><span>${formatProbability(metrics.accuracy)}</span></div>
            <div><strong>ROC AUC</strong><span>${formatNumber(metrics.roc_auc, 3)}</span></div>
            <div><strong>Log loss</strong><span>${formatNumber(metrics.log_loss, 3)}</span></div>
            <div><strong>Brier</strong><span>${formatNumber(metrics.brier_score, 3)}</span></div>
        </div>
        ${selectedModel ? "" : emptyState("No registry entry", sport === "MLB" ? "Run npm run refresh:mlb:all." : "NFL registry support is schema-ready.")}
    `;
}

function renderModelRecordPanel(sport) {
    const record = getModelRecord(sport);
    const overall = record.overall || {};
    const lastRun = state.modelRecord?.metadata?.generated_at;
    return `
        <header><p class="eyebrow">Model record</p><h2>${recordLine(overall)}</h2></header>
        <div class="summary-grid summary-grid--compact">
            ${card("Accuracy", formatProbability(overall.accuracy), "scored predictions")}
            ${card("Pending", safeNumber(overall.pending, 0), "awaiting final")}
            ${card("Recent 7 days", recordLine(record.recent_7_days || {}), formatProbability(record.recent_7_days?.accuracy))}
            ${card("Recent 30 days", recordLine(record.recent_30_days || {}), formatProbability(record.recent_30_days?.accuracy))}
        </div>
        <p class="muted">Last scoring run: ${escapeHtml(timestamp(lastRun))}. ${sport === "NFL" ? "NFL scoring remains schema-ready and depends on exported cover-result fields." : "MLB scoring uses cached MLB Stats API schedule/results when available."}</p>
        ${state.modelRecord ? "" : emptyState("No model record file", "Run npm run score:models.")}
    `;
}

function renderTopGlobalFeatures(sport) {
    const features = topGlobalFeatures(sport);
    return `
        <header><p class="eyebrow">Top global features</p><h2>Model drivers</h2></header>
        ${features.length ? `<div class="stat-list">${features.slice(0, 12).map(row => `<div><strong>${escapeHtml(row.feature)}</strong><span>${formatNumber(row.importance ?? row.coefficient, 4)}</span></div>`).join("")}</div>` : emptyState("No feature importance export", sport === "MLB" ? "Run npm run refresh:mlb:all." : "NFL feature importance export is not available yet.")}
    `;
}

function renderPredictionLogSummary(sport) {
    const summary = logSummaryForSport(sport);
    const latest = summary.entries.map(row => row.generated_at).filter(Boolean).sort().at(-1);
    return `
        <header><p class="eyebrow">Prediction log</p><h2>${summary.entries.length} logged snapshots</h2></header>
        <div class="summary-grid summary-grid--compact">
            ${card("Scored", summary.scored, "win/loss/push")}
            ${card("Pending", summary.pending, "future or no final")}
            ${card("Latest log", latest ? formatDate(latest) : "-", timestamp(latest))}
        </div>
        ${summary.entries.length ? renderPredictionLogTable(summary.entries.slice(0, 6)) : emptyState("No prediction log", sport === "MLB" ? "Run npm run refresh:mlb, then npm run score:models." : "NFL prediction logging is schema-ready.")}
    `;
}

function renderPredictionLogTable(rows) {
    return `<div class="table-wrapper"><table class="data-table"><thead><tr><th>Date</th><th>Game</th><th>Pick</th><th>Prob</th><th>Result</th></tr></thead><tbody>${rows.map(row => `<tr><td>${formatDate(row.game_date)}</td><td>${escapeHtml(row.away)} @ ${escapeHtml(row.home)}</td><td><strong>${escapeHtml(row.model_pick)}</strong></td><td>${formatProbability(row.confidence || Math.max(safeNumber(row.home_win_probability, 0), safeNumber(row.away_win_probability, 0)))}</td><td>${escapeHtml(row.model_result || row.result_status || "pending")}</td></tr>`).join("")}</tbody></table></div>`;
}

function renderFeatureSummary(sport) {
    if (sport !== "MLB") return `<header><p class="eyebrow">Feature summary</p><h2>NFL compatibility</h2></header>${emptyState("NFL feature summary not generated", "NFL structure is preserved; this sprint focuses on MLB feature engineering.")}`;
    const summary = state.featureSummary || {};
    const meta = summary.metadata || {};
    const groups = summary.feature_groups || {};
    const groupRows = Object.entries(groups).map(([name, group]) => ({ name, missing: group.missingness_avg, feature_count: group.feature_count }));
    return `
        <header><p class="eyebrow">Feature summary</p><h2>${escapeHtml(summary.feature_count || 0)} MLB features</h2></header>
        <div class="summary-grid summary-grid--compact">
            ${card("Rows", summary.rows || 0, "feature table")}
            ${card("Features used", (summary.features_used_by_model || []).length, "selected model")}
            ${card("Dropped", (summary.features_dropped || []).length, "missing/object/excluded")}
            ${card("Generated", timestamp(meta.generated_at), "summary export")}
        </div>
        ${groupRows.length ? `<div class="stat-list">${groupRows.map(row => `<div><strong>${escapeHtml(row.name.replaceAll("_", " "))}</strong><span>${row.feature_count} features / ${formatProbability(row.missing)} missing</span></div>`).join("")}</div>` : emptyState("No feature groups", "Run npm run refresh:mlb:all.")}
    `;
}

function renderModelRegistryPanel(sport) {
    const entries = (state.modelRegistry?.models || []).filter(model => model.sport === sport);
    if (!entries.length) return `<header><p class="eyebrow">Model registry</p><h2>No model runs yet</h2></header>${emptyState("Registry file missing or empty", sport === "MLB" ? "Run npm run refresh:mlb:all." : "NFL registry entries will appear after model-backed training exports.")}`;
    const current = entries.find(model => model.selected) || entries[0];
    const previous = entries.find(model => model.model_id !== current.model_id);
    const improved = previous && safeNumber(current.metrics?.log_loss) !== null && safeNumber(previous.metrics?.log_loss) !== null
        ? safeNumber(current.metrics.log_loss) < safeNumber(previous.metrics.log_loss)
        : null;
    return `
        <header><p class="eyebrow">Model registry</p><h2>${escapeHtml(current.model_id || current.model_name)}</h2></header>
        <p class="muted">${improved === null ? "No previous comparable model yet." : improved ? "Improved vs previous by log loss." : "No log-loss improvement vs previous model."}</p>
        <div class="table-wrapper"><table class="data-table"><thead><tr><th>Model</th><th>Version</th><th>Trained</th><th>Log loss</th><th>Brier</th><th>Selected</th></tr></thead><tbody>${entries.slice(0, 6).map(row => `<tr><td>${escapeHtml(row.model_name)}</td><td>${escapeHtml(row.version)}</td><td>${formatDate(row.trained_at)}</td><td>${formatNumber(row.metrics?.log_loss, 3)}</td><td>${formatNumber(row.metrics?.brier_score, 3)}</td><td>${row.selected ? '<span class="tag tag--high">current</span>' : ""}</td></tr>`).join("")}</tbody></table></div>
    `;
}

function renderCalibrationTable(rows) {
    if (!rows.length) return emptyState("No calibration rows", "Run or export a model report.");
    return `<div class="table-wrapper"><table class="data-table"><thead><tr><th>Bucket</th><th>Pred avg</th><th>Actual</th><th>Games</th><th>Diff</th></tr></thead><tbody>${rows.map(row => `<tr><td>${row.bucket}</td><td>${formatProbability(row.predicted_avg)}</td><td>${formatProbability(row.actual_rate)}</td><td>${row.games}</td><td>${formatEdge(row.difference)}</td></tr>`).join("")}</tbody></table></div>`;
}

function renderModelComparison(rows) {
    if (!rows.length) return emptyState("No comparison rows", "Model comparison export is missing.");
    const finiteLogLosses = rows.map(row => safeNumber(row.log_loss)).filter(value => value !== null);
    const bestLogLoss = finiteLogLosses.length ? Math.min(...finiteLogLosses) : null;
    return `<div class="table-wrapper"><table class="data-table"><thead><tr><th>Model</th><th>Status</th><th>Accuracy</th><th>ROC AUC</th><th>Log loss</th><th>Brier</th><th>N</th></tr></thead><tbody>${rows.map(row => `<tr><td><strong>${escapeHtml(row.model || row.model_name)}</strong> ${bestLogLoss !== null && safeNumber(row.log_loss) === bestLogLoss ? '<span class="tag tag--high">Best log loss</span>' : ""}</td><td>${escapeHtml(row.status)}</td><td>${formatProbability(row.accuracy)}</td><td>${formatNumber(row.roc_auc, 3)}</td><td>${formatNumber(row.log_loss, 3)}</td><td>${formatNumber(row.brier_score, 3)}</td><td>${row.sample_size || 0}</td></tr>`).join("")}</tbody></table></div>`;
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
    const record = getModelRecord(sport).overall || {};
    const currentModel = selectedModelEntry(sport);
    const lines = [
        `LineLens Sports ${sport === "MLB" ? "MLB Daily" : "NFL Weekly"} Report`,
        `Generated: ${new Date().toLocaleString()}`,
        `Current model: ${currentModel?.model_name || meta.model_type || "not selected"} (${currentModel?.version || meta.version || state.app.version || APP_VERSION})`,
        `Model record: ${recordLine(record)} / ${formatProbability(record.accuracy)}`,
        "",
        "Top model leans:",
        ...(rows.length ? rows.map((row, idx) => {
            const factor = row.game.top_factor_label || row.game.explanation?.top_factors?.[0]?.label || "model confidence";
            return `${idx + 1}. ${row.pick} in ${row.game.away} @ ${row.game.home} - ${formatProbability(row.probability)} home-side probability (${row.confidence}); top factor: ${factor}`;
        }) : ["No model leans loaded."]),
        "",
        "Data notes:",
        `- Prediction mode: ${dataMode(sport === "NFL" ? state.nfl.payload : state.mlb.payload, sport === "NFL" ? state.nfl.games : state.mlb.games)}.`,
        `- Odds data: ${meta.odds_status || "Optional/unavailable."}`,
        sport === "MLB" ? "- Pitcher features use real probable pitcher names when available and pitcher-team-result proxies, not fabricated ERA/WHIP." : "- Injury impact depends on exported injury fields; missing injuries are labeled unknown.",
        sport === "MLB" ? "- Travel is an estimated city/venue distance feature, not an exact itinerary." : "- NFL record scoring is schema-ready when cover-result fields are exported.",
        `- Report metrics mode: ${report?.status || (state.report?.metadata?.real_data === false ? "missing" : "real")}.`,
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

function liveWidgetPrefs() {
    try {
        return JSON.parse(localStorage.getItem("linelens.liveWidget.v1") || "{}");
    } catch (_error) {
        return {};
    }
}

function saveLiveWidgetPrefs(prefs) {
    localStorage.setItem("linelens.liveWidget.v1", JSON.stringify({ ...liveWidgetPrefs(), ...prefs }));
}

function renderLiveWidgetSettings() {
    const prefs = liveWidgetPrefs();
    const meta = normalizeMeta(state.live.payload);
    const interval = safeNumber(prefs.refreshInterval, 30);
    return `
        <section class="panel live-widget-settings">
            <header class="section-header">
                <div>
                    <p class="eyebrow">Live Widget</p>
                    <h2>Mini live scores window</h2>
                    <p class="muted">${state.refreshRuntime.available ? "Desktop widget commands are available." : "Live widget is available in the Tauri desktop app. Browser mode uses manual refresh commands."}</p>
                </div>
                <span class="chip">${escapeHtml(meta.source_status || "missing")}</span>
            </header>
            <div class="settings-grid">
                <div class="setting-row"><strong>Live games loaded</strong><span>${escapeHtml(String(state.live.games.length))}</span><code>data/live/live_scores.json</code></div>
                <div class="setting-row"><strong>Last live refresh</strong><span>${escapeHtml(timestamp(meta.generated_at))}</span><code>${escapeHtml(meta.source || "npm run refresh:live")}</code></div>
                <div class="setting-row"><strong>Manual command</strong><span>Browser/static fallback</span><code>npm run refresh:live</code></div>
                <div class="setting-row"><strong>Auto refresh</strong><span>${interval ? `${interval}s` : "Off"}</span><code>Widget preference</code></div>
            </div>
            <div class="report-actions">
                <button class="btn btn--primary" data-open-live-widget>Open Live Widget</button>
                <button class="btn" data-refresh-command="live_scores">Refresh Live Scores Now</button>
                <label class="inline-control">Interval
                    <select id="live-widget-interval">
                        ${[[30, "30s"], [60, "60s"], [120, "2m"], [0, "Off"]].map(([value, label]) => `<option value="${value}" ${interval === value ? "selected" : ""}>${label}</option>`).join("")}
                    </select>
                </label>
                <label class="inline-control">
                    <input id="live-widget-work-mode" type="checkbox" ${prefs.workMode ? "checked" : ""}>
                    Work Mode
                </label>
            </div>
            ${state.refreshRuntime.available ? "" : `<p class="data-status" data-variant="warning">Live widget windows open from the Tauri desktop app. In browser/static mode, run <code>npm run refresh:live</code> to update cached live scores.</p>`}
        </section>
    `;
}

function renderSettings() {
    const modes = [
        ["App version", state.app.version || APP_VERSION, "Visible release metadata"],
        ["NFL data mode", dataMode(state.nfl.payload, state.nfl.games), "data/predictions/nfl_predictions.json"],
        ["MLB data mode", dataMode(state.mlb.payload, state.mlb.games), "data/predictions/mlb_predictions.json"],
        ["MLB Stats API", "No key required", "schedule/probable pitchers/status/scores"],
        ["NFL data", "nfl-data-py/cached pipeline", "exported NFL predictions or offseason cache"],
        ["Odds API", oddsStatusLabel(), "optional The Odds API via ODDS_API_KEY"],
        ["Reports mode", state.report?.metadata?.real_data === false ? "missing" : state.report ? "real" : "missing", "data/reports/model_report.json"],
        ["MLB feature summary", state.featureSummary ? `${state.featureSummary.feature_count || 0} features` : "missing", "data/reports/mlb_feature_summary.json"],
        ["Model comparison", state.modelComparison ? `${(state.modelComparison.models || []).length} rows` : "missing", "data/reports/mlb_model_comparison.json"],
        ["Model registry", state.modelRegistry ? `${(state.modelRegistry.models || []).length} model runs` : "missing", "data/models/model_registry.json"],
        ["Prediction log", state.predictionLog ? `${getLogEntries().length} snapshots` : "missing", "data/tracking/model_predictions_log.json"],
        ["Model record", state.modelRecord ? timestamp(state.modelRecord.metadata?.generated_at) : "missing", "data/tracking/model_record.json"],
        ["Live widget", state.live.payload ? `${state.live.games.length} games` : "missing", "data/live/live_scores.json"],
        ["Team metadata", state.teamPayload?.teams?.length ? `${state.teamPayload.teams.length} teams` : "missing", "data/team_metadata.json"],
        ["Bootstrap status", state.bootstrapStatus?.status || "missing", state.bootstrapStatus?.python_version ? `Python ${state.bootstrapStatus.python_version}` : "data/bootstrap_status.json"],
        ["Startup automation", state.startupStatus?.status || "missing", state.startupStatus?.error || "data/startup_status.json"],
        ["Desktop build", "GitHub Actions", ".github/workflows/tauri-windows-build.yml"],
        ["Refresh runtime", state.refreshRuntime.available ? "Available in desktop app" : "Not available in browser/static mode", state.refreshRuntime.message],
    ];
    $("#view-settings").innerHTML = `
        <section class="module-header panel">
            <div><p class="eyebrow">Settings / Data Status</p><h2>Environment, data files, and build path</h2><p class="muted">Local native Tauri build is optional. This work machine can use GitHub Actions for Windows bundles.</p></div>
            <span class="chip">${escapeHtml(state.app.version || APP_VERSION)}</span>
        </section>
        ${renderLiveWidgetSettings()}
        ${renderRefreshPanel("settings")}
        ${renderCommandConsole("settings")}
        <section class="panel"><div class="settings-grid">${modes.map(([label, status, note]) => `<div class="setting-row"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(status)}</span><code>${escapeHtml(note)}</code></div>`).join("")}</div></section>
        ${dataMode(state.nfl.payload, state.nfl.games) === "missing" ? `<section class="panel">${renderNflManualRecoveryCard()}</section>` : ""}
        <section class="panel"><p class="data-status" data-variant="${state.refreshRuntime.available ? "success" : "warning"}">${state.refreshRuntime.available ? "Python data refresh is available through the Tauri desktop shell. Browser mode still uses manual commands." : "Command refresh is available only in the Tauri desktop app. Run CLI commands from terminal in browser/static mode."} Tracking data is stored locally in <code>${TRACKER_KEY}</code>. Refresh logs use <code>${REFRESH_LOGS_KEY}</code>.</p><p class="muted">For analysis and tracking only. Predictions are experimental and not financial advice.</p></section>
    `;
}

function renderAll() {
    renderHome();
    renderNFL();
    renderMLB();
    renderReports();
    renderRecord();
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

        if (event.target.closest("[data-open-live-widget]")) openLiveWidget();

        const recordSport = event.target.closest("[data-record-sport]");
        if (recordSport) {
            state.selected.recordSport = recordSport.dataset.recordSport;
            persistSettings();
            renderRecord();
        }

        const homeSport = event.target.closest("[data-home-sport]");
        if (homeSport) {
            state.selected.homeSport = homeSport.dataset.homeSport;
            persistSettings();
            renderHome();
        }

        const homeMlbRange = event.target.closest("[data-home-mlb-range]");
        if (homeMlbRange) {
            setHomeMlbRange(homeMlbRange.dataset.homeMlbRange);
            renderHome();
        }

        const homeMlbDay = event.target.closest("[data-home-mlb-day]");
        if (homeMlbDay) {
            state.selected.homeMlbRange = "date";
            moveMlbReviewDate(Number(homeMlbDay.dataset.homeMlbDay));
            renderHome();
        }

        const mlbDay = event.target.closest("[data-mlb-day]");
        if (mlbDay) {
            moveMlbReviewDate(Number(mlbDay.dataset.mlbDay));
            renderMLB();
        }

        const homeNflWeek = event.target.closest("[data-home-nfl-week]");
        if (homeNflWeek) {
            moveNflWeek(Number(homeNflWeek.dataset.homeNflWeek));
            renderHome();
        }

        const nflWeek = event.target.closest("[data-nfl-week]");
        if (nflWeek) {
            moveNflWeek(Number(nflWeek.dataset.nflWeek));
            renderNFL();
        }

        const homeOpenGame = event.target.closest("[data-home-open-game]");
        if (homeOpenGame) {
            const sport = homeOpenGame.dataset.homeOpenGame;
            const source = sport === "NFL" ? ensureNflScope().games : homeBoardGames();
            const game = source.find(item => gameKey({ ...item, sport }) === homeOpenGame.dataset.gameId);
            if (game) state.selected[sport.toLowerCase()] = game;
            persistSettings();
            sport === "NFL" ? renderNFL() : renderMLB();
            switchView(sport.toLowerCase());
        }

        const tickerOpenGame = event.target.closest("[data-ticker-open-game]");
        if (tickerOpenGame) {
            const sport = tickerOpenGame.dataset.tickerOpenGame;
            const source = sport === "NFL" ? ensureNflScope().games : homeBoardGames();
            const game = source.find(item => gameKey({ ...item, sport }) === tickerOpenGame.dataset.gameId);
            if (game) state.selected[sport.toLowerCase()] = game;
            persistSettings();
            sport === "NFL" ? renderNFL() : renderMLB();
            switchView(sport.toLowerCase());
        }

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
            const sourceName = row.dataset.selectGame;
            const sport = sourceName === "MLB_BACKTEST" || sourceName === "MLB_REVIEW" ? "MLB" : sourceName;
            const source = sourceName === "NFL"
                ? state.nfl.games
                : sourceName === "MLB_BACKTEST"
                    ? state.mlbBacktest.games
                    : sourceName === "MLB_REVIEW"
                        ? filterMlbGames(mlbRowsForDate())
                        : state.mlb.games;
            const game = source.find(item => gameKey({ ...item, sport }) === row.dataset.gameId) || source[Number(row.dataset.gameIndex)];
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
        const commandRefreshButton = event.target.closest("[data-refresh-command]");
        if (commandRefreshButton) runRefreshCommand(commandRefreshButton.dataset.refreshCommand);
        const refreshButton = event.target.closest("[data-refresh-sport]");
        if (refreshButton) refreshData(refreshButton.dataset.refreshSport);
        const startupRefreshButton = event.target.closest("[data-startup-refresh]");
        if (startupRefreshButton) runStartupRefresh();
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
        if (event.target.id === "mlb-filter-select") {
            state.selected.mlbFilter = event.target.value;
            persistSettings();
            renderMLB();
        }
        if (event.target.id === "home-mlb-date") {
            state.selected.homeMlbDate = event.target.value;
            state.selected.homeMlbRange = "date";
            persistSettings();
            renderHome();
        }
        if (event.target.id === "mlb-mlb-date") {
            state.selected.homeMlbDate = event.target.value;
            persistSettings();
            renderMLB();
        }
        if (event.target.id === "home-nfl-season" || event.target.id === "nfl-nfl-season") {
            state.selected.homeNflSeason = safeNumber(event.target.value);
            state.selected.homeNflWeek = latestNflWeek(state.selected.homeNflSeason);
            persistSettings();
            event.target.id === "home-nfl-season" ? renderHome() : renderNFL();
        }
        if (event.target.id === "home-nfl-week" || event.target.id === "nfl-nfl-week") {
            state.selected.homeNflWeek = safeNumber(event.target.value);
            persistSettings();
            event.target.id === "home-nfl-week" ? renderHome() : renderNFL();
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
        if (event.target.id === "live-widget-interval") {
            saveLiveWidgetPrefs({ refreshInterval: safeNumber(event.target.value, 30) });
            showToast("Live widget interval saved");
            renderSettings();
        }
        if (event.target.id === "live-widget-work-mode") {
            saveLiveWidgetPrefs({ workMode: event.target.checked });
            showToast("Live widget work mode saved");
            renderSettings();
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
