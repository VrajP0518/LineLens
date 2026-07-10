const APP_VERSION = "v2.0.0";
const TRACKER_KEY = "linelens.tracker.v1";
const SETTINGS_KEY = "linelens.settings.v1";
const REFRESH_LOGS_KEY = "linelens.refreshLogs.v1";
const FAVORITES_KEY = "linelens.favorites.v1";
const LIVE_ALERTS_KEY = "linelens.liveAlerts.v1";

const DATA_SOURCES = {
    app: ["data/app_metadata.json"],
    teams: ["data/team_metadata.json"],
    reports: ["data/reports/model_report.json"],
    modelComparison: ["data/reports/mlb_model_comparison.json"],
    moltresCard: ["data/reports/mlb_moltres_model_card.json"],
    featureSummary: ["data/reports/mlb_feature_summary.json"],
    modelRegistry: ["data/models/model_registry.json"],
    modelRecord: ["data/tracking/model_record.json"],
    predictionLog: ["data/tracking/model_predictions_log.json"],
    bootstrap: ["data/bootstrap_status.json"],
    startup: ["data/startup_status.json"],
    refresh: ["data/refresh_status.json"],
    live: ["data/live/live_scores.json"],
    odds: ["data/odds/odds_snapshots.json"],
    nfl: ["data/predictions/nfl_predictions.json", "data/predictions.json"],
    mlb: ["data/predictions/mlb_predictions.json"],
    mlbBacktest: ["data/predictions/mlb_backtest_predictions.json"],
};

const state = {
    app: window.__APP_METADATA__ || { app: "LineLens Sports", version: APP_VERSION },
    teamPayload: window.__TEAM_METADATA__ || { teams: [] },
    report: window.__MODEL_REPORT__ || null,
    modelComparison: window.__MLB_MODEL_COMPARISON__ || null,
    moltresCard: window.__MLB_MOLTRES_MODEL_CARD__ || null,
    featureSummary: window.__MLB_FEATURE_SUMMARY__ || null,
    modelRegistry: window.__MODEL_REGISTRY__ || null,
    modelRecord: window.__MODEL_RECORD__ || null,
    predictionLog: window.__MODEL_PREDICTIONS_LOG__ || null,
    bootstrapStatus: window.__BOOTSTRAP_STATUS__ || null,
    startupStatus: window.__STARTUP_STATUS__ || null,
    refreshStatus: window.__REFRESH_STATUS__ || null,
    live: { payload: window.__LIVE_SCORES__ || null, games: [], error: null },
    odds: window.__ODDS_SNAPSHOTS__ || null,
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
        recordResultFilter: "all",
        recordMarketFilter: "all",
        mlbFilter: "all",
        nflFilter: "all",
        homeSport: "MLB",
        homeMlbDate: null,
        mlbDate: null,
        homeMlbRange: "today",
        homeNflSeason: null,
        homeNflWeek: null,
        nflSeasonManual: false,
        presentationMode: false,
        tableDensity: "comfortable",
        liveHeartbeatEnabled: true,
        liveHeartbeatSeconds: 15,
        onboardingSeen: false,
        onboardingNever: false,
        modelName: null,
        mlbLifecycleFilter: "all",
    },
    favorites: { teams: [], games: [] },
    gamecast: { open: false, sport: null, gameId: null },
    liveRefresh: {
        intervalId: null,
        refreshing: false,
        lastRunAt: null,
        lastStatus: "waiting",
        lastMessage: "Live heartbeat will start after exports load.",
        signatures: {},
        notifications: [],
    },
    tracker: [],
    refreshLogs: [],
    charts: {},
    aboutOpen: false,
};

const derivedCache = {
    mlbReviewKey: "",
    mlbReviewRows: null,
    modelEntriesKey: "",
    modelEntries: null,
    mlbBoardKey: "",
    mlbBoardGames: null,
    mlbBoardDatesKey: "",
    mlbBoardDates: null,
    teamGradientColors: new Map(),
};

const REFRESH_COMMANDS = {
    startup_auto: {
        label: "Startup Automation",
        manual: "npm run refresh:startup",
        description: "Bootstrap Python, refresh MLB/NFL/live data, score records, and check bundled data status.",
    },
    bootstrap_env: {
        label: "Bootstrap Python Environment",
        manual: "py -3.11 scripts/bootstrap_env.py",
        description: "Create/use .venv, install requirements when needed, and verify imports.",
    },
    startup: {
        label: "Startup Refresh",
        manual: "npm run refresh:startup",
        description: "Run the full startup refresh for MLB, NFL, live widget data, records, and data status.",
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
    odds_snapshots: {
        label: "Odds Snapshots",
        manual: "npm run refresh:odds",
        description: "Fetch optional real odds snapshots and join current market lines when a key is configured.",
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
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return formatDateOnly(value);
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function parseDateOnly(value) {
    const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateOnly(value, options = { month: "long", day: "numeric" }) {
    const date = parseDateOnly(toIsoDate(value));
    return date ? date.toLocaleDateString(undefined, options) : String(value || "-");
}

function localDateIso(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
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
    const raw = String(value).trim();
    const direct = raw.match(/^(\d{4}-\d{2}-\d{2})/);
    if (direct) return direct[1];
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return "";
    return localDateIso(date);
}

function isEpochLikeDate(value) {
    const iso = toIsoDate(value);
    if (!iso) return true;
    return Number(iso.slice(0, 4)) <= 1971;
}

function gameIsoDate(game) {
    if (game?.source === "ESPN Scoreboard API" && game?.game_time && /T\d{2}:\d{2}/.test(String(game.game_time))) {
        const localDate = new Date(String(game.game_time));
        if (!Number.isNaN(localDate.getTime())) return localDateIso(localDate);
    }
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

function gameWeekLabel(game) {
    const label = firstPresent(game?.week_label, game?.round, game?.postseason_round);
    if (label) return String(label);
    const week = gameWeek(game);
    return week === null ? "-" : `Week ${week}`;
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
    setBodyModes();
}

function loadLiveAlerts() {
    try {
        const saved = JSON.parse(localStorage.getItem(LIVE_ALERTS_KEY) || "[]");
        state.liveRefresh.notifications = Array.isArray(saved) ? saved.slice(0, 12) : [];
    } catch (_error) {
        state.liveRefresh.notifications = [];
    }
}

function saveLiveAlerts() {
    localStorage.setItem(LIVE_ALERTS_KEY, JSON.stringify(state.liveRefresh.notifications.slice(0, 12)));
}

function setBodyModes() {
    document.body.classList.toggle("presentation-mode", Boolean(state.selected.presentationMode));
    document.body.classList.toggle("density-compact", state.selected.tableDensity === "compact");
    const toggle = $("#presentation-toggle");
    if (toggle) {
        toggle.classList.toggle("is-active", Boolean(state.selected.presentationMode));
        toggle.textContent = state.selected.presentationMode ? "Clean UI On" : "Clean UI";
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

function loadFavorites() {
    try {
        const saved = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "{}");
        state.favorites = {
            teams: Array.isArray(saved.teams) ? saved.teams : [],
            games: Array.isArray(saved.games) ? saved.games : [],
        };
    } catch (_error) {
        state.favorites = { teams: [], games: [] };
    }
}

function saveFavorites() {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(state.favorites));
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
        "MLB:ATH": "MLB:OAK",
        "MLB:SDP": "MLB:SD",
        "MLB:SFN": "MLB:SF",
        "MLB:CHW": "MLB:CWS",
        "NFL:WSH": "NFL:WAS",
    };
    const key = aliases[`${sport}:${normalized}`] || `${sport}:${normalized}`;
    const indexed = teamIndex.get(key);
    if (indexed) return indexed;
    const searchValues = [code, display].filter(Boolean).map(value => String(value).trim().toLowerCase());
    const named = (state.teamPayload?.teams || []).find(team => {
        if (sport && team.sport && team.sport !== sport) return false;
        return [team.abbreviation, team.full_name, team.city, team.name].filter(Boolean).some(value => searchValues.includes(String(value).trim().toLowerCase()));
    });
    return named || {
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

function teamFavoriteId(sport, code) {
    return `${sport}:${String(code || "").toUpperCase()}`;
}

function gameFavoriteId(game) {
    const sport = game?.sport || "MLB";
    return `${sport}:${gameKey(game)}`;
}

function isFavoriteTeam(sport, code) {
    return state.favorites.teams.includes(teamFavoriteId(sport, code));
}

function isWatchedGame(game) {
    return state.favorites.games.includes(gameFavoriteId(game));
}

function renderFavoriteButton(sport, code, label = "Favorite team") {
    const active = isFavoriteTeam(sport, code);
    return `<button class="favorite-btn ${active ? "is-active" : ""}" type="button" data-favorite-team="${escapeHtml(teamFavoriteId(sport, code))}" aria-label="${escapeHtml(label)}">${active ? "★" : "☆"}</button>`;
}

function renderWatchButton(game, label = "Watch game") {
    const active = isWatchedGame(game);
    return `<button class="favorite-btn favorite-btn--game ${active ? "is-active" : ""}" type="button" data-watch-game="${escapeHtml(gameFavoriteId(game))}" aria-label="${escapeHtml(label)}">${active ? "★" : "☆"}</button>`;
}

function toggleFavoriteTeam(id) {
    const exists = state.favorites.teams.includes(id);
    state.favorites.teams = exists ? state.favorites.teams.filter(item => item !== id) : [id, ...state.favorites.teams];
    saveFavorites();
    renderAll();
    showToast(exists ? "Team removed from favorites" : "Team added to favorites");
}

function toggleWatchedGame(id) {
    const exists = state.favorites.games.includes(id);
    state.favorites.games = exists ? state.favorites.games.filter(item => item !== id) : [id, ...state.favorites.games];
    saveFavorites();
    renderAll();
    showToast(exists ? "Game removed from watchlist" : "Game added to watchlist");
}

function getGameProbability(game, sport) {
    if (sport === "NFL") {
        return safeNumber(game.home_cover_probability ?? game.cover_probability ?? game.model_home_cover ?? game.model?.home_cover_probability ?? game.model?.cover_probability);
    }
    return safeNumber(game.home_win_probability ?? game.model_home_win ?? game.model?.home_win_probability ?? game.model?.model_home_win);
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
    if (game.model_pick || game.model?.pick) return game.model_pick || game.model.pick;
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
    const explicit = safeNumber(game.edge ?? game.model?.edge);
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
    if (meta.prediction_mode === "schedule_only") return "schedule";
    return games.length ? "available" : "missing";
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

function liveGames() {
    return state.live.games.map(game => ({ ...game, sport: game.sport || "MLB" }));
}

function gameStatusText(game) {
    return [game?.status, game?.status_detail]
        .filter(Boolean)
        .map(value => String(value).trim().toLowerCase())
        .join(" ");
}

function isLiveSportGame(game) {
    const status = gameStatusText(game);
    // ESPN soccer rows can retain a Scheduled status while shortDetail carries
    // the live match minute (for example, "52'"). Treat that as live without
    // inferring live state from a score, since scheduled games are often 0-0.
    return status.includes("progress")
        || status.includes("live")
        || status.includes("warmup")
        || status.includes("halftime")
        || /\b\d{1,3}(?:\+\d{1,2})?\s*[\u0027\u2032]/.test(status);
}

function isFinalSportGame(game) {
    const status = gameStatusText(game);
    return status.includes("final") || status.includes("completed") || status === "ft" || status.startsWith("ft-");
}

function soccerGames() {
    return scoreboardGames("SOCCER");
}

const SCOREBOARD_SPORTS = {
    SOCCER: { view: "soccer", navLabel: "Soccer", title: "World Cup scoreboard", eyebrow: "Soccer / World Cup", description: "Live international fixtures and final scores from the bundled real-data feed. Soccer has no LineLens prediction model.", accent: "#70e7c0", emptyTitle: "No World Cup games are available", emptyCopy: "The current bundled live export has no World Cup rows. Run npm run refresh:live yourself when the ESPN scoreboard is available; LineLens will show only real returned rows." },
    NBA: { view: "nba", navLabel: "NBA", title: "NBA scoreboard", eyebrow: "Basketball / NBA", description: "A clean courtside view of real live, upcoming, and final NBA games. No LineLens prediction model is applied.", accent: "#ff9a56", emptyTitle: "No NBA games are available", emptyCopy: "The current bundled live export has no NBA rows. Run npm run refresh:live yourself to load real ESPN scoreboard results." },
    NHL: { view: "nhl", navLabel: "NHL", title: "NHL scoreboard", eyebrow: "Hockey / NHL", description: "Real NHL game status and scores, designed as a compact ice-level scoreboard. No LineLens prediction model is applied.", accent: "#72d8ff", emptyTitle: "No NHL games are available", emptyCopy: "The current bundled live export has no NHL rows. Run npm run refresh:live yourself to load real ESPN scoreboard results." },
    WNBA: { view: "wnba", navLabel: "WNBA", title: "WNBA scoreboard", eyebrow: "Basketball / WNBA", description: "Real WNBA fixtures, live state, and final scores without fabricated predictions or market calls.", accent: "#ef8dff", emptyTitle: "No WNBA games are available", emptyCopy: "The current bundled live export has no WNBA rows. Run npm run refresh:live yourself to load real ESPN scoreboard results." },
};

function normalizedSportCode(sport) {
    return String(sport || "").toUpperCase() === "SOC" ? "SOCCER" : String(sport || "").toUpperCase();
}

function isScoreboardOnlySport(sport) {
    return Boolean(SCOREBOARD_SPORTS[normalizedSportCode(sport)]);
}

function scoreboardViewForSport(sport) {
    return SCOREBOARD_SPORTS[normalizedSportCode(sport)]?.view || String(sport || "").toLowerCase();
}

function scoreboardGames(sport) {
    const normalized = normalizedSportCode(sport);
    return uniqueRowsByGame(liveGames().filter(game => normalizedSportCode(game.sport) === normalized))
        .sort((a, b) => (tickerPriority(b) - tickerPriority(a)) || ((gameTimestamp(a) ?? Number.MAX_SAFE_INTEGER) - (gameTimestamp(b) ?? Number.MAX_SAFE_INTEGER)));
}

function liveHeartbeatSeconds() {
    const raw = safeNumber(state.selected.liveHeartbeatSeconds, 30);
    if (!raw || raw <= 0) return 0;
    return Math.max(15, Math.min(300, raw));
}

function liveAlertGameId(game) {
    return `${game?.sport || "MLB"}:${gameKey(game)}`;
}

function liveAlertScore(game, side) {
    return safeNumber(game?.[`${side}_score`], null);
}

function liveAlertTeamLabel(game, side) {
    const code = game?.[side] || "";
    return String(code || game?.[`${side}_display`] || side).toUpperCase();
}

function liveAlertTeamDisplay(game, side) {
    return game?.[`${side}_display`] || game?.[side] || side;
}

function liveAlertStatus(game) {
    return String(game?.status || game?.status_detail || "").toLowerCase();
}

function isLiveAlertCandidate(game) {
    const status = liveAlertStatus(game);
    const iso = gameIsoDate(game);
    return game?.sport === "MLB"
        && (status.includes("progress") || status.includes("live") || status.includes("final") || iso === dateOffsetIso(0));
}

function liveGameSignature(game) {
    return [
        game?.status,
        game?.status_detail,
        liveAlertScore(game, "away"),
        liveAlertScore(game, "home"),
        game?.inning,
        game?.inning_state,
        game?.balls,
        game?.strikes,
        game?.outs,
        game?.latest_play,
    ].map(value => value ?? "").join("|");
}

function liveGameSignatureMap(games = liveGames()) {
    return Object.fromEntries(games.map(game => [liveAlertGameId(game), liveGameSignature(game)]));
}

function scoreStateLabel(game, scoringSide = null) {
    const awayScore = liveAlertScore(game, "away");
    const homeScore = liveAlertScore(game, "home");
    if (awayScore === null || homeScore === null) return game?.status_detail || game?.status || "Score updated";
    const score = `${awayScore}-${homeScore}`;
    if (awayScore === homeScore) return `game tied ${score}`;
    const leaderSide = awayScore > homeScore ? "away" : "home";
    const leader = liveAlertTeamLabel(game, leaderSide);
    if (scoringSide && scoringSide !== leaderSide) return `${liveAlertTeamLabel(game, scoringSide)} cuts it to ${score}`;
    return `${leader} leads ${score}`;
}

function scoringSide(prev, next) {
    const awayDiff = (liveAlertScore(next, "away") ?? 0) - (liveAlertScore(prev, "away") ?? 0);
    const homeDiff = (liveAlertScore(next, "home") ?? 0) - (liveAlertScore(prev, "home") ?? 0);
    if (awayDiff <= 0 && homeDiff <= 0) return null;
    return awayDiff >= homeDiff ? "away" : "home";
}

function scoringRuns(prev, next, side) {
    if (!side) return 0;
    return Math.max(0, (liveAlertScore(next, side) ?? 0) - (liveAlertScore(prev, side) ?? 0));
}

function livePlayLooksLikeHomer(text) {
    return /\b(home run|homers|hr)\b/i.test(String(text || ""));
}

function buildLiveAlert(prev, next) {
    if (!prev || !next || !isLiveAlertCandidate(next)) return null;
    const prevAway = liveAlertScore(prev, "away");
    const prevHome = liveAlertScore(prev, "home");
    const nextAway = liveAlertScore(next, "away");
    const nextHome = liveAlertScore(next, "home");
    let scoreChanged = prevAway !== nextAway || prevHome !== nextHome;
    const latestPlay = String(next.latest_play || "").trim();
    const playChanged = latestPlay && latestPlay !== String(prev.latest_play || "").trim();
    const becameFinal = !liveAlertStatus(prev).includes("final") && liveAlertStatus(next).includes("final");
    const side = scoreChanged ? scoringSide(prev, next) : null;
    if (scoreChanged && !side && !becameFinal) scoreChanged = false;

    if (!scoreChanged && !playChanged && !becameFinal) return null;

    const runs = scoringRuns(prev, next, side);
    const scoringTeam = side ? liveAlertTeamLabel(next, side) : "";
    const homer = scoreChanged && livePlayLooksLikeHomer(latestPlay);
    const title = becameFinal
        ? `Final: ${liveAlertTeamLabel(next, "away")} @ ${liveAlertTeamLabel(next, "home")}`
        : homer
            ? `${scoringTeam} ${runs || 1}-run HR`
            : scoreChanged
                ? `${scoringTeam || "MLB"} scores`
                : "MLB play update";
    const statusLine = scoreChanged ? scoreStateLabel(next, side) : (next.status_detail || next.status || "");
    const message = latestPlay
        ? `${latestPlay}${statusLine ? ` • ${statusLine}` : ""}`
        : statusLine || `${liveAlertTeamDisplay(next, "away")} @ ${liveAlertTeamDisplay(next, "home")} updated.`;
    return {
        id: `${liveAlertGameId(next)}:${Date.now()}`,
        sport: next.sport || "MLB",
        game_id: gameKey(next),
        title,
        message,
        matchup: `${liveAlertTeamLabel(next, "away")} @ ${liveAlertTeamLabel(next, "home")}`,
        created_at: new Date().toISOString(),
        tone: becameFinal ? "final" : scoreChanged ? "score" : "play",
    };
}

function pushLiveAlert(alert) {
    if (!alert) return;
    state.liveRefresh.notifications = [alert, ...state.liveRefresh.notifications].slice(0, 8);
    saveLiveAlerts();
    renderLiveNotifications();
}

function detectLiveAlerts(beforeGames, afterGames) {
    const beforeById = new Map(beforeGames.map(game => [liveAlertGameId(game), game]));
    afterGames.forEach(game => {
        const previous = beforeById.get(liveAlertGameId(game));
        const alert = buildLiveAlert(previous, game);
        if (alert) pushLiveAlert(alert);
    });
    state.liveRefresh.signatures = liveGameSignatureMap(afterGames);
}

function renderLiveNotifications() {
    const mount = $("#live-notification-root");
    if (!mount) return;
    const alerts = state.liveRefresh.notifications || [];
    mount.innerHTML = alerts.length ? `
        <div class="live-alert-stack">
            ${alerts.slice(0, 4).map(alert => `
                <article class="live-alert live-alert--${escapeHtml(alert.tone || "play")}" data-live-alert-id="${escapeHtml(alert.id)}">
                    <div>
                        <span><i></i>${escapeHtml(alert.sport || "MLB")} Live</span>
                        <strong>${escapeHtml(alert.title)}</strong>
                        <small>${escapeHtml(alert.message)}</small>
                    </div>
                    <button type="button" aria-label="Dismiss live alert" data-dismiss-live-alert="${escapeHtml(alert.id)}">×</button>
                </article>
            `).join("")}
            <button class="live-alert-clear" type="button" data-clear-live-alerts>Clear alerts</button>
        </div>
    ` : "";
}

async function refreshLiveHeartbeat(options = {}) {
    if (!state.selected.liveHeartbeatEnabled || state.liveRefresh.refreshing) return;
    if (state.refreshRuntime.active && !options.force) return;
    const before = liveGames();
    state.liveRefresh.refreshing = true;
    state.liveRefresh.lastStatus = "refreshing";
    state.liveRefresh.lastMessage = "Refreshing live scores...";

    try {
        if (isTauriRefreshAvailable()) {
            const result = await tauriInvoke("run_refresh_command", { commandName: "live_scores" });
            if (!result?.success) {
                throw new Error(result?.stderr || result?.stdout || "Live score refresh failed.");
            }
            state.refreshRuntime.available = true;
            state.refreshRuntime.message = "Live heartbeat refreshed scores in the background.";
            state.liveRefresh.lastStatus = "fresh";
        } else {
            state.liveRefresh.lastStatus = "cached";
        }
        await loadAllAfterRefresh();
        const after = liveGames();
        detectLiveAlerts(before, after);
        state.liveRefresh.lastMessage = isTauriRefreshAvailable()
            ? `Live heartbeat updated ${after.length} games.`
            : `Browser mode reloaded cached live export with ${after.length} games.`;
    } catch (error) {
        state.liveRefresh.lastStatus = "cached";
        state.liveRefresh.lastMessage = `Showing cached live data - ${String(error?.message || error || "refresh failed")}`;
    } finally {
        state.liveRefresh.lastRunAt = new Date().toISOString();
        state.liveRefresh.refreshing = false;
        renderAll();
    }
}

function startLiveHeartbeat() {
    if (state.liveRefresh.intervalId) {
        window.clearInterval(state.liveRefresh.intervalId);
        state.liveRefresh.intervalId = null;
    }
    state.liveRefresh.signatures = liveGameSignatureMap();
    if (!state.selected.liveHeartbeatEnabled) {
        state.liveRefresh.lastStatus = "off";
        state.liveRefresh.lastMessage = "Live heartbeat is off.";
        renderLiveNotifications();
        return;
    }
    const seconds = liveHeartbeatSeconds();
    if (!seconds) return;
    state.liveRefresh.lastStatus = isTauriRefreshAvailable() ? "waiting" : "cached";
    state.liveRefresh.lastMessage = isTauriRefreshAvailable()
        ? `Live heartbeat ready every ${seconds}s.`
        : `Browser/static mode can reload cached live data every ${seconds}s; desktop mode runs npm run refresh:live.`;
    state.liveRefresh.intervalId = window.setInterval(() => {
        refreshLiveHeartbeat({ source: "interval" });
    }, seconds * 1000);
    window.setTimeout(() => refreshLiveHeartbeat({ source: "startup" }), isTauriRefreshAvailable() ? 6000 : 15000);
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
    const selected = entries.find(model => model.sport === sport && model.selected);
    if (selected) return selected;
    const payload = sport === "MLB" ? normalizeMeta(state.mlb.payload) : normalizeMeta(state.nfl.payload);
    const payloadName = payload.model_name || payload.model_type;
    return payloadName ? entries.find(model => model.sport === sport && model.model_name === payloadName) || null : null;
}

function moltresCard() {
    return state.moltresCard?.metadata?.model_name === "Moltres" ? state.moltresCard : null;
}

function moltresStatusLabel() {
    const card = moltresCard();
    if (!card) return "not trained";
    return selectedModelEntry("MLB")?.model_name === "Moltres" ? "production" : "challenger";
}

function renderMoltresBadge(compact = false) {
    const card = moltresCard();
    const active = Boolean(card && selectedModelEntry("MLB")?.model_name === "Moltres");
    const label = active ? "Moltres active" : card ? "Moltres challenger" : "Moltres pending";
    const note = active
        ? "selected on holdout evidence"
        : card ? "holdout-tested, not selected" : "train to evaluate";
    return `<span class="moltres-badge moltres-badge--${active ? "active" : card ? "challenger" : "pending"}" title="${escapeHtml(note)}">${compact ? "Moltres" : escapeHtml(label)}</span>`;
}

function isMoltresGame(game) {
    return String(game?.model_name || "").toLowerCase() === "moltres";
}

function isNonDecisiveGameStatus(row) {
    const status = String(row?.status_at_prediction || row?.status || row?.status_detail || "").toLowerCase();
    return ["postponed", "canceled", "cancelled", "suspended", "delayed", "delay"].some(marker => status.includes(marker));
}

function isExcludedPrediction(row) {
    return isNonDecisiveGameStatus(row) || row?.prediction_mode === "postseason_result_supplement";
}

function predictionLogIdentity(row) {
    return `${row?.sport || ""}:${row?.game_date || ""}:${row?.game_id || `${row?.away || ""}@${row?.home || ""}`}`;
}

function eligibleMlbLiveRows() {
    const latest = new Map();
    getLogEntries().filter(row => row.sport === "MLB" && !isExcludedPrediction(row)).forEach(row => {
        const key = predictionLogIdentity(row);
        const current = latest.get(key);
        if (!current || String(row.generated_at || row.prediction_at || "") >= String(current.generated_at || current.prediction_at || "")) latest.set(key, row);
    });
    return [...latest.values()];
}

function summarizeEligibleRows(rows) {
    const wins = rows.filter(row => ["win", "won"].includes(String(row.model_result || row.result_status || "").toLowerCase())).length;
    const losses = rows.filter(row => ["loss", "lost"].includes(String(row.model_result || row.result_status || "").toLowerCase())).length;
    const pushes = rows.filter(row => String(row.model_result || row.result_status || "").toLowerCase() === "push").length;
    const scored = wins + losses + pushes;
    return { wins, losses, pushes, pending: Math.max(0, rows.length - scored), accuracy: wins + losses ? wins / (wins + losses) : null, sample_size: rows.length, scored };
}

function derivedMlbLiveRecord() {
    const rows = eligibleMlbLiveRows().sort((a, b) => String(b.game_date || b.generated_at || "").localeCompare(String(a.game_date || a.generated_at || "")));
    const today = localDateIso();
    const yesterday = dateOffsetIso(-1);
    const recent = days => rows.filter(row => {
        const iso = gameIsoDate(row);
        const parsed = parseDateOnly(iso);
        const anchor = parseDateOnly(today);
        if (!parsed || !anchor) return false;
        const difference = Math.round((anchor.getTime() - parsed.getTime()) / 86400000);
        return difference >= 0 && difference <= days;
    });
    const scored = rows.filter(row => ["win", "loss", "push"].includes(String(row.model_result || "").toLowerCase()));
    return {
        overall: summarizeEligibleRows(rows),
        today_record: summarizeEligibleRows(rows.filter(row => gameIsoDate(row) === today)),
        yesterday_record: summarizeEligibleRows(rows.filter(row => gameIsoDate(row) === yesterday)),
        recent_7_days: summarizeEligibleRows(recent(7)),
        recent_30_days: summarizeEligibleRows(recent(30)),
        recent_predictions: rows.slice(0, 12),
        pending_predictions: rows.filter(row => !["win", "loss", "push"].includes(String(row.model_result || "").toLowerCase())).slice(0, 20),
        last_scored_game: scored[0] || null,
    };
}

function getModelRecord(sport = "MLB") {
    const record = state.modelRecord?.sports?.[sport] || {};
    if (sport !== "MLB" || !state.predictionLog) return record;
    const live = derivedMlbLiveRecord();
    return { ...record, overall: live.overall, live_record: live.overall, ...live };
}

function recordLine(record = {}) {
    const wins = safeNumber(record.wins, 0);
    const losses = safeNumber(record.losses, 0);
    const pushes = safeNumber(record.pushes, 0);
    const pending = safeNumber(record.pending, 0);
    return `${wins}-${losses}${pushes ? `-${pushes}` : ""}${pending ? ` / ${pending} pending` : ""}`;
}

function getLogEntries() {
    return Array.isArray(state.predictionLog?.predictions) ? state.predictionLog.predictions.filter(row => !isExcludedPrediction(row)) : [];
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

function teamIdentityKey(sport, code, display) {
    const aliases = {
        "MLB:ATH": "OAK",
        "MLB:CHW": "CWS",
        "MLB:SDP": "SD",
        "MLB:SFN": "SF",
        "NFL:WSH": "WAS",
    };
    const normalizedCode = String(code || "").trim().toUpperCase();
    const rawValues = [aliases[`${sport}:${normalizedCode}`] || code, display].filter(Boolean).map(value => String(value).trim().toLowerCase());
    const teams = state.teamPayload?.teams || [];
    const found = teams.find(team => {
        if (sport && team.sport && team.sport !== sport) return false;
        const values = [team.abbreviation, team.full_name, team.city, team.name].filter(Boolean).map(value => String(value).trim().toLowerCase());
        return rawValues.some(value => values.includes(value));
    });
    return String(found?.abbreviation || aliases[`${sport}:${normalizedCode}`] || code || display || "unknown").trim().toUpperCase();
}

function gameTimeKey(game) {
    const raw = firstPresent(game?.game_time, game?.start_time, game?.commence_time, game?.kickoff, game?.first_pitch);
    if (!raw) return "";
    const value = String(raw);
    const time = value.match(/T(\d{2}:\d{2})|^(\d{1,2}:\d{2})/);
    return time ? (time[1] || time[2]) : "";
}

function canonicalGameKey(game) {
    const sport = game?.sport || "MLB";
    const slot = gameTimeKey(game);
    return `${sport}:${gameIsoDate(game)}:${teamIdentityKey(sport, game?.away, game?.away_display)}:${teamIdentityKey(sport, game?.home, game?.home_display)}${slot ? `:${slot}` : ""}`;
}

function canonicalGameBaseKey(game) {
    const sport = game?.sport || "MLB";
    return `${sport}:${gameIsoDate(game)}:${teamIdentityKey(sport, game?.away, game?.away_display)}:${teamIdentityKey(sport, game?.home, game?.home_display)}`;
}

function teamsMatch(a, b) {
    const sport = a?.sport || b?.sport || "MLB";
    return teamIdentityKey(sport, a?.home, a?.home_display) === teamIdentityKey(sport, b?.home, b?.home_display)
        && teamIdentityKey(sport, a?.away, a?.away_display) === teamIdentityKey(sport, b?.away, b?.away_display);
}

function sameGame(a, b) {
    if (!a || !b) return false;
    const aId = String(a.game_id || a.id || "");
    const bId = String(b.game_id || b.id || "");
    if (aId && bId && aId === bId) return true;
    if (!teamsMatch(a, b) || gameIsoDate(a) !== gameIsoDate(b)) return false;
    const aTime = gameTimeKey(a);
    const bTime = gameTimeKey(b);
    return !aTime || !bTime || aTime === bTime;
}

function gameSourceRank(game) {
    return { live: 0, current: 1, backtest: 2, prediction_log: 3 }[game?.source_type] ?? 9;
}

function mergeCanonicalGameRows(rows) {
    const byBase = new Map();
    rows.forEach(row => {
        const key = canonicalGameBaseKey(row);
        if (!key || !gameIsoDate(row)) return;
        if (!byBase.has(key)) byBase.set(key, []);
        byBase.get(key).push(row);
    });
    const groups = [];
    byBase.forEach(rowsForMatchup => {
        const timedBySlot = new Map();
        rowsForMatchup.filter(row => gameTimeKey(row)).forEach(row => {
            const slot = gameTimeKey(row);
            if (!timedBySlot.has(slot)) timedBySlot.set(slot, []);
            timedBySlot.get(slot).push(row);
        });
        const untimed = rowsForMatchup.filter(row => !gameTimeKey(row));
        if (timedBySlot.size <= 1) {
            groups.push(rowsForMatchup);
            return;
        }
        timedBySlot.forEach(slotRows => groups.push([...slotRows, ...untimed.splice(0, 1)]));
        untimed.forEach(row => groups.push([row]));
    });
    return groups.map(group => {
        const ordered = [...group].sort((a, b) => gameSourceRank(a) - gameSourceRank(b));
        const merged = { ...ordered[0] };
        ordered.slice(1).forEach(row => {
            Object.entries(row).forEach(([key, value]) => {
                if (value !== null && value !== undefined && value !== "" && (merged[key] === null || merged[key] === undefined || merged[key] === "")) merged[key] = value;
            });
            if (row.model && (row.model.prediction_available || !merged.model?.prediction_available)) merged.model = { ...(merged.model || {}), ...row.model };
        });
        return merged;
    });
}

function mergedGameRows() {
    return [
        ...currentGames(),
        ...liveGames(),
        ...state.mlbBacktest.games.map(game => ({ ...game, sport: "MLB", source_type: game.source_type || "backtest" })),
    ];
}

function findGameByKey(sport, key) {
    const normalizedSport = sport || "";
    const rows = mergedGameRows();
    return rows.find(game => (normalizedSport ? game.sport === normalizedSport : true) && gameKey(game) === String(key))
        || rows.find(game => (normalizedSport ? game.sport === normalizedSport : true) && String(game.game_id || game.id || "") === String(key))
        || null;
}

function liveGameFor(game) {
    return liveGames().find(row => row.sport === (game?.sport || "MLB") && sameGame(row, game)) || null;
}

function latestLogForGame(game) {
    return getLogEntries()
        .filter(row => row.sport === (game?.sport || "MLB") && sameGame(row, game))
        .sort((a, b) => String(b.generated_at || "").localeCompare(String(a.generated_at || "")))[0] || null;
}

function oddsSnapshotsForGame(game) {
    const snapshots = Array.isArray(state.odds?.snapshots) ? state.odds.snapshots : [];
    return snapshots
        .filter(row => row.sport === (game?.sport || "MLB") && sameGame(row, game))
        .sort((a, b) => String(b.snapshot_at || "").localeCompare(String(a.snapshot_at || "")));
}

function latestOddsForGame(game) {
    return oddsSnapshotsForGame(game)[0] || null;
}

function oddsContextForGame(game) {
    const snapshots = oddsSnapshotsForGame(game);
    const sorted = [...snapshots].sort((a, b) => String(a.snapshot_at || "").localeCompare(String(b.snapshot_at || "")));
    const opening = sorted.length > 1 ? sorted[0] : null;
    const current = sorted.at(-1) || null;
    const isFinal = String((liveGameFor(game) || game)?.status || (liveGameFor(game) || game)?.status_detail || "").toLowerCase().includes("final");
    const closing = isFinal ? current : null;
    return { snapshots: sorted, opening, current, closing, isFinal };
}

function marketLine(snapshot, side, sport = "MLB") {
    if (!snapshot) return null;
    if (sport === "NFL") {
        return safeNumber(
            snapshot[`spread_${side}_current`]
            ?? snapshot[`spread_${side}`]
            ?? snapshot.spread_current
            ?? snapshot[`moneyline_${side}_current`]
            ?? snapshot[`best_${side}_moneyline`]
        );
    }
    return safeNumber(snapshot[`moneyline_${side}_current`] ?? snapshot[`best_${side}_moneyline`]);
}

function marketImplied(snapshot, side) {
    return safeNumber(snapshot?.[`market_implied_${side}`]);
}

function marketSideForPick(game, sport = game?.sport || "MLB") {
    const pick = String(getGamePick(game, sport) || "").toUpperCase();
    if (pick && pick === String(game?.home || "").toUpperCase()) return "home";
    if (pick && pick === String(game?.away || "").toUpperCase()) return "away";
    return "home";
}

function modelProbabilityForSide(game, side, sport = game?.sport || "MLB") {
    const homeProb = getGameProbability(game, sport);
    if (homeProb === null) return null;
    return side === "home" ? homeProb : 1 - homeProb;
}

function marketEdgeForGame(game, snapshot = latestOddsForGame(game), sport = game?.sport || "MLB") {
    const side = marketSideForPick(game, sport);
    const modelProbability = modelProbabilityForSide(game, side, sport);
    const implied = marketImplied(snapshot, side);
    if (modelProbability === null || implied === null) return null;
    return modelProbability - implied;
}

function oddsFreshness(snapshot) {
    if (!snapshot?.snapshot_at) return "No odds";
    const ageMs = Date.now() - new Date(snapshot.snapshot_at).getTime();
    if (!Number.isFinite(ageMs)) return timestamp(snapshot.snapshot_at);
    const minutes = Math.max(0, Math.round(ageMs / 60000));
    if (minutes < 2) return "fresh";
    if (minutes < 60) return `${minutes}m old`;
    const hours = Math.round(minutes / 60);
    if (hours < 48) return `${hours}h old`;
    return `${Math.round(hours / 24)}d old`;
}

function lineMovementSummary(game, sport = game?.sport || "MLB") {
    const { opening, current, closing } = oddsContextForGame(game);
    const openHome = marketLine(opening, "home", sport);
    const currentHome = marketLine(current, "home", sport);
    const openImplied = marketImplied(opening, "home");
    const currentImplied = marketImplied(current, "home");
    const impliedMove = currentImplied !== null && openImplied !== null ? currentImplied - openImplied : null;
    let direction = current ? "Current odds" : "Movement unavailable";
    if (impliedMove !== null) {
        if (Math.abs(impliedMove) < 0.005) direction = "Little market movement";
        else direction = impliedMove > 0 ? "Market toward home" : "Market toward away";
    }
    return {
        available: Boolean(current),
        opening,
        current,
        closing,
        openHome,
        currentHome,
        closeHome: marketLine(closing, "home", sport),
        openImplied,
        currentImplied,
        closeImplied: marketImplied(closing, "home"),
        direction,
        freshness: oddsFreshness(current),
        marketEdge: marketEdgeForGame(game, current, sport),
    };
}

function clvSummaryForGame(game, sport = game?.sport || "MLB") {
    const context = oddsContextForGame(game);
    if (!context.isFinal || context.snapshots.length < 2 || !context.closing || !context.current) {
        return { label: "Unavailable", value: null, note: "Needs close" };
    }
    const side = marketSideForPick(game, sport);
    const currentImplied = marketImplied(context.current, side);
    const closeImplied = marketImplied(context.closing, side);
    if (currentImplied === null || closeImplied === null) {
        return { label: "Unavailable", value: null, note: "No implied close" };
    }
    const value = closeImplied - currentImplied;
    const label = value > 0.005 ? "Beat close" : value < -0.005 ? "Lost value" : "Matched close";
    return { label, value, note: `${formatEdge(value)} CLV` };
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

function isNflSupplement(game) {
    return String(game?.prediction_mode || "") === "postseason_result_supplement"
        || String(game?.source || "").toLowerCase().includes("postseason result supplement")
        || String(game?.model_pick || "") === "-";
}

function nflGamesForSeason(season) {
    const selectedSeason = safeNumber(season);
    return state.nfl.games.filter(game => gameSeason(game, "NFL") === selectedSeason);
}

function nflModelGamesForSeason(season) {
    return nflGamesForSeason(season).filter(game => !isNflSupplement(game));
}

function nflWeeksForSeason(season) {
    const seasonGames = nflGamesForSeason(season);
    const explicitWeeks = uniqueSortedNumbers(seasonGames.map(gameWeek), "asc");
    if (explicitWeeks.length) return explicitWeeks;
    const dates = uniqueSortedStrings(seasonGames.map(gameIsoDate), "asc");
    return dates.map((date, index) => ({ week: index + 1, date }));
}

function latestNflSeason() {
    return nflSeasons().find(season => nflModelGamesForSeason(season).length) ?? nflSeasons()[0] ?? null;
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
    if (!seasons.includes(season) || (!state.selected.nflSeasonManual && !nflModelGamesForSeason(season).length)) season = latestNflSeason();
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
    const key = [
        normalizeMeta(state.mlb.payload).generated_at,
        normalizeMeta(state.mlbBacktest.payload).generated_at,
        normalizeMeta(state.predictionLog).generated_at,
        state.mlb.games.length,
        state.mlbBacktest.games.length,
        state.live.games.map(game => `${canonicalGameKey(game)}:${game.status}:${game.status_detail}:${game.away_score}:${game.home_score}`).join(","),
        getLogEntries().length,
    ].join("|");
    if (derivedCache.mlbReviewRows && derivedCache.mlbReviewKey === key) return derivedCache.mlbReviewRows;
    const sources = [
        ...state.mlb.games.map(game => ({ ...game, sport: "MLB", source_label: "Current export", source_type: "current" })),
        ...liveGames().filter(game => game.sport === "MLB").map(game => ({ ...game, sport: "MLB", source_label: "Live export", source_type: "live" })),
        ...state.mlbBacktest.games.map(game => ({ ...game, sport: "MLB", source_label: "Backtest", source_type: "backtest" })),
        ...predictionLogRowsForMlb(),
    ];
    derivedCache.mlbReviewRows = mergeCanonicalGameRows(sources.filter(game => gameIsoDate(game)));
    derivedCache.mlbReviewKey = key;
    return derivedCache.mlbReviewRows;
}

function mlbReviewDates() {
    return uniqueSortedStrings(allMlbReviewRows().map(gameIsoDate), "asc");
}

function defaultMlbReviewDate() {
    const dates = mlbReviewDates();
    if (!dates.length) return null;
    const today = localDateIso();
    if (dates.includes(today)) return today;
    return dates.find(date => date > today) || dates[dates.length - 1];
}

function mlbBoardDateRows() {
    return [
        ...allMlbReviewRows(),
        ...liveGames().filter(game => game.sport === "MLB"),
    ];
}

function mlbBoardDates() {
    const key = [
        derivedCache.mlbReviewKey,
        normalizeMeta(state.live.payload).generated_at,
        state.live.games.length,
    ].join("|");
    if (derivedCache.mlbBoardDates && derivedCache.mlbBoardDatesKey === key) return derivedCache.mlbBoardDates;
    derivedCache.mlbBoardDates = uniqueSortedStrings(mlbBoardDateRows().map(gameIsoDate), "asc");
    derivedCache.mlbBoardDatesKey = key;
    return derivedCache.mlbBoardDates;
}

function defaultMlbBoardDate() {
    const dates = mlbBoardDates();
    if (!dates.length) return null;
    const today = localDateIso();
    if (dates.includes(today)) return today;
    return dates.find(date => date > today) || dates[dates.length - 1];
}

function ensureMlbBoardDate() {
    const dates = mlbBoardDates();
    if (!dates.length) {
        state.selected.mlbDate = null;
        return null;
    }
    if (!dates.includes(state.selected.mlbDate)) state.selected.mlbDate = defaultMlbBoardDate();
    return state.selected.mlbDate;
}

function shiftDateOnly(value, days) {
    const date = parseDateOnly(value) || parseDateOnly(localDateIso());
    if (!date) return "";
    date.setDate(date.getDate() + days);
    return localDateIso(date);
}

function setMlbBoardDate(value) {
    const normalized = toIsoDate(value);
    state.selected.mlbDate = /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : ensureMlbBoardDate();
    persistSettings();
    return state.selected.mlbDate;
}

function moveMlbBoardDate(delta) {
    return setMlbBoardDate(shiftDateOnly(ensureMlbBoardDate() || localDateIso(), delta));
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
    state.selected.homeMlbRange = "date";
    persistSettings();
    return state.selected.homeMlbDate;
}

function mlbRowsForDate(date = ensureMlbReviewDate()) {
    if (!date) return [];
    const rows = allMlbReviewRows().filter(game => gameIsoDate(game) === date);
    return sortedGamesByTime(mergeCanonicalGameRows(rows));
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
    const logged = game?.sport ? latestLogForGame(game) : null;
    const result = firstPresent(game?.model_result, game?.pick_result, game?.prediction_result, logged?.model_result, logged?.result_status);
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
    if (normalized.includes("win") || normalized.includes("won") || normalized.includes("correct")) tone = "win";
    if (normalized.includes("loss") || normalized.includes("lost") || normalized.includes("wrong")) tone = "loss";
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
    return localDateIso(date);
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
        const anchor = parseDateOnly(selected) || new Date();
        const start = new Date(anchor);
        start.setDate(anchor.getDate() - 6);
        const startIso = localDateIso(start);
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
    loadFavorites();
    loadRefreshLogs();
    loadLiveAlerts();
    const [
        app,
        teams,
        report,
        modelComparison,
        moltresCard,
        featureSummary,
        modelRegistry,
        modelRecord,
        predictionLog,
        bootstrap,
        startup,
        refresh,
        live,
        odds,
        nfl,
        mlb,
        mlbBacktest,
    ] = await Promise.all([
        loadOptional("app", ["__APP_METADATA__"]),
        loadOptional("teams", ["__TEAM_METADATA__"]),
        loadOptional("reports", ["__MODEL_REPORT__"]),
        loadOptional("modelComparison", ["__MLB_MODEL_COMPARISON__"]),
        loadOptional("moltresCard", ["__MLB_MOLTRES_MODEL_CARD__"]),
        loadOptional("featureSummary", ["__MLB_FEATURE_SUMMARY__"]),
        loadOptional("modelRegistry", ["__MODEL_REGISTRY__"]),
        loadOptional("modelRecord", ["__MODEL_RECORD__"]),
        loadOptional("predictionLog", ["__MODEL_PREDICTIONS_LOG__"]),
        loadOptional("bootstrap", ["__BOOTSTRAP_STATUS__"]),
        loadOptional("startup", ["__STARTUP_STATUS__"]),
        loadOptional("refresh", ["__REFRESH_STATUS__"]),
        loadOptional("live", ["__LIVE_SCORES__"]),
        loadOptional("odds", ["__ODDS_SNAPSHOTS__"]),
        loadOptional("nfl", ["__NFL_PREDICTIONS__", "__PREDICTIONS__"]),
        loadOptional("mlb", ["__MLB_PREDICTIONS__"]),
        loadOptional("mlbBacktest", ["__MLB_BACKTEST_PREDICTIONS__"]),
    ]);

    state.app = app || state.app;
    state.teamPayload = teams || state.teamPayload;
    state.report = report || state.report;
    state.modelComparison = modelComparison || state.modelComparison;
    state.moltresCard = moltresCard || state.moltresCard;
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
    state.odds = odds || state.odds;
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
    if ($("#app-version-chip")) $("#app-version-chip").textContent = state.app.version || APP_VERSION;
    renderAll();

    const modes = [`NFL ${dataMode(state.nfl.payload, state.nfl.games)}`, `MLB ${dataMode(state.mlb.payload, state.mlb.games)}`];
    setStatus(allGames().length ? "" : `No prediction exports loaded. ${modes.join(" / ")}.`, allGames().length ? "success" : "warning");
    if (!state.refreshRuntime.checked) {
        state.refreshRuntime.checked = true;
        state.refreshRuntime.available = isTauriRefreshAvailable();
        state.refreshRuntime.message = state.refreshRuntime.available
            ? "Desktop auto-refresh is available."
            : "Installed app/browser mode is showing bundled exports. Command refresh requires the project repo/dev environment.";
        renderAll();
        if (state.refreshRuntime.available) {
            runStartupAutomation({ background: true });
        }
    }
    startLiveHeartbeat();
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
    state.refreshRuntime.message = "Running startup automation: bootstrap Python, refresh MLB/NFL/live data, score records, and check data status.";
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
    const [bootstrap, startup, refresh, live, odds, report, modelComparison, moltresCard, featureSummary, modelRegistry, modelRecord, predictionLog, nfl, mlb, mlbBacktest] = await Promise.all([
        loadOptional("bootstrap", []),
        loadOptional("startup", []),
        loadOptional("refresh", ["__REFRESH_STATUS__"]),
        loadOptional("live", ["__LIVE_SCORES__"]),
        loadOptional("odds", ["__ODDS_SNAPSHOTS__"]),
        loadOptional("reports", []),
        loadOptional("modelComparison", []),
        loadOptional("moltresCard", []),
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
    if (odds) {
        state.odds = odds;
        window.__ODDS_SNAPSHOTS__ = odds;
    }
    if (report) {
        state.report = report;
        window.__MODEL_REPORT__ = report;
    }
    if (modelComparison) {
        state.modelComparison = modelComparison;
        window.__MLB_MODEL_COMPARISON__ = modelComparison;
    }
    if (moltresCard) {
        state.moltresCard = moltresCard;
        window.__MLB_MOLTRES_MODEL_CARD__ = moltresCard;
    } else {
        state.moltresCard = null;
        window.__MLB_MOLTRES_MODEL_CARD__ = null;
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
    const previous = state.selected.view;
    state.selected.view = view;
    persistSettings();
    $$(".view").forEach(el => {
        const active = el.id === `view-${view}`;
        el.classList.toggle("is-active", active);
        el.classList.toggle("view--entering", active && previous !== view);
        if (active && previous !== view) {
            window.setTimeout(() => el.classList.remove("view--entering"), 420);
        }
    });
    $$(".nav__item").forEach(btn => btn.classList.toggle("is-active", btn.dataset.view === view));
    const titles = {
        home: ["LineLens Sports", "sports prediction command center"],
        nfl: ["NFL Spread Predictor", "spread module"],
        mlb: ["MLB Game Board", "daily broadcast board"],
        soccer: ["Soccer / World Cup", "live international scoreboard"],
        nba: ["NBA Scoreboard", "courtside live board"],
        nhl: ["NHL Scoreboard", "ice-level live board"],
        wnba: ["WNBA Scoreboard", "live game board"],
        models: ["MLB Model Observatory", "production vs challengers"],
        reports: ["Model Reports", "calibration and comparison"],
        record: ["Model Record", "live and historical performance"],
        teams: ["Team Profiles", "team-level model context"],
        tracking: ["Tracking", "local analysis ledger"],
        settings: ["Settings / Data Status", "environment and exports"],
    };
    const [title, kicker] = titles[view] || titles.home;
    $("#view-title").textContent = title;
    $("#view-kicker").textContent = kicker;
    if (previous !== view) renderView(view);
    renderGlobalTicker();
}

function renderView(view = state.selected.view || "home") {
    const renderers = {
        home: renderHome,
        nfl: renderNFL,
        mlb: renderMLB,
        soccer: renderSoccer,
        nba: renderNBA,
        nhl: renderNHL,
        wnba: renderWNBA,
        models: renderModels,
        reports: renderReports,
        record: renderRecord,
        teams: renderTeams,
        tracking: renderTracking,
        settings: renderSettings,
    };
    renderers[view]?.();
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
        <div class="hero-holo hero-holo--image" aria-hidden="true">
            <img src="assets/sportsdesk-hero.png" alt="" loading="eager" />
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
            <div class="best-pick-v2__actions">
                <button class="btn btn--primary best-pick-v2__cta" data-open-gamecast="${game.sport}" data-game-id="${escapeHtml(gameKey(game))}">Open GameCast</button>
                <button class="btn best-pick-v2__cta" data-view-link="${game.sport === "NFL" ? "nfl" : "mlb"}">Full board</button>
                ${renderWatchButton(game, "Watch this best pick")}
            </div>
        </article>
    `;
}

function renderMlbDateControls(context = "home") {
    const date = context === "home" ? ensureMlbReviewDate() : ensureMlbBoardDate();
    const dayAttr = context === "home" ? "data-home-mlb-day" : "data-mlb-day";
    if (context === "home") {
        return `<div class="home-board-controls"><button class="icon-btn" type="button" ${dayAttr}="-1" aria-label="Previous MLB day">‹</button><input id="${context}-mlb-date" type="date" value="${escapeHtml(date || "")}" /><button class="icon-btn" type="button" ${dayAttr}="1" aria-label="Next MLB day">›</button></div>`;
    }
    return `
        <div class="mlb-date-controls">
            <div class="mlb-date-quick-nav" role="group" aria-label="MLB date navigation">
                <button class="btn btn--small" type="button" data-mlb-date-jump="-1">Yesterday</button>
                <button class="btn btn--small" type="button" data-mlb-date-jump="0">Today</button>
                <button class="btn btn--small" type="button" data-mlb-date-jump="1">Tomorrow</button>
            </div>
            <div class="mlb-date-picker"><button class="icon-btn" type="button" ${dayAttr}="-1" aria-label="Previous MLB day">‹</button><input id="${context}-mlb-date" type="date" value="${escapeHtml(date || "")}" /><button class="icon-btn" type="button" ${dayAttr}="1" aria-label="Next MLB day">›</button></div>
        </div>
    `;
}

function selectedMlbDateDisplay(date) {
    const iso = toIsoDate(date);
    const parsed = parseDateOnly(iso);
    return {
        monthDay: parsed ? parsed.toLocaleDateString(undefined, { month: "long", day: "numeric" }) : "MLB board",
        season: parsed ? `${parsed.getFullYear()} Season` : "Season unavailable",
    };
}

function mlbDateJump(offset) {
    const dates = mlbBoardDates();
    if (!dates.length) return null;
    setMlbBoardDate(shiftDateOnly(localDateIso(), offset));
    return state.selected.mlbDate;
}

function renderNflWeekControls(context = "home") {
    const scope = ensureNflScope();
    const seasons = nflSeasons();
    const weeks = scope.weeks.map(item => typeof item === "object" ? item.week : item);
    const weekAttr = context === "home" ? "data-home-nfl-week" : "data-nfl-week";
    const labelForWeek = week => {
        const row = scope.games.find(game => gameWeek(game) === week && game.week_label);
        return row?.week_label || `Week ${week}`;
    };
    return `
        <div class="home-board-controls">
            <select id="${context}-nfl-season" aria-label="NFL season">
                ${seasons.map(season => `<option value="${season}" ${season === scope.season ? "selected" : ""}>${season}</option>`).join("")}
            </select>
            <button class="icon-btn" type="button" ${weekAttr}="-1" aria-label="Previous NFL week">‹</button>
            <select id="${context}-nfl-week" aria-label="NFL week">
                ${weeks.map(week => `<option value="${week}" ${week === scope.week ? "selected" : ""}>${escapeHtml(labelForWeek(week))}</option>`).join("")}
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
        return `<div class="daily-record-strip"><span>Season ${escapeHtml(scope.season || "-")}</span><span>${escapeHtml(gameWeekLabel(rows[0] || { week: scope.week }))}</span><span>${rows.length} games</span></div>`;
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
                    <h2>${sport === "MLB" ? formatDate(ensureMlbReviewDate()) : `NFL ${ensureNflScope().season} ${gameWeekLabel((ensureNflScope().games || [])[0] || { week: ensureNflScope().week })}`}</h2>
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

function signalBoardRows(limit = 6) {
    return homeBoardGames()
        .filter(game => getGamePick(game, game.sport) !== "-" && getGameProbability(game, game.sport) !== null)
        .map(game => {
            const probability = getGameProbability(game, game.sport);
            const pick = getGamePick(game, game.sport);
            const pickedProbability = pick === game.home ? probability : 1 - probability;
            const movement = lineMovementSummary(game, game.sport);
            return { game, pick, pickedProbability, movement, confidence: confidenceValue(game, game.sport) };
        })
        .sort((a, b) => (b.pickedProbability - a.pickedProbability) || (b.confidence - a.confidence))
        .slice(0, limit);
}

function renderSignalBoard() {
    const rows = signalBoardRows();
    return `
        <section class="panel signal-board">
            <header class="section-header">
                <div><p class="eyebrow">Signal Board</p><h2>Highest-conviction board reads</h2><p class="muted">Ranked from loaded model probabilities. Market edge appears only when real odds snapshots join.</p></div>
                <span class="chip chip--soft">${rows.length} signals</span>
            </header>
            ${rows.length ? `<div class="signal-board__list">${rows.map(({ game, pick, pickedProbability, movement }) => {
                const quality = featureQualityForGame(game);
                const marketEdge = movement.available ? safeNumber(movement.marketEdge) : null;
                return `<article class="signal-row">
                    <div class="signal-row__game"><strong>${escapeHtml(pick)}</strong><span>${escapeHtml(game.away)} @ ${escapeHtml(game.home)}</span><small>${escapeHtml(game.sport)} · ${escapeHtml(detailResultSubtext(game))}</small></div>
                    <div><span>Pick probability</span><strong>${formatProbability(pickedProbability)}</strong></div>
                    <div><span>Market edge</span><strong>${marketEdge === null ? "Unavailable" : formatEdge(marketEdge)}</strong><small>${marketEdge === null ? "No joined odds" : escapeHtml(movement.freshness)}</small></div>
                    <div><span>Data read</span><strong>${escapeHtml(game.sport === "MLB" ? compactQualityValue(quality.pitcher) : "export")}</strong><small>${escapeHtml(game.model_name || "model")}</small></div>
                    <div class="signal-row__actions"><button class="btn btn--micro" type="button" data-open-gamecast="${escapeHtml(game.sport)}" data-game-id="${escapeHtml(gameKey(game))}">GameCast</button>${renderWatchButton(game, "Watch signal")}</div>
                </article>`;
            }).join("")}</div>` : emptyState("No model signals loaded", "Load a real MLB or NFL prediction export to populate the signal board.")}
        </section>
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
    return isLiveSportGame(game);
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
    const live = isLiveSportGame(game);
    const time = live ? `LIVE${game?.status_detail && !/^(in progress|live|warmup)$/i.test(String(game.status_detail).trim()) ? ` · ${game.status_detail}` : ""}` : getGameTimeLabel(game);
    const score = finalScoreLabel(game);
    const result = sport === "MLB" ? modelResultLabel(game) : (game?.result || game?.status_detail || game?.status || "Pending");
    const scoreboard = isScoreboardOnlySport(sport);
    const scoreboardLabel = SCOREBOARD_SPORTS[normalizedSportCode(sport)]?.title || "Live scoreboard";
    const signal = scoreboard ? scoreboardLabel : (pick === "-" ? "No model pick" : `${escapeHtml(pick)} ${formatEdge(getGameEdge(game, sport))}`);
    return `
        <button class="ticker-item-v2" type="button" data-ticker-open-game="${sport}" data-game-id="${escapeHtml(gameKey(game))}">
            <b>${escapeHtml(scoreboard ? (SCOREBOARD_SPORTS[normalizedSportCode(sport)]?.navLabel || sport) : sport)}</b>
            <span>${escapeHtml(time)}</span>
            <strong>${escapeHtml(game?.away_display || game?.away || "AWAY")} @ ${escapeHtml(game?.home_display || game?.home || "HOME")}</strong>
            <em>${signal}</em>
            ${resultChip(result)}
            ${score ? `<span>${escapeHtml(score)}</span>` : ""}
        </button>
    `;
}

function tickerPriority(game) {
    const sport = game?.sport || "MLB";
    const live = isLiveSportGame(game);
    const final = isFinalSportGame(game);
    const date = gameIsoDate(game);
    // The lifecycle bucket is intentionally dominant: LIVE always leads,
    // upcoming follows, and finals remain available after current action.
    let score = live ? 3000000 : final ? 1000000 : 2000000;
    if (isWatchedGame(game)) score += 10000;
    if (isFavoriteTeam(sport, game.home) || isFavoriteTeam(sport, game.away)) score += 5000;
    if (date === dateOffsetIso(0)) score += 1000;
    score += Math.round(safeNumber(getGameEdge(game, sport), 0) * 1000);
    const time = gameTimestamp(game);
    if (time !== null) score -= Math.max(0, Math.abs(Date.now() - time) / 100000000);
    return score;
}

function tickerGames() {
    const rows = uniqueRowsByGame([
        ...liveGames(),
        ...currentGames(),
        ...homeBoardGames(),
    ]).sort((a, b) => tickerPriority(b) - tickerPriority(a));
    return rows.slice(0, 18);
}

function renderSportsTickerV2(rows = []) {
    const fallbackGames = rows.map(row => row.game).filter(Boolean);
    const games = tickerGames().length ? tickerGames() : uniqueRowsByGame(fallbackGames);
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

function renderGlobalTicker() {
    const mount = $("#global-ticker");
    if (!mount) return;
    mount.innerHTML = renderSportsTickerV2(topEdges(8));
}

function rowsForDateFromLogs(date, sport = "MLB") {
    return getLogEntries().filter(row => row.sport === sport && String(row.game_date || row.generated_at || "").slice(0, 10) === date);
}

function latestScoredLog(result) {
    return getLogEntries()
        .filter(row => String(row.model_result || "").toLowerCase() === result)
        .sort((a, b) => String(b.generated_at || "").localeCompare(String(a.generated_at || "")))[0] || null;
}

function dailyBriefData() {
    const top = topEdges(1)[0] || homeTopEdges(1)[0] || null;
    const today = dateOffsetIso(0);
    const yesterday = dateOffsetIso(-1);
    const todayRecord = summarizeRecordRows(rowsForDateFromLogs(today));
    const yesterdayRecord = summarizeRecordRows(rowsForDateFromLogs(yesterday));
    const pending = getLogEntries().filter(row => String(row.model_result || row.result_status || "").toLowerCase() === "pending").length;
    const bestRecent = latestScoredLog("win");
    const worstRecent = latestScoredLog("loss");
    const liveMeta = normalizeMeta(state.live.payload);
    const oddsMeta = normalizeMeta(state.odds);
    return {
        top,
        today,
        yesterday,
        todayRecord,
        yesterdayRecord,
        pending,
        bestRecent,
        worstRecent,
        liveStatus: liveMeta.source_status || (state.live.games.length ? "loaded" : "missing"),
        oddsStatus: oddsMeta.source_status || oddsMeta.status || oddsStatusLabel(),
    };
}

function recordSummaryCopy(record) {
    return `${record.wins}-${record.losses}${record.pushes ? `-${record.pushes}` : ""}${record.pending ? ` / ${record.pending} pending` : ""}`;
}

function dailyBriefText() {
    const data = dailyBriefData();
    const top = data.top?.game;
    const sport = top?.sport || "MLB";
    const topLine = top
        ? `${getGamePick(top, sport)} in ${top.away} @ ${top.home} (${formatProbability(getConfidenceScore(top, sport))}, ${formatEdge(getGameEdge(top, sport))})`
        : "No current model pick loaded";
    const best = data.bestRecent ? `${data.bestRecent.model_pick} won ${data.bestRecent.away} @ ${data.bestRecent.home}` : "No scored win loaded";
    const miss = data.worstRecent ? `${data.worstRecent.model_pick} missed ${data.worstRecent.away} @ ${data.worstRecent.home}` : "No scored miss loaded";
    return [
        "LineLens Daily Brief",
        `Generated: ${timestamp(new Date().toISOString())}`,
        `Top model lean: ${topLine}`,
        `Today record: ${recordSummaryCopy(data.todayRecord)}`,
        `Yesterday record: ${recordSummaryCopy(data.yesterdayRecord)}`,
        `Pending picks: ${data.pending}`,
        `Recent win: ${best}`,
        `Recent miss: ${miss}`,
        `Live data: ${data.liveStatus}`,
        `Odds: ${data.oddsStatus}`,
    ].join("\n");
}

function copyDailyBrief() {
    navigator.clipboard?.writeText(dailyBriefText());
    showToast("Daily Brief copied");
}

function renderDailyBrief() {
    const data = dailyBriefData();
    const top = data.top?.game;
    const sport = top?.sport || "MLB";
    const topCopy = top ? `${top.away} @ ${top.home}` : "No current pick";
    const recap = top
        ? `LineLens is watching ${getGamePick(top, sport)} as the top lean, with ${formatEdge(getGameEdge(top, sport))} of model separation and ${data.pending} picks still waiting on finals.`
        : "Load current predictions to populate today’s model brief.";
    return `
        <section class="panel daily-brief-card">
            <header class="section-header">
                <div>
                    <p class="eyebrow">LineLens Daily Brief</p>
                    <h2>SportsDesk rundown</h2>
                </div>
                <button class="btn btn--small" type="button" data-copy-daily-brief>Copy brief</button>
            </header>
            <div class="brief-grid">
                <article><span>Top lean</span><strong>${escapeHtml(top ? getGamePick(top, sport) : "-")}</strong><small>${escapeHtml(topCopy)}</small></article>
                <article><span>Today</span><strong>${escapeHtml(recordSummaryCopy(data.todayRecord))}</strong><small>${escapeHtml(data.today)}</small></article>
                <article><span>Yesterday</span><strong>${escapeHtml(recordSummaryCopy(data.yesterdayRecord))}</strong><small>${escapeHtml(data.yesterday)}</small></article>
                <article><span>Odds</span><strong>${escapeHtml(data.oddsStatus)}</strong><small>${escapeHtml(oddsStatusLabel())}</small></article>
            </div>
            <p class="brief-recap">${escapeHtml(recap)}</p>
        </section>
    `;
}

function renderModelTrustCenterCompact() {
    const model = selectedModelEntry("MLB");
    const record = getModelRecord("MLB");
    const live = record.live_record || record.overall || {};
    const backtest = record.backtest_record || {};
    const registry = (state.modelRegistry?.models || []).filter(row => row.sport === "MLB");
    const previous = registry.filter(row => !row.selected).sort((a, b) => String(b.trained_at || "").localeCompare(String(a.trained_at || "")))[0];
    const selectedLogLoss = safeNumber(model?.metrics?.log_loss);
    const previousLogLoss = safeNumber(previous?.metrics?.log_loss);
    const improved = selectedLogLoss !== null && previousLogLoss !== null && selectedLogLoss < previousLogLoss;
    return `
        <section class="panel trust-compact-card">
            <header class="section-header">
                <div><p class="eyebrow">Model Trust</p><h2>${escapeHtml(model?.model_name || "MLB model")}</h2></div>
                <span class="chip ${improved ? "chip--success" : "chip--soft"}">${previous ? (improved ? "improved" : "watch") : "baseline"}</span>
            </header>
            <div class="brief-grid brief-grid--trust">
                <article><span>Features</span><strong>${escapeHtml(model?.feature_count || state.featureSummary?.feature_count || "-")}</strong><small>active model</small></article>
                <article><span>Live</span><strong>${escapeHtml(recordLine(live))}</strong><small>${formatProbability(live.accuracy)}</small></article>
                <article><span>Backtest</span><strong>${escapeHtml(recordLine(backtest))}</strong><small>${formatProbability(backtest.accuracy)}</small></article>
                <article><span>Trained</span><strong>${escapeHtml(timestamp(model?.trained_at))}</strong><small>${escapeHtml(model?.version || state.app.version || APP_VERSION)}</small></article>
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
    const nflLatest = latestNflSeason();
    const nflAvailableLatest = nflSeasons()[0];
    $("#view-home").innerHTML = `
        <section class="home-v2-shell">
            <section class="panel home-v2-hero">
                <div class="home-v2-hero__copy">
                    <p class="eyebrow">LineLens Sports ${escapeHtml(state.app.version || APP_VERSION)}</p>
                    <h2>Live Edge.<br><span>Model Clarity.</span></h2>
                    <p class="muted">Real MLB/NFL model signals, daily results, and prediction record tracking in one command center. Today’s most important game state stays one click away.</p>
                    ${renderQuickActionsV2()}
                    <div class="home-identity-pulse"><span class="lifecycle-status lifecycle-status--live">${lifecycleBoardGames().filter(game => lifecycleStage(game) === "live").length} live</span><span>${lifecycleBoardGames().length} MLB lifecycle rows</span><span>${escapeHtml(selectedModelEntry("MLB")?.model_name || "No production model")}</span></div>
                </div>
                ${renderHeroHologram()}
                ${renderBestPickMini(best)}
            </section>
            <section class="metric-strip-v2">
                ${homeMetricCard("NFL", "NFL Games", String(state.nfl.games.length), "loaded rows", "blue")}
                ${homeMetricCard("MLB", "MLB Games", String(state.mlb.games.length), "loaded rows", "purple")}
                ${homeMetricCard("EDGE", "Strong Edges", String(strongEdges), "current board", "green")}
                ${homeMetricCard("REC", "Model Record", formatBoardRecord(mlbRecord), formatProbability(mlbRecord.accuracy), "orange")}
                ${homeMetricCard("TIME", "Latest Export", latest ? formatDate(latest) : "-", latest ? timestamp(latest) : "no timestamp", "blue")}
            </section>
            ${nflAvailableLatest && nflLatest && nflAvailableLatest !== nflLatest ? `<div class="home-source-strip" data-variant="warning"><strong>NFL source note</strong><span>${nflAvailableLatest} currently has only a verified postseason supplement; Home defaults to the latest complete model season, ${nflLatest}.</span><button class="btn btn--micro" data-view-link="nfl">Inspect NFL</button></div>` : ""}
            ${renderDailyBrief()}
            <section class="home-v2-grid">
                ${renderBestPickFeatureV2(best)}
                ${renderHomeDailyBoard(scopedRows)}
                ${renderHomeReadoutV2(top)}
            </section>
            ${renderModelTrustCenterCompact()}
            ${renderLiveWidgetPreview()}
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
                    <h2>${running ? "Preparing environment and data..." : "Python, models, and refresh"}</h2>
                    <p class="muted">${escapeHtml(startup.error || bootstrap.error || "Desktop startup loads cached JSON first, then refreshes the data pipeline.")}</p>
                </div>
                <div class="report-actions">
                    <button class="btn btn--primary" data-refresh-command="startup_auto">Run Startup Automation Again</button>
                    <button class="btn" data-refresh-command="bootstrap_env">Bootstrap Python Environment</button>
                </div>
            </header>
            <div class="automation-steps">
                ${renderAutomationStep("Checking Python environment", bootstrap.status || "pending", bootstrapCopy)}
                ${renderAutomationStep("Creating virtual environment", bootstrap.venv_created ? "done" : bootstrap.venv_detected ? "cached" : "pending", bootstrap.venv_detected ? ".venv detected" : ".venv will be created when automation runs")}
                ${renderAutomationStep("Installing requirements", bootstrap.requirements_installed ? "done" : bootstrap.requirements_skipped ? "cached" : bootstrap.status === "install_failed" ? "install_failed" : "pending", bootstrap.requirements_skipped ? "requirements hash current; install skipped" : "installs only when missing or outdated")}
                ${renderAutomationStep("Refreshing MLB predictions", mlbStatus, refresh.MLB?.message || "Uses trained model when available; trains if missing during startup automation.")}
                ${renderAutomationStep("Rebuilding NFL data if needed", nflStatus, refresh.NFL?.message || "Attempts local import, processed parquet, nfl-data-py, and source fallbacks.")}
                ${renderAutomationStep("Done", startup.status || "pending", startup.status ? `Last startup status: ${startup.status}` : "Run the Tauri app or npm run startup:auto.")}
            </div>
            ${startup.nfl_requires_import || nflStatus === "source_refused" || dataMode(state.nfl.payload, state.nfl.games) === "missing" ? renderNflManualRecoveryCard("inline") : ""}
        </section>
    `;
}

function oddsStatusLabel() {
    const snapshot = state.odds?.metadata;
    if (snapshot?.source_status === "success") return "linked";
    if (snapshot?.source_status === "missing_key") return "missing key";
    if (snapshot?.snapshot_count) return "cached";
    const odds = state.refreshStatus?.odds;
    if (!odds) return "missing";
    if (odds.enabled) return "enabled";
    if (!odds.key_present) return "missing key";
    return "unavailable";
}

function oddsStatusMessage() {
    const snapshot = state.odds?.metadata;
    if (snapshot?.source_status === "success") return `${snapshot.new_snapshot_count || 0} new / ${snapshot.snapshot_count || 0} saved`;
    if (snapshot?.snapshot_count) return `${snapshot.snapshot_count} cached snapshots`;
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

function healthTone(status) {
    const normalized = String(status || "").toLowerCase();
    if (["linked", "real odds", "real_fresh", "model_generated", "success", "available", "ready", "real"].includes(normalized)) return "success";
    if (["cached", "real_cached", "schedule_only", "missing key", "pending", "manual"].some(token => normalized.includes(token))) return "warning";
    if (["failed", "missing", "unavailable", "error"].some(token => normalized.includes(token))) return "error";
    return "info";
}

function healthChip(label, status, note = "") {
    return `<article class="health-chip" data-variant="${healthTone(status)}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(status || "-")}</strong>${note ? `<small>${escapeHtml(note)}</small>` : ""}</article>`;
}

function renderRefreshHealthBanner() {
    const mlb = refreshSportStatus("MLB");
    const nfl = refreshSportStatus("NFL");
    const liveMeta = normalizeMeta(state.live.payload);
    const liveStatus = state.live.games.length ? (liveMeta.refresh_mode || liveMeta.source_status || "cached") : "missing";
    const recordStatus = state.modelRecord ? "ready" : "missing";
    return `
        <section class="refresh-health-strip" aria-label="Data freshness">
            ${healthChip("MLB", mlb.status || dataMode(state.mlb.payload, state.mlb.games), state.mlb.games.length ? `${state.mlb.games.length} games` : "no rows")}
            ${healthChip("NFL", nfl.status || dataMode(state.nfl.payload, state.nfl.games), state.nfl.games.length ? `${state.nfl.games.length} rows` : "no rows")}
            ${healthChip("Live", liveStatus, state.live.games.length ? `${state.live.games.length} games` : "run refresh:live")}
            ${healthChip("Odds", oddsStatusLabel(), oddsStatusMessage())}
            ${healthChip("Record", recordStatus, state.modelRecord ? timestamp(state.modelRecord.metadata?.generated_at) : "run score:models")}
        </section>
    `;
}

function renderCommandConsole(context = "compact") {
    const latest = state.refreshLogs[0];
    const logs = context === "settings" ? state.refreshLogs.slice(0, 6) : state.refreshLogs.slice(0, 2);
    if (!logs.length) {
        return `
            <section class="panel command-console ${context === "settings" ? "settings-keep-visible" : ""}">
                <header class="section-header"><div><p class="eyebrow">Command console</p><h2>Terminal output</h2></div><span class="chip">empty</span></header>
                ${emptyState("No refresh commands logged", "Run a Tauri desktop refresh command to capture stdout and stderr here.")}
            </section>
        `;
    }
    return `
        <section class="panel command-console ${context === "settings" ? "settings-keep-visible" : ""}">
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
            ["odds_snapshots", "Refresh Odds", ""],
            ["score_models", "Score Model Record", ""],
            ["check_data", "Check Data Status", ""],
        ]
        : [
            ["startup_auto", "Run Startup Automation Again", "btn--primary"],
            ["bootstrap_env", "Bootstrap Python Environment", ""],
            ["mlb_current", "Refresh MLB Current", ""],
            ["mlb_all", "Run MLB Full Train", ""],
            ["odds_snapshots", "Refresh Odds", ""],
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
            ${card("Games loaded", games.length, "current view")}
            ${card("High confidence", top.filter(row => row.confidence === "High").length, "current export")}
            ${card("Best edge", top[0] ? formatEdge(top[0].edge) : "-", top[0] ? `${top[0].game.away} @ ${top[0].game.home}` : "none")}
            ${card("Latest export", timestamp(normalizeMeta(payload).generated_at), normalizeMeta(payload).model_type || "not available")}
        </section>
    `;
}

function mlbFilterLabel() {
    const value = state.selected.mlbFilter || "all";
    const labels = {
        all: "All",
        model: "Model picks",
        high55: "55%+",
        high60: "60%+",
        pitcher: "Pitcher data",
        travel: "Travel edge",
        fatigue: "Fatigue edge",
        schedule: "Schedule-only",
    };
    return labels[value] || value;
}

function nflFilterLabel() {
    const value = state.selected.nflFilter || "all";
    const labels = {
        all: "All",
        high: "High confidence",
        home: "Home covers",
        away: "Away covers",
        scored: "Scored",
    };
    return labels[value] || value;
}

function filterNflGames(games) {
    const filter = state.selected.nflFilter || "all";
    return games.filter(game => {
        const pick = getGamePick(game, "NFL");
        const result = modelResultLabel({ ...game, sport: "NFL" });
        if (filter === "high") return getGameConfidence(game, "NFL") === "High";
        if (filter === "home") return pick === game.home;
        if (filter === "away") return pick === game.away;
        if (filter === "scored") return ["Won", "Lost", "Push"].includes(result);
        return true;
    });
}

function renderNFL() {
    const scope = ensureNflScope();
    const rawGames = scope.games;
    const games = filterNflGames(rawGames);
    const selectedStillVisible = games.some(game => gameKey(game) === gameKey(state.selected.nfl));
    const selected = selectedStillVisible ? state.selected.nfl : games[0] || defaultNflGame();
    state.selected.nfl = selected;
    const top = rankRowsByEdge(games.map(game => ({ ...game, sport: "NFL" })), 1)[0]?.game || selected;
    const supplementOnly = Boolean(scope.season && nflGamesForSeason(scope.season).length && !nflModelGamesForSeason(scope.season).length);
    const latestComplete = latestNflSeason();
    $("#view-nfl").innerHTML = `
        <section class="predictor-hero predictor-hero--nfl">
            <div>
                <div class="title-row"><h2>NFL Spread Predictor</h2><span class="sport-pill">NFL</span></div>
                <p>AI-powered spread review for every loaded NFL matchup.</p>
            </div>
            <div class="predictor-actions">
                <button class="btn btn--primary" data-refresh-command="nfl_real">Reload exports</button>
            </div>
        </section>
        ${supplementOnly ? `<p class="data-status nfl-source-notice" data-variant="warning"><strong>${scope.season} source status:</strong> this season contains only a verified postseason result supplement (${rawGames.length} row) and no model prediction slate. It is excluded from model record calculations. Latest complete model season: ${latestComplete || "unavailable"}.</p>` : ""}
        <section class="prediction-desk">
            <article class="panel prediction-board">
                ${renderNflDeskHeader(scope, rawGames)}
                ${rawGames.length && games.length !== rawGames.length ? `<p class="data-status prediction-board__notice" data-variant="info">Showing ${games.length} of ${rawGames.length}. Filter: ${escapeHtml(nflFilterLabel())}.</p>` : ""}
                ${games.length ? renderPredictionCards("NFL", games, "NFL") : `${emptyState("No NFL predictions found", "Run the NFL real refresh command. Existing NFL model files are preserved.")}${renderNflManualRecoveryCard()}`}
                ${renderAnalysisDrawer("NFL", selected)}
            </article>
            ${renderPredictionRail("NFL", games, top, state.nfl.payload)}
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

function lifecycleStage(game) {
    const live = liveGameFor(game);
    const statuses = [live?.status_detail, live?.status, game?.status_detail, game?.status].filter(Boolean).map(value => String(value).toLowerCase());
    if (statuses.some(status => status.includes("final") || status.includes("completed"))) return "final";
    if (statuses.some(status => status.includes("progress") || status.includes("live") || status.includes("in progress"))) return "live";
    const date = gameIsoDate(live || game);
    const awayScore = safeNumber((live || game)?.away_score);
    const homeScore = safeNumber((live || game)?.home_score);
    if (date && date < localDateIso() && (awayScore === null || homeScore === null || (awayScore === 0 && homeScore === 0))) return "stale";
    return "pregame";
}

function lifecycleStageLabel(stage) {
    return { pregame: "Pregame", live: "Live", final: "Final", stale: "Past / verify" }[stage] || "Pregame";
}

function lifecycleBoardGames() {
    const selectedDate = ensureMlbBoardDate();
    const key = `${selectedDate || ""}|${derivedCache.mlbReviewKey}|${normalizeMeta(state.live.payload).generated_at || ""}|${state.live.games.length}`;
    if (derivedCache.mlbBoardGames && derivedCache.mlbBoardKey === key) return derivedCache.mlbBoardGames;
    const boardRows = mlbRowsForDate(selectedDate).map(game => ({ ...game, sport: "MLB" }));
    const liveRows = liveGames().filter(game => game.sport === "MLB" && gameIsoDate(game) === selectedDate);
    liveRows.forEach(live => {
        const existingIndex = boardRows.findIndex(game => sameGame(game, live));
        if (existingIndex === -1) {
            boardRows.push({ ...live, sport: "MLB" });
            return;
        }
        // Live status/score fields win, while the prediction export keeps the model fields.
        boardRows[existingIndex] = { ...boardRows[existingIndex], ...live, ...Object.fromEntries(Object.entries(boardRows[existingIndex]).filter(([key]) => live[key] === null || live[key] === undefined || live[key] === "")) };
    });
    derivedCache.mlbBoardGames = mergeCanonicalGameRows(boardRows);
    derivedCache.mlbBoardKey = key;
    return derivedCache.mlbBoardGames;
}

function lifecyclePriority(game) {
    const stage = lifecycleStage(game);
    const watched = isWatchedGame(game);
    const loggedResult = ["Won", "Lost", "Push"].includes(modelResultLabel(game));
    if (stage === "live") return watched ? 0 : 1;
    if (stage === "pregame") return watched ? 2 : getGameEdge(game, "MLB") !== null ? 3 : 4;
    if (stage === "stale") return 7;
    return loggedResult ? 5 : 6;
}

function sortMlbLifecycleGames(games) {
    return games.map(game => ({
        game,
        stage: lifecycleStage(game),
        priority: lifecyclePriority(game),
        edge: safeNumber(getGameEdge(game, "MLB"), 0),
        timestamp: gameTimestamp(game) ?? Number.MAX_SAFE_INTEGER,
    })).sort((a, b) => {
        const priority = a.priority - b.priority;
        if (priority !== 0) return priority;
        if (a.stage === "pregame") {
            const edge = b.edge - a.edge;
            if (edge !== 0) return edge;
        }
        return a.timestamp - b.timestamp;
    }).map(entry => entry.game);
}

function teamGradientColor(meta) {
    const key = `${meta?.sport || "MLB"}:${meta?.abbreviation || ""}:${meta?.primary || ""}:${meta?.secondary || ""}`;
    if (derivedCache.teamGradientColors.has(key)) return derivedCache.teamGradientColors.get(key);
    const colors = [meta?.primary, meta?.secondary].filter(color => /^#[0-9a-f]{6}$/i.test(String(color || "")));
    if (!colors.length) {
        derivedCache.teamGradientColors.set(key, "#2e86ab");
        return "#2e86ab";
    }
    const score = color => {
        const values = color.slice(1).match(/.{2}/g).map(value => parseInt(value, 16));
        return Math.max(...values) - Math.min(...values) + Math.max(...values) * 0.2;
    };
    const color = colors.sort((a, b) => score(b) - score(a))[0];
    derivedCache.teamGradientColors.set(key, color);
    return color;
}

function lifecycleMarketRead(game) {
    const movement = lineMovementSummary(game, "MLB");
    const pick = getGamePick(game, "MLB");
    const side = pick === game.home ? "home" : "away";
    const pickProbability = modelProbabilityForSide(game, side, "MLB");
    const marketProbability = movement.available ? marketImplied(movement.current, side) : null;
    return {
        movement,
        pickProbability,
        marketProbability,
        edge: movement.available ? safeNumber(movement.marketEdge) : null,
        lineShift: movement.available && movement.openHome !== null && movement.currentHome !== null ? movement.currentHome - movement.openHome : null,
    };
}

function lifecycleTimeline(game) {
    const log = latestLogForGame(game);
    const odds = latestOddsForGame(game);
    const stage = lifecycleStage(game);
    return [
        { label: "Prediction", value: log?.generated_at ? timestamp(log.generated_at) : "Not logged", done: Boolean(log) },
        { label: "First odds", value: odds?.snapshot_at ? timestamp(odds.snapshot_at) : "No snapshot", done: Boolean(odds) },
        { label: stage === "pregame" ? "First pitch" : "Live state", value: stage === "pregame" ? getGameTimeLabel(game) : gameStatusLine(game, liveGameFor(game)), done: stage !== "pregame" },
        { label: "Final", value: finalScoreLabel(liveGameFor(game) || game) || "Awaiting result", done: stage === "final" },
        { label: "Accountability", value: modelResultLabel(game), done: ["Won", "Lost", "Push"].includes(modelResultLabel(game)) },
    ];
}

function renderLifecycleGame(game) {
    const stage = lifecycleStage(game);
    const market = lifecycleMarketRead(game);
    const pick = getGamePick(game, "MLB");
    const selected = gameKey(game) === gameKey(state.selected.mlb);
    const watched = isWatchedGame(game);
    const live = liveGameFor(game);
    const score = live ? finalScoreLabel(live) : finalScoreLabel(game);
    return `
        <article class="lifecycle-game ${selected ? "is-selected" : ""} ${watched ? "is-watched" : ""}" data-lifecycle-game="MLB" data-game-id="${escapeHtml(gameKey(game))}">
            <div class="lifecycle-game__top"><span class="lifecycle-status lifecycle-status--${stage}">${lifecycleStageLabel(stage)}</span><span>${escapeHtml(watched ? "Watchlist" : getGameTimeLabel(game))}</span>${renderWatchButton(game, "Watch this game")}</div>
            <div class="lifecycle-game__teams"><div>${renderTeamLogo("MLB", game.away, "sm", game.away_display)}<strong>${escapeHtml(game.away)}</strong><small>${live && safeNumber(live.away_score) !== null ? live.away_score : "-"}</small></div><span>@</span><div>${renderTeamLogo("MLB", game.home, "sm", game.home_display)}<strong>${escapeHtml(game.home)}</strong><small>${live && safeNumber(live.home_score) !== null ? live.home_score : "-"}</small></div></div>
            <div class="lifecycle-game__pick"><span>${isMoltresGame(game) ? "Moltres" : game.model_name || "Production model"}</span><strong>${escapeHtml(pick)}</strong><b>${formatProbability(market.pickProbability)}</b></div>
            <div class="lifecycle-game__market"><div><span>Market</span><strong>${market.marketProbability === null ? "Unavailable" : formatProbability(market.marketProbability)}</strong></div><div><span>Model edge</span><strong>${market.edge === null ? "—" : formatEdge(market.edge)}</strong></div><small>${market.lineShift === null ? "No odds movement loaded" : `Open → current ${market.lineShift > 0 ? "+" : ""}${formatNumber(market.lineShift, 0)}`}</small></div>
            <div class="lifecycle-game__bottom"><span>${escapeHtml(score || gameStatusLine(game, live))}</span><button class="btn btn--micro" type="button" data-open-gamecast="MLB" data-game-id="${escapeHtml(gameKey(game))}">Open matchup</button></div>
        </article>
    `;
}

function renderLifecycleLane(stage, games) {
    return `<section class="lifecycle-lane lifecycle-lane--${stage}"><header><div><span class="lifecycle-lane__dot"></span><h3>${lifecycleStageLabel(stage)}</h3></div><strong>${games.length}</strong></header>${games.length ? games.map(renderLifecycleGame).join("") : `<div class="lifecycle-empty"><strong>No ${lifecycleStageLabel(stage).toLowerCase()} games</strong><span>Real schedule/live/final data will appear here when available.</span></div>`}</section>`;
}

function renderPredictionLifecycle(games = lifecycleBoardGames()) {
    const sorted = [...games].sort((a, b) => lifecyclePriority(b) - lifecyclePriority(a));
    return `<div class="lifecycle-board">${["pregame", "live", "final"].map(stage => renderLifecycleLane(stage, sorted.filter(game => lifecycleStage(game) === stage))).join("")}</div>`;
}

function renderMlbStageFilters(games) {
    const options = [["all", "All"], ["pregame", "Upcoming"], ["live", "Live"], ["final", "Final"]];
    return `<div class="mlb-stage-filters" role="tablist" aria-label="MLB lifecycle stage">${options.map(([value, label]) => `<button type="button" data-mlb-stage-filter="${value}" class="${(state.selected.mlbLifecycleFilter || "all") === value ? "is-active" : ""}">${label}<span>${value === "all" ? games.length : games.filter(game => lifecycleStage(game) === value).length}</span></button>`).join("")}</div>`;
}

function renderMlbLifecycleCard(game) {
    const stage = lifecycleStage(game);
    const market = lifecycleMarketRead(game);
    const live = liveGameFor(game);
    const selected = gameKey(game) === gameKey(state.selected.mlb);
    const source = live || game;
    const awayScore = safeNumber(source?.away_score);
    const homeScore = safeNumber(source?.home_score);
    const score = (stage === "live" || stage === "final") && awayScore !== null && homeScore !== null ? `${awayScore} – ${homeScore}` : "";
    const result = modelResultLabel(game);
    const cardResult = result === "Won" ? "MODEL WON" : result === "Lost" ? "MODEL LOST" : result.toUpperCase();
    const homeMeta = getTeamMeta("MLB", game.home, game.home_display);
    const awayMeta = getTeamMeta("MLB", game.away, game.away_display);
    const statusLabel = stage === "pregame" ? "UPCOMING" : lifecycleStageLabel(stage).toUpperCase();
    const dateLabel = stage === "pregame" ? `${gameIsoDate(game) === localDateIso() ? "TODAY" : formatDateOnly(gameIsoDate(game), { month: "short", day: "numeric" }).toUpperCase()} · ${getGameTimeLabel(game)}` : stage === "stale" ? "PAST · VERIFY SOURCE" : gameStatusLine(game, live);
    const marketRead = !market.movement.available ? "" : `<div class="mlb-game-card__market"><span>Market ${market.marketProbability === null ? "Linked" : formatProbability(market.marketProbability)}</span>${market.edge === null ? "" : `<strong>Edge ${formatEdge(market.edge)}</strong>`}</div>`;
    const latestPlay = stage === "live" && live?.latest_play ? `<small class="mlb-game-card__play">${escapeHtml(live.latest_play)}</small>` : "";
    return `<article class="mlb-game-card mlb-game-card--${stage} ${selected ? "is-selected" : ""} ${isWatchedGame(game) ? "is-watched" : ""}" style="--away-color:${escapeHtml(teamGradientColor(awayMeta))};--home-color:${escapeHtml(teamGradientColor(homeMeta))}" data-lifecycle-game="MLB" data-game-id="${escapeHtml(gameKey(game))}">
        <header class="mlb-game-card__header"><span class="mlb-game-card__status">${statusLabel}</span><span class="mlb-game-card__time">${escapeHtml(dateLabel)}</span>${renderWatchButton(game, "Watch matchup")}</header>
        <div class="mlb-game-card__matchup">
            <div class="mlb-game-card__team">${renderTeamLogo("MLB", awayMeta.abbreviation, "lg", awayMeta.full_name)}<strong>${escapeHtml(awayMeta.abbreviation)}</strong></div>
            <div class="mlb-game-card__at">${score ? `<b>${escapeHtml(score)}</b>` : "VS"}<small>${stage === "live" ? "LIVE SCORE" : stage === "final" ? "FINAL" : "FIRST PITCH"}</small></div>
            <div class="mlb-game-card__team mlb-game-card__team--home">${renderTeamLogo("MLB", homeMeta.abbreviation, "lg", homeMeta.full_name)}<strong>${escapeHtml(homeMeta.abbreviation)}</strong></div>
        </div>
        <div class="mlb-game-card__signal"><span>Pick</span><strong>${escapeHtml(getGamePick(game, "MLB"))}</strong><b>${formatProbability(market.pickProbability)}</b></div>
        ${marketRead}${latestPlay}
        <footer class="mlb-game-card__footer"><span>${resultChip(cardResult)}</span><button class="btn btn--micro" type="button" data-open-gamecast="MLB" data-game-id="${escapeHtml(gameKey(game))}">${stage === "live" ? "Open GameCast" : "View Matchup"}</button></footer>
    </article>`;
}

function renderLifecycleMatchup(game) {
    if (!game) return `<section class="panel lifecycle-matchup lifecycle-matchup--empty">${emptyState("Select a game to inspect the lifecycle", "Open a matchup from the board to see model, market, live, and final accountability in one place.")}</section>`;
    const market = lifecycleMarketRead(game);
    const timeline = lifecycleTimeline(game);
    return `<section class="panel lifecycle-matchup"><header class="section-header"><div><p class="eyebrow">Matchup workspace</p><h2>${escapeHtml(game.away)} @ ${escapeHtml(game.home)}</h2><p class="muted">${escapeHtml(lifecycleStageLabel(lifecycleStage(game)))} · ${escapeHtml(game.model_name || "Production model")}</p></div>${renderWatchButton(game, "Watch matchup")}</header><div class="lifecycle-matchup__readout"><div><span>Model pick</span><strong>${escapeHtml(getGamePick(game, "MLB"))}</strong><small>${formatProbability(market.pickProbability)} picked probability</small></div><div><span>Market</span><strong>${market.marketProbability === null ? "Unavailable" : formatProbability(market.marketProbability)}</strong><small>${market.edge === null ? "No joined odds" : `${formatEdge(market.edge)} model edge`}</small></div><div><span>Result</span><strong>${escapeHtml(modelResultLabel(game))}</strong><small>${escapeHtml(finalScoreLabel(liveGameFor(game) || game) || "Pending final")}</small></div></div><ol class="lifecycle-timeline">${timeline.map(item => `<li class="${item.done ? "is-done" : ""}"><i></i><div><strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(item.value)}</span></div></li>`).join("")}</ol>${renderMatchupDetail("MLB", game)}</section>`;
}

function renderMlbLifecyclePage() {
    const games = lifecycleBoardGames();
    const selectedDate = ensureMlbBoardDate();
    const filter = state.selected.mlbLifecycleFilter || "all";
    const ordered = sortMlbLifecycleGames(games);
    const filtered = filter === "all" ? ordered : ordered.filter(game => lifecycleStage(game) === filter);
    const selected = games.find(game => gameKey(game) === gameKey(state.selected.mlb)) || games[0] || null;
    state.selected.mlb = selected;
    const liveCount = games.filter(game => lifecycleStage(game) === "live").length;
    const finalCount = games.filter(game => lifecycleStage(game) === "final").length;
    const pregameCount = games.filter(game => lifecycleStage(game) === "pregame").length;
    const dateDisplay = selectedMlbDateDisplay(selectedDate);
    const production = selectedModelEntry("MLB");
    const productionIdentity = production ? modelIdentity(production.model_name) : { legend: "Not declared" };
    const freshness = refreshSportStatus("MLB");
    const modelPicks = games.filter(game => getGamePick(game, "MLB") !== "-" && getGameProbability(game, "MLB") !== null).length;
    const oddsLinked = games.filter(game => lifecycleMarketRead(game).movement.available).length;
    const record = dailyRecord(games);
    const recordText = `${record.wins}-${record.losses}${record.pushes ? `-${record.pushes}` : ""}`;
    return `<section class="lifecycle-shell mlb-lifecycle-shell">
        <section class="panel mlb-page-header">
            <div class="mlb-page-header__top"><div><p class="eyebrow">MLB / Daily board</p><h2>MLB Game Board</h2><div class="mlb-selected-date"><strong>${escapeHtml(dateDisplay.monthDay)}</strong><span>${escapeHtml(dateDisplay.season)}</span></div></div><div class="mlb-page-header__actions"><span class="mlb-freshness">Data ${escapeHtml(freshness.status || "pending")} · ${escapeHtml(freshness.last_success_at ? timestamp(freshness.last_success_at) : "freshness unavailable")}</span></div></div>
            <div class="mlb-page-header__controls"><div>${renderMlbDateControls("mlb")}</div><div class="mlb-production" title="Technical model: ${escapeHtml(production?.model_name || "not declared")}"><span>Production model:</span><strong>${escapeHtml(productionIdentity.legend || "Not declared")}</strong></div><div class="mlb-filter-wrap">${renderMlbStageFilters(games)}</div></div>
        </section>
        <section class="mlb-intelligence-strip" aria-label="MLB board summary"><span><strong>${games.length}</strong> games</span><span><strong>${modelPicks}</strong> model picks</span><span><strong>${liveCount}</strong> live</span><span><strong>${finalCount}</strong> final</span><span><strong>${oddsLinked}</strong> odds linked</span><span><strong>${recordText}</strong> record</span></section>
        <section class="panel mlb-board-panel"><header class="section-header"><div><p class="eyebrow">Daily game board</p><p class="muted">${escapeHtml(dateDisplay.monthDay)} · live and watchlisted games lead; final accountability stays in the same full list.</p></div></header><div class="mlb-game-grid">${filtered.length ? filtered.map(renderMlbLifecycleCard).join("") : emptyState("No games in this lifecycle state", "This filter only shows real rows loaded for the selected date.")}</div></section>
        ${renderLifecycleMatchup(selected)}
    </section>`;
}

function renderMLB() {
    $("#view-mlb").innerHTML = renderMlbLifecyclePage();
}

function scoreboardStatus(game) {
    if (isFinalSportGame(game)) return "final";
    if (isLiveSportGame(game)) return "live";
    return "upcoming";
}

function scoreboardTeamColor(value) {
    const text = String(value || "team");
    const hash = [...text].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) % 360, 0);
    return `hsl(${hash} 72% 58%)`;
}

function renderScoreboardTeam(game, side) {
    const code = game?.[side] || "---";
    const display = game?.[`${side}_display`] || code;
    const logo = game?.[`${side}_logo`] || "";
    return `<div class="scoreboard-game__team"><span class="scoreboard-team-mark" style="--scoreboard-color:${scoreboardTeamColor(code)}">${logo ? `<img src="${escapeHtml(logo)}" alt="" loading="lazy" onerror="this.hidden=true; this.nextElementSibling.hidden=false;" /><i hidden>${escapeHtml(String(code).slice(0, 3).toUpperCase())}</i>` : `<i>${escapeHtml(String(code).slice(0, 3).toUpperCase())}</i>`}</span><strong>${escapeHtml(display)}</strong></div>`;
}

function renderScoreboardCard(game, config) {
    const stage = scoreboardStatus(game);
    const awayScore = safeNumber(game?.away_score);
    const homeScore = safeNumber(game?.home_score);
    const hasScore = awayScore !== null && homeScore !== null;
    const statusLabel = stage === "live" ? "LIVE" : stage === "final" ? "FINAL" : "UPCOMING";
    const detail = stage === "live" && game?.latest_play ? game.latest_play : stage === "upcoming" ? getGameTimeLabel(game) : (hasScore ? `${awayScore} – ${homeScore}` : "Score unavailable");
    return `<article class="scoreboard-game scoreboard-game--${stage}" style="--scoreboard-accent:${escapeHtml(config.accent)}">
        <header><span class="scoreboard-game__status">${statusLabel}</span><span>${escapeHtml(game?.status_detail || config.navLabel)}</span></header>
        <div class="scoreboard-game__matchup">${renderScoreboardTeam(game, "away")}<div class="scoreboard-game__score"><strong>${hasScore ? `${awayScore} – ${homeScore}` : "VS"}</strong><small>${escapeHtml(detail)}</small></div>${renderScoreboardTeam(game, "home")}</div>
        ${game?.latest_play && stage !== "live" ? `<p class="scoreboard-game__note">${escapeHtml(game.latest_play)}</p>` : ""}
        <footer><span>Real ESPN scoreboard data</span><span>${escapeHtml(gameIsoDate(game) || "Date unavailable")}</span></footer>
    </article>`;
}

function renderScoreboardDesk(sport) {
    const normalized = normalizedSportCode(sport);
    const config = SCOREBOARD_SPORTS[normalized];
    const games = scoreboardGames(normalized);
    const metadata = normalizeMeta(state.live.payload);
    const sourceDate = metadata.generated_at ? timestamp(metadata.generated_at) : "bundled export status unavailable";
    const mount = $(`#view-${config.view}`);
    if (!mount) return;
    mount.innerHTML = `<section class="scoreboard-shell" style="--scoreboard-accent:${escapeHtml(config.accent)}">
        <section class="panel scoreboard-header"><div><p class="eyebrow">${escapeHtml(config.eyebrow)}</p><h2>${escapeHtml(config.title)}</h2><p class="muted">${escapeHtml(config.description)}</p></div><div class="scoreboard-header__meta"><strong>${games.length} loaded</strong><span>Feed: ${escapeHtml(sourceDate)}</span></div></section>
        <section class="panel scoreboard-board"><header class="section-header"><div><p class="eyebrow">${escapeHtml(config.navLabel)}</p><h3>Fixtures, live action, and results</h3></div><span class="scoreboard-source-pill">${games.length ? "Real live export" : "No rows bundled"}</span></header>${games.length ? `<div class="scoreboard-grid">${games.map(game => renderScoreboardCard(game, config)).join("")}</div>` : emptyState(config.emptyTitle, config.emptyCopy)}</section>
    </section>`;
}

function renderSoccer() { renderScoreboardDesk("SOCCER"); }
function renderNBA() { renderScoreboardDesk("NBA"); }
function renderNHL() { renderScoreboardDesk("NHL"); }
function renderWNBA() { renderScoreboardDesk("WNBA"); }

function recordSummaryText(summary) {
    const record = `${summary.wins}-${summary.losses}${summary.pushes ? `-${summary.pushes}` : ""}`;
    const decided = summary.wins + summary.losses + summary.pushes;
    return `${record} · ${decided} decided`;
}

function renderMlbFilterPills() {
    const options = [
        ["all", "All"],
        ["high55", "Strong"],
        ["model", "Model picks"],
        ["schedule", "Schedule-only"],
    ];
    return `
        <div class="desk-filter-pills" role="tablist" aria-label="MLB board filters">
            ${options.map(([value, label]) => `<button type="button" data-mlb-filter="${value}" class="${state.selected.mlbFilter === value ? "is-active" : ""}">${escapeHtml(label)} <span>${escapeHtml(value === "all" ? String(mlbRowsForDate().length) : "")}</span></button>`).join("")}
        </div>
    `;
}

function renderMlbDeskHeader(rawGames, selectedDate, usingBacktest) {
    const modelRows = rawGames.filter(row => !isScheduleOnly(row, state.mlb.payload) && (row.model_pick || getGameProbability(row, "MLB") !== null));
    const summary = summarizeRecordRows(modelRows);
    const decided = summary.wins + summary.losses + summary.pushes;
    return `
        <header class="desk-header desk-header--mlb">
            <div class="desk-date-block">
                <div class="desk-date-controls">${renderMlbDateControls("mlb")}</div>
                <div>
                    <p class="eyebrow">${usingBacktest ? "Historical backtest day" : "Selected MLB day"}</p>
                    <h2>${escapeHtml(formatDate(selectedDate) || selectedDate || "MLB board")}</h2>
                    <div class="desk-record-line">
                        <strong>${escapeHtml(`${summary.wins}-${summary.losses}${summary.pushes ? `-${summary.pushes}` : ""}`)}</strong>
                        <span>${decided ? `${decided} decided picks` : "0 decided picks"}</span>
                        <span>${summary.pending} pending</span>
                    </div>
                </div>
            </div>
            <div class="desk-toolbar">
                ${renderMlbFilterPills()}
                ${renderMlbFilter()}
            </div>
        </header>
    `;
}

function renderNflDeskHeader(scope, games) {
    const record = summarizeRecordRows(games);
    const label = gameWeekLabel(games[0] || { week: scope.week });
    return `
        <header class="desk-header desk-header--nfl">
            <div class="desk-date-block">
                <div class="desk-date-controls">${renderNflWeekControls("nfl")}</div>
                <div>
                    <p class="eyebrow">NFL board</p>
                    <h2>${escapeHtml(label)}</h2>
                    <div class="desk-record-line">
                        <strong>${escapeHtml(`Season ${scope.season || "-"}`)}</strong>
                        <span>${games.length} games loaded</span>
                        <span>${record.wins + record.losses} scored</span>
                    </div>
                </div>
            </div>
            <div class="desk-toolbar">
                ${renderNflFilterPills(games)}
            </div>
        </header>
    `;
}

function renderNflFilterPills(games) {
    const options = [
        ["all", "All"],
        ["high", "High"],
        ["home", "Home"],
        ["away", "Away"],
        ["scored", "Scored"],
    ];
    const counts = {
        all: games.length,
        high: games.filter(game => getGameConfidence(game, "NFL") === "High").length,
        home: games.filter(game => getGamePick(game, "NFL") === game.home).length,
        away: games.filter(game => getGamePick(game, "NFL") === game.away).length,
        scored: games.filter(game => ["Won", "Lost", "Push"].includes(modelResultLabel({ ...game, sport: "NFL" }))).length,
    };
    return `
        <div class="desk-filter-pills" role="tablist" aria-label="NFL board filters">
            ${options.map(([value, label]) => `<button type="button" data-nfl-filter="${value}" class="${state.selected.nflFilter === value ? "is-active" : ""}">${escapeHtml(label)} <span>${counts[value] || 0}</span></button>`).join("")}
        </div>
    `;
}

function projectionLine(game, sport) {
    if (sport === "NFL") return `Spread ${formatLine(game.spread_line, sport)}`;
    const homeLine = firstPresent(game.moneyline_home_current, game.moneyline_home);
    return `Proj: ${formatLine(homeLine, sport)}`;
}

function teamBoardBlock(sport, game, side) {
    const code = game?.[side] || "---";
    const meta = getTeamMeta(sport, code, game?.[`${side}_display`]);
    const pitcher = sport === "MLB" ? game?.[`${side}_probable_pitcher`] : null;
    return `
        <div class="desk-team">
            ${renderFavoriteButton(sport, meta.abbreviation, `Favorite ${meta.full_name}`)}
            ${renderTeamLogo(sport, meta.abbreviation, "md", meta.full_name)}
            <div>
                <strong>${escapeHtml(meta.full_name)}</strong>
                <small>${sport === "MLB" ? escapeHtml(pitcher || "Pitcher TBD") : escapeHtml(code)}</small>
            </div>
        </div>
    `;
}

function renderPredictionCards(sport, games, source) {
    return `<div class="prediction-card-list">${games.map((game, index) => renderPredictionCard(sport, game, source, index)).join("")}</div>`;
}

function renderPredictionCard(sport, game, source, index) {
    const probability = getGameProbability(game, sport);
    const pick = getGamePick(game, sport);
    const confidence = getGameConfidence(game, sport);
    const result = modelResultLabel({ ...game, sport });
    const selected = gameKey(game) === gameKey(state.selected[sport.toLowerCase()]);
    return `
        <article class="prediction-row-card ${selected ? "is-selected" : ""}" data-select-game="${source}" data-game-index="${index}" data-game-id="${escapeHtml(gameKey({ ...game, sport }))}">
            <div class="desk-time">
                <span>${escapeHtml(getGameTimeLabel(game))}</span>
                <small>${escapeHtml(game.status_detail || game.status || gameWeekLabel(game))}</small>
            </div>
            ${teamBoardBlock(sport, game, "away")}
            <span class="desk-at">@</span>
            ${teamBoardBlock(sport, game, "home")}
            <div class="desk-pick">
                <strong>${escapeHtml(pick)}</strong>
                <span>${formatProbability(probability)}</span>
                <small>${escapeHtml(projectionLine(game, sport))}</small>
            </div>
            <div class="desk-edge">
                <span>Edge</span>
                <strong>${formatEdge(getGameEdge(game, sport))}</strong>
            </div>
            <div class="desk-confidence">
                <span>Confidence</span>
                ${confidenceTag(confidence)}
                <small>${escapeHtml(formatConfidencePercent(game, sport))}</small>
            </div>
            <div class="desk-result">
                ${resultChip(result)}
                <small>${escapeHtml(finalScoreLabel(game) || "")}</small>
            </div>
            <div class="desk-factor">
                <span>Top factor</span>
                <strong>${escapeHtml(sport === "MLB" ? (game.top_factor_label || game.explanation?.top_factors?.[0]?.label || "Model signal") : (game.top_factor_label || "Spread signal"))}</strong>
                <button class="btn btn--micro" type="button" data-open-gamecast="${sport}" data-game-id="${escapeHtml(gameKey({ ...game, sport }))}">GameCast</button>
            </div>
        </article>
    `;
}

function renderPredictionRail(sport, games, topGame, payload) {
    const modelRecord = getModelRecord(sport);
    const overall = sport === "MLB" ? (modelRecord.live_record || modelRecord.overall || {}) : (modelRecord.historical_record || modelRecord.overall || {});
    return `
        <aside class="prediction-rail">
            ${renderTopEdgeCard(sport, topGame)}
            <section class="rail-card">
                <header><h3>Model Performance</h3><span class="chip chip--soft">${sport === "MLB" ? "Live" : "Historical"}</span></header>
                <div class="rail-performance">
                    <div><span>${sport === "MLB" ? "Live Record" : "Backtest Record"}</span><strong>${escapeHtml(recordLine(overall))}</strong></div>
                    <div><span>Accuracy</span><strong>${formatProbability(overall.accuracy)}</strong></div>
                </div>
                <div class="rail-sparkline" aria-hidden="true"><span></span></div>
                <div class="rail-kpis">
                    <div><span>Games</span><strong>${games.length}</strong></div>
                    <div><span>High</span><strong>${games.filter(game => getGameConfidence(game, sport) === "High").length}</strong></div>
                    <div><span>View</span><strong>${games.length}</strong></div>
                </div>
            </section>
            <section class="rail-card">
                <header><h3>Board View</h3><button class="btn btn--small" ${sport === "MLB" ? "data-mlb-filter=\"all\"" : "data-nfl-filter=\"all\""}>Reset</button></header>
                <div class="rail-filter-stack">
                    <span>${sport === "MLB" ? escapeHtml(mlbFilterLabel()) : escapeHtml(nflFilterLabel())}</span>
                    <span>Market ${escapeHtml(oddsStatusLabel())}</span>
                    <span>${games.length} rows in view</span>
                </div>
            </section>
        </aside>
    `;
}

function renderTopEdgeCard(sport, game) {
    if (!game) {
        return `<section class="rail-card rail-card--top">${emptyState("No top edge loaded", "Refresh predictions to populate the edge card.")}</section>`;
    }
    const home = getTeamMeta(sport, game.home, game.home_display);
    const away = getTeamMeta(sport, game.away, game.away_display);
    const statusText = String(game.status_detail || game.status || "").toLowerCase();
    const statusLabel = statusText.includes("final") ? "Final" : statusText.includes("progress") || statusText.includes("live") ? "Live" : "Board";
    return `
        <section class="rail-card rail-card--top">
            <header><h3>Top Edge Right Now</h3><span class="rail-status-pill">${escapeHtml(statusLabel)}</span></header>
            <div class="rail-matchup">
                <div>${renderTeamLogo(sport, away.abbreviation, "md", away.full_name)}<span>${escapeHtml(away.abbreviation)}</span></div>
                <strong>@</strong>
                <div>${renderTeamLogo(sport, home.abbreviation, "md", home.full_name)}<span>${escapeHtml(home.abbreviation)}</span></div>
            </div>
            <div class="rail-pick-line">
                <strong>${escapeHtml(getGamePick(game, sport))}</strong>
                <span>${formatProbability(getConfidenceScore(game, sport))}</span>
                <b>${formatEdge(getGameEdge(game, sport))}</b>
            </div>
            <button class="btn btn--primary full-width" data-select-game="${sport === "MLB" ? "MLB_REVIEW" : "NFL"}" data-game-id="${escapeHtml(gameKey({ ...game, sport }))}">View Full Analysis</button>
        </section>
    `;
}

function renderAnalysisDrawer(sport, selected) {
    if (!selected) return "";
    return `
        <details class="analysis-drawer">
            <summary>View selected matchup analysis</summary>
            ${renderMatchupDetail(sport, selected)}
        </details>
    `;
}

function renderMlbDailyLedger(rows, selectedDate) {
    const modelRows = rows.filter(row => !isScheduleOnly(row, state.mlb.payload) && (row.model_pick || getGameProbability(row, "MLB") !== null));
    const summary = summarizeRecordRows(modelRows);
    const decided = summary.wins + summary.losses + summary.pushes;
    const latest = modelRows.slice(0, 8);
    const recordText = `${summary.wins}-${summary.losses}${summary.pushes ? `-${summary.pushes}` : ""}`;
    return `
        <section class="panel daily-ledger daily-ledger--hero">
            <header class="section-header">
                <div>
                    <p class="eyebrow">Selected MLB Day</p>
                    <h2>${escapeHtml(formatDate(selectedDate) || selectedDate)}</h2>
                    <strong class="daily-ledger__record">${escapeHtml(recordText)}</strong>
                    <span class="daily-ledger__note">${summary.pending ? `${summary.pending} pending` : decided ? `${decided} decided picks` : "No scored picks yet"}</span>
                </div>
                <div class="ledger-pills">
                    <span class="chip chip--success">Correct ${summary.wins}</span>
                    <span class="chip chip--danger">Wrong ${summary.losses}</span>
                    <span class="chip chip--warning">Pending ${summary.pending}</span>
                    ${summary.pushes ? `<span class="chip">Push ${summary.pushes}</span>` : ""}
                </div>
            </header>
            ${decided || summary.pending ? `
                <div class="ledger-strip">
                    ${latest.map(row => `<article><strong>${escapeHtml(row.away || "-")} @ ${escapeHtml(row.home || "-")}</strong><span>${escapeHtml(row.model_pick || getGamePick(row, "MLB"))}</span>${resultChip(accountabilityLabel(row))}</article>`).join("")}
                </div>
            ` : emptyState("No logged model picks for this date", "Schedule-only rows can appear here, but they do not count in model record.")}
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
                <thead><tr><th>Date</th><th>Away</th><th>Home</th><th>Pick</th><th>Prob</th><th>Edge</th><th>Confidence</th><th>Top factor</th><th>Result</th><th>CLV</th></tr></thead>
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
                            <td>${resultChip(modelResultLabel({ ...game, sport }))}</td>
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
    return `
        <div class="factor-cell">
            <strong>${escapeHtml(factor || "Model drivers pending")}</strong>
        </div>
    `;
}

function shortDisplayName(value) {
    const raw = String(value || "").trim();
    if (!raw || raw === "TBD") return "TBD";
    const parts = raw.split(/\s+/);
    return parts.length > 1 ? parts.at(-1) : raw;
}

function compactQualityValue(value) {
    const normalized = String(value || "unknown").replaceAll("_", " ").trim().toLowerCase();
    if (normalized === "partial proxy") return "partial";
    if (normalized === "proxy") return "proxy";
    if (normalized === "estimated") return "estimated";
    if (normalized === "unavailable") return "missing";
    return normalized || "unknown";
}

function renderDetailChips(items) {
    return `<div class="detail-card__chips">${items.map(item => `<span class="chip chip--soft">${escapeHtml(item)}</span>`).join("")}</div>`;
}

function detailResultSubtext(game) {
    const score = finalScoreLabel(game);
    if (score) return score;
    const status = String(game.status_detail || game.status || "").trim();
    if (!status) return "Awaiting result";
    if (status.toLowerCase() === "pending") return "Awaiting first pitch";
    return status;
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
    const probabilityRows = scheduleOnly ? `<div class="empty-state"><strong>No model pick</strong><p>Schedule row only.</p></div>` : `
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
                <div class="detail-card detail-card--compact"><span>Model result</span><strong>${escapeHtml(modelResultLabel({ ...game, sport }))}</strong><small>${escapeHtml(detailResultSubtext(game))}</small></div>
            </div>
            ${sport === "MLB" ? renderPredictionExplanation(game) : ""}
            <button class="btn btn--primary full-width" data-add-tracker="${sport}" data-game-id="${escapeHtml(game.game_id || game.id || "")}" ${canTrack ? "" : "disabled"}>${canTrack ? "Add to Tracker" : "No model prediction"}</button>
        </div>
    `;
}

function renderNFLImpact(game) {
    const homeInjuries = (game.key_home_injuries || []).join(", ");
    const awayInjuries = (game.key_away_injuries || []).join(", ");
    return `
        <div class="detail-card detail-card--compact">
            <span>Injury impact</span>
            <strong>${escapeHtml(game.injury_note || "Unavailable")}</strong>
            <small>${escapeHtml(game.home_injury_impact || "Home unknown")} / ${escapeHtml(game.away_injury_impact || "Away unknown")}</small>
        </div>
        <div class="detail-card detail-card--compact">
            <span>Key injuries</span>
            <strong>${escapeHtml(homeInjuries || "None loaded")}</strong>
            <small>${escapeHtml(awayInjuries || "Away none loaded")}</small>
        </div>
    `;
}

function renderMLBImpact(game) {
    const quality = featureQualityForGame(game);
    const pitcherNames = `${shortDisplayName(game.away_probable_pitcher)} vs ${shortDisplayName(game.home_probable_pitcher)}`;
    const pitcherNote = game.pitcher_data_status === "missing"
        ? "Team model only"
        : (game.pitcher_edge || "Pitcher context");
    const pitcherQuality = compactQualityValue(quality.pitcher);
    const travelQuality = compactQualityValue(quality.travel);
    const qualityTitle = pitcherQuality === "available"
        ? "Pitcher data"
        : pitcherQuality === "missing"
            ? "Team-only model"
            : "Partial pitcher data";
    const qualityLine = `${travelQuality === "estimated" ? "Estimated travel" : "Travel pending"}${quality.missing ? ` / ${quality.missing} gaps` : ""}`;
    return `
        <div class="detail-card detail-card--compact">
            <span>Pitchers</span>
            <strong>${escapeHtml(pitcherNames)}</strong>
            <small>${escapeHtml(pitcherNote)}</small>
        </div>
        <div class="detail-card detail-card--compact">
            <span>Data</span>
            <strong>${escapeHtml(qualityTitle)}</strong>
            <small>${escapeHtml(qualityLine)}</small>
        </div>
    `;
}

function renderMoltresComponents(game, compact = false) {
    const components = game?.model_components || game?.explanation?.component_contributions || [];
    if (!components.length) return "";
    const rows = components.slice(0, compact ? 4 : 6);
    return `
        <section class="moltres-components ${compact ? "moltres-components--compact" : ""}">
            <header><span>Moltres component read</span><small>base-model home probabilities</small></header>
            <div>
                ${rows.map(component => `<article><strong>${escapeHtml(component.model_name || "Base model")}</strong><span>${formatProbability(component.home_probability)}</span><small>${safeNumber(component.weight) === null ? "weight pending" : `${(safeNumber(component.weight) * 100).toFixed(0)}% blend weight`}</small></article>`).join("")}
            </div>
        </section>
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
                    <span class="chip">${escapeHtml(compactQualityValue(quality.pitcher) === "missing" ? "team-only" : "pitcher data")}</span>
                    <span class="chip">${escapeHtml(compactQualityValue(quality.travel) === "estimated" ? "travel estimate" : "travel pending")}</span>
                    ${quality.missing ? `<span class="chip chip--soft">${escapeHtml(quality.missing)} gaps</span>` : ""}
                </div>
            </div>
            ${factors.length ? `<div class="factor-list">${factors.slice(0, 5).map(factor => renderFactorRow(factor)).join("")}</div>` : emptyState("No factor export found", "Run npm run refresh:mlb:all to regenerate explanations.")}
            ${renderMoltresComponents(game)}
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
    const movement = lineMovementSummary(game, sport);
    if (!movement.available) {
        return `<div class="detail-card detail-card--compact"><span>Market</span><strong>Unavailable</strong><small>No odds snapshot</small></div>`;
    }
    return `
        <div class="detail-card detail-card--compact">
            <span>Line movement</span>
            <strong>${escapeHtml(movement.direction)}</strong>
            <small>Open ${formatLine(movement.openHome, sport)} / Now ${formatLine(movement.currentHome, sport)}</small>
        </div>
    `;
}

function renderCLV(game, sport) {
    const clv = clvSummaryForGame(game, sport);
    return `<div class="detail-card detail-card--compact"><span>CLV</span><strong>${escapeHtml(clv.label)}</strong><small>${escapeHtml(clv.note)}</small></div>`;
}

function openGameCast(sport, gameOrKey) {
    const game = typeof gameOrKey === "object"
        ? gameOrKey
        : sport === "MLB"
            ? lifecycleBoardGames().find(row => gameKey(row) === String(gameOrKey)) || findGameByKey(sport, gameOrKey)
            : findGameByKey(sport, gameOrKey);
    if (!game) {
        showToast("GameCast could not find that matchup in loaded exports.");
        return;
    }
    if ((sport || game.sport || "MLB") === "MLB") state.selected.mlb = game;
    state.gamecast = { open: true, sport: sport || game.sport || "MLB", gameId: gameKey(game) };
    renderGameCastRoot();
}

function closeGameCast() {
    state.gamecast.open = false;
    renderGameCastRoot();
}

function gamecastGame() {
    if (!state.gamecast.open) return null;
    if (state.gamecast.sport === "MLB" && state.selected.mlb && gameKey(state.selected.mlb) === String(state.gamecast.gameId)) return state.selected.mlb;
    return findGameByKey(state.gamecast.sport, state.gamecast.gameId);
}

function gameStatusLine(game, live) {
    const source = live || game;
    const parts = [source?.status_detail || source?.status || getGameTimeLabel(game)].filter(Boolean);
    if (source?.inning) parts.push(`${source.inning_state || ""} ${source.inning}`.trim());
    if (safeNumber(source?.outs) !== null) parts.push(`${source.outs} out${safeNumber(source.outs) === 1 ? "" : "s"}`);
    if (safeNumber(source?.balls) !== null && safeNumber(source?.strikes) !== null) parts.push(`${source.balls}-${source.strikes} count`);
    return parts.join(" · ") || "Status pending";
}

function basesLabel(bases) {
    if (!bases || typeof bases !== "object") return "Bases unavailable";
    const labels = [];
    if (bases.first) labels.push("1st");
    if (bases.second) labels.push("2nd");
    if (bases.third) labels.push("3rd");
    return labels.length ? `Runners: ${labels.join(" + ")}` : "Bases empty";
}

function renderGameCastScore(game, live) {
    const sport = game?.sport || "MLB";
    const source = live || game;
    const away = getTeamMeta(sport, game.away, game.away_display);
    const home = getTeamMeta(sport, game.home, game.home_display);
    const awayScore = safeNumber(source?.away_score);
    const homeScore = safeNumber(source?.home_score);
    return `
        <section class="gamecast-score">
            <div>${renderTeamLogo(sport, away.abbreviation, "md", away.full_name)}<span>${escapeHtml(away.abbreviation)}</span><strong>${awayScore === null ? "-" : awayScore}</strong></div>
            <span>@</span>
            <div>${renderTeamLogo(sport, home.abbreviation, "md", home.full_name)}<span>${escapeHtml(home.abbreviation)}</span><strong>${homeScore === null ? "-" : homeScore}</strong></div>
        </section>
        <p class="gamecast-status">${escapeHtml(gameStatusLine(game, live))}</p>
    `;
}

function renderModelReaction(game) {
    const log = latestLogForGame(game);
    const label = accountabilityLabel(log || game);
    if (label === "Correct") return `<span class="chip chip--success">Model Won</span>`;
    if (label === "Wrong") return `<span class="chip chip--danger">Model Lost</span>`;
    if (label === "Push") return `<span class="chip chip--warning">Push</span>`;
    const sport = game?.sport || "MLB";
    const pick = getGamePick(game, sport);
    if (pick === "-") return `<span class="chip chip--soft">No model pick</span>`;
    const live = liveGameFor(game) || game;
    const awayScore = safeNumber(live?.away_score);
    const homeScore = safeNumber(live?.home_score);
    if (awayScore !== null && homeScore !== null && String(live?.status || live?.status_detail || "").toLowerCase().includes("progress")) {
        const pickedHome = String(pick).toUpperCase() === String(game.home).toUpperCase();
        const pickedAway = String(pick).toUpperCase() === String(game.away).toUpperCase();
        const pickedScore = pickedHome ? homeScore : pickedAway ? awayScore : null;
        const opponentScore = pickedHome ? awayScore : pickedAway ? homeScore : null;
        if (pickedScore !== null && opponentScore !== null) {
            if (pickedScore > opponentScore) return `<span class="chip chip--success">Pick alive</span>`;
            if (pickedScore < opponentScore) return `<span class="chip chip--danger">Needs rally</span>`;
            return `<span class="chip chip--warning">Pick tied</span>`;
        }
    }
    return `<span class="chip chip--warning">Pending</span>`;
}

function renderKeyPlays(game) {
    const live = liveGameFor(game);
    const plays = Array.isArray(live?.plays) ? live.plays : [];
    const latestPlay = live?.latest_play || game.latest_play;
    if (!plays.length && !latestPlay) {
        return emptyState("No play feed available", game.sport === "NFL" ? "NFL live play feed is not connected yet." : "MLB live feed did not include play-by-play for this game.");
    }
    const rows = plays.length
        ? plays.slice(-12).reverse()
        : [{ description: latestPlay, event: "Latest play", inning: live?.inning, half: live?.inning_state, outs: live?.outs }];
    return `
        <div class="key-play-list">
            ${rows.map(play => `
                <article>
                    <span>${escapeHtml([play.half, play.inning ? `Inning ${play.inning}` : "", play.count, safeNumber(play.outs) !== null ? `${play.outs} out${safeNumber(play.outs) === 1 ? "" : "s"}` : ""].filter(Boolean).join(" · ") || play.event || "Play")}</span>
                    <strong>${escapeHtml(play.description || play.event || "Play detail unavailable")}</strong>
                    <small>${escapeHtml(play.timestamp ? timestamp(play.timestamp) : "Source play feed")}</small>
                </article>
            `).join("")}
        </div>
    `;
}

function timelineItem(label, value, status = "neutral") {
    return `<li data-status="${escapeHtml(status)}"><span></span><div><strong>${escapeHtml(label)}</strong><small>${escapeHtml(value)}</small></div></li>`;
}

function renderPredictionTimeline(game) {
    const log = latestLogForGame(game);
    const odds = latestOddsForGame(game);
    const live = liveGameFor(game);
    const final = finalScoreLabel(live || game);
    const items = [
        timelineItem("Prediction exported", log?.generated_at ? timestamp(log.generated_at) : "No logged prediction", log ? "done" : "missing"),
        timelineItem("Odds snapshot", odds?.snapshot_at ? `${timestamp(odds.snapshot_at)} · ${safeNumber(odds.bookmakers_count, 0)} books` : "No odds snapshot", odds ? "done" : "missing"),
        timelineItem("Game status", gameStatusLine(game, live), "done"),
        timelineItem("Final score", final || "Result pending", final ? "done" : "pending"),
        timelineItem("Model scored", log?.model_result ? accountabilityLabel(log) : "Pending or no logged pick", log?.model_result ? "done" : "pending"),
    ];
    return `<ol class="prediction-timeline">${items.join("")}</ol>`;
}

function renderGameCastMarket(game) {
    const sport = game?.sport || "MLB";
    const movement = lineMovementSummary(game, sport);
    const odds = movement.current;
    if (!odds) return emptyState("No market snapshot", "Run npm run refresh:odds when an ODDS_API_KEY is configured.");
    const side = marketSideForPick(game, sport);
    const modelProbability = modelProbabilityForSide(game, side, sport);
    const implied = marketImplied(odds, side);
    return `
        <div class="gamecast-market">
            ${card("Books", safeNumber(odds.bookmakers_count, 0), "snapshot consensus")}
            ${card("Opening", formatLine(movement.openHome, sport), odds.home_display || game.home)}
            ${card("Current", formatLine(movement.currentHome, sport), movement.direction)}
            ${card("Market implied", formatProbability(implied), `${side} side`)}
            ${card("Model probability", formatProbability(modelProbability), getGamePick(game, sport))}
            ${card("Model edge", formatEdge(movement.marketEdge), movement.freshness)}
        </div>
    `;
}

function renderGameCastWhy(game) {
    const sport = game?.sport || "MLB";
    if (sport !== "MLB") {
        return `<p class="muted">NFL explanations depend on exported spread feature fields. Historical rows show the scored pick and spread context when available.</p>`;
    }
    const explanation = game.explanation || {};
    const factors = explanation.top_factors || [];
    return `
        <div class="gamecast-model-identity"><span>${escapeHtml(game.model_name || "MLB model")}</span>${isMoltresGame(game) ? renderMoltresBadge(true) : ""}</div>
        <p class="muted">${escapeHtml(explanation.summary || "No exported explanation for this row.")}</p>
        ${factors.length ? `<div class="factor-list factor-list--compact">${factors.slice(0, 3).map(renderFactorRow).join("")}</div>` : ""}
        ${renderMoltresComponents(game, true)}
    `;
}

function renderGameCastProvenance(game, sport) {
    const live = liveGameFor(game);
    const odds = latestOddsForGame(game);
    const payload = sport === "MLB" ? state.mlb.payload : state.nfl.payload;
    const model = selectedModelEntry(sport);
    return `<div class="gamecast-provenance" aria-label="GameCast data provenance"><span><strong>Prediction</strong>${escapeHtml(timestamp(game.generated_at || normalizeMeta(payload).generated_at))}</span><span><strong>Model</strong>${escapeHtml(model?.model_name || game.model_name || "not declared")}</span><span><strong>Live feed</strong>${escapeHtml(live ? "joined" : "not joined")}</span><span><strong>Odds</strong>${escapeHtml(odds ? oddsFreshness(odds) : "not linked")}</span></div>`;
}

function renderGameCast(game, sport) {
    const live = liveGameFor(game);
    const quality = featureQualityForGame(game);
    const prediction = getGamePick(game, sport);
    return `
        <div class="gamecast-backdrop" data-close-gamecast></div>
        <aside class="gamecast-drawer" role="dialog" aria-modal="true" aria-label="LineLens GameCast">
            <header class="gamecast-header">
                <div>
                    <p class="eyebrow">LineLens GameCast</p>
                    <h2>${escapeHtml(game.away || "Away")} @ ${escapeHtml(game.home || "Home")}</h2>
                </div>
                <div class="gamecast-actions">
                    ${renderWatchButton({ ...game, sport }, "Watch this matchup")}
                    <button class="icon-btn" type="button" data-close-gamecast aria-label="Close GameCast">×</button>
                </div>
            </header>
            ${renderGameCastScore(game, live)}
            ${renderGameCastProvenance(game, sport)}
            <section class="gamecast-grid">
                <article class="gamecast-panel gamecast-panel--pick">
                    <span>${isMoltresGame(game) ? "Moltres pick" : "Model pick"}</span>
                    <strong>${escapeHtml(prediction)}</strong>
                    <small>${formatProbability(getConfidenceScore(game, sport))} · ${formatEdge(getGameEdge(game, sport))}</small>
                    ${renderModelReaction(game)}
                </article>
                <article class="gamecast-panel">
                    <span>Live context</span>
                    <strong>${escapeHtml(live?.latest_play || game.latest_play || live?.down_distance || live?.status_detail || "No latest play loaded")}</strong>
                    <small>${sport === "MLB" ? escapeHtml(basesLabel(live?.bases)) : escapeHtml(live?.down_distance || live?.clock || "Scoreboard context only")}</small>
                </article>
                <article class="gamecast-panel">
                    <span>${sport === "MLB" ? "Pitchers" : "Injuries"}</span>
                    <strong>${sport === "MLB" ? `${escapeHtml(shortDisplayName(game.away_probable_pitcher || live?.probable_pitchers?.away))} vs ${escapeHtml(shortDisplayName(game.home_probable_pitcher || live?.probable_pitchers?.home))}` : escapeHtml(game.injury_note || "Unavailable")}</strong>
                    <small>${sport === "MLB" ? `Pitcher ${compactQualityValue(quality.pitcher)} · Travel ${compactQualityValue(quality.travel)}` : "Real injury export dependent"}</small>
                </article>
            </section>
            <section class="gamecast-section">
                <header><h3>Why this pick?</h3></header>
                ${renderGameCastWhy(game)}
            </section>
            <section class="gamecast-section">
                <header><h3>Market / Odds</h3></header>
                ${renderGameCastMarket(game)}
            </section>
            <section class="gamecast-section">
                <header><h3>Prediction Timeline</h3></header>
                ${renderPredictionTimeline(game)}
            </section>
            <section class="gamecast-section">
                <header><h3>Key Plays</h3></header>
                ${renderKeyPlays(game)}
            </section>
        </aside>
    `;
}

function renderGameCastRoot() {
    const root = $("#gamecast-root");
    if (!root) return;
    const game = gamecastGame();
    root.innerHTML = state.gamecast.open && game ? renderGameCast(game, state.gamecast.sport || game.sport || "MLB") : "";
    document.body.classList.toggle("gamecast-open", Boolean(state.gamecast.open && game));
}

function renderOddsMovementBoard() {
    const snapshots = Array.isArray(state.odds?.snapshots) ? state.odds.snapshots : [];
    const gamesWithOdds = currentGames()
        .map(game => ({ game, sport: game.sport || "MLB", movement: lineMovementSummary(game, game.sport || "MLB") }))
        .filter(row => row.movement.available)
        .sort((a, b) => Math.abs(safeNumber(b.movement.marketEdge, 0)) - Math.abs(safeNumber(a.movement.marketEdge, 0)))
        .slice(0, 12);
    if (!snapshots.length) {
        return `
            <header><p class="eyebrow">Market Center</p><h2>Line movement + CLV</h2></header>
            ${emptyState("Odds disabled or missing", "Add ODDS_API_KEY locally, then run npm run refresh:odds. No lines are fabricated.")}
        `;
    }
    return `
        <header class="section-header">
            <div><p class="eyebrow">Market Center</p><h2>Line movement + CLV</h2></div>
        </header>
        <div class="market-strip">
            ${card("Snapshots", snapshots.length, `${gamesWithOdds.length} joined games`)}
            ${card("Provider", normalizeMeta(state.odds).provider || "optional", normalizeMeta(state.odds).source || "odds feed")}
            ${card("Generated", timestamp(normalizeMeta(state.odds).generated_at), "cached export")}
            ${card("Freshness", oddsFreshness(gamesWithOdds[0]?.movement.current), "latest joined line")}
        </div>
        <div class="market-board-list">
            ${gamesWithOdds.map(({ game, sport, movement }) => {
                const side = marketSideForPick(game, sport);
                const clv = clvSummaryForGame(game, sport);
                return `
                    <article>
                        <div><strong>${escapeHtml(game.away || "-")} @ ${escapeHtml(game.home || "-")}</strong><span>${escapeHtml(formatDate(gameIsoDate(game)))} · ${escapeHtml(movement.freshness)}</span></div>
                        <div><span>Open</span><strong>${formatLine(movement.openHome, sport)}</strong><small>home</small></div>
                        <div><span>Current</span><strong>${formatLine(movement.currentHome, sport)}</strong><small>${escapeHtml(movement.direction)}</small></div>
                        <div><span>Close</span><strong>${formatLine(movement.closeHome, sport)}</strong><small>${escapeHtml(clv.label)}</small></div>
                        <div><span>Market</span><strong>${formatProbability(marketImplied(movement.current, side))}</strong><small>${escapeHtml(side)} implied</small></div>
                        <div><span>Model</span><strong>${formatProbability(modelProbabilityForSide(game, side, sport))}</strong><small>${formatEdge(movement.marketEdge)}</small></div>
                    </article>
                `;
            }).join("") || emptyState("No joined odds rows", "Odds snapshots exist, but no current board games matched them.")}
        </div>
    `;
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
        <section class="panel">${renderModelTrustCenter(sport)}</section>
        ${sport === "MLB" ? renderMoltresModelCard() : ""}
        <section class="dashboard-grid">
            <article class="panel">${renderCurrentModelPanel(sport)}</article>
            <article class="panel">${renderModelRecordPanel(sport)}</article>
        </section>
        <section class="dashboard-grid">
            <article class="panel">
                <header class="section-header"><div><p class="eyebrow">Calibration</p><h2>${sport} calibration</h2></div><span class="chip">${state.report?.metadata?.real_data === false ? "missing" : "ready"}</span></header>
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
        <section class="panel">${renderOddsMovementBoard()}</section>
        <section class="dashboard-grid">
            <article class="panel">${renderModelRegistryPanel(sport)}</article>
            <article class="panel"><header><p class="eyebrow">Auto report</p><h2>Generated report text</h2></header><div class="report-actions"><button class="btn" data-generate-report="NFL">Generate NFL Weekly Report</button><button class="btn" data-generate-report="MLB">Generate MLB Daily Report</button><button class="btn btn--primary" id="copy-report-btn">Copy Report</button></div><textarea id="generated-report" readonly>${escapeHtml(generateReportText(sport))}</textarea></article>
        </section>
    `;
    renderCalibrationChart(report.calibration || []);
}

const MODEL_IDENTITIES = {
    Moltres: { legend: "Moltres", element: "ember", role: "Flagship stacked ensemble challenger", motif: "A layered ember core for component consensus.", strength: "Combines multiple probability views through a chronological meta-model.", weakness: "Needs a completed sealed evaluation before production promotion." },
    LogisticRegression: { legend: "Articuno", element: "frost", role: "Stable linear reference", motif: "A cold, clean calibration line.", strength: "Transparent coefficients and a disciplined baseline probability shape.", weakness: "Linear decision surface may miss nonlinear matchup interactions." },
    RandomForestClassifier: { legend: "Zapdos", element: "storm", role: "Fast nonlinear challenger", motif: "Electric branching signals across many trees.", strength: "Captures interactions and remains resilient to noisy feature combinations.", weakness: "Probability behavior can be less smooth and harder to explain locally." },
    GradientBoostingClassifier: { legend: "Lugia", element: "tide", role: "Current production model", motif: "A balanced current built from sequential corrections.", strength: "Strong general-purpose nonlinear fit in the existing MLB comparison.", weakness: "Can overreact to feature drift and depends on careful calibration." },
    HistGradientBoostingClassifier: { legend: "Ho-Oh", element: "phoenix", role: "Modern boosting challenger", motif: "A rebirth loop for efficient histogram splits.", strength: "Efficient nonlinear learning with regularization controls.", weakness: "Only useful when its holdout evidence is present and comparable." },
};

function modelIdentity(modelName) {
    return MODEL_IDENTITIES[modelName] || { legend: "Legendary", element: "neutral", role: "Registry model", motif: "Abstract model signal.", strength: "Real registry-backed candidate.", weakness: "Behavior details are not exported." };
}

function modelObservatoryEntries() {
    const registryEntries = (state.modelRegistry?.models || []).filter(model => model.sport === "MLB");
    const comparisonEntries = getComparisonRows("MLB").filter(row => row.status === "trained");
    const key = `${normalizeMeta(state.modelRegistry).generated_at}|${registryEntries.length}|${comparisonEntries.length}|${registryEntries.map(entry => `${entry.model_name}:${entry.trained_at}:${entry.selected}`).join(",")}`;
    if (derivedCache.modelEntries && derivedCache.modelEntriesKey === key) return derivedCache.modelEntries;
    const latestByName = new Map();
    registryEntries.forEach(entry => {
        const current = latestByName.get(entry.model_name);
        if (!current || String(entry.trained_at || "") > String(current.trained_at || "") || entry.selected) latestByName.set(entry.model_name, entry);
    });
    comparisonEntries.forEach(entry => {
        if (!latestByName.has(entry.model_name)) latestByName.set(entry.model_name, { ...entry, comparison_only: true, metrics: { ...entry } });
    });
    derivedCache.modelEntries = [...latestByName.values()].sort((a, b) => (b.selected ? 1 : 0) - (a.selected ? 1 : 0) || String(a.model_name).localeCompare(String(b.model_name)));
    derivedCache.modelEntriesKey = key;
    return derivedCache.modelEntries;
}

function modelComparisonFor(name) {
    return getComparisonRows("MLB").find(row => row.model_name === name) || {};
}

function renderModelMetric(label, value, note = "") {
    return `<div class="model-metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong>${note ? `<small>${escapeHtml(note)}</small>` : ""}</div>`;
}

function renderModelProfile(entry) {
    const name = entry.model_name || "Unknown model";
    const identity = modelIdentity(name);
    const comparison = modelComparisonFor(name);
    const metrics = { ...(entry.metrics || {}), ...comparison };
    const card = name === "Moltres" ? moltresCard() : null;
    const topFactors = name === selectedModelEntry("MLB")?.model_name ? topGlobalFeatures("MLB").slice(0, 5) : [];
    const trainSeasons = Array.isArray(entry.train_seasons) ? entry.train_seasons.join(", ") : entry.train_seasons || "Not exported";
    return `<details class="model-profile model-profile--${identity.element}" ${entry.selected ? "open" : ""}><summary><span class="model-profile__crest" aria-hidden="true"><i></i><b>${escapeHtml(identity.legend.slice(0, 2).toUpperCase())}</b></span><span class="model-profile__title"><strong>${escapeHtml(identity.legend)}</strong><small>${escapeHtml(name)}</small></span><span class="model-profile__role">${escapeHtml(identity.role)}</span><span class="model-profile__headline">${formatNumber(metrics.log_loss, 3)}<small>log loss</small></span><span class="model-profile__status ${entry.selected ? "is-selected" : ""}">${entry.selected ? "Production" : "Challenger"}</span></summary><div class="model-profile__body"><div class="model-profile__intro"><p>${escapeHtml(identity.motif)}</p><div><span class="technical-label">Technical model</span><code>${escapeHtml(name)}</code></div></div><div class="model-metric-grid">${renderModelMetric("Accuracy", formatProbability(metrics.accuracy), `N=${metrics.sample_size || entry.test_rows || "-"}`)}${renderModelMetric("Log loss", formatNumber(metrics.log_loss, 3), "lower is better")}${renderModelMetric("Brier", formatNumber(metrics.brier_score, 3), "lower is better")}${renderModelMetric("ROC AUC", formatNumber(metrics.roc_auc, 3), "discrimination")}${renderModelMetric("Calibration", formatEdge(metrics.calibration_error), "absolute error")}${renderModelMetric("Stability", formatNumber(metrics.stability?.stability_score, 3), `${metrics.stability?.blocks || 0} time slices`)}</div><div class="model-profile__facts"><div><span class="eyebrow">Lifecycle</span><p>Trained ${escapeHtml(formatDate(entry.trained_at) || "not exported")}</p><p>Train seasons: ${escapeHtml(trainSeasons)}</p><p>Test season: ${escapeHtml(entry.test_season || "not exported")} · ${escapeHtml(String(entry.feature_count || "-"))} features</p></div><div><span class="eyebrow">Strength / weakness</span><p><strong>Strength:</strong> ${escapeHtml(identity.strength)}</p><p><strong>Weakness:</strong> ${escapeHtml(identity.weakness)}</p></div><div><span class="eyebrow">Top factors</span>${topFactors.length ? `<ul>${topFactors.map(factor => `<li>${escapeHtml(factor.feature || factor.label || "feature")}</li>`).join("")}</ul>` : `<p class="muted">Per-model attribution is not exported for this row. The production feature summary is available in Reports.</p>`}</div></div>${card ? `<div class="model-profile__components"><span class="eyebrow">Moltres components</span>${(card.architecture?.base_models || []).map(component => `<span><strong>${escapeHtml(component)}</strong><em>${safeNumber(card.architecture?.weights?.[component]) === null ? "-" : `${(card.architecture.weights[component] * 100).toFixed(0)}%`}</em></span>`).join("") || `<p class="muted">Moltres has not been manually trained in this bundle.</p>`}</div>` : ""}<p class="model-profile__limitation"><strong>Honest limitation:</strong> ${escapeHtml(card?.limitations?.[0] || "Registry metrics describe this exported evaluation only; they do not guarantee future performance.")}</p></div></details>`;
}

function renderModelGalleryCard(entry) {
    const name = entry.model_name || "Unknown model";
    const identity = modelIdentity(name);
    const comparison = modelComparisonFor(name);
    const metrics = { ...(entry.metrics || {}), ...comparison };
    const selected = Boolean(entry.selected);
    const pending = !entry.metrics && !Object.keys(comparison).length;
    const statusLabel = selected ? "SELECTED" : entry.comparison_only ? "EVALUATED" : "CHALLENGER";
    return `<article class="model-gallery-card model-gallery-card--${identity.element} ${selected ? "is-production" : ""}">
        <div class="model-gallery-card__visual"><span>${escapeHtml(identity.legend)}</span><i></i><b></b><em></em></div>
        <div class="model-gallery-card__body"><div class="model-gallery-card__heading"><div><p class="eyebrow">${selected ? "Production model" : entry.comparison_only ? "Comparison export" : "Registry challenger"}</p><h3>${escapeHtml(identity.legend)}</h3><code>${escapeHtml(name)}</code></div><span class="model-gallery-card__badge">${statusLabel}</span></div>
        <p class="muted">${escapeHtml(identity.role)}</p><div class="model-gallery-card__metrics">${renderModelMetric("Accuracy", pending ? "Pending" : formatProbability(metrics.accuracy))}${renderModelMetric("Log loss", pending ? "Pending" : formatNumber(metrics.log_loss, 3))}${renderModelMetric("Brier", pending ? "Pending" : formatNumber(metrics.brier_score, 3))}${renderModelMetric("ROC AUC", pending ? "Pending" : formatNumber(metrics.roc_auc, 3))}</div>
        <button type="button" class="btn ${selected ? "btn--primary" : ""}" data-model-open="${escapeHtml(name)}">View model profile</button></div>
    </article>`;
}

function renderModelVersionHistory(name) {
    const versions = (state.modelRegistry?.models || []).filter(model => model.sport === "MLB" && model.model_name === name).sort((a, b) => String(b.trained_at || "").localeCompare(String(a.trained_at || "")));
    if (versions.length < 2) return `<p class="muted">No prior registry versions exported for this algorithm.</p>`;
    return `<div class="model-version-list">${versions.slice(0, 5).map((version, index) => `<div><strong>${index === 0 ? "Current export" : `Version ${versions.length - index}`}</strong><span>${escapeHtml(formatDate(version.trained_at) || "date unavailable")}</span><em>${version.selected ? "Production" : "Challenger"}</em></div>`).join("")}</div>`;
}

function renderModels() {
    const entries = modelObservatoryEntries();
    const selected = selectedModelEntry("MLB");
    const comparison = getComparisonRows("MLB");
    const selectedEntry = state.selected.modelName ? entries.find(entry => entry.model_name === state.selected.modelName) : null;
    const detail = selectedEntry ? `<section class="model-drawer"><header class="section-header"><div><p class="eyebrow">Model profile</p><h2>${escapeHtml(modelIdentity(selectedEntry.model_name).legend)}</h2><p class="muted">Expanded technical profile and registry history.</p></div><button class="btn btn--small" type="button" data-model-close>Close profile</button></header>${renderModelProfile(selectedEntry)}<div class="model-history"><p class="eyebrow">Registry history</p>${renderModelVersionHistory(selectedEntry.model_name)}</div></section>` : `<div class="models-gallery-hint"><strong>Select a model to inspect its profile.</strong><span>Metrics stay tied to the real registry and comparison exports; pending models remain visibly pending.</span></div>`;
    $("#view-models").innerHTML = `<section class="models-shell"><section class="models-hero"><div><p class="eyebrow">LineLens Model Observatory</p><h2>Five signals. One accountable system.</h2><p>Every MLB algorithm gets a distinct visual identity, its real technical name, measured metrics, and an honest role. Moltres is the ember-red ensemble challenger; it is not promoted until a manual chronological evaluation proves it belongs in production.</p></div><div class="models-hero__orb"><span></span><i></i><b></b></div></section><section class="models-command"><div><span class="eyebrow">Production model</span><strong>${escapeHtml(selected?.model_name || "Not declared")}</strong><small>${selected ? `selected ${formatDate(selected.trained_at)}` : "No registry selection"}</small></div><div><span class="eyebrow">Model gallery</span><strong>${entries.length}</strong><small>unique MLB algorithms</small></div><div><span class="eyebrow">Evaluation rows</span><strong>${comparison.length}</strong><small>real comparison exports</small></div><div><span class="eyebrow">Moltres</span><strong>${escapeHtml(moltresStatusLabel())}</strong><small>${moltresCard() ? "card loaded" : "manual training pending"}</small></div></section><section class="models-legend"><span>Metric guide</span><small>Accuracy ↑</small><small>Log loss ↓</small><small>Brier ↓</small><small>ROC AUC ↑</small><small>Calibration ↓</small><small>Stability ↑</small></section><section class="models-gallery">${entries.length ? entries.map(renderModelGalleryCard).join("") : emptyState("No MLB models in registry", "Train or load a real MLB registry export to populate the Model Observatory.")}</section>${detail}</section>`;
}

function renderModelTrustCenter(sport) {
    const selected = selectedModelEntry(sport);
    const record = getModelRecord(sport);
    const live = sport === "MLB" ? (record.live_record || record.overall || {}) : (record.historical_record || record.overall || {});
    const backtest = sport === "MLB" ? record.backtest_record || {} : {};
    const registry = (state.modelRegistry?.models || []).filter(row => row.sport === sport);
    const previous = registry.filter(row => !row.selected).sort((a, b) => String(b.trained_at || "").localeCompare(String(a.trained_at || "")))[0];
    const selectedLogLoss = safeNumber(selected?.metrics?.log_loss);
    const previousLogLoss = safeNumber(previous?.metrics?.log_loss);
    const improved = selectedLogLoss !== null && previousLogLoss !== null ? selectedLogLoss < previousLogLoss : null;
    return `
        <header class="section-header">
            <div><p class="eyebrow">Model Trust Center</p><h2>${escapeHtml(selected?.model_name || `${sport} model status`)}</h2></div>
            <span class="chip ${improved === true ? "chip--success" : improved === false ? "chip--warning" : ""}">${improved === null ? "registry baseline" : improved ? "improved vs previous" : "watch vs previous"}</span>
        </header>
        <div class="trust-grid">
            ${card("Last trained", timestamp(selected?.trained_at || selected?.created_at), selected?.version || state.app.version || APP_VERSION)}
            ${card("Features", selected?.feature_count || "-", sport === "MLB" ? "rich MLB feature set" : "historical export")}
            ${card(sport === "MLB" ? "Live record" : "Historical record", recordLine(live), formatProbability(live.accuracy))}
            ${card("Backtest", sport === "MLB" ? recordLine(backtest) : "NFL export", sport === "MLB" ? formatProbability(backtest.accuracy) : "scored from rows")}
        </div>
        <p class="muted">Trust comes from exported predictions, logged results, and registry metrics. Missing odds or source data stay marked as missing.</p>
    `;
}

function renderMoltresModelCard() {
    const modelCard = moltresCard();
    if (!modelCard) {
        return `
            <section class="panel moltres-card moltres-card--pending">
                <header class="section-header"><div><p class="eyebrow">MLB flagship model</p><h2>Moltres</h2></div>${renderMoltresBadge()}</header>
                <p class="muted">Moltres is integrated as a challenger path but has not been trained in this data bundle yet. No Moltres prediction or performance claim is shown.</p>
                <code>python -m src.mlb.train_model_mlb</code>
            </section>
        `;
    }
    const metrics = modelCard.metrics || {};
    const comparison = modelCard.comparison || {};
    const components = modelCard.architecture?.base_models || [];
    const weights = modelCard.architecture?.weights || {};
    const selected = selectedModelEntry("MLB")?.model_name === "Moltres";
    return `
        <section class="panel moltres-card">
            <header class="section-header">
                <div><p class="eyebrow">MLB flagship model</p><h2>Moltres</h2><p class="muted">${escapeHtml(modelCard.identity?.tagline || "Chronological MLB ensemble")}</p></div>
                ${renderMoltresBadge()}
            </header>
            <div class="moltres-card__metrics">
                ${card("Holdout accuracy", formatProbability(metrics.accuracy), `N=${metrics.sample_size || "-"}`)}
                ${card("Log loss", formatNumber(metrics.log_loss, 3), "lower is better")}
                ${card("Brier", formatNumber(metrics.brier_score, 3), "lower is better")}
                ${card("ROC AUC", formatNumber(metrics.roc_auc, 3), "holdout")}
                ${card("Calibration", formatEdge(comparison.calibration_error), "absolute bucket error")}
                ${card("Stability", formatNumber(comparison.stability?.stability_score, 3), `${comparison.stability?.blocks || 0} chronological slices`)}
            </div>
            <div class="moltres-card__body">
                <div><span class="eyebrow">Stack components</span><div class="moltres-weight-list">${components.map(name => `<span><strong>${escapeHtml(name)}</strong><em>${safeNumber(weights[name]) === null ? "-" : `${(weights[name] * 100).toFixed(0)}%`}</em></span>`).join("") || "<span>Pending manual training</span>"}</div></div>
                <div><span class="eyebrow">Leakage controls</span><ul>${(modelCard.data?.leakage_controls || []).slice(0, 3).map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>
            </div>
            <small class="moltres-card__foot">${escapeHtml(selected ? "Moltres is selected from the sealed comparison evidence." : `Moltres is not selected; ${modelCard.selection?.evidence || "the existing production model remains in place until Moltres wins the selection rule."}`)}</small>
        </section>
    `;
}

function confidenceValue(row, sport = row?.sport || "MLB") {
    const explicit = safeNumber(row?.confidence_score);
    if (explicit !== null) return explicit;
    const home = safeNumber(row?.home_win_probability ?? row?.home_cover_probability);
    const away = safeNumber(row?.away_win_probability);
    if (home !== null && away !== null) return Math.max(home, away);
    if (home !== null) return Math.max(home, 1 - home);
    return safeNumber(getConfidenceScore(row, sport), 0);
}

function recordSummaryLine(summary) {
    const decided = summary.wins + summary.losses + summary.pushes;
    const accuracy = decided ? `${((summary.wins / decided) * 100).toFixed(1)}%` : "pending";
    return `${summary.wins}-${summary.losses}${summary.pushes ? `-${summary.pushes}` : ""}${summary.pending ? ` / ${summary.pending} pending` : ""} · ${accuracy}`;
}

function rowsWithinDays(rows, days) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return rows.filter(row => {
        const raw = row.game_date || row.generated_at;
        if (!raw) return false;
        const date = new Date(raw);
        return !Number.isNaN(date.getTime()) && date >= cutoff;
    });
}

function bestPickRowsByDay(rows) {
    const grouped = new Map();
    rows.forEach(row => {
        const day = String(row.game_date || row.generated_at || "").slice(0, 10);
        if (!day || day.length < 10 || !row.model_pick) return;
        const current = grouped.get(day);
        if (!current || confidenceValue(row) > confidenceValue(current)) grouped.set(day, row);
    });
    return [...grouped.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([, row]) => row);
}

function renderModelAccountabilityCenter() {
    const mlbRows = getLogEntries().filter(row => row.sport === "MLB");
    const bestPicks = bestPickRowsByDay(mlbRows);
    const yesterdayBest = bestPicks.find(row => String(row.game_date || row.generated_at || "").slice(0, 10) === dateOffsetIso(-1));
    const last10 = summarizeRecordRows(bestPicks.slice(0, 10));
    const hotPicks = summarizeRecordRows(mlbRows.filter(row => confidenceValue(row) >= 0.6));
    const leans = summarizeRecordRows(mlbRows.filter(row => confidenceValue(row) < 0.55));
    const yesterday = summarizeRecordRows(rowsForDateFromLogs(dateOffsetIso(-1)));
    const last7 = summarizeRecordRows(rowsWithinDays(mlbRows, 7));
    const last30 = summarizeRecordRows(rowsWithinDays(mlbRows, 30));
    const mlbRecord = getModelRecord("MLB");
    const nflRecord = getModelRecord("NFL");
    const marketScored = mlbRows.filter(row => ["correct", "wrong", "push"].includes(accountabilityLabel(row).toLowerCase()) && oddsSnapshotsForGame({ ...row, sport: "MLB" }).length);
    const marketSummary = summarizeRecordRows(marketScored);
    const bucketRows = [
        ["Best Pick Yesterday", yesterdayBest ? `${yesterdayBest.model_pick} · ${accountabilityLabel(yesterdayBest)}` : "No logged best pick", yesterdayBest ? `${yesterdayBest.away} @ ${yesterdayBest.home}` : "Run score:models"],
        ["Last 10 Best Picks", recordSummaryLine(last10), "daily top-confidence picks"],
        ["Hot Picks", recordSummaryLine(hotPicks), "60%+ confidence"],
        ["Leans", recordSummaryLine(leans), "below 55% confidence"],
    ];
    return `
        <section class="panel accountability-center">
            <header class="section-header">
                <div><p class="eyebrow">Model Accountability</p><h2>Can the model back it up?</h2></div>
                <button class="btn" data-refresh-command="score_models">Score Records</button>
            </header>
            <div class="accountability-grid">
                ${bucketRows.map(([label, value, note]) => `<article><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(note)}</small></article>`).join("")}
            </div>
            <div class="accountability-strip">
                ${card("Yesterday", recordSummaryLine(yesterday), "MLB live")}
                ${card("Last 7 days", recordSummaryLine(last7), "MLB live")}
                ${card("Last 30 days", recordSummaryLine(last30), "MLB live")}
                ${card("MLB live", recordLine(mlbRecord.live_record || mlbRecord.overall || {}), formatProbability((mlbRecord.live_record || mlbRecord.overall || {}).accuracy))}
                ${card("MLB backtest", recordLine(mlbRecord.backtest_record || {}), formatProbability((mlbRecord.backtest_record || {}).accuracy))}
                ${card("NFL historical", recordLine(nflRecord.historical_record || nflRecord.overall || {}), formatProbability((nflRecord.historical_record || nflRecord.overall || {}).accuracy))}
                ${card("Model vs market", marketScored.length ? recordSummaryLine(marketSummary) : "pending", marketScored.length ? "scored odds-joined picks" : "needs scored odds rows")}
            </div>
        </section>
    `;
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
        ${renderModelAccountabilityCenter()}
        ${sport === "MLB" ? renderMlbRecordView() : renderNflRecordView()}
    `;
}

function accountabilityLabel(row) {
    const raw = String(row?.model_result || row?.result || row?.result_status || "").toLowerCase();
    if (["win", "won", "correct"].includes(raw)) return "Correct";
    if (["loss", "lost", "wrong"].includes(raw)) return "Wrong";
    if (raw.includes("push")) return "Push";
    if (raw.includes("no") && raw.includes("prediction")) return "No pick";
    if (raw.includes("pending") || !raw) return "Pending";
    return raw.replaceAll("_", " ");
}

function recordRowsForSport(sport) {
    if (sport === "MLB") {
        return getLogEntries().filter(row => row.sport === "MLB");
    }
    return getModelRecord("NFL").recent_games || state.nfl.games || [];
}

function filterRecordRows(rows, sport) {
    const resultFilter = state.selected.recordResultFilter || "all";
    const marketFilter = state.selected.recordMarketFilter || "all";
    return rows.filter(row => {
        const result = accountabilityLabel(row).toLowerCase();
        if (resultFilter !== "all" && result !== resultFilter) return false;
        if (marketFilter !== "all") {
            const linked = oddsSnapshotsForGame({ ...row, sport }).length > 0;
            if (marketFilter === "linked" && !linked) return false;
            if (marketFilter === "unlinked" && linked) return false;
        }
        return true;
    });
}

function renderRecordFilters() {
    return `<div class="record-filters"><select id="record-result-filter" aria-label="Record result filter"><option value="all" ${state.selected.recordResultFilter === "all" ? "selected" : ""}>All results</option><option value="correct" ${state.selected.recordResultFilter === "correct" ? "selected" : ""}>Won</option><option value="wrong" ${state.selected.recordResultFilter === "wrong" ? "selected" : ""}>Lost</option><option value="pending" ${state.selected.recordResultFilter === "pending" ? "selected" : ""}>Pending</option></select><select id="record-market-filter" aria-label="Record market filter"><option value="all" ${state.selected.recordMarketFilter === "all" ? "selected" : ""}>All markets</option><option value="linked" ${state.selected.recordMarketFilter === "linked" ? "selected" : ""}>Odds linked</option><option value="unlinked" ${state.selected.recordMarketFilter === "unlinked" ? "selected" : ""}>Odds unlinked</option></select></div>`;
}

function summarizeRecordRows(rows) {
    return rows.reduce((acc, row) => {
        const label = accountabilityLabel(row).toLowerCase();
        if (label === "correct") acc.wins += 1;
        else if (label === "wrong") acc.losses += 1;
        else if (label === "push") acc.pushes += 1;
        else if (label !== "no pick") acc.pending += 1;
        return acc;
    }, { wins: 0, losses: 0, pushes: 0, pending: 0 });
}

function renderRecordCalendar(sport) {
    const rows = recordRowsForSport(sport).filter(row => row.game_date || row.generated_at);
    if (!rows.length) return emptyState(`No ${sport} record calendar yet`, sport === "MLB" ? "Run npm run refresh:mlb, then npm run score:models." : "Run npm run score:models after NFL rows are exported.");
    const grouped = new Map();
    rows.forEach(row => {
        const day = String(row.game_date || row.generated_at || "").slice(0, 10);
        if (!day || day.length < 10) return;
        if (!grouped.has(day)) grouped.set(day, []);
        grouped.get(day).push(row);
    });
    const days = [...grouped.keys()].sort().slice(-28);
    return `
        <div class="record-calendar">
            ${days.map(day => {
                const summary = summarizeRecordRows(grouped.get(day));
                const decided = summary.wins + summary.losses + summary.pushes;
                const variant = decided ? (summary.wins >= summary.losses ? "success" : "error") : "warning";
                const label = `${summary.wins}-${summary.losses}${summary.pushes ? `-${summary.pushes}` : ""}${summary.pending ? ` / ${summary.pending} P` : ""}`;
                return `<button class="record-day" data-variant="${variant}" title="${escapeHtml(day)} ${escapeHtml(label)}"><span>${escapeHtml(day.slice(5))}</span><strong>${escapeHtml(label)}</strong></button>`;
            }).join("")}
        </div>
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
    const recentRows = filterRecordRows(record.recent_predictions || getLogEntries().filter(row => row.sport === "MLB").slice(0, 12), "MLB");
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
        <section class="panel">
            <header><p class="eyebrow">Record Calendar</p><h2>Recent MLB accountability</h2></header>
            ${renderRecordCalendar("MLB")}
        </section>
        <section class="dashboard-grid">
            <article class="panel">
                <header class="section-header"><div><p class="eyebrow">Live Prediction Log</p><h2>Recent logged MLB picks</h2></div>${renderRecordFilters()}</header>
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
            <header><p class="eyebrow">Record Calendar</p><h2>Recent NFL export accountability</h2></header>
            ${renderRecordCalendar("NFL")}
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
        return `<tr><td>${formatDate(row.game_date || row.generated_at)}</td><td>${escapeHtml(row.away || "-")} @ ${escapeHtml(row.home || "-")}</td><td><strong>${escapeHtml(row.model_pick || "-")}</strong></td><td>${formatProbability(probability)}</td><td>${resultChip(accountabilityLabel(row))}</td><td>${escapeHtml(score)}</td></tr>`;
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
    const current = selectedModelEntry(sport);
    const previous = current ? entries.find(model => model.model_id !== current.model_id) : null;
    const improved = current && previous && safeNumber(current.metrics?.log_loss) !== null && safeNumber(previous.metrics?.log_loss) !== null
        ? safeNumber(current.metrics.log_loss) < safeNumber(previous.metrics.log_loss)
        : null;
    return `
        <header><p class="eyebrow">Model registry</p><h2>${escapeHtml(current?.model_id || current?.model_name || "Selection unavailable")}</h2></header>
        <p class="muted">${!current ? "Registry rows are present, but no current selection is declared." : improved === null ? "No previous comparable model yet." : improved ? "Improved vs previous by log loss." : "No log-loss improvement vs previous model."}</p>
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
    const meta = normalizeMeta(state.modelComparison);
    return `<p class="comparison-selection-note">Production selection: <strong>${escapeHtml(meta.selected_model || "not declared")}</strong> · ${escapeHtml(meta.selected_by || "selection rule unavailable")} · all rows use the exported evaluation boundary.</p><div class="table-wrapper"><table class="data-table"><thead><tr><th>Model</th><th>Status</th><th>Accuracy</th><th>ROC AUC</th><th>Log loss</th><th>Brier</th><th>Calibration</th><th>Stability</th><th>N</th></tr></thead><tbody>${rows.map(row => `<tr><td><strong>${escapeHtml(row.model || row.model_name)}</strong> ${bestLogLoss !== null && safeNumber(row.log_loss) === bestLogLoss ? '<span class="tag tag--high">Best log loss</span>' : ""}</td><td>${escapeHtml(row.status || "pending")}</td><td>${formatProbability(row.accuracy)}</td><td>${formatNumber(row.roc_auc, 3)}</td><td>${formatNumber(row.log_loss, 3)}</td><td>${formatNumber(row.brier_score, 3)}</td><td>${formatEdge(row.calibration_error)}</td><td>${formatNumber(row.stability?.stability_score, 3)}</td><td>${row.sample_size || 0}</td></tr>`).join("")}</tbody></table></div>`;
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
                ${renderFavoriteButton(team.sport, team.abbreviation, `Favorite ${team.full_name}`)}
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
    const heartbeatSeconds = liveHeartbeatSeconds();
    const heartbeatStatus = state.selected.liveHeartbeatEnabled
        ? `${heartbeatSeconds || 0}s - ${state.liveRefresh.lastStatus}`
        : "Off";
    return `
        <section class="panel live-widget-settings">
            <header class="section-header">
                <div>
                    <p class="eyebrow">Live Scores</p>
                    <h2>Widget and app heartbeat</h2>
                    <p class="muted">${state.refreshRuntime.available ? "Desktop widget commands are available." : "Live widget is available in the Tauri desktop app. Browser mode uses manual refresh commands."}</p>
                </div>
                <span class="chip">${escapeHtml(meta.source_status || "missing")}</span>
            </header>
            <div class="settings-grid">
                <div class="setting-row"><strong>Live games loaded</strong><span>${escapeHtml(String(state.live.games.length))}</span><code>data/live/live_scores.json</code></div>
                <div class="setting-row"><strong>Last live refresh</strong><span>${escapeHtml(timestamp(meta.generated_at))}</span><code>${escapeHtml(meta.source || "npm run refresh:live")}</code></div>
                <div class="setting-row"><strong>Manual command</strong><span>Browser/static fallback</span><code>npm run refresh:live</code></div>
                <div class="setting-row"><strong>Main app heartbeat</strong><span>${escapeHtml(heartbeatStatus)}</span><code>${escapeHtml(state.liveRefresh.lastMessage || "Waiting for app startup")}</code></div>
                <div class="setting-row"><strong>Auto refresh</strong><span>${interval ? `${interval}s` : "Off"}</span><code>Widget preference</code></div>
            </div>
            <div class="report-actions">
                <button class="btn btn--primary" data-open-live-widget>Open Live Widget</button>
                <button class="btn" data-refresh-command="live_scores">Refresh Live Scores Now</button>
                <button class="btn" data-live-heartbeat-now>Run Heartbeat Now</button>
                <label class="inline-control">
                    <input id="live-heartbeat-enabled" type="checkbox" ${state.selected.liveHeartbeatEnabled ? "checked" : ""}>
                    Main App Heartbeat
                </label>
                <label class="inline-control">Heartbeat
                    <select id="live-heartbeat-interval">
                        ${[[15, "15s"], [30, "30s"], [60, "60s"], [120, "2m"], [0, "Off"]].map(([value, label]) => `<option value="${value}" ${heartbeatSeconds === value || (!heartbeatSeconds && value === 0) ? "selected" : ""}>${label}</option>`).join("")}
                    </select>
                </label>
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

function doctorStatus(kind, ready, command, note) {
    return { kind, ready, command, note };
}

function renderDataDoctorPanel() {
    const rows = [
        doctorStatus("MLB predictions", Boolean(state.mlb.games.length), "npm run refresh:mlb", `${state.mlb.games.length} rows`),
        doctorStatus("MLB backtest", Boolean(state.mlbBacktest.games.length), "npm run refresh:mlb:all", `${state.mlbBacktest.games.length} rows`),
        doctorStatus("Live scores", Boolean(state.live.games.length), "npm run refresh:live", `${state.live.games.length} games`),
        doctorStatus("Odds snapshots", Boolean(state.odds?.metadata?.snapshot_count), "npm run refresh:odds", oddsStatusMessage()),
        doctorStatus("Model record", Boolean(state.modelRecord), "npm run score:models", state.modelRecord ? timestamp(state.modelRecord.metadata?.generated_at) : "missing"),
        doctorStatus("Reports", Boolean(state.report && state.modelComparison), "npm run refresh:mlb:all", state.report ? "report found" : "missing"),
        doctorStatus("NFL export", Boolean(state.nfl.games.length), "npm run refresh:nfl:real", `${state.nfl.games.length} rows`),
    ];
    return `
        <section class="panel data-doctor-panel">
            <header class="section-header">
                <div><p class="eyebrow">Data Doctor</p><h2>Demo readiness checklist</h2></div>
                <button class="btn" data-refresh-command="check_data">Check Data</button>
            </header>
            <div class="doctor-list">
                ${rows.map(row => `
                    <article class="doctor-row" data-variant="${row.ready ? "success" : "warning"}">
                        <span>${row.ready ? "Ready" : "Needs refresh"}</span>
                        <strong>${escapeHtml(row.kind)}</strong>
                        <small>${escapeHtml(row.note || "")}</small>
                        <code>${escapeHtml(row.command)}</code>
                    </article>
                `).join("")}
            </div>
        </section>
    `;
}

function renderUiPreferencesPanel() {
    return `
        <section class="panel ui-preferences-panel">
            <header class="section-header">
                <div><p class="eyebrow">Presentation</p><h2>Display controls</h2></div>
                <div class="report-actions">
                    <label class="inline-control"><input id="presentation-mode-toggle" type="checkbox" ${state.selected.presentationMode ? "checked" : ""}> Clean UI</label>
                    <label class="inline-control">Density
                        <select id="table-density-select">
                            <option value="comfortable" ${state.selected.tableDensity !== "compact" ? "selected" : ""}>Comfortable</option>
                            <option value="compact" ${state.selected.tableDensity === "compact" ? "selected" : ""}>Compact</option>
                        </select>
                    </label>
                </div>
            </header>
            <p class="muted">Clean UI reduces dashboard noise while keeping full diagnostics available in Settings.</p>
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
        ["Odds API", oddsStatusLabel(), oddsStatusMessage()],
        ["Reports mode", state.report?.metadata?.real_data === false ? "missing" : state.report ? "ready" : "missing", "data/reports/model_report.json"],
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
            <div class="report-actions"><button class="btn" type="button" data-reopen-onboarding>Reopen onboarding</button><button class="btn btn--primary" type="button" data-open-about>About / What’s New</button></div>
            <span class="chip">${escapeHtml(state.app.version || APP_VERSION)}</span>
        </section>
        ${renderUiPreferencesPanel()}
        ${renderDataDoctorPanel()}
        ${renderLiveWidgetSettings()}
        ${renderRefreshPanel("settings")}
        ${renderCommandConsole("settings")}
        <section class="panel"><div class="settings-grid">${modes.map(([label, status, note]) => `<div class="setting-row"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(status)}</span><code>${escapeHtml(note)}</code></div>`).join("")}</div></section>
        ${dataMode(state.nfl.payload, state.nfl.games) === "missing" ? `<section class="panel">${renderNflManualRecoveryCard()}</section>` : ""}
        <section class="panel"><p class="data-status" data-variant="${state.refreshRuntime.available ? "success" : "warning"}">${state.refreshRuntime.available ? "Bundled exports load first. Python refresh commands are available when the packaged app can access the project scripts." : "Installed app/browser mode is showing bundled exports. Command refresh requires the project repo/dev environment."} Tracking data is stored locally in <code>${TRACKER_KEY}</code>. Refresh logs use <code>${REFRESH_LOGS_KEY}</code>.</p><p class="muted">For analysis and tracking only. Predictions are experimental and not financial advice.</p></section>
    `;
}

function finishOnboarding() {
    state.selected.onboardingSeen = true;
    state.selected.onboardingNever = Boolean($("#onboarding-dont-show")?.checked);
    persistSettings();
    renderOnboarding();
}

function renderOnboarding() {
    const root = $("#onboarding-root");
    if (!root) return;
    if (state.selected.onboardingSeen || state.selected.onboardingNever) {
        root.innerHTML = "";
        return;
    }
    root.innerHTML = `
        <div class="onboarding-backdrop" data-onboarding-close></div>
        <section class="onboarding-dialog" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
            <header><span class="brand__mark">LL</span><div><p class="eyebrow">LineLens Sports ${escapeHtml(state.app.version || APP_VERSION)}</p><h2 id="onboarding-title">A clearer way to read the board.</h2></div></header>
            <p class="muted">Start with the real bundled demo, then follow one prediction from signal to accountability.</p>
            <ol class="onboarding-steps"><li><strong>Review today’s MLB game board</strong><span>See what matters now, with live and final states separated.</span></li><li><strong>Open a matchup</strong><span>Inspect model, market, explanation, GameCast, and timeline details.</span></li><li><strong>Visit Models and Record</strong><span>See how the system was evaluated and whether predictions held up.</span></li></ol>
            <footer><label class="onboarding-check"><input id="onboarding-dont-show" type="checkbox" /> Do not show again</label><div class="onboarding-actions"><button class="btn" type="button" data-onboarding-skip>Skip</button><button class="btn btn--primary" type="button" data-onboarding-start>Start Demo</button></div></footer>
        </section>
    `;
}

function renderAbout() {
    const root = $("#about-root");
    if (!root) return;
    if (!state.aboutOpen) {
        root.innerHTML = "";
        return;
    }
    const production = selectedModelEntry("MLB");
    root.innerHTML = `
        <div class="about-backdrop" data-close-about></div>
        <section class="about-dialog" role="dialog" aria-modal="true" aria-labelledby="about-title">
            <header class="section-header"><div><p class="eyebrow">LineLens Sports</p><h2 id="about-title">What’s New in v2.0.0</h2></div><button class="icon-btn" type="button" data-close-about aria-label="Close About">×</button></header>
            <p class="muted">A release-hardening and presentation pass focused on real data, model transparency, and a faster first impression.</p>
            <div class="about-feature-grid"><span>MLB visual game board</span><span>Prediction Lifecycle</span><span>Soccer / World Cup scoreboard</span><span>Model Observatory</span><span>Moltres challenger ensemble</span><span>GameCast and odds movement</span><span>Record accountability</span><span>Live widget</span><span>Date/performance fixes</span></div>
            <div class="about-status-grid"><div><span>Production model</span><strong>${escapeHtml(production?.model_name || "Not declared")}</strong></div><div><span>Moltres</span><strong>${escapeHtml(moltresStatusLabel())}</strong></div><div><span>Bundled data</span><strong>${state.mlb.games.length ? "available" : "missing"}</strong></div><div><span>Policy</span><strong>Real data only</strong></div></div>
            <p class="about-disclaimer">Educational/demo outputs only. LineLens is not betting advice. Odds, live feeds, and pitcher context remain source-dependent.</p>
            <footer class="about-actions"><a class="btn" href="README.md" target="_blank" rel="noreferrer">Open README</a><a class="btn" href="RELEASE_NOTES_v2.0.0.md" target="_blank" rel="noreferrer">Release notes</a><button class="btn btn--primary" type="button" data-close-about>Done</button></footer>
        </section>
    `;
}

function renderAll() {
    setBodyModes();
    renderView(state.selected.view || "home");
    renderGlobalTicker();
    renderGameCastRoot();
    renderLiveNotifications();
    renderOnboarding();
    renderAbout();
    switchView(state.selected.view || "home");
}

function bindEvents() {
    document.addEventListener("click", event => {
        if (event.target.id === "about-btn" || event.target.closest("[data-open-about]")) {
            state.aboutOpen = true;
            renderAbout();
            return;
        }
        if (event.target.closest("[data-close-about]")) {
            state.aboutOpen = false;
            renderAbout();
            return;
        }
        if (event.target.closest("[data-onboarding-start]")) {
            finishOnboarding();
            switchView("home");
            return;
        }
        if (event.target.closest("[data-onboarding-skip]") || event.target.closest("[data-onboarding-close]")) {
            finishOnboarding();
            return;
        }
        if (event.target.closest("[data-reopen-onboarding]")) {
            state.selected.onboardingSeen = false;
            state.selected.onboardingNever = false;
            persistSettings();
            renderOnboarding();
            return;
        }
        const viewLink = event.target.closest("[data-view-link]");
        if (viewLink) switchView(viewLink.dataset.viewLink);

        const nav = event.target.closest(".nav__item");
        if (nav) switchView(nav.dataset.view);

        if (event.target.closest("[data-open-live-widget]")) openLiveWidget();

        if (event.target.id === "presentation-toggle") {
            state.selected.presentationMode = !state.selected.presentationMode;
            setBodyModes();
            persistSettings();
            renderAll();
            showToast(state.selected.presentationMode ? "Clean UI on" : "Clean UI off");
            return;
        }

        const favoriteButton = event.target.closest("[data-favorite-team]");
        if (favoriteButton) {
            toggleFavoriteTeam(favoriteButton.dataset.favoriteTeam);
            return;
        }

        const watchButton = event.target.closest("[data-watch-game]");
        if (watchButton) {
            toggleWatchedGame(watchButton.dataset.watchGame);
            return;
        }

        const gamecastButton = event.target.closest("[data-open-gamecast]");
        if (gamecastButton) {
            openGameCast(gamecastButton.dataset.openGamecast, gamecastButton.dataset.gameId);
            return;
        }

        if (event.target.closest("[data-close-gamecast]")) {
            closeGameCast();
            return;
        }

        if (event.target.closest("[data-copy-daily-brief]")) {
            copyDailyBrief();
            return;
        }

        const dismissLiveAlert = event.target.closest("[data-dismiss-live-alert]");
        if (dismissLiveAlert) {
            state.liveRefresh.notifications = state.liveRefresh.notifications.filter(alert => alert.id !== dismissLiveAlert.dataset.dismissLiveAlert);
            saveLiveAlerts();
            renderLiveNotifications();
            return;
        }

        if (event.target.closest("[data-clear-live-alerts]")) {
            state.liveRefresh.notifications = [];
            saveLiveAlerts();
            renderLiveNotifications();
            return;
        }

        if (event.target.closest("[data-live-heartbeat-now]")) {
            refreshLiveHeartbeat({ force: true, source: "manual" });
            return;
        }

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

        const mlbDateJumpButton = event.target.closest("[data-mlb-date-jump]");
        if (mlbDateJumpButton) {
            mlbDateJump(Number(mlbDateJumpButton.dataset.mlbDateJump));
            state.selected.view === "home" ? renderHome() : renderMLB();
            return;
        }

        const mlbDay = event.target.closest("[data-mlb-day]");
        if (mlbDay) {
            moveMlbBoardDate(Number(mlbDay.dataset.mlbDay));
            renderMLB();
            return;
        }

        const mlbFilterButton = event.target.closest("[data-mlb-filter]");
        if (mlbFilterButton) {
            state.selected.mlbFilter = mlbFilterButton.dataset.mlbFilter;
            persistSettings();
            renderMLB();
        }

        const mlbStageButton = event.target.closest("[data-mlb-stage-filter]");
        if (mlbStageButton) {
            state.selected.mlbLifecycleFilter = mlbStageButton.dataset.mlbStageFilter;
            persistSettings();
            renderMLB();
            return;
        }

        const modelOpen = event.target.closest("[data-model-open]");
        if (modelOpen) {
            state.selected.modelName = modelOpen.dataset.modelOpen;
            persistSettings();
            renderModels();
            return;
        }

        if (event.target.closest("[data-model-close]")) {
            state.selected.modelName = null;
            persistSettings();
            renderModels();
            return;
        }

        const nflFilterButton = event.target.closest("[data-nfl-filter]");
        if (nflFilterButton) {
            state.selected.nflFilter = nflFilterButton.dataset.nflFilter;
            persistSettings();
            renderNFL();
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
            const game = findGameByKey(sport, tickerOpenGame.dataset.gameId);
            if (game) state.selected[sport.toLowerCase()] = game;
            persistSettings();
            if (sport === "NFL") renderNFL();
            else if (sport === "MLB") renderMLB();
            else if (isScoreboardOnlySport(sport)) renderScoreboardDesk(normalizedSportCode(sport));
            const view = isScoreboardOnlySport(sport) ? scoreboardViewForSport(sport) : sport.toLowerCase();
            switchView(view);
            if (game && !isScoreboardOnlySport(sport)) openGameCast(sport, game);
        }

        const lifecycleGame = event.target.closest("[data-lifecycle-game]");
        if (lifecycleGame && !event.target.closest("button")) {
            const game = lifecycleBoardGames().find(item => gameKey(item) === lifecycleGame.dataset.gameId);
            if (game) {
                state.selected.mlb = game;
                persistSettings();
                renderHome();
                renderMLB();
            }
            return;
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
        if (event.target.id === "record-result-filter") {
            state.selected.recordResultFilter = event.target.value;
            persistSettings();
            renderRecord();
        }
        if (event.target.id === "record-market-filter") {
            state.selected.recordMarketFilter = event.target.value;
            persistSettings();
            renderRecord();
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
            setMlbBoardDate(event.target.value);
            renderMLB();
        }
        if (event.target.id === "home-nfl-season" || event.target.id === "nfl-nfl-season") {
            state.selected.homeNflSeason = safeNumber(event.target.value);
            state.selected.nflSeasonManual = true;
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
        if (event.target.id === "live-heartbeat-enabled") {
            state.selected.liveHeartbeatEnabled = event.target.checked;
            persistSettings();
            startLiveHeartbeat();
            renderSettings();
            showToast(state.selected.liveHeartbeatEnabled ? "Main app live heartbeat on" : "Main app live heartbeat off");
        }
        if (event.target.id === "live-heartbeat-interval") {
            const nextSeconds = safeNumber(event.target.value, 30);
            state.selected.liveHeartbeatSeconds = nextSeconds;
            state.selected.liveHeartbeatEnabled = nextSeconds > 0;
            persistSettings();
            startLiveHeartbeat();
            renderSettings();
            showToast(nextSeconds > 0 ? `Live heartbeat every ${nextSeconds}s` : "Main app live heartbeat off");
        }
        if (event.target.id === "presentation-mode-toggle") {
            state.selected.presentationMode = event.target.checked;
            setBodyModes();
            persistSettings();
            showToast(state.selected.presentationMode ? "Clean UI on" : "Clean UI off");
            renderAll();
        }
        if (event.target.id === "table-density-select") {
            state.selected.tableDensity = event.target.value;
            setBodyModes();
            persistSettings();
            showToast(`Table density: ${event.target.value}`);
            renderAll();
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

    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && state.gamecast.open) {
            closeGameCast();
        }
    });

    $("#refresh-btn").addEventListener("click", () => loadAll());
}

document.addEventListener("DOMContentLoaded", () => {
    bindEvents();
    loadAll();
});
