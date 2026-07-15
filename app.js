const APP_VERSION = "v4.1.0";
const TRACKER_KEY = "linelens.tracker.v1";
const SETTINGS_KEY = "linelens.settings.v1";
const REFRESH_LOGS_KEY = "linelens.refreshLogs.v1";
const FAVORITES_KEY = "linelens.favorites.v1";
const LIVE_ALERTS_KEY = "linelens.liveAlerts.v1";
const RELOAD_AFTER_REFRESH_KEY = "linelens.refreshReload.v1";

const DATA_SOURCES = {
    app: ["data/app_metadata.json"],
    teams: ["data/team_metadata.json"],
    reports: ["data/reports/model_report.json"],
    modelComparison: ["data/reports/mlb_model_comparison.json"],
    wnbaModelComparison: ["data/reports/wnba_model_comparison.json"],
    moltresCard: ["data/reports/mlb_moltres_model_card.json"],
    featureSummary: ["data/reports/mlb_feature_summary.json"],
    wnbaFeatureSummary: ["data/reports/wnba_feature_summary.json"],
    wnbaCard: ["data/reports/wnba_model_card.json"],
    modelRegistry: ["data/models/model_registry.json"],
    modelRecord: ["data/tracking/model_record.json"],
    predictionLog: ["data/tracking/model_predictions_log.json"],
    bootstrap: ["data/bootstrap_status.json"],
    startup: ["data/startup_status.json"],
    refresh: ["data/refresh_status.json"],
    live: ["data/live/live_heartbeat.json", "data/live/live_scores.json"],
    odds: ["data/odds/odds_snapshots.json"],
    playerProps: ["data/odds/player_props.json"],
    oddsHealth: ["data/odds/odds_health.json"],
    wnbaAvailability: ["data/odds/wnba_availability.json"],
    propsDiagnostics: ["data/odds/props_matching_diagnostics.json"],
    nfl: ["data/predictions/nfl_predictions.json", "data/predictions.json"],
    mlb: ["data/predictions/mlb_predictions.json"],
    mlbBacktest: ["data/predictions/mlb_backtest_predictions.json"],
    wnba: ["data/predictions/wnba_predictions.json"],
    wnbaBacktest: ["data/predictions/wnba_backtest_predictions.json"],
    wnbaPropPredictions: ["data/predictions/wnba_prop_predictions.json"],
    mlbPropPredictions: ["data/predictions/mlb_prop_predictions.json"],
    propLog: ["data/tracking/prop_prediction_log.json"],
    propRecord: ["data/tracking/prop_record.json"],
    wnbaPropModelRegistry: ["data/reports/wnba_prop_model_registry.json"],
    wnbaPropModelCards: ["data/reports/wnba_prop_model_cards.json"],
    wnbaPropModelHealth: ["data/reports/wnba_prop_model_health.json"],
    wnbaPropDatasetSummary: ["data/reports/wnba_prop_dataset_summary.json"],
    mlbPropModelRegistry: ["data/reports/mlb_prop_model_registry.json"],
    mlbPropModelCards: ["data/reports/mlb_prop_model_cards.json"],
    mlbPropModelHealth: ["data/reports/mlb_prop_model_health.json"],
    mlbPropDatasetSummary: ["data/reports/mlb_prop_dataset_summary.json"],
};

const state = {
    app: window.__APP_METADATA__ || { app: "LineLens Sports", version: APP_VERSION },
    teamPayload: window.__TEAM_METADATA__ || { teams: [] },
    report: window.__MODEL_REPORT__ || null,
    modelComparison: window.__MLB_MODEL_COMPARISON__ || null,
    wnbaModelComparison: window.__WNBA_MODEL_COMPARISON__ || null,
    moltresCard: window.__MLB_MOLTRES_MODEL_CARD__ || null,
    featureSummary: window.__MLB_FEATURE_SUMMARY__ || null,
    wnbaFeatureSummary: window.__WNBA_FEATURE_SUMMARY__ || null,
    wnbaCard: window.__WNBA_MODEL_CARD__ || null,
    modelRegistry: window.__MODEL_REGISTRY__ || null,
    modelRecord: window.__MODEL_RECORD__ || null,
    predictionLog: window.__MODEL_PREDICTIONS_LOG__ || null,
    bootstrapStatus: window.__BOOTSTRAP_STATUS__ || null,
    startupStatus: window.__STARTUP_STATUS__ || null,
    refreshStatus: window.__REFRESH_STATUS__ || null,
    live: { payload: window.__LIVE_SCORES__ || null, games: [], error: null, stale: false },
    odds: window.__ODDS_SNAPSHOTS__ || null,
    playerProps: window.__PLAYER_PROPS__ || null,
    oddsHealth: window.__ODDS_HEALTH__ || null,
    wnbaAvailability: window.__WNBA_AVAILABILITY__ || null,
    propsDiagnostics: window.__PROPS_MATCHING_DIAGNOSTICS__ || null,
    wnbaPropPredictions: window.__WNBA_PROP_PREDICTIONS__ || null,
    mlbPropPredictions: window.__MLB_PROP_PREDICTIONS__ || null,
    propLog: window.__PROP_PREDICTION_LOG__ || null,
    propRecord: window.__PROP_RECORD__ || null,
    wnbaPropModelRegistry: window.__WNBA_PROP_MODEL_REGISTRY__ || null,
    wnbaPropModelCards: window.__WNBA_PROP_MODEL_CARDS__ || null,
    wnbaPropModelHealth: window.__WNBA_PROP_MODEL_HEALTH__ || null,
    wnbaPropDatasetSummary: window.__WNBA_PROP_DATASET_SUMMARY__ || null,
    mlbPropModelRegistry: window.__MLB_PROP_MODEL_REGISTRY__ || null,
    mlbPropModelCards: window.__MLB_PROP_MODEL_CARDS__ || null,
    mlbPropModelHealth: window.__MLB_PROP_MODEL_HEALTH__ || null,
    mlbPropDatasetSummary: window.__MLB_PROP_DATASET_SUMMARY__ || null,
    refreshRuntime: { available: false, active: false, message: "Checking refresh availability..." },
    nfl: { payload: window.__NFL_PREDICTIONS__ || window.__PREDICTIONS__ || null, games: [], error: null },
    mlb: { payload: window.__MLB_PREDICTIONS__ || null, games: [], error: null },
    mlbBacktest: { payload: window.__MLB_BACKTEST_PREDICTIONS__ || null, games: [], error: null },
    wnba: { payload: window.__WNBA_PREDICTIONS__ || null, games: [], error: null },
    wnbaBacktest: { payload: window.__WNBA_BACKTEST_PREDICTIONS__ || null, games: [], error: null },
    selected: {
        nfl: null,
        mlb: null,
        wnba: null,
        wnbaDate: null,
        scoreboardDates: { NBA: null, NHL: null, SOCCER: null },
        teamSport: "MLB",
        teamCode: "TOR",
        reportSport: "MLB",
        recordSport: "MLB",
        recordResultFilter: "all",
        recordMarketFilter: "all",
        mlbFilter: "all",
        nflFilter: "all",
        homeSport: "MLB",
        picksSport: "all",
        picksDate: null,
        picksStatus: "all",
        picksConfidence: "all",
        picksModel: "all",
        picksSort: "confidence",
        picksWatchlist: false,
        picksDisagree: false,
        propsDate: null,
        propsDateManual: false,
        propsSport: "MLB",
        propsMarket: "all",
        propsSide: "all",
        propsConfidence: "all",
        propsStatus: "all",
        propsGame: "all",
        propsSearch: "",
        propsSort: "score",
        propId: null,
        propPlayer: null,
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
        pinnedModel: null,
        mlbLifecycleFilter: "all",
        historySport: "all",
        historySeason: "all",
        historyResult: "all",
        historyConfidence: "all",
        historyModel: "all",
        historyTeam: "all",
        historyQuery: "",
        historyFrom: "",
        historyTo: "",
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
    wnba_current: {
        label: "WNBA Current Board",
        manual: "npm run refresh:wnba",
        description: "Refresh real WNBA schedule rows and current model probabilities when the model artifact is ready.",
    },
    wnba_all: {
        label: "WNBA Full Train",
        manual: "npm run refresh:wnba:all",
        description: "Fetch cached completed seasons, build leakage-safe form/Elo features, evaluate Raikou/Entei/Suicune, and export predictions.",
    },
    wnba_train: {
        label: "WNBA Train Only",
        manual: "npm run refresh:wnba:train",
        description: "Retrain the WNBA candidate line and refresh the chronological holdout report.",
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
    live_scores_fast: {
        label: "Live Score Heartbeat",
        manual: "npm run refresh:live:fast",
        description: "Refresh yesterday, today, and tomorrow scoreboards quickly for the ticker and live boards.",
    },
    odds_snapshots: {
        label: "Odds Snapshots",
        manual: "npm run refresh:odds",
        description: "Fetch optional real odds snapshots and join current market lines when a key is configured.",
    },
    wnba_availability: {
        label: "WNBA Availability",
        manual: "npm run refresh:wnba:availability",
        description: "Fetch and parse the latest official WNBA injury report. Unlisted players remain unknown.",
    },
    mlb_player_games: {
        label: "MLB Player-Game Data",
        manual: "npm run refresh:mlb:player-games",
        description: "Download resumable pybaseball Statcast parquet chunks and build local MLB player-game rows.",
    },
    player_props_pipeline: {
        label: "Player Props Pipeline",
        manual: "npm run refresh:props:pipeline",
        description: "Refresh WNBA availability, build MLB player data, train research props models, export candidates, and score real finals.",
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
    if (sport === "MLB") return americanOdds(numeric);
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
    const separator = String(url).includes("?") ? "&" : "?";
    const response = await fetch(`${url}${separator}v=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`${url} returned ${response.status}`);
    return response.json();
}

function browserRefreshAvailable() {
    return Boolean(window.location && ["http:", "https:"].includes(window.location.protocol));
}

function livePayloadAgeSeconds(payload) {
    const generatedAt = normalizeMeta(payload).generated_at;
    if (!generatedAt) return Number.POSITIVE_INFINITY;
    const timestampValue = Date.parse(String(generatedAt));
    if (!Number.isFinite(timestampValue)) return Number.POSITIVE_INFINITY;
    return Math.max(0, (Date.now() - timestampValue) / 1000);
}

function livePayloadIsFresh(payload, maxAgeSeconds = 180) {
    return livePayloadAgeSeconds(payload) <= maxAgeSeconds;
}

async function loadOptional(kind, globals = [], options = {}) {
    if (isTauriRefreshAvailable()) {
        const tauriCandidates = [];
        for (const url of DATA_SOURCES[kind] || []) {
            try {
                const raw = await tauriInvoke("read_data_export", { path: url });
                const payload = typeof raw === "string" ? JSON.parse(raw) : raw;
                if (payload) tauriCandidates.push(payload);
            } catch (_error) {
                // Older installed builds may not expose the resource reader; use the static asset below.
            }
        }
        if (tauriCandidates.length) {
            if (kind === "live") {
                return tauriCandidates.sort((a, b) => {
                    const left = Date.parse(String(normalizeMeta(a).generated_at || "")) || 0;
                    const right = Date.parse(String(normalizeMeta(b).generated_at || "")) || 0;
                    return right - left;
                })[0];
            }
            return tauriCandidates[0];
        }
    }
    if (kind === "live" && (options.force || window.location.protocol !== "file:")) {
        const candidates = [];
        for (const url of DATA_SOURCES.live || []) {
            try {
                const payload = await fetchJson(url);
                if (payload) candidates.push(payload);
            } catch (_error) {
                // Choose the newest available live export below.
            }
        }
        if (candidates.length) {
            return candidates.sort((a, b) => {
                const left = Date.parse(String(normalizeMeta(a).generated_at || "")) || 0;
                const right = Date.parse(String(normalizeMeta(b).generated_at || "")) || 0;
                return right - left;
            })[0];
        }
    }
    if (!options.force && window.location.protocol === "file:") {
        for (const name of globals) {
            if (window[name]) return window[name];
        }
        return null;
    }
    for (const url of DATA_SOURCES[kind] || []) {
        try {
            return await fetchJson(url);
        } catch (_error) {
            // Try the next source. The UI renders clean missing states.
        }
    }
    for (const name of globals) {
        if (window[name]) return window[name];
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

let appLoadingStartedAt = performance.now();

function setAppLoading(message, detail = "", progress = 24) {
    const root = $("#app-loading");
    if (!root) return;
    root.hidden = false;
    root.setAttribute("aria-hidden", "false");
    root.classList.remove("is-complete");
    root.classList.add("is-visible");
    root.style.setProperty("--loading-progress", `${Math.max(8, Math.min(96, progress))}%`);
    const messageEl = $("#app-loading-message");
    if (messageEl) messageEl.textContent = message || "Loading prediction exports...";
    const detailEl = $(".app-loading__eyebrow");
    if (detailEl && detail) detailEl.textContent = `LineLens / ${detail}`;
}

function finishAppLoading() {
    const root = $("#app-loading");
    if (!root) return;
    const elapsed = performance.now() - appLoadingStartedAt;
    const wait = Math.max(180, 560 - elapsed);
    root.style.setProperty("--loading-progress", "100%");
    window.setTimeout(() => {
        root.classList.add("is-complete");
        window.setTimeout(() => {
            root.hidden = true;
            root.setAttribute("aria-hidden", "true");
        }, 540);
    }, wait);
}

function startAppLoading(message, detail, progress = 20) {
    appLoadingStartedAt = performance.now();
    setAppLoading(message, detail, progress);
}

function triggerViewTransition() {
    const wash = $("#view-transition-wash");
    if (!wash) return;
    wash.classList.remove("is-active");
    void wash.offsetWidth;
    wash.classList.add("is-active");
    window.setTimeout(() => wash.classList.remove("is-active"), 560);
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
    // Daily boards always open on today's slate, or the next date with real games.
    // Date navigation remains available for the rest of the current session.
    state.selected.homeMlbDate = null;
    state.selected.mlbDate = null;
    state.selected.wnbaDate = null;
    state.selected.picksDate = null;
    state.selected.propsDate = null;
    state.selected.propsDateManual = false;
    state.selected.scoreboardDates = { NBA: null, NHL: null, SOCCER: null };
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
        const saved = JSON.parse(localStorage.getItem(REFRESH_LOGS_KEY) || "[]");
        state.refreshLogs = (Array.isArray(saved) ? saved : []).filter(entry => {
            const stderr = String(entry?.stderr || "");
            return !entry?.skipped && !stderr.includes("Automatic refresh requires scripts/");
        });
        if (state.refreshLogs.length !== saved.length) saveRefreshLogs();
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
        ...state.wnba.games.map(game => ({ ...game, sport: "WNBA" })),
        ...state.wnbaBacktest.games.map(game => ({ ...game, sport: "WNBA" })),
    ];
}

function currentGames() {
    return [
        ...state.nfl.games.map(game => ({ ...game, sport: "NFL" })),
        ...state.mlb.games.map(game => ({ ...game, sport: "MLB" })),
        ...state.wnba.games.map(game => ({ ...game, sport: "WNBA" })),
    ];
}

function liveGames() {
    return state.live.games
        .filter(game => !state.live.stale || !isLiveSportGame(game))
        .map(game => ({ ...game, sport: game.sport || "MLB" }));
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
    WNBA: { view: "wnba", navLabel: "WNBA", title: "WNBA scoreboard", eyebrow: "Basketball / WNBA", description: "Real WNBA fixtures, team logos, live state, final scores, and LineLens winner probabilities when the required pregame inputs are available.", accent: "#ef8dff", emptyTitle: "No WNBA games are available", emptyCopy: "The current bundled live export has no WNBA rows. Run npm run refresh:live yourself to load real ESPN scoreboard results." },
};

function normalizedSportCode(sport) {
    return String(sport || "").toUpperCase() === "SOC" ? "SOCCER" : String(sport || "").toUpperCase();
}

function isScoreboardOnlySport(sport) {
    return normalizedSportCode(sport) !== "WNBA" && Boolean(SCOREBOARD_SPORTS[normalizedSportCode(sport)]);
}

function scoreboardViewForSport(sport) {
    return SCOREBOARD_SPORTS[normalizedSportCode(sport)]?.view || String(sport || "").toLowerCase();
}

function scoreboardGames(sport) {
    const normalized = normalizedSportCode(sport);
    return uniqueRowsByGame(liveGames().filter(game => normalizedSportCode(game.sport) === normalized))
        .sort((a, b) => (tickerPriority(b) - tickerPriority(a)) || ((gameTimestamp(a) ?? Number.MAX_SAFE_INTEGER) - (gameTimestamp(b) ?? Number.MAX_SAFE_INTEGER)));
}

function scoreboardAvailableDates(sport) {
    return uniqueSortedStrings(scoreboardGames(sport).map(gameIsoDate).filter(Boolean), "asc");
}

function scoreboardDateValue(sport) {
    const normalized = normalizedSportCode(sport);
    if (normalized === "MLB") return state.selected.mlbDate;
    if (normalized === "WNBA") return state.selected.wnbaDate;
    return state.selected.scoreboardDates?.[normalized] || null;
}

function setScoreboardDateValue(sport, value) {
    const normalized = normalizedSportCode(sport);
    if (normalized === "MLB") state.selected.mlbDate = value;
    else if (normalized === "WNBA") state.selected.wnbaDate = value;
    else {
        state.selected.scoreboardDates = { ...(state.selected.scoreboardDates || {}), [normalized]: value };
    }
    persistSettings();
}

function ensureScoreboardDate(sport, dates = scoreboardAvailableDates(sport)) {
    if (!dates.length) return null;
    const current = scoreboardDateValue(sport);
    if (current && dates.includes(current)) return current;
    const today = localDateIso();
    const selected = dates.includes(today) ? today : dates.find(date => date > today) || dates[dates.length - 1];
    setScoreboardDateValue(sport, selected);
    return selected;
}

function moveScoreboardDate(sport, delta) {
    const dates = normalizedSportCode(sport) === "MLB" ? mlbBoardDates() : normalizedSportCode(sport) === "WNBA" ? wnbaAvailableDates() : scoreboardAvailableDates(sport);
    if (!dates.length) return null;
    const current = ensureScoreboardDate(sport, dates);
    const index = dates.indexOf(current);
    const next = dates[Math.max(0, Math.min(dates.length - 1, index + delta))];
    setScoreboardDateValue(sport, next);
    return next;
}

function gameDateDisplay(iso) {
    const normalized = toIsoDate(iso);
    if (!normalized) return { weekday: "Date", monthDay: "Unavailable" };
    const date = new Date(`${normalized}T12:00:00`);
    if (Number.isNaN(date.getTime())) return { weekday: "Date", monthDay: normalized };
    const weekday = date.toLocaleDateString([], { weekday: "short" }) || "Date";
    const monthDay = date.toLocaleDateString([], { month: "short", day: "numeric" }) || normalized;
    return {
        weekday,
        monthDay,
    };
}

function renderGameDateCalendar({ sport, dates, selected, games, label }) {
    if (!dates.length) return `<div class="game-date-calendar game-date-calendar--empty">No real game dates loaded yet.</div>`;
    const selectedIndex = Math.max(0, dates.indexOf(selected));
    const start = Math.max(0, Math.min(Math.max(0, dates.length - 7), selectedIndex - 3));
    const visible = dates.slice(start, start + 7);
    const normalized = normalizedSportCode(sport);
    return `<div class="game-date-calendar" aria-label="${escapeHtml(label || `${normalized} game dates`)}"><div class="game-date-calendar__top"><h3>Game dates</h3><span>${dates.length} dates loaded</span></div><div class="game-date-calendar__rail"><button class="icon-btn" type="button" data-scoreboard-day="-1" data-scoreboard-sport="${normalized}" aria-label="Previous ${normalized} game date">‹</button><div class="game-date-calendar__days">${visible.map(date => { const item = gameDateDisplay(date); const count = games.filter(game => gameIsoDate(game) === date).length; return `<button type="button" class="game-date-chip ${date === selected ? "is-active" : ""}" data-scoreboard-date="${date}" data-scoreboard-sport="${normalized}"><span>${escapeHtml(item.weekday)}</span><strong>${escapeHtml(item.monthDay)}</strong><small>${count} ${count === 1 ? "game" : "games"}</small></button>`; }).join("")}</div><button class="icon-btn" type="button" data-scoreboard-day="1" data-scoreboard-sport="${normalized}" aria-label="Next ${normalized} game date">›</button></div><label class="game-date-calendar__picker">Jump to date<input id="${normalized.toLowerCase()}-date-picker" type="date" value="${escapeHtml(selected || "")}" min="${escapeHtml(dates[0])}" max="${escapeHtml(dates.at(-1))}" data-scoreboard-date-picker="${normalized}" /></label></div>`;
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
    if (!isTauriRefreshAvailable() && !browserRefreshAvailable()) {
        state.liveRefresh.lastStatus = "cached";
        state.liveRefresh.lastMessage = "Static mode cannot refresh live data; start npm run app.";
        renderLiveNotifications();
        return;
    }
    if (state.refreshRuntime.active && state.refreshRuntime.command !== "startup_auto" && !options.force) return;
    const before = liveGames();
    state.liveRefresh.refreshing = true;
    state.liveRefresh.lastStatus = "refreshing";
    state.liveRefresh.lastMessage = "Refreshing live scores...";

    try {
        const result = await runRefreshCommand("live_scores_fast", {
            background: true,
            loadAfterRefresh: false,
            reloadAfterRefresh: false,
        });
        if (result?.success) {
            state.liveRefresh.lastStatus = "fresh";
            state.refreshRuntime.message = "Live heartbeat refreshed scores in the background.";
        } else if (!result) {
            state.liveRefresh.lastStatus = "cached";
        }
        await loadAllAfterRefresh();
        const after = liveGames();
        detectLiveAlerts(before, after);
        state.liveRefresh.lastMessage = result?.success
            ? `Live heartbeat updated ${after.length} games.`
            : `Live refresh unavailable; retained ${after.length} non-live cached rows.`;
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
    const refreshAvailable = isTauriRefreshAvailable() || browserRefreshAvailable();
    state.liveRefresh.lastStatus = refreshAvailable ? "waiting" : "cached";
    state.liveRefresh.lastMessage = refreshAvailable
        ? `Live heartbeat ready every ${seconds}s; live_scores refresh runs in the background.`
        : `Static mode can only show bundled live data. Start npm run app to enable live refresh.`;
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
    const payload = sport === "MLB" ? normalizeMeta(state.mlb.payload) : sport === "WNBA" ? normalizeMeta(state.wnba.payload) : normalizeMeta(state.nfl.payload);
    const payloadName = payload.model_name || payload.model_type;
    return payloadName ? entries.find(model => model.sport === sport && model.model_name === payloadName) || null : null;
}

function modelOpsSummary(sport) {
    const isWnba = sport === "WNBA";
    const payload = isWnba ? state.wnba.payload : state.mlb.payload;
    const games = isWnba ? state.wnba.games : state.mlb.games;
    const featureSummary = isWnba ? state.wnbaFeatureSummary : state.featureSummary;
    const comparison = getComparisonRows(sport);
    const selected = selectedModelEntry(sport);
    const selectedComparison = comparison.find(row => row.model_name === selected?.model_name || row.technical_name === selected?.technical_name) || {};
    const featureMeta = isWnba ? (featureSummary?.metadata || {}) : (featureSummary || {});
    const modelName = selected?.model_name || normalizeMeta(payload).model_name || normalizeMeta(payload).model_type || "Not selected";
    const modelCard = isWnba ? state.wnbaCard : state.moltresCard;
    const cardCreatedAt = modelCard?.metadata?.created_at || modelCard?.metadata?.generated_at;
    const evaluated = comparison.filter(row => row.status === "evaluated" || row.status === "trained").length;
    const holdoutRows = selectedComparison.sample_size || selectedComparison.test_rows || selected?.test_rows || "-";
    const featureRows = featureMeta.rows || featureMeta.row_count || "-";
    const featureCount = featureMeta.feature_count || featureMeta.features?.length || selected?.feature_count || "-";
    const currentExport = normalizeMeta(payload).generated_at;
    const trainedAt = selected?.trained_at || selectedComparison.trained_at || cardCreatedAt;
    const status = selected && games.length ? "READY" : selected ? "CURRENT EXPORT PENDING" : "TRAINING NEEDED";
    return {
        sport,
        modelName,
        selected,
        currentRows: games.length,
        evaluated,
        candidateCount: isWnba ? 3 : Math.max(evaluated, 4),
        holdoutRows,
        featureRows,
        featureCount,
        currentExport,
        trainedAt,
        status,
        dataQuality: normalizeMeta(payload).data_quality || featureMeta.data_quality || (isWnba ? "score + Elo" : "feature-rich MLB form"),
    };
}

function renderModelOpsCard(summary) {
    const ready = summary.status === "READY";
    const modelLabel = summary.modelName === "Not selected" ? summary.modelName : modelIdentity(summary.modelName).legend;
    return `<article class="model-ops-card" data-variant="${ready ? "success" : "warning"}">
        <header><div><p class="eyebrow">${escapeHtml(summary.sport)} operations</p><h3>${escapeHtml(modelLabel)}</h3></div><span class="model-ops-card__status">${escapeHtml(summary.status)}</span></header>
        <div class="model-ops-card__grid">
            ${renderModelMetric("Current rows", String(summary.currentRows), "prediction export")}
            ${renderModelMetric("Holdout", String(summary.holdoutRows), "evaluation rows")}
            ${renderModelMetric("Features", String(summary.featureCount), `${summary.featureRows} source rows`)}
            ${renderModelMetric("Candidates", `${summary.evaluated}/${summary.candidateCount}`, "evaluated line")}
        </div>
        <dl class="model-ops-card__facts"><div><dt>Last trained</dt><dd>${escapeHtml(timestamp(summary.trainedAt) || "Not exported")}</dd></div><div><dt>Current export</dt><dd>${escapeHtml(timestamp(summary.currentExport) || "Not exported")}</dd></div><div><dt>Data policy</dt><dd>${escapeHtml(summary.dataQuality)}</dd></div></dl>
        <div class="report-actions"><button class="btn btn--small" data-view-link="${summary.sport === "WNBA" ? "wnba" : "mlb"}">Open board</button><button class="btn btn--small ${ready ? "" : "btn--primary"}" data-refresh-command="${summary.sport === "WNBA" ? "wnba_all" : "mlb_all"}">Retrain line</button></div>
    </article>`;
}

function renderModelOpsPanel() {
    const summaries = [modelOpsSummary("MLB"), modelOpsSummary("WNBA")];
    return `<section class="panel model-ops-panel"><header class="section-header"><div><p class="eyebrow">Model operations</p><h2>Daily training and data health</h2><p class="muted">A compact operational read: what is selected, what was evaluated, and whether current exports are present.</p></div><span class="chip chip--soft">${summaries.filter(summary => summary.status === "READY").length} / ${summaries.length} ready</span></header><div class="model-ops-grid">${summaries.map(renderModelOpsCard).join("")}</div></section>`;
}

function modelHealthRows(sport) {
    return recordRowsForSport(sport)
        .filter(row => ["correct", "wrong", "push"].includes(accountabilityLabel(row).toLowerCase()))
        .sort((a, b) => String(b.generated_at || b.prediction_at || "").localeCompare(String(a.generated_at || a.prediction_at || "")));
}

function healthMetrics(rows) {
    const scored = rows.filter(row => ["Correct", "Wrong", "Push"].includes(accountabilityLabel(row)));
    if (!scored.length) return { sample: 0, accuracy: null, logLoss: null, brier: null, calibration: null };
    let logLoss = 0;
    let brier = 0;
    let calibration = 0;
    let count = 0;
    scored.forEach(row => {
        const probability = getGameProbability(row, row.sport || "MLB");
        const pickProbability = getGamePick(row, row.sport || "MLB") === row.home ? probability : probability === null ? null : 1 - probability;
        if (pickProbability === null) return;
        const actual = accountabilityLabel(row) === "Correct" ? 1 : 0;
        const bounded = Math.max(0.0001, Math.min(0.9999, pickProbability));
        logLoss += -(actual * Math.log(bounded) + (1 - actual) * Math.log(1 - bounded));
        brier += Math.pow(bounded - actual, 2);
        calibration += Math.abs(bounded - actual);
        count += 1;
    });
    return { sample: scored.length, accuracy: scored.filter(row => accountabilityLabel(row) === "Correct").length / scored.length, logLoss: count ? logLoss / count : null, brier: count ? brier / count : null, calibration: count ? calibration / count : null };
}

function modelHealthSummary(sport) {
    const rows = modelHealthRows(sport);
    const recent10 = healthMetrics(rows.slice(0, 10));
    const recent30 = healthMetrics(rows.slice(0, 30));
    const ops = modelOpsSummary(sport);
    const selected = ops.selected;
    const trained = selected?.trained_at ? new Date(selected.trained_at).getTime() : null;
    const exported = ops.currentExport ? new Date(ops.currentExport).getTime() : null;
    const stale = trained && exported ? exported - trained > 1000 * 60 * 60 * 24 * 14 : false;
    const drift = recent10.sample >= 10 && recent30.sample >= 20 && Math.abs((recent10.accuracy ?? 0) - (recent30.accuracy ?? 0)) >= 0.15;
    let status = "Insufficient sample";
    let reason = `Needs at least 10 scored predictions; ${recent10.sample} available in the last-10 window.`;
    if (stale) { status = "Stale model"; reason = "The current prediction export is more than 14 days newer than the selected model training timestamp."; }
    else if (recent10.sample >= 10 && drift) { status = "Drifting"; reason = "Last-10 accuracy differs from the last-30 window by at least 15 percentage points."; }
    else if (recent10.sample >= 10 && (recent10.calibration ?? 0) > 0.12) { status = "Monitor"; reason = "Average absolute confidence error is above 12% in the last-10 scored predictions."; }
    else if (recent10.sample >= 10) { status = recent10.sample >= 30 ? "Healthy" : "Stable"; reason = "Recent sample is large enough for a directional health read."; }
    return { sport, status, reason, recent10, recent30, rows, stale, drift };
}

function renderModelHealthPanel() {
    const summaries = [modelHealthSummary("MLB"), modelHealthSummary("WNBA")];
    return `<section class="panel model-health-dashboard"><header class="section-header"><div><p class="eyebrow">Model Health and Drift</p><h2>Production model pulse</h2><p class="muted">Rolling metrics are calculated only from scored prediction-log rows. Cross-sport values are intentionally kept separate.</p></div><span class="chip chip--soft">No cross-sport metric ranking</span></header><div class="model-health-grid">${summaries.map(summary => `<article class="model-health-card" data-variant="${summary.status.toLowerCase().replaceAll(" ", "-")}"><header><div><p class="eyebrow">${summary.sport} production</p><h3>${escapeHtml(modelIdentity(modelOpsSummary(summary.sport).modelName).legend)}</h3></div><span>${escapeHtml(summary.status)}</span></header><p class="muted">${escapeHtml(summary.reason)}</p><div class="model-health-windows"><div><strong>Last 10</strong><b>${formatProbability(summary.recent10.accuracy)}</b><small>${summary.recent10.sample} scored · LL ${formatNumber(summary.recent10.logLoss, 3)} · Brier ${formatNumber(summary.recent10.brier, 3)}</small></div><div><strong>Last 30</strong><b>${formatProbability(summary.recent30.accuracy)}</b><small>${summary.recent30.sample} scored · LL ${formatNumber(summary.recent30.logLoss, 3)} · Brier ${formatNumber(summary.recent30.brier, 3)}</small></div></div><div class="model-health-facts"><span>Calibration <b>${formatProbability(summary.recent10.calibration)}</b></span><span>Home picks <b>${formatProbability(summary.rows.length ? summary.rows.filter(row => getGamePick(row, summary.sport) === row.home).length / summary.rows.length : null)}</b></span><span>Feature drift <b>${state[summary.sport === "MLB" ? "featureSummary" : "wnbaFeatureSummary"]?.drift_status || "Unavailable"}</b></span></div></article>`).join("")}</div></section>`;
}

function arenaEntries(sport) {
    if (sport === "MLB") return modelObservatoryEntries();
    if (sport === "WNBA") return getComparisonRows("WNBA").map(row => ({ ...row, model_name: row.model_name, technical_name: row.technical_name, metrics: row, selected: row.model_name === selectedModelEntry("WNBA")?.model_name, train_seasons: [2021, 2022, 2023, 2024], test_season: 2025, feature_count: state.wnbaFeatureSummary?.features?.length || "-" }));
    const meta = normalizeMeta(state.nfl.payload);
    const record = getModelRecord("NFL").historical_record || getModelRecord("NFL").overall || {};
    return [{ model_name: meta.model_type || "existing_project_pipeline", technical_name: meta.model_type || "existing_project_pipeline", sport: "NFL", selected: false, historical: true, train_seasons: `${meta.season_min || "-"}-${Math.max((meta.season_max || 0) - 1, meta.season_min || 0)}`, test_season: meta.season_max || "-", feature_count: "-", metrics: { accuracy: record.accuracy, sample_size: record.sample_size }, limitation: "Historical spread export only; no current NFL production registry or live model record is declared." }];
}

function renderArenaSportGroup(sport, title) {
    const entries = arenaEntries(sport);
    const leaderboard = [...entries].sort((a, b) => safeNumber(a.metrics?.log_loss, Infinity) - safeNumber(b.metrics?.log_loss, Infinity));
    const selectionReason = sport === "MLB" ? "Lugia remains production because the selected GradientBoostingClassifier entry wins the sealed MLB log-loss/Brier rule; Moltres remains a challenger." : sport === "WNBA" ? (state.wnbaModelComparison?.metadata?.selection_policy || "Selected by the chronological holdout rule; metrics stay within WNBA.") : "NFL is shown as a historical model export, not a current production selection.";
    return `<section class="arena-sport-group"><header class="section-header"><div><p class="eyebrow">${escapeHtml(sport)}</p><h2>${escapeHtml(title)}</h2><p class="muted">${escapeHtml(selectionReason)}</p></div><span class="chip chip--soft">${entries.length} real model${entries.length === 1 ? "" : "s"}</span></header><div class="arena-model-grid">${entries.map(entry => { const identity = modelIdentity(entry.model_name); const metrics = { ...(entry.metrics || {}), ...((sport === "MLB" && modelComparisonFor(entry.model_name)) || {}) }; const record = getModelRecord(sport); const live = entry.selected ? (record.live_record || record.overall || {}) : null; const backtest = record.backtest_record || {}; const status = entry.historical ? "HISTORICAL" : entry.selected ? "PRODUCTION" : entry.model_name === "Moltres" ? "CHALLENGER" : "EVALUATED"; return `<article class="arena-model-card ${entry.selected ? "is-production" : ""}"><div class="arena-model-card__visual model-gallery-card--${identity.element}"><strong>${escapeHtml(sport === "NFL" ? "NFL" : identity.legend)}</strong><span>${status}</span></div><div class="arena-model-card__body"><header><div><h3>${escapeHtml(sport === "NFL" ? entry.model_name : identity.legend)}</h3><code>${escapeHtml(entry.technical_name || entry.model_name || "Not declared")}</code></div><span>${escapeHtml(status)}</span></header><div class="arena-model-facts"><span>Sport <b>${sport}</b></span><span>Train <b>${escapeHtml(Array.isArray(entry.train_seasons) ? entry.train_seasons.join(", ") : entry.train_seasons || "Not exported")}</b></span><span>Test <b>${escapeHtml(entry.test_season || "Not exported")}</b></span><span>Features <b>${escapeHtml(entry.feature_count || "-")}</b></span><span>Trained <b>${escapeHtml(timestamp(entry.trained_at) || "Not exported")}</b></span></div><div class="model-gallery-card__metrics">${renderModelMetric("Accuracy", formatProbability(metrics.accuracy))}${renderModelMetric("Log loss", formatNumber(metrics.log_loss, 3))}${renderModelMetric("Brier", formatNumber(metrics.brier_score, 3))}${renderModelMetric("ROC AUC", formatNumber(metrics.roc_auc, 3))}${renderModelMetric("Calibration", formatEdge(metrics.calibration_error))}${renderModelMetric("Stability", formatNumber(metrics.stability?.stability_score, 3))}</div><p class="muted">${escapeHtml(entry.limitation || identity.weakness)}</p>${live ? `<small>Live record: ${escapeHtml(recordLine(live))}</small>` : ""}${backtest.sample_size ? `<small>Backtest record: ${escapeHtml(recordLine(backtest))}</small>` : ""}</div></article>`; }).join("")}</div><div class="arena-leaderboard"><h3>${escapeHtml(title)} leaderboard</h3><div class="table-wrapper"><table class="data-table"><thead><tr><th>Rank</th><th>Model</th><th>Accuracy</th><th>Log loss</th><th>Brier</th><th>Status</th></tr></thead><tbody>${leaderboard.map((entry, index) => `<tr><td>${index + 1}</td><td><strong>${escapeHtml(modelIdentity(entry.model_name).legend)}</strong><small>${escapeHtml(entry.technical_name || entry.model_name || "Not declared")}</small></td><td>${formatProbability(entry.metrics?.accuracy)}</td><td>${formatNumber(entry.metrics?.log_loss, 3)}</td><td>${formatNumber(entry.metrics?.brier_score, 3)}</td><td>${entry.selected ? "Production" : entry.historical ? "Historical" : "Challenger / evaluated"}</td></tr>`).join("")}</tbody></table></div></div></section>`;
}

function renderCrossSportModelArena() {
    return `<section class="panel cross-sport-warning" data-variant="warning"><strong>Cross-sport comparison warning</strong><span>MLB, WNBA, and NFL metrics use different targets, samples, seasons, and prediction difficulty. Compare models within a sport; do not rank sports against one another.</span></section><section class="model-arena"><header class="section-header"><div><p class="eyebrow">Cross-sport Model Arena</p><h2>One observatory, separate evidence</h2></div></header>${renderArenaSportGroup("MLB", "MLB Models")}${renderArenaSportGroup("WNBA", "WNBA Models")}${renderArenaSportGroup("NFL", "NFL Historical Model")}</section>`;
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

function recordTrackingStart(sport) {
    const logged = getLogEntries()
        .filter(row => row.sport === sport)
        .map(row => String(row.generated_at || row.prediction_at || "").slice(0, 10))
        .filter(value => /^\d{4}-\d{2}-\d{2}$/.test(value))
        .sort();
    if (logged.length) return logged[0];
    return sport === "WNBA" ? localDateIso() : null;
}

function recordTrackingStartCopy(sport) {
    const start = recordTrackingStart(sport);
    return start ? `Tracking began ${formatDate(start)}. Only ${sport} predictions logged from that point are included in this record.` : `Tracking start will appear after the first ${sport} prediction is logged.`;
}

function logSummaryForSport(sport = "MLB") {
    const entries = getLogEntries().filter(row => row.sport === sport);
    const scored = entries.filter(row => ["win", "loss", "push"].includes(String(row.model_result || "").toLowerCase())).length;
    const pending = entries.filter(row => String(row.model_result || row.result_status || "").toLowerCase() === "pending").length;
    return { entries, scored, pending };
}

function getComparisonRows(sport = "MLB") {
    if (sport === "MLB" && Array.isArray(state.modelComparison?.models)) return state.modelComparison.models;
    if (sport === "WNBA" && Array.isArray(state.wnbaModelComparison?.models)) return state.wnbaModelComparison.models;
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
        ...state.wnbaBacktest.games.map(game => ({ ...game, sport: "WNBA", source_type: game.source_type || "backtest" })),
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

function marketSpreadLine(snapshot, side) {
    if (!snapshot) return null;
    return safeNumber(snapshot[`spread_${side}_current`] ?? snapshot[`spread_${side}`] ?? snapshot[`spread_${side}_point_current`]);
}

function americanOdds(value) {
    const numeric = safeNumber(value);
    if (numeric === null) return "-";
    const rounded = Math.round(numeric);
    return rounded > 0 ? `+${rounded}` : String(rounded);
}

function runLine(value) {
    const numeric = safeNumber(value);
    if (numeric === null) return "-";
    return numeric > 0 ? `+${numeric.toFixed(1)}` : numeric.toFixed(1);
}

function oddsDisplayForGame(game) {
    const context = oddsContextForGame(game);
    const stage = lifecycleStage(game);
    const direct = {
        snapshot_at: game?.odds_snapshot_at,
        moneyline_home_current: game?.moneyline_home_current ?? game?.moneyline_home,
        moneyline_away_current: game?.moneyline_away_current ?? game?.moneyline_away,
        spread_home_current: game?.spread_home_current ?? game?.spread_line,
        spread_away_current: game?.spread_away_current,
        spread_home_price_current: game?.spread_home_price_current,
        spread_away_price_current: game?.spread_away_price_current,
    };
    const hasDirectOdds = Object.values(direct).some(value => value !== null && value !== undefined && value !== "" && value !== direct.snapshot_at);
    let snapshot;
    let label;
    if (stage === "final" || stage === "stale") {
        snapshot = context.opening || context.current || (hasDirectOdds ? direct : null);
        label = "Pregame odds";
    } else if (stage === "live") {
        snapshot = context.current || (hasDirectOdds ? direct : null);
        label = "Live odds";
    } else {
        snapshot = context.current || context.opening || (hasDirectOdds ? direct : null);
        label = "Current odds";
    }
    if (!snapshot) return { snapshot: null, label, freshness: "Unavailable" };
    return { snapshot, label, freshness: oddsFreshness(snapshot) };
}

function renderMlbOdds(game) {
    const display = oddsDisplayForGame(game);
    const snapshot = display.snapshot;
    if (!snapshot) {
        return `<div class="mlb-game-card__odds mlb-game-card__odds--empty"><span>Odds</span><small>—</small></div>`;
    }
    const awayMeta = getTeamMeta("MLB", game.away, game.away_display);
    const homeMeta = getTeamMeta("MLB", game.home, game.home_display);
    const awayMoneyline = marketLine(snapshot, "away", "MLB");
    const homeMoneyline = marketLine(snapshot, "home", "MLB");
    const awaySpread = marketSpreadLine(snapshot, "away");
    const homeSpread = marketSpreadLine(snapshot, "home");
    const awaySpreadPrice = safeNumber(snapshot.spread_away_price_current ?? snapshot.spread_away_price);
    const homeSpreadPrice = safeNumber(snapshot.spread_home_price_current ?? snapshot.spread_home_price);
    const moneylineAvailable = awayMoneyline !== null || homeMoneyline !== null;
    const runlineAvailable = awaySpread !== null || homeSpread !== null || awaySpreadPrice !== null || homeSpreadPrice !== null;
    const runlineCell = (line, price) => line === null && price === null ? "—" : [line === null ? null : runLine(line), price === null ? null : americanOdds(price)].filter(Boolean).join(" ");
    return `<div class="mlb-game-card__odds" aria-label="MLB odds"><div class="mlb-game-card__odds-row mlb-game-card__odds-row--teams"><span></span><strong>${escapeHtml(awayMeta.abbreviation)}</strong><strong>${escapeHtml(homeMeta.abbreviation)}</strong></div><div class="mlb-game-card__odds-row"><span>Moneyline</span><b>${moneylineAvailable ? americanOdds(awayMoneyline) : "—"}</b><b>${moneylineAvailable ? americanOdds(homeMoneyline) : "—"}</b></div><div class="mlb-game-card__odds-row"><span>Runline</span><b>${runlineAvailable ? runlineCell(awaySpread, awaySpreadPrice) : "—"}</b><b>${runlineAvailable ? runlineCell(homeSpread, homeSpreadPrice) : "—"}</b></div></div>`;
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

function teamProfileGames(team) {
    const rows = team.sport === "MLB" ? allMlbReviewRows() : state.nfl.games.map(game => ({ ...game, sport: "NFL" }));
    return rows
        .filter(game => game.sport === team.sport && (game.home === team.abbreviation || game.away === team.abbreviation))
        .sort((a, b) => {
            const dateOrder = String(gameIsoDate(b) || "").localeCompare(String(gameIsoDate(a) || ""));
            if (dateOrder !== 0) return dateOrder;
            return String(b.game_time || b.start_time || "").localeCompare(String(a.game_time || a.start_time || ""));
        });
}

function teamAverageRunDifferential(team, games) {
    if (team.sport !== "MLB") return null;
    const values = games.map(game => {
        const trend = game.trend || {};
        const side = game.home === team.abbreviation ? trend.home : trend.away;
        return safeNumber(Array.isArray(side) ? side[1] : null);
    }).filter(value => value !== null);
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
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

function mlbCurrentBoardRows() {
    return mergeCanonicalGameRows([
        ...state.mlb.games.map(game => ({ ...game, sport: "MLB", source_type: "current" })),
        ...liveGames()
            .filter(game => game.sport === "MLB")
            .map(game => ({ ...game, sport: "MLB", source_type: "live" })),
    ].filter(game => gameIsoDate(game)));
}

function mlbBoardDateRows() {
    // The board calendar is for the current schedule/live window only. Backtest
    // and prediction-log rows belong in History/Record and must not inflate the
    // visible dates or daily game counts.
    return mlbCurrentBoardRows();
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

function mlbBoardRowsForDate(date = ensureMlbBoardDate()) {
    if (!date) return [];
    return sortedGamesByTime(mlbCurrentBoardRows().filter(game => gameIsoDate(game) === date));
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
    const dates = mlbBoardDates();
    if (!dates.length) return null;
    const current = ensureMlbBoardDate();
    const index = dates.indexOf(current);
    const nextIndex = index === -1
        ? (delta < 0 ? 0 : dates.length - 1)
        : Math.max(0, Math.min(dates.length - 1, index + delta));
    state.selected.mlbDate = dates[nextIndex];
    persistSettings();
    return state.selected.mlbDate;
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
    if ((state.selected.homeSport || "MLB") === "WNBA") {
        return state.wnba.games.map(game => ({ ...game, sport: "WNBA" }));
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
    startAppLoading("Loading prediction exports...", "Sports Intelligence", 18);
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
        wnbaModelComparison,
        wnbaFeatureSummary,
        wnbaCard,
        wnba,
        wnbaBacktest,
        playerProps,
        oddsHealth,
        wnbaPropPredictions,
        propLog,
        propRecord,
        wnbaPropModelRegistry,
        wnbaPropModelCards,
        wnbaPropModelHealth,
        wnbaPropDatasetSummary,
        propsDiagnostics,
        mlbPropPredictions,
        mlbPropModelRegistry,
        mlbPropModelCards,
        mlbPropModelHealth,
        mlbPropDatasetSummary,
        wnbaAvailability,
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
        loadOptional("live", ["__LIVE_HEARTBEAT__", "__LIVE_SCORES__"]),
        loadOptional("odds", ["__ODDS_SNAPSHOTS__"]),
        loadOptional("nfl", ["__NFL_PREDICTIONS__", "__PREDICTIONS__"]),
        loadOptional("mlb", ["__MLB_PREDICTIONS__"]),
        loadOptional("mlbBacktest", ["__MLB_BACKTEST_PREDICTIONS__"]),
        loadOptional("wnbaModelComparison", ["__WNBA_MODEL_COMPARISON__"]),
        loadOptional("wnbaFeatureSummary", ["__WNBA_FEATURE_SUMMARY__"]),
        loadOptional("wnbaCard", ["__WNBA_MODEL_CARD__"]),
        loadOptional("wnba", ["__WNBA_PREDICTIONS__"]),
        loadOptional("wnbaBacktest", ["__WNBA_BACKTEST_PREDICTIONS__"]),
        loadOptional("playerProps", ["__PLAYER_PROPS__"]),
        loadOptional("oddsHealth", ["__ODDS_HEALTH__"]),
        loadOptional("wnbaPropPredictions", ["__WNBA_PROP_PREDICTIONS__"]),
        loadOptional("propLog", ["__PROP_PREDICTION_LOG__"]),
        loadOptional("propRecord", ["__PROP_RECORD__"]),
        loadOptional("wnbaPropModelRegistry", ["__WNBA_PROP_MODEL_REGISTRY__"]),
        loadOptional("wnbaPropModelCards", ["__WNBA_PROP_MODEL_CARDS__"]),
        loadOptional("wnbaPropModelHealth", ["__WNBA_PROP_MODEL_HEALTH__"]),
        loadOptional("wnbaPropDatasetSummary", ["__WNBA_PROP_DATASET_SUMMARY__"]),
        loadOptional("propsDiagnostics", ["__PROPS_MATCHING_DIAGNOSTICS__"]),
        loadOptional("mlbPropPredictions", ["__MLB_PROP_PREDICTIONS__"]),
        loadOptional("mlbPropModelRegistry", ["__MLB_PROP_MODEL_REGISTRY__"]),
        loadOptional("mlbPropModelCards", ["__MLB_PROP_MODEL_CARDS__"]),
        loadOptional("mlbPropModelHealth", ["__MLB_PROP_MODEL_HEALTH__"]),
        loadOptional("mlbPropDatasetSummary", ["__MLB_PROP_DATASET_SUMMARY__"]),
        loadOptional("wnbaAvailability", ["__WNBA_AVAILABILITY__"]),
    ]);

    setAppLoading("Building the board...", "Model registry / Live board", 66);

    state.app = app || state.app;
    state.teamPayload = teams || state.teamPayload;
    state.report = report || state.report;
    state.modelComparison = modelComparison || state.modelComparison;
    state.wnbaModelComparison = wnbaModelComparison || state.wnbaModelComparison;
    state.moltresCard = moltresCard || state.moltresCard;
    state.featureSummary = featureSummary || state.featureSummary;
    state.wnbaFeatureSummary = wnbaFeatureSummary || state.wnbaFeatureSummary;
    state.wnbaCard = wnbaCard || state.wnbaCard;
    state.modelRegistry = modelRegistry || state.modelRegistry;
    state.modelRecord = modelRecord || state.modelRecord;
    state.predictionLog = predictionLog || state.predictionLog;
    state.bootstrapStatus = bootstrap || state.bootstrapStatus;
    state.startupStatus = startup || state.startupStatus;
    state.refreshStatus = refresh || state.refreshStatus;
    state.live.payload = live;
    state.live.games = normalizeGames(live);
    state.live.stale = !livePayloadIsFresh(live);
    state.live.error = live
        ? (state.live.stale ? "Live export is older than three minutes; waiting for background refresh." : null)
        : "No live widget export found. Run npm run refresh:live.";
    state.odds = odds || state.odds;
    state.nfl.payload = nfl;
    state.nfl.games = normalizeGames(nfl);
    state.nfl.error = nfl ? null : "No NFL predictions found. Run the NFL export command.";
    state.mlb.payload = mlb;
    state.mlb.games = normalizeGames(mlb);
    state.mlb.error = mlb ? null : "No MLB predictions found. Run the MLB export command.";
    state.mlbBacktest.payload = mlbBacktest;
    state.mlbBacktest.games = normalizeGames(mlbBacktest);
    state.wnba.payload = wnba;
    state.wnba.games = normalizeGames(wnba);
    state.wnba.error = wnba ? null : "No WNBA model export found. Run npm run refresh:wnba:all.";
    state.wnbaBacktest.payload = wnbaBacktest;
    state.wnbaBacktest.games = normalizeGames(wnbaBacktest);
    state.playerProps = playerProps || state.playerProps;
    state.oddsHealth = oddsHealth || state.oddsHealth;
    state.wnbaAvailability = wnbaAvailability || state.wnbaAvailability;
    state.propsDiagnostics = propsDiagnostics || state.propsDiagnostics;
    state.wnbaPropPredictions = wnbaPropPredictions || state.wnbaPropPredictions;
    state.mlbPropPredictions = mlbPropPredictions || state.mlbPropPredictions;
    state.propLog = propLog || state.propLog;
    state.propRecord = propRecord || state.propRecord;
    state.wnbaPropModelRegistry = wnbaPropModelRegistry || state.wnbaPropModelRegistry;
    state.wnbaPropModelCards = wnbaPropModelCards || state.wnbaPropModelCards;
    state.wnbaPropModelHealth = wnbaPropModelHealth || state.wnbaPropModelHealth;
    state.wnbaPropDatasetSummary = wnbaPropDatasetSummary || state.wnbaPropDatasetSummary;
    state.mlbPropModelRegistry = mlbPropModelRegistry || state.mlbPropModelRegistry;
    state.mlbPropModelCards = mlbPropModelCards || state.mlbPropModelCards;
    state.mlbPropModelHealth = mlbPropModelHealth || state.mlbPropModelHealth;
    state.mlbPropDatasetSummary = mlbPropDatasetSummary || state.mlbPropDatasetSummary;
    teamIndex = buildTeamIndex();

    $("#sidebar-version").textContent = state.app.version || APP_VERSION;
    if ($("#app-version-chip")) $("#app-version-chip").textContent = state.app.version || APP_VERSION;
    if ($("#footer-version")) $("#footer-version").textContent = state.app.version || APP_VERSION;
    renderAll();
    setAppLoading("Data loaded.", "Exports and model status ready", 94);
    finishAppLoading();

    const modes = [`NFL ${dataMode(state.nfl.payload, state.nfl.games)}`, `MLB ${dataMode(state.mlb.payload, state.mlb.games)}`, `WNBA ${dataMode(state.wnba.payload, state.wnba.games)}`];
    setStatus(allGames().length ? "" : `No prediction exports loaded. ${modes.join(" / ")}.`, allGames().length ? "success" : "warning");
    const resumedAfterFileRefresh = sessionStorage.getItem(RELOAD_AFTER_REFRESH_KEY) === "1";
    if (resumedAfterFileRefresh) sessionStorage.removeItem(RELOAD_AFTER_REFRESH_KEY);
    if (!state.refreshRuntime.checked) {
        state.refreshRuntime.checked = true;
        state.refreshRuntime.available = isTauriRefreshAvailable() || browserRefreshAvailable();
        state.refreshRuntime.message = state.refreshRuntime.available
            ? isTauriRefreshAvailable()
                ? "Desktop auto-refresh is available."
                : "Local refresh bridge detected; background refresh is enabled."
            : "Showing bundled exports. Start npm run app to enable local command refresh.";
        renderAll();
        if (state.refreshRuntime.available && !resumedAfterFileRefresh) {
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
    return `Local refresh bridge unavailable. Start the app with npm run app, or run this manually: ${config.manual}`;
}

async function requestLocalRefresh(commandName) {
    if (!window.location || !["http:", "https:"].includes(window.location.protocol)) return null;
    const response = await fetch("/api/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command_name: commandName }),
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Local refresh bridge returned ${response.status}.`);
    return response.json();
}

function refreshCommandLabel(commandName) {
    return REFRESH_COMMANDS[commandName]?.label || commandName;
}

async function openLiveWidget() {
    if (!isTauriRefreshAvailable()) {
        const widget = window.open("widget.html", "linelens-live-widget", "popup=yes,width=390,height=180,resizable=yes");
        if (widget) {
            widget.focus?.();
            showToast("Opening LineLens Live widget");
        } else {
            showToast("Popup blocked. Open widget.html in a new tab.");
        }
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
        return runBrowserRefreshCommand(commandName, options);
    }
    state.refreshRuntime.available = true;
    state.refreshRuntime.active = true;
    state.refreshRuntime.command = commandName;
    state.refreshRuntime.message = `Running ${config.label}: ${config.manual}`;
    if (!options.background) {
        startAppLoading(`Refreshing ${config.label}...`, "Daily data refresh", 28);
        showToast(`Running ${config.label}...`);
    }
    renderAll();
    try {
        const result = await tauriInvoke("run_refresh_command", { commandName });
        appendRefreshLog(result);
        state.refreshRuntime.message = result.success
            ? `${config.label} completed.`
            : `${config.label} failed with exit code ${result.exit_code ?? "unknown"}.`;
        showToast(result.success ? `${config.label} complete` : `${config.label} failed`);
        if (result.success && window.location.protocol === "file:" && options.reloadAfterRefresh !== false) {
            sessionStorage.setItem(RELOAD_AFTER_REFRESH_KEY, "1");
            window.location.reload();
            return;
        }
        if (options.loadAfterRefresh !== false) {
            setAppLoading("Loading refreshed exports...", "New data / Model signals", 72);
            await loadAllAfterRefresh();
        }
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
        if (!options.background) {
            setAppLoading("Refresh complete.", "Board synchronized", 96);
            finishAppLoading();
        }
        renderAll();
    }
}

async function runBrowserRefreshCommand(commandName = "startup", options = {}) {
    const config = REFRESH_COMMANDS[commandName] || REFRESH_COMMANDS.startup;
    state.refreshRuntime.available = browserRefreshAvailable();
    state.refreshRuntime.active = true;
    state.refreshRuntime.command = commandName;
    state.refreshRuntime.message = `Refreshing through the local bridge: ${config.manual}`;
    if (!options.background) {
        startAppLoading(`Refreshing ${config.label}...`, "Local data refresh", 28);
        showToast(`Running ${config.label}...`);
    }
    renderAll();
    try {
        const result = await requestLocalRefresh(commandName);
        if (!result) {
            state.refreshRuntime.available = false;
            state.refreshRuntime.message = browserRefreshMessage(commandName);
            if (!options.background) showToast(state.refreshRuntime.message);
            return null;
        }
        appendRefreshLog(result);
        state.refreshRuntime.message = result.success
            ? `${config.label} completed.`
            : `${config.label} failed with exit code ${result.exit_code ?? "unknown"}.`;
        if (result.success) {
            showToast(`${config.label} complete`);
            if (options.loadAfterRefresh !== false) await loadAllAfterRefresh();
        } else {
            showToast(`${config.label} failed; cached data remains visible`);
        }
        return result;
    } catch (error) {
        state.refreshRuntime.message = String(error?.message || error || "Local refresh failed; showing cached data.");
        if (!options.background) showToast("Refresh failed; cached data remains visible");
        return null;
    } finally {
        state.refreshRuntime.active = false;
        if (!options.background) {
            setAppLoading("Refresh complete.", "Board synchronized", 96);
            finishAppLoading();
        }
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
    if (!options.background) {
        startAppLoading("Running startup automation...", "Daily data refresh", 22);
        showToast("Running startup automation...");
    }
    renderAll();
    try {
        const result = await tauriInvoke("run_startup_automation", {});
        appendRefreshLog(result);
        state.refreshRuntime.message = result.success ? "Startup automation finished." : "Startup automation failed; see command console.";
        showToast(result.success ? "Startup automation finished" : "Startup automation failed");
        if (result.success && window.location.protocol === "file:") {
            sessionStorage.setItem(RELOAD_AFTER_REFRESH_KEY, "1");
            window.location.reload();
            return;
        }
        setAppLoading("Loading refreshed exports...", "New data / Model signals", 72);
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
        if (!options.background) {
            setAppLoading("Refresh complete.", "Board synchronized", 96);
            finishAppLoading();
        }
        renderAll();
    }
}

async function loadAllAfterRefresh() {
    const [bootstrap, startup, refresh, live, odds, report, modelComparison, moltresCard, featureSummary, modelRegistry, modelRecord, predictionLog, nfl, mlb, mlbBacktest, wnbaModelComparison, wnbaCard, wnbaFeatureSummary, wnba, wnbaBacktest, playerProps, oddsHealth, wnbaPropPredictions, propLog, propRecord, wnbaPropModelRegistry, wnbaPropModelCards, wnbaPropModelHealth, wnbaPropDatasetSummary, propsDiagnostics, mlbPropPredictions, mlbPropModelRegistry, mlbPropModelCards, mlbPropModelHealth, mlbPropDatasetSummary, wnbaAvailability] = await Promise.all([
        loadOptional("bootstrap", [], { force: true }),
        loadOptional("startup", [], { force: true }),
        loadOptional("refresh", ["__REFRESH_STATUS__"], { force: true }),
        loadOptional("live", ["__LIVE_HEARTBEAT__", "__LIVE_SCORES__"], { force: true }),
        loadOptional("odds", ["__ODDS_SNAPSHOTS__"], { force: true }),
        loadOptional("reports", [], { force: true }),
        loadOptional("modelComparison", [], { force: true }),
        loadOptional("moltresCard", [], { force: true }),
        loadOptional("featureSummary", [], { force: true }),
        loadOptional("modelRegistry", [], { force: true }),
        loadOptional("modelRecord", [], { force: true }),
        loadOptional("predictionLog", [], { force: true }),
        loadOptional("nfl", [], { force: true }),
        loadOptional("mlb", [], { force: true }),
        loadOptional("mlbBacktest", [], { force: true }),
        loadOptional("wnbaModelComparison", [], { force: true }),
        loadOptional("wnbaCard", [], { force: true }),
        loadOptional("wnbaFeatureSummary", [], { force: true }),
        loadOptional("wnba", [], { force: true }),
        loadOptional("wnbaBacktest", [], { force: true }),
        loadOptional("playerProps", [], { force: true }),
        loadOptional("oddsHealth", [], { force: true }),
        loadOptional("wnbaPropPredictions", [], { force: true }),
        loadOptional("propLog", [], { force: true }),
        loadOptional("propRecord", [], { force: true }),
        loadOptional("wnbaPropModelRegistry", [], { force: true }),
        loadOptional("wnbaPropModelCards", [], { force: true }),
        loadOptional("wnbaPropModelHealth", [], { force: true }),
        loadOptional("wnbaPropDatasetSummary", [], { force: true }),
        loadOptional("propsDiagnostics", [], { force: true }),
        loadOptional("mlbPropPredictions", [], { force: true }),
        loadOptional("mlbPropModelRegistry", [], { force: true }),
        loadOptional("mlbPropModelCards", [], { force: true }),
        loadOptional("mlbPropModelHealth", [], { force: true }),
        loadOptional("mlbPropDatasetSummary", [], { force: true }),
        loadOptional("wnbaAvailability", [], { force: true }),
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
        state.live.stale = !livePayloadIsFresh(live);
        state.live.error = state.live.stale ? "Live export is older than three minutes; waiting for background refresh." : null;
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
    if (wnbaModelComparison) { state.wnbaModelComparison = wnbaModelComparison; window.__WNBA_MODEL_COMPARISON__ = wnbaModelComparison; }
    if (wnbaCard) { state.wnbaCard = wnbaCard; window.__WNBA_MODEL_CARD__ = wnbaCard; }
    if (wnbaFeatureSummary) { state.wnbaFeatureSummary = wnbaFeatureSummary; window.__WNBA_FEATURE_SUMMARY__ = wnbaFeatureSummary; }
    if (wnba) { state.wnba.payload = wnba; state.wnba.games = normalizeGames(wnba); window.__WNBA_PREDICTIONS__ = wnba; }
    if (wnbaBacktest) { state.wnbaBacktest.payload = wnbaBacktest; state.wnbaBacktest.games = normalizeGames(wnbaBacktest); window.__WNBA_BACKTEST_PREDICTIONS__ = wnbaBacktest; }
    if (playerProps) { state.playerProps = playerProps; window.__PLAYER_PROPS__ = playerProps; }
    if (oddsHealth) { state.oddsHealth = oddsHealth; window.__ODDS_HEALTH__ = oddsHealth; }
    if (wnbaAvailability) { state.wnbaAvailability = wnbaAvailability; window.__WNBA_AVAILABILITY__ = wnbaAvailability; }
    if (propsDiagnostics) { state.propsDiagnostics = propsDiagnostics; window.__PROPS_MATCHING_DIAGNOSTICS__ = propsDiagnostics; }
    if (wnbaPropPredictions) { state.wnbaPropPredictions = wnbaPropPredictions; window.__WNBA_PROP_PREDICTIONS__ = wnbaPropPredictions; }
    if (mlbPropPredictions) { state.mlbPropPredictions = mlbPropPredictions; window.__MLB_PROP_PREDICTIONS__ = mlbPropPredictions; }
    if (propLog) { state.propLog = propLog; window.__PROP_PREDICTION_LOG__ = propLog; }
    if (propRecord) { state.propRecord = propRecord; window.__PROP_RECORD__ = propRecord; }
    if (wnbaPropModelRegistry) { state.wnbaPropModelRegistry = wnbaPropModelRegistry; window.__WNBA_PROP_MODEL_REGISTRY__ = wnbaPropModelRegistry; }
    if (wnbaPropModelCards) { state.wnbaPropModelCards = wnbaPropModelCards; window.__WNBA_PROP_MODEL_CARDS__ = wnbaPropModelCards; }
    if (wnbaPropModelHealth) { state.wnbaPropModelHealth = wnbaPropModelHealth; window.__WNBA_PROP_MODEL_HEALTH__ = wnbaPropModelHealth; }
    if (wnbaPropDatasetSummary) { state.wnbaPropDatasetSummary = wnbaPropDatasetSummary; window.__WNBA_PROP_DATASET_SUMMARY__ = wnbaPropDatasetSummary; }
    if (mlbPropModelRegistry) { state.mlbPropModelRegistry = mlbPropModelRegistry; window.__MLB_PROP_MODEL_REGISTRY__ = mlbPropModelRegistry; }
    if (mlbPropModelCards) { state.mlbPropModelCards = mlbPropModelCards; window.__MLB_PROP_MODEL_CARDS__ = mlbPropModelCards; }
    if (mlbPropModelHealth) { state.mlbPropModelHealth = mlbPropModelHealth; window.__MLB_PROP_MODEL_HEALTH__ = mlbPropModelHealth; }
    if (mlbPropDatasetSummary) { state.mlbPropDatasetSummary = mlbPropDatasetSummary; window.__MLB_PROP_DATASET_SUMMARY__ = mlbPropDatasetSummary; }
}

function switchView(view) {
    const previous = state.selected.view;
    if (previous !== view) triggerViewTransition();
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
        home: ["LineLens Sports", "Today’s model pulse"],
        picks: ["Picks Hub", "prediction feed"],
        props: ["Player Props", "WNBA projection feed"],
        nfl: ["NFL Spread Predictor", "spread module"],
        mlb: ["MLB Game Board", "daily broadcast board"],
        soccer: ["Soccer / World Cup", "live international scoreboard"],
        nba: ["NBA Scoreboard", "courtside live board"],
        nhl: ["NHL Scoreboard", "ice-level live board"],
        wnba: ["WNBA Game Board", "model + live scoreboard"],
        models: ["Model Arena", "model comparison"],
        history: ["History Explorer", "search the cached prediction ledger"],
        watchlist: ["Watchlist", "your teams, games, and model"],
        reports: ["Model Reports", "calibration and evaluation"],
        record: ["Model Record", "prediction accountability"],
        teams: ["Team Profiles", "team-level model context"],
        tracking: ["Tracking", "local analysis ledger"],
        settings: ["Settings / Data Status", "exports and preferences"],
        about: ["About LineLens", "product information and support"],
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
        picks: renderPicks,
        props: renderProps,
        nfl: renderNFL,
        mlb: renderMLB,
        soccer: renderSoccer,
        nba: renderNBA,
        nhl: renderNHL,
        wnba: renderWNBA,
        models: renderModels,
        history: renderHistory,
        watchlist: renderWatchlist,
        reports: renderReports,
        record: renderRecord,
        teams: renderTeams,
        tracking: renderTracking,
        settings: renderSettings,
        about: renderAbout,
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
                <p class="muted">Run startup automation or refresh predictions to populate the daily board.</p>
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
                <button class="btn best-pick-v2__cta" data-view-link="${game.sport === "NFL" ? "nfl" : game.sport === "WNBA" ? "wnba" : "mlb"}">Full board</button>
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
    const target = shiftDateOnly(localDateIso(), offset);
    const previous = dates.filter(date => date <= target).at(-1);
    const next = dates.find(date => date >= target);
    const selected = offset < 0 ? (previous || dates[0]) : offset > 0 ? (next || dates.at(-1)) : (dates.includes(target) ? target : defaultMlbBoardDate());
    setMlbBoardDate(selected);
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
            ${["MLB", "NFL", "WNBA"].map(item => `<button type="button" data-home-sport="${item}" class="${sport === item ? "is-active" : ""}">${item}</button>`).join("")}
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
            : sport === "WNBA"
                ? "No current WNBA model rows found. Refresh the live source or run the WNBA training command."
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
                    <p class="eyebrow">${sport === "MLB" ? "Daily Review" : sport === "WNBA" ? "Current WNBA Board" : "Weekly Board"}</p>
                    <h2>${sport === "MLB" ? formatDate(ensureMlbReviewDate()) : sport === "WNBA" ? "WNBA model + scoreboard" : `NFL ${ensureNflScope().season} ${gameWeekLabel((ensureNflScope().games || [])[0] || { week: ensureNflScope().week })}`}</h2>
                </div>
                ${renderHomeSportTabs()}
            </header>
            ${sport === "MLB" ? renderHomeRangeTabs() : ""}
            ${sport === "MLB" ? renderMlbDateControls("home") : sport === "WNBA" ? "" : renderNflWeekControls("home")}
            ${renderDailyRecordStrip(rows, sport)}
            ${renderHomeBoardRows(rows, sport)}
        </article>
    `;
}

function renderHomeReadoutV2(rows) {
    const selectedModel = selectedModelEntry("MLB");
    const mlbRecord = getModelRecord("MLB").overall || {};
    const selectedWnbaModel = selectedModelEntry("WNBA");
    const wnbaRecord = summarizeRecordRows(recordRowsForSport("WNBA"));
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
                <div><span>WNBA model</span><strong>${escapeHtml(selectedWnbaModel?.model_name || normalizeMeta(state.wnba.payload).model_type || "-")}</strong></div>
                <div><span>WNBA live</span><strong>${escapeHtml(recordLine(wnbaRecord))}</strong></div>
                <div><span>Latest WNBA export</span><strong>${escapeHtml(timestamp(normalizeMeta(state.wnba.payload).generated_at))}</strong></div>
                <div><span>Modules</span><strong>NFL / MLB / WNBA</strong></div>
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
            <button class="btn" data-open-live-widget>Open Live Widget</button>
            <button class="btn btn--primary" data-view-link="picks">Open Picks</button>
            <button class="btn" data-view-link="props">Open Props</button>
            <button class="btn" data-view-link="mlb">Open MLB</button>
            <button class="btn" data-view-link="wnba">Open WNBA</button>
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

function tickerRelevant(game) {
    const sport = normalizedSportCode(game?.sport || "MLB");
    const date = gameIsoDate(game);
    const today = dateOffsetIso(0);
    const yesterday = dateOffsetIso(-1);
    const tomorrow = dateOffsetIso(1);
    // The ticker is a broadcast strip, not a historical export browser:
    // yesterday's finals, today's slate, tomorrow's notable slate, and live
    // games only. This also prevents stale NFL exports from leaking into the
    // offseason ticker when ESPN has no current NFL scoreboard events.
    if (isLiveSportGame(game)) return true;
    if (!date) return sport !== "NFL" && !isFinalSportGame(game);
    if (date === yesterday || date === today) return true;
    if (date === tomorrow) return sport !== "NFL";
    return false;
}

function tickerGames() {
    const rows = uniqueRowsByGame([
        ...liveGames(),
        ...currentGames(),
        ...homeBoardGames(),
    ]).filter(tickerRelevant).sort((a, b) => tickerPriority(b) - tickerPriority(a));
    return rows.slice(0, 18);
}

function renderSportsTickerV2(rows = []) {
    const fallbackGames = rows.map(row => row.game).filter(Boolean);
    const liveRelevant = tickerGames();
    const games = liveRelevant.length ? liveRelevant : uniqueRowsByGame(fallbackGames).filter(tickerRelevant);
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
                    <h2>Daily model brief</h2>
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

function universalPickRows() {
    const rows = [
        ...state.mlb.games.map(game => ({ ...game, sport: "MLB", source_type: "current" })),
        ...state.wnba.games.map(game => ({ ...game, sport: "WNBA", source_type: "current" })),
        ...liveGames().filter(game => ["MLB", "WNBA"].includes(game.sport)).map(game => ({ ...game, source_type: "live" })),
    ];
    return mergeCanonicalGameRows(rows).filter(game => ["MLB", "WNBA"].includes(game.sport) && getGameProbability(game, game.sport) !== null && getGamePick(game, game.sport) !== "-");
}

function picksLifecycle(game) {
    const live = liveGameFor(game) || game;
    if (isFinalSportGame(live)) return "final";
    if (isLiveSportGame(live)) return "live";
    return "upcoming";
}

function picksConsensus(game) {
    const consensus = modelConsensusForGame(game);
    if (!consensus || consensus.total < 2) return { label: "No consensus available", count: 0, total: 0, disagree: false };
    const count = consensus.consensusCount;
    const total = consensus.total;
    const disagree = new Set(consensus.rows.map(row => row.pick)).size > 1;
    let label = `${count} of ${total} agree`;
    if (count === total) label = `${total} of ${total} agree`;
    else if (count === 3 && total === 5) label = "Models divided 3–2";
    else if (count === 4 && total === 5) label = "4 of 5 agree";
    return { ...consensus, label, count, total, disagree };
}

function ensurePicksDate(rows = universalPickRows()) {
    const dates = uniqueSortedStrings(rows.map(gameIsoDate).filter(Boolean), "asc");
    if (!dates.length) return null;
    if (!dates.includes(state.selected.picksDate)) {
        const today = localDateIso();
        state.selected.picksDate = dates.includes(today) ? today : dates.find(date => date > today) || dates[dates.length - 1];
    }
    return state.selected.picksDate;
}

function movePicksDate(delta) {
    const dates = uniqueSortedStrings(universalPickRows().map(gameIsoDate).filter(Boolean), "asc");
    const current = ensurePicksDate();
    const index = dates.indexOf(current);
    if (index === -1) return current;
    state.selected.picksDate = dates[Math.max(0, Math.min(dates.length - 1, index + delta))];
    persistSettings();
    renderPicks();
    return state.selected.picksDate;
}

function picksSortedRows(rows) {
    const sort = state.selected.picksSort || "confidence";
    return [...rows].sort((a, b) => {
        if (sort === "edge") return safeNumber(getGameEdge(b, b.sport), -Infinity) - safeNumber(getGameEdge(a, a.sport), -Infinity);
        if (sort === "consensus") return (picksConsensus(b).count / Math.max(1, picksConsensus(b).total)) - (picksConsensus(a).count / Math.max(1, picksConsensus(a).total));
        if (sort === "time") return (gameTimestamp(a) ?? Number.MAX_SAFE_INTEGER) - (gameTimestamp(b) ?? Number.MAX_SAFE_INTEGER);
        if (sort === "watchlist") return Number(isWatchedGame(b)) - Number(isWatchedGame(a)) || getConfidenceScore(b, b.sport) - getConfidenceScore(a, a.sport);
        return getConfidenceScore(b, b.sport) - getConfidenceScore(a, a.sport) || safeNumber(getGameEdge(b, b.sport), -Infinity) - safeNumber(getGameEdge(a, a.sport), -Infinity);
    });
}

function filteredPicksRows() {
    const date = ensurePicksDate();
    const selected = state.selected;
    return picksSortedRows(universalPickRows().filter(game => {
        const status = picksLifecycle(game);
        const confidence = getGameConfidence(game, game.sport);
        const model = String(game.model_name || normalizeMeta(game.sport === "MLB" ? state.mlb.payload : state.wnba.payload).model_type || "Unknown");
        if (selected.picksSport !== "all" && game.sport !== selected.picksSport) return false;
        if (date && gameIsoDate(game) !== date) return false;
        if (selected.picksStatus !== "all" && status !== selected.picksStatus) return false;
        if (selected.picksConfidence !== "all" && confidence !== selected.picksConfidence) return false;
        if (selected.picksModel !== "all" && model !== selected.picksModel) return false;
        if (selected.picksWatchlist && !isWatchedGame(game)) return false;
        if (selected.picksDisagree && !picksConsensus(game).disagree) return false;
        return true;
    }));
}

function propPredictionRows() {
    const exports = [state.wnbaPropPredictions, state.mlbPropPredictions].filter(Boolean);
    const exported = exports.flatMap(payload => Array.isArray(payload?.predictions) ? payload.predictions : []);
    const candidates = exports.flatMap(payload => Array.isArray(payload?.candidate_predictions) ? payload.candidate_predictions : []);
    const modelPicks = exports.flatMap(payload => Array.isArray(payload?.model_picks) ? payload.model_picks : []);
    const seen = new Set(exported.map(row => row.prediction_id));
    const candidateIds = new Set(candidates.map(row => row.prediction_id));
    const predictions = [...exported, ...candidates.filter(row => !seen.has(row.prediction_id)), ...modelPicks.filter(row => !seen.has(row.prediction_id) && !candidateIds.has(row.prediction_id))];
    const logged = new Map((state.propLog?.predictions || []).map(row => [row.prediction_id, row]));
    const currentMarkets = Array.isArray(state.playerProps?.markets) ? state.playerProps.markets : [];
    return predictions.map(prediction => {
        const log = logged.get(prediction.prediction_id) || {};
        const market = currentMarkets.find(row => String(row.sport || "").toUpperCase() === String(prediction.sport || "").toUpperCase() && row.provider_event_id === prediction.event_id && row.market_key === prediction.market_key && (row.player_id === prediction.player_id || row.normalized_player_id === prediction.player_id || row.player_name === prediction.player_name));
        return { ...prediction, ...log, current_line: market?.line ?? prediction.current_line ?? prediction.line, current_over_price: market?.over_price ?? prediction.current_over_price ?? prediction.over_price, current_under_price: market?.under_price ?? prediction.current_under_price ?? prediction.under_price, current_odds_snapshot_at: market?.snapshot_at ?? prediction.current_odds_snapshot_at ?? prediction.odds_snapshot_at, availability_status: prediction.availability_status || log.availability_status || market?.availability_status || "unknown", freshness_status: market?.freshness_status || prediction.freshness_status || (state.playerProps?.metadata?.status === "success" ? "Current" : "Bundled snapshot") };
    });
}

function propMarketLabel(value) {
    return String(value || "").replace(/^player_/, "").replaceAll("_", " ").replace(/\b\w/g, letter => letter.toUpperCase());
}

function propStatus(row) {
    return row.result || row.status || "Pending";
}

function propConfidence(row) {
    const probability = safeNumber(row.probability);
    if (probability === null) return "Unavailable";
    if (probability >= 0.65) return "High";
    if (probability >= 0.58) return "Medium";
    return "Low";
}

function propStaleState(row) {
    if (row.model_only_pick) return "Internal threshold / lineup pending";
    if (row.model_only) return "No bookmaker line / lineup pending";
    const availability = String(row.availability_status || "").toLowerCase();
    if (["out", "dnp", "void"].includes(availability)) return availability === "out" ? "Player out" : availability.toUpperCase();
    if (["questionable", "doubtful", "probable"].includes(availability)) return "Availability not confirmed";
    if (["availability_changed", "starter_changed", "lineup_changed", "starting_pitcher_changed", "scratched", "late_out"].includes(availability)) return row.sport === "MLB" ? "Starter or lineup changed" : "Availability changed";
    if (row.candidate_only && ["", "unknown", "not_used", "not_sourced"].includes(availability)) return "Availability pending";
    const original = safeNumber(row.original_line ?? row.line);
    const current = safeNumber(row.current_line ?? row.line);
    if (original !== null && current !== null && Math.abs(current - original) >= Math.max(1, Math.abs(original) * 0.15)) return "Line moved materially";
    if (String(row.freshness_status || "").toLowerCase() !== "current") return "Prediction may be stale";
    return "Prediction current";
}

function propScore(row) {
    const probability = safeNumber(row.probability, 0);
    const edge = Math.abs(safeNumber(row.edge, 0));
    const interval = Math.max(0, safeNumber(row.upper_projection, 0) - safeNumber(row.lower_projection, 0));
    const uncertaintyPenalty = Math.min(0.25, interval / Math.max(1, Math.abs(safeNumber(row.projection, 1)) * 10));
    return probability * 0.55 + Math.min(0.25, edge) * 1.2 - uncertaintyPenalty;
}

function propMatchesQuality(row) {
    const line = safeNumber(row.line);
    const price = safeNumber(row.side === "Over" ? row.over_price : row.under_price);
    const probability = safeNumber(row.probability);
    const edge = safeNumber(row.edge);
    const interval = safeNumber(row.upper_projection) !== null && safeNumber(row.lower_projection) !== null ? safeNumber(row.upper_projection) - safeNumber(row.lower_projection) : null;
    const availability = String(row.availability_status || "").toLowerCase();
    const freshness = String(row.freshness_status || "").toLowerCase();
    const allowedAvailability = String(row.sport || "").toUpperCase() === "MLB" ? ["confirmed_start", "confirmed_lineup", "expected_active", "confirmed_active", "active"] : ["expected_active", "confirmed_active", "active"];
    return line !== null && price !== null && probability !== null && edge !== null && probability >= 0.55 && edge >= 0.03 && (interval === null || interval <= Math.max(12, Math.abs(line) * 0.9)) && allowedAvailability.includes(availability) && freshness === "current";
}

function qualifiedPropRows() {
    const rows = propPredictionRows().filter(propMatchesQuality);
    const perPlayer = new Map();
    const perGame = new Map();
    const selected = [];
    for (const row of rows.sort((a, b) => propScore(b) - propScore(a))) {
        const playerKey = String(row.player_id || row.player_name || "").toLowerCase();
        const gameKeyValue = String(row.event_id || row.game_id || "").toLowerCase();
        if ((perPlayer.get(playerKey) || 0) >= 2 || (perGame.get(gameKeyValue) || 0) >= 3) continue;
        if (selected.some(item => item.player_id === row.player_id && item.market_key === row.market_key && item.line === row.line && item.side !== row.side)) continue;
        perPlayer.set(playerKey, (perPlayer.get(playerKey) || 0) + 1);
        perGame.set(gameKeyValue, (perGame.get(gameKeyValue) || 0) + 1);
        selected.push(row);
        if (selected.length >= 10) break;
    }
    return selected;
}

function renderPlayerMark(row) {
    const initials = String(row.player_name || "Player").split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase();
    const sport = String(row.sport || "MLB").toUpperCase();
    const team = getTeamMeta(sport, row.team, row.team);
    const logo = team.logo_url || "";
    return `<span class="prop-player-mark" style="--prop-team-color:${escapeHtml(team.primary || "#31546b")}" aria-label="${escapeHtml(`${row.player_name || "Player"}, ${team.full_name || row.team || "team"}`)}"><img src="${escapeHtml(logo)}" alt="" aria-hidden="true" loading="lazy" onerror="this.hidden=true;" /><b>${escapeHtml(initials || "P")}</b></span>`;
}

function renderPropCard(row) {
    const status = propStatus(row);
    const candidate = Boolean(row.candidate_only);
    const modelOnly = Boolean(row.model_only);
    const modelOnlyPick = Boolean(row.model_only_pick);
    const sport = String(row.sport || "WNBA").toUpperCase();
    const freshness = propStaleState(row);
    const interval = safeNumber(row.lower_projection) !== null && safeNumber(row.upper_projection) !== null ? `${formatNumber(row.lower_projection, 1)}–${formatNumber(row.upper_projection, 1)}` : "Unavailable";
    const over = safeNumber(row.current_over_price ?? row.over_price);
    const under = safeNumber(row.current_under_price ?? row.under_price);
    const market = modelOnly ? "No bookmaker line" : over !== null || under !== null ? `O ${over === null ? "—" : americanOdds(over)} · U ${under === null ? "—" : americanOdds(under)}` : "No current price";
    const cardLabel = modelOnlyPick ? "Model pick · internal threshold" : modelOnly ? "Model projection" : candidate ? "Model candidate" : propMarketLabel(row.market_key);
    const pickLabel = modelOnlyPick ? "Model pick" : modelOnly ? "Projected stat" : candidate ? "Model lean" : "Pick";
    const pickValue = modelOnlyPick ? `${row.side || "Not exported"} ${formatNumber(row.model_threshold, 1)}` : modelOnly ? `${formatNumber(row.projection, 1)} ${propMarketLabel(row.market_key)}` : `${row.side || "Not exported"}${row.line == null ? "" : ` ${row.line}`}`;
    const cardClass = [candidate ? "prop-card--candidate" : "", modelOnly ? "prop-card--model-only" : ""].filter(Boolean).join(" ");
    const statusLabel = modelOnlyPick ? "Model pick" : modelOnly ? "Model-only" : candidate ? "Availability pending" : status;
    const modelLabel = modelOnlyPick ? `${row.model_id || "Trained model"} · ${row.threshold_label || "Internal threshold"}` : modelOnly ? (row.model_id || "Trained model") : candidate ? (row.candidate_reason || "Review only") : (row.model_id || "Model not exported");
    return `<article class="prop-card ${cardClass}" data-prop-status="${escapeHtml(status.toLowerCase())}">
        <header class="prop-card__header"><div class="prop-card__heading"><span class="sport-pill sport-pill--${escapeHtml(sport.toLowerCase())}">${escapeHtml(sport)}</span><span class="prop-card__market">${escapeHtml(cardLabel)}</span></div><span class="prop-card__time">${escapeHtml(row.game_time || row.game_date || "Time not exported")}</span></header>
        <div class="prop-card__identity">${renderPlayerMark(row)}<div><h3>${escapeHtml(row.player_name || "Player not exported")}</h3><p>${escapeHtml(row.team || "Team not exported")} <span aria-hidden="true">vs</span> ${escapeHtml(row.opponent || "Opponent not exported")}</p></div></div>
        <div class="prop-card__pick"><div><span>${pickLabel}</span><strong>${escapeHtml(pickValue)}</strong></div><div><span>Projection</span><strong>${formatNumber(row.projection, 1)}</strong></div><div><span>Probability</span><strong>${formatProbability(row.probability)}</strong></div><div><span>Model edge</span><strong>${modelOnly ? "—" : formatEdge(row.edge)}</strong></div></div>
        <footer class="prop-card__footer"><div class="prop-card__status"><span>${resultChip(statusLabel)}</span><small>${escapeHtml(modelLabel)} · ${escapeHtml(freshness)}</small></div><div class="prop-card__actions"><button class="btn btn--micro btn--quiet" type="button" data-prop-profile="${escapeHtml(row.player_id || row.player_name || "")}" data-prop-profile-sport="${escapeHtml(sport)}">Profile</button><button class="btn btn--micro btn--primary" type="button" data-prop-open="${escapeHtml(row.prediction_id)}">Open analysis</button></div></footer>
        <div class="prop-card__details" aria-label="Additional market context"><span>${escapeHtml(market)}</span><span>Band ${escapeHtml(interval)}</span></div>
    </article>`;
}

function renderPropFilters(rows) {
    const scopedRows = state.selected.propsSport === "all" ? rows : rows.filter(row => String(row.sport || "").toUpperCase() === state.selected.propsSport);
    const dates = [...new Set(scopedRows.map(row => String(row.game_date || "").slice(0, 10)).filter(Boolean))].sort();
    const date = state.selected.propsDate || dates[0] || localDateIso();
    if (!state.selected.propsDate && dates[0]) state.selected.propsDate = dates[0];
    const games = [...new Set(scopedRows.filter(row => String(row.game_date || "").slice(0, 10) === date).map(row => row.event_id || row.game_id).filter(Boolean))];
    const markets = [...new Set([...scopedRows.map(row => row.market_key), ...((state.playerProps?.markets || []).filter(row => state.selected.propsSport === "all" || String(row.sport || "").toUpperCase() === state.selected.propsSport).map(row => row.market_key))].filter(Boolean))].sort();
    const previousDate = [...dates].reverse().find(value => value < date);
    const nextDate = dates.find(value => value > date);
    return `<section class="props-filters" aria-label="Prop feed controls">
        <div class="props-filter-bar"><div class="props-filter-sport" role="group" aria-label="Sport"><button type="button" data-props-sport="all" class="${state.selected.propsSport === "all" ? "is-active" : ""}">All sports</button><button type="button" data-props-sport="MLB" class="${state.selected.propsSport === "MLB" ? "is-active" : ""}">MLB</button><button type="button" data-props-sport="WNBA" class="${state.selected.propsSport === "WNBA" ? "is-active" : ""}">WNBA</button></div><div class="props-date-nav"><button class="icon-btn" type="button" data-props-shift="-1" aria-label="Previous props date" ${previousDate ? "" : "disabled"}>‹</button><label><span>Date</span><input id="props-date" type="date" value="${escapeHtml(date)}" /></label><button class="icon-btn" type="button" data-props-shift="1" aria-label="Next props date" ${nextDate ? "" : "disabled"}>›</button></div><label class="props-search"><span>Search</span><input id="props-search" type="search" value="${escapeHtml(state.selected.propsSearch || "")}" placeholder="Player name" /></label><label class="props-sort"><span>Sort</span><select id="props-sort"><option value="score" ${state.selected.propsSort === "score" ? "selected" : ""}>Prop score</option><option value="probability" ${state.selected.propsSort === "probability" ? "selected" : ""}>Probability</option><option value="edge" ${state.selected.propsSort === "edge" ? "selected" : ""}>Model edge</option><option value="time" ${state.selected.propsSort === "time" ? "selected" : ""}>Game time</option><option value="freshness" ${state.selected.propsSort === "freshness" ? "selected" : ""}>Freshness</option></select></label></div>
        <details class="props-advanced"><summary>More filters <span>Market, side, confidence, game, and result</span></summary><div class="props-filter-grid"><label>Market<select id="props-market"><option value="all">All markets</option>${markets.map(value => `<option value="${escapeHtml(value)}" ${state.selected.propsMarket === value ? "selected" : ""}>${escapeHtml(propMarketLabel(value))}</option>`).join("")}</select></label><label>Side<select id="props-side"><option value="all">Over / Under</option><option value="Over" ${state.selected.propsSide === "Over" ? "selected" : ""}>Over</option><option value="Under" ${state.selected.propsSide === "Under" ? "selected" : ""}>Under</option></select></label><label>Confidence<select id="props-confidence"><option value="all">All confidence</option>${["High", "Medium", "Low"].map(value => `<option value="${value}" ${state.selected.propsConfidence === value ? "selected" : ""}>${value}</option>`).join("")}</select></label><label>Game<select id="props-game"><option value="all">All games</option>${games.map(value => `<option value="${escapeHtml(value)}" ${state.selected.propsGame === value ? "selected" : ""}>${escapeHtml(value)}</option>`).join("")}</select></label><label>Result<select id="props-status"><option value="all">All states</option>${["Pending", "Won", "Lost", "Push", "Void", "DNP"].map(value => `<option value="${value}" ${state.selected.propsStatus === value ? "selected" : ""}>${value}</option>`).join("")}</select></label></div></details>
    </section>`;
}

function renderPropAnalysis(row) {
    if (!row) return "";
    const band = safeNumber(row.lower_projection) !== null && safeNumber(row.upper_projection) !== null ? `${formatNumber(row.lower_projection, 1)}–${formatNumber(row.upper_projection, 1)}` : "Not exported";
    const originalOdds = safeNumber(row.side === "Over" ? row.over_price : row.under_price);
    const currentOdds = safeNumber(row.side === "Over" ? row.current_over_price ?? row.over_price : row.current_under_price ?? row.under_price);
    const availability = String(row.availability_status || "unknown").toLowerCase() === "unknown" ? "Unknown — official status not exported" : row.availability_status;
    const summaryReady = row.projection !== null && row.line !== null && row.probability !== null;
    const modelOnly = Boolean(row.model_only);
    const modelOnlyPick = Boolean(row.model_only_pick);
    const summary = modelOnlyPick ? `Model pick: ${escapeHtml(row.side || "Not exported")} at the internal ${propMarketLabel(row.market_key).toLowerCase()} threshold of ${formatNumber(row.model_threshold, 1)}.` : modelOnly ? `Real ${propMarketLabel(row.market_key).toLowerCase()} projection: ${formatNumber(row.projection, 1)}.` : summaryReady ? `Projected ${formatNumber(row.projection, 1)} against a line of ${formatNumber(row.line, 1)}.` : "Projection context not exported.";
    const summaryNote = modelOnlyPick ? `${formatProbability(row.probability)} model probability from the retrained regressor and chronological holdout error. No bookmaker line, odds, or market edge is available.` : modelOnly ? "No bookmaker line, odds, lineup confirmation, or player availability state was returned, so this is not a publishable prop." : summaryReady ? `${escapeHtml(row.side || "Not exported")} probability ${formatProbability(row.probability)} with model edge ${formatEdge(row.edge)}.` : "This row is a real candidate, but it is not a publishable prop.";
    return `<section class="panel prop-analysis" data-prop-analysis><header class="section-header"><div><p class="eyebrow">Prop analysis</p><h2>${escapeHtml(row.player_name || "Player")}</h2><p class="muted">${escapeHtml(propMarketLabel(row.market_key))} · ${escapeHtml(row.side || "Not exported")} ${escapeHtml(String(row.line ?? ""))}</p></div><button class="btn btn--micro" type="button" data-prop-close>Close</button></header><div class="prop-analysis__summary"><strong>${summary}</strong><span>${summaryNote}</span></div><div class="prop-analysis__facts"><div><span>Prediction interval</span><strong>${escapeHtml(band)}</strong></div><div><span>Original odds</span><strong>${originalOdds === null ? "Not exported" : escapeHtml(americanOdds(originalOdds))}</strong></div><div><span>Current line</span><strong>${escapeHtml(String(row.current_line ?? row.line ?? "Not exported"))}</strong></div><div><span>Current odds</span><strong>${currentOdds === null ? "Not exported" : escapeHtml(americanOdds(currentOdds))}</strong></div><div><span>Closing line</span><strong>${row.closing_line == null ? "Not captured" : escapeHtml(String(row.closing_line))}</strong></div><div><span>Closing odds</span><strong>${row.closing_price == null ? "Not captured" : escapeHtml(americanOdds(row.closing_price))}</strong></div><div><span>Market consensus</span><strong>${escapeHtml(row.market_consensus || "Not exported")}</strong></div><div><span>Line movement</span><strong>${escapeHtml(row.line_movement || "Not exported")}</strong></div><div><span>Snapshot time</span><strong>${escapeHtml(row.current_odds_snapshot_at || row.odds_snapshot_at || "Not exported")}</strong></div><div><span>Model</span><strong>${escapeHtml(row.model_id || "Not exported")}</strong></div><div><span>Availability</span><strong>${escapeHtml(availability)}</strong></div></div><div class="prop-analysis__sections"><section><h3>Recent game log</h3><p class="muted">${escapeHtml(row.recent_game_log || "Not included in the bundled player export")}</p></section><section><h3>Supporting factors</h3><p class="muted">${escapeHtml(row.supporting_factors || "Not exported by the current prop model")}</p></section><section><h3>Opposing factors</h3><p class="muted">${escapeHtml(row.opposing_factors || "Not exported by the current prop model")}</p></section></div></section>`;
}

function renderPlayerProfile(playerId, sport) {
    const rows = propPredictionRows().filter(row => String(row.sport || "").toUpperCase() === String(sport || "").toUpperCase() && String(row.player_id || row.player_name || "").toLowerCase() === String(playerId || "").toLowerCase());
    const row = rows[0];
    if (!row) return "";
    const history = (state.propLog?.predictions || []).filter(item => String(item.sport || "").toUpperCase() === String(sport || "").toUpperCase() && String(item.player_id || item.player_name || "").toLowerCase() === String(playerId || "").toLowerCase());
    const results = history.filter(item => ["Won", "Lost", "Push", "DNP", "Void"].includes(item.result));
    const marketRows = (state.playerProps?.markets || []).filter(item => String(item.sport || "").toUpperCase() === String(sport || "").toUpperCase() && String(item.player_name || "").toLowerCase() === String(row.player_name || "").toLowerCase());
    return `<section class="panel prop-analysis prop-profile"><header class="section-header"><div><p class="eyebrow">Player profile</p><h2>${escapeHtml(row.player_name || "Player")}</h2><p class="muted">${escapeHtml(sport)} · ${escapeHtml(row.team || "Team not exported")} vs ${escapeHtml(row.opponent || "Opponent not exported")}</p></div><button class="btn btn--micro" type="button" data-prop-profile-close>Close</button></header><div class="prop-analysis__facts"><div><span>Published prop history</span><strong>${results.length || "No scored rows"}</strong></div><div><span>Current market rows</span><strong>${marketRows.length || "None matched"}</strong></div><div><span>Availability</span><strong>${escapeHtml(propStaleState(row))}</strong></div><div><span>Feature export</span><strong>${row.recent_game_log ? "Available" : "Not bundled"}</strong></div></div><div class="prop-analysis__sections"><section><h3>Current markets</h3><p class="muted">${escapeHtml(marketRows.length ? marketRows.map(item => `${propMarketLabel(item.market_key)} ${item.line ?? "—"}`).join(" · ") : "No additional real player market rows matched this player.")}</p></section><section><h3>Scored results</h3><p class="muted">${escapeHtml(results.length ? results.map(item => `${item.result} ${item.market_key || "prop"}`).join(" · ") : "No scored LineLens prop result is available.")}</p></section><section><h3>Data boundary</h3><p class="muted">${escapeHtml(row.recent_game_log || "The bundled export does not include a separate player-profile season table. No trend or availability values are inferred here.")}</p></section></div></section>`;
}

function sortPropRows(rows) {
    const score = row => propScore(row);
    const value = row => state.selected.propsSort === "probability" ? safeNumber(row.probability, -1) : state.selected.propsSort === "edge" ? safeNumber(row.edge, -1) : state.selected.propsSort === "time" ? String(row.game_time || row.game_date || "") : state.selected.propsSort === "freshness" ? (String(row.freshness_status || "").toLowerCase() === "current" ? 1 : 0) : score(row);
    return [...rows].sort((a, b) => {
        const av = value(a); const bv = value(b);
        if (typeof av === "string") return av.localeCompare(bv);
        return bv - av;
    });
}

function renderPropFunnel(rows) {
    const diagnostics = state.propsDiagnostics?.sports || {};
    const sportRows = state.selected.propsSport === "all" ? rows : rows.filter(row => String(row.sport || "").toUpperCase() === state.selected.propsSport);
    const sources = state.selected.propsSport === "all" ? Object.values(diagnostics) : [diagnostics[state.selected.propsSport] || {}];
    const received = sources.reduce((sum, item) => sum + safeNumber(item.events_received, 0), 0);
    const matched = sources.reduce((sum, item) => sum + safeNumber(item.events_matched, 0), 0);
    const marketRows = sources.reduce((sum, item) => sum + safeNumber(item.markets_normalized ?? item.market_rows_available, 0), 0);
    const projected = sportRows.filter(row => row.projection !== null && row.projection !== undefined).length;
    const published = sportRows.filter(row => !row.candidate_only && propStatus(row) !== "Pending").length;
    const reasons = Object.entries((state.selected.propsSport === "all" ? Object.values(diagnostics).reduce((out, item) => ({ ...out, ...(item.rejection_reason_totals || {}) }), {}) : diagnostics[state.selected.propsSport]?.rejection_reason_totals || {})).map(([reason, count]) => `${reason.replaceAll("_", " ")}: ${count}`).join(" · ");
    return `<section class="props-summary" aria-label="Props data summary"><div class="props-summary__stats"><div><span>Events matched</span><strong>${matched || "—"}</strong></div><div><span>Market rows</span><strong>${marketRows || "—"}</strong></div><div><span>Projections</span><strong>${projected || "—"}</strong></div><div><span>Published</span><strong>${published || "0"}</strong></div></div><p class="props-summary__note">${escapeHtml(reasons || (sportRows.length ? `${sportRows.length} real rows available for review.` : "No real projection rows are available for this filter."))}</p></section>`;
}

function renderPropHealth() {
    const models = [["WNBA", state.wnbaPropModelHealth], ["MLB", state.mlbPropModelHealth]];
    return `<section class="prop-health"><header class="section-header"><div><p class="eyebrow">Model status</p><h2>Prop model health</h2></div><div class="report-actions"><button class="btn btn--small" data-refresh-command="wnba_availability">Refresh availability</button><button class="btn btn--small btn--primary" data-refresh-command="player_props_pipeline">Build props</button></div></header><div class="prop-health__rows">${models.map(([sport, payload]) => { const meta = payload?.metadata || {}; const markets = payload?.markets || []; return `<article><div class="prop-health__title"><strong>${sport}</strong><span>${escapeHtml(meta.status || "Not trained")}</span></div><p>${escapeHtml(meta.reason || (sport === "MLB" ? "MLB player-game inputs and research artifacts are required for model health." : "Health metrics appear after real player rows, chronological evaluation, and scored predictions."))}</p><small>${markets.length ? markets.map(market => `${escapeHtml(market.market || "market")}: ${escapeHtml(market.status || "not evaluated")}`).join(" · ") : "No market-level evaluation exported"}</small></article>`; }).join("")}</div></section>`;
}

function renderProps() {
    const allRows = propPredictionRows();
    const marketRows = Array.isArray(state.playerProps?.markets) ? state.playerProps.markets : [];
    const mlbMarketCount = marketRows.filter(row => String(row.sport || "").toUpperCase() === "MLB").length;
    const scopedAllRows = state.selected.propsSport === "all" ? allRows : allRows.filter(row => String(row.sport || "").toUpperCase() === state.selected.propsSport);
    const dates = [...new Set(scopedAllRows.map(row => String(row.game_date || "").slice(0, 10)).filter(Boolean))].sort();
    const today = localDateIso();
    const actionableDates = [...new Set(scopedAllRows.filter(row => !row.candidate_only || row.model_only_pick).map(row => String(row.game_date || "").slice(0, 10)).filter(Boolean))].sort();
    const savedDateHasActionableRows = state.selected.propsDateManual || (dates.includes(state.selected.propsDate) && actionableDates.includes(state.selected.propsDate));
    const nextActionableDate = actionableDates.find(value => value > today);
    const fallbackDate = actionableDates.includes(today) ? today : nextActionableDate || actionableDates[actionableDates.length - 1] || (dates.includes(today) ? today : dates.find(value => value > today) || dates[dates.length - 1] || today);
    const date = savedDateHasActionableRows ? state.selected.propsDate : fallbackDate;
    if (state.selected.propsDate !== date) {
        state.selected.propsDate = date;
        persistSettings();
    }
    const matchesFilters = row => String(row.game_date || "").slice(0, 10) === date && (state.selected.propsSport === "all" || String(row.sport || "").toUpperCase() === state.selected.propsSport) && (state.selected.propsMarket === "all" || row.market_key === state.selected.propsMarket) && (state.selected.propsSide === "all" || row.side === state.selected.propsSide) && (state.selected.propsConfidence === "all" || propConfidence(row) === state.selected.propsConfidence) && (state.selected.propsStatus === "all" || propStatus(row) === state.selected.propsStatus) && (state.selected.propsGame === "all" || String(row.event_id || row.game_id) === state.selected.propsGame) && (!state.selected.propsSearch || String(row.player_name || "").toLowerCase().includes(state.selected.propsSearch.toLowerCase()));
    const rows = sortPropRows(qualifiedPropRows().filter(matchesFilters));
    const candidates = sortPropRows(allRows.filter(row => row.candidate_only && !row.model_only).filter(matchesFilters)).slice(0, 10);
    const modelPicks = sortPropRows(allRows.filter(row => row.model_only_pick).filter(matchesFilters)).slice(0, 10);
    const modelOnly = sortPropRows(allRows.filter(row => row.model_only && !row.model_only_pick).filter(matchesFilters)).slice(0, 10);
    const best = rows.slice(0, 10);
    const visibleCount = best.length || candidates.length || modelPicks.length || modelOnly.length;
    const heroTitle = best.length ? "Top qualified props" : candidates.length ? "Model candidates" : modelPicks.length ? "MLB model picks" : modelOnly.length ? "MLB model projections" : "No qualified props";
    const heroText = best.length ? "Published only after real lines, odds, model output, freshness, and player availability pass the quality gate." : candidates.length ? "Real projections and current market prices are shown for review. They are not publishable picks until sport-specific availability or lineup states are verified." : modelPicks.length ? "Real upcoming MLB games and retrained player models are producing internal-threshold picks. They are separate from bookmaker-backed props until a market line is returned." : modelOnly.length ? "Real upcoming MLB games and trained player models are available. Bookmaker lines, odds, probabilities, and availability remain unreturned." : "No real current prop projections are available for the selected date.";
    const statusText = best.length ? `${best.length === 1 ? "prop" : "props"} met publication criteria` : candidates.length ? "candidates awaiting verification" : modelPicks.length ? "model picks available" : modelOnly.length ? "model-only projections available" : "rows available";
    const monitorText = mlbMarketCount ? `${mlbMarketCount} real player-market rows loaded; MLB projections remain research-only until a real player-stat model and lineup/starter inputs are available.` : modelPicks.length ? `No current MLB player markets were returned. Showing ${modelPicks.length} model-backed internal-threshold picks and ${modelOnly.length} supporting projections; bookmaker odds and market edge remain unavailable.` : modelOnly.length ? `No current MLB player markets were returned. Showing ${modelOnly.length} real model-only MLB projections; bookmaker line, odds, probability, and availability remain unavailable.` : "No selected MLB player markets were returned for the current MLB event.";
    const drawer = state.selected.propPlayer ? renderPlayerProfile(state.selected.propPlayer.id, state.selected.propPlayer.sport) : state.selected.propId ? renderPropAnalysis(propPredictionRows().find(row => row.prediction_id === state.selected.propId)) : "";
    $("#view-props").innerHTML = `<section class="props-shell"><header class="props-header"><div><p class="eyebrow">Player props · ${escapeHtml(formatDate(date))}</p><h2>${heroTitle}</h2><p class="muted">${heroText}</p></div><div class="props-header__status"><strong>${visibleCount}</strong><span>${statusText}</span><small>Data updates stay tied to real exports.</small></div></header><p class="data-status props-monitor" data-variant="${mlbMarketCount ? "info" : modelPicks.length || modelOnly.length ? "warning" : "warning"}"><strong>Market status</strong><span>${monitorText}</span></p>${renderPropFilters(allRows)}${renderPropFunnel(allRows)}<section class="props-feed"><header class="section-header"><div><p class="eyebrow">Review queue</p><h2>${best.length ? "Published props" : candidates.length ? "Candidates awaiting verification" : "No qualified props"}</h2></div><span class="muted">${best.length ? "Quality-gated rows" : "No rows are promoted without the required data"}</span></header>${best.length ? `<div class="props-grid">${best.map(renderPropCard).join("")}</div>` : candidates.length ? `<p class="data-status" data-variant="warning">Real lines and model outputs are available, but availability is not confirmed. These rows remain review-only.</p><div class="props-grid">${candidates.map(renderPropCard).join("")}</div>` : emptyState("No qualified props", "A prop requires a matched current line, real odds, active-player status, sufficient data, a trained model, and a fresh snapshot.")}</section>${modelPicks.length ? `<section class="props-feed props-feed--model-only"><header class="section-header"><div><p class="eyebrow">MLB model lane</p><h2>Internal-threshold picks</h2></div><span class="muted">No bookmaker line</span></header><p class="data-status" data-variant="info">Deterministic model picks against internal baseball thresholds. They are separate from sportsbook props and have no market edge.</p><div class="props-grid">${modelPicks.map(renderPropCard).join("")}</div></section>` : ""}${modelOnly.length ? `<section class="props-feed props-feed--model-only"><header class="section-header"><div><p class="eyebrow">MLB model lane</p><h2>Projection-only rows</h2></div><span class="muted">No bookmaker line</span></header><p class="data-status" data-variant="info">Real schedule and trained player-game models are available while market, lineup, and availability inputs remain pending.</p><div class="props-grid">${modelOnly.map(renderPropCard).join("")}</div></section>` : ""}${renderPropHealth()}${drawer}</section>`;
}

function renderPicksFilters(rows) {
    const models = uniqueSortedStrings(rows.map(game => game.model_name).filter(Boolean), "asc");
    const date = ensurePicksDate(rows);
    return `<section class="panel picks-filters"><div class="picks-filter-group"><span class="eyebrow">Sport</span><div class="segmented-control">${[["all", "All Sports"], ["MLB", "MLB"], ["WNBA", "WNBA"]].map(([value, label]) => `<button type="button" data-picks-sport="${value}" class="${state.selected.picksSport === value ? "is-active" : ""}">${label}</button>`).join("")}</div></div><label><span>Date</span><input id="picks-date-picker" type="date" value="${escapeHtml(date || "")}" /></label><div class="picks-date-nav"><button class="icon-btn" type="button" data-picks-shift="-1" aria-label="Previous picks date">‹</button><strong>${escapeHtml(date ? formatDate(date) : "No dates")}</strong><button class="icon-btn" type="button" data-picks-shift="1" aria-label="Next picks date">›</button></div><label><span>Status</span><select id="picks-status-filter"><option value="all">All states</option><option value="upcoming" ${state.selected.picksStatus === "upcoming" ? "selected" : ""}>Upcoming</option><option value="live" ${state.selected.picksStatus === "live" ? "selected" : ""}>Live</option><option value="final" ${state.selected.picksStatus === "final" ? "selected" : ""}>Final</option></select></label><label><span>Confidence</span><select id="picks-confidence-filter"><option value="all">All confidence</option>${["High", "Medium", "Low"].map(value => `<option value="${value}" ${state.selected.picksConfidence === value ? "selected" : ""}>${value}</option>`).join("")}</select></label><label><span>Model</span><select id="picks-model-filter"><option value="all">All models</option>${models.map(value => `<option value="${escapeHtml(value)}" ${state.selected.picksModel === value ? "selected" : ""}>${escapeHtml(modelIdentity(value).legend)}</option>`).join("")}</select></label><label><span>Sort</span><select id="picks-sort-select">${[["confidence", "Strongest confidence"], ["edge", "Model edge"], ["consensus", "Consensus"], ["time", "Game time"], ["watchlist", "Watchlist priority"]].map(([value, label]) => `<option value="${value}" ${state.selected.picksSort === value ? "selected" : ""}>${label}</option>`).join("")}</select></label><label class="picks-check"><input id="picks-watchlist-filter" type="checkbox" ${state.selected.picksWatchlist ? "checked" : ""} /><span>Watchlist only</span></label><label class="picks-check"><input id="picks-disagreement-filter" type="checkbox" ${state.selected.picksDisagree ? "checked" : ""} /><span>Models disagree</span></label></section>`;
}

function renderPickCard(game) {
    const sport = game.sport;
    const consensus = picksConsensus(game);
    const status = picksLifecycle(game);
    const pick = getGamePick(game, sport);
    const probability = getGameProbability(game, sport);
    const pickProbability = pick === game.home ? probability : 1 - probability;
    const modelSeparation = getGameEdge(game, sport);
    const marketEdge = safeNumber(lineMovementSummary(game, sport).marketEdge);
    return `<article class="universal-pick-card" data-variant="${status}"><header><span class="sport-pill sport-pill--${sport.toLowerCase()}">${sport}</span><span class="lifecycle-status lifecycle-status--${status}">${status}</span><span class="universal-pick-card__time">${escapeHtml(getGameTimeLabel(game))}</span></header><div class="universal-pick-card__teams"><div>${renderTeamLogo(sport, game.away, "lg", game.away_display)}<strong>${escapeHtml(game.away_display || game.away)}</strong></div><span>@</span><div>${renderTeamLogo(sport, game.home, "lg", game.home_display)}<strong>${escapeHtml(game.home_display || game.home)}</strong></div></div><div class="universal-pick-card__signal"><span>Production pick</span><strong>${escapeHtml(pick)}</strong><b>${formatProbability(pickProbability)}</b></div><div class="universal-pick-card__meta"><span><small>Model</small><strong>${escapeHtml(modelIdentity(game.model_name || "").legend || game.model_name || "Model")}</strong></span><span><small>Market edge</small><strong>${marketEdge === null ? "Unavailable" : formatEdge(marketEdge)}</strong></span><span><small>Consensus</small><strong>${escapeHtml(consensus.label)}</strong></span></div><footer><span>${resultChip(accountabilityLabel(game))}</span><div class="report-actions"><span class="chip chip--soft">${formatEdge(modelSeparation)} model separation</span>${renderWatchButton(game, "Watch pick")}<button class="btn btn--micro" type="button" data-picks-open="${escapeHtml(gameKey(game))}" data-picks-sport="${sport}">Open Analysis</button></div></footer></article>`;
}

function picksBriefText(rows) {
    const today = localDateIso();
    const todayRows = universalPickRows().filter(row => gameIsoDate(row) === today);
    const best = picksSortedRows(todayRows)[0];
    const consensus = best ? picksConsensus(best).label : "No consensus available";
    const yesterday = dateOffsetIso(-1);
    const yesterdayRows = getLogEntries().filter(row => ["MLB", "WNBA"].includes(row.sport) && String(row.game_date || "").slice(0, 10) === yesterday);
    const record = summarizeRecordRows(yesterdayRows);
    const pending = getLogEntries().filter(row => ["MLB", "WNBA"].includes(row.sport) && String(row.model_result || row.result_status || "").toLowerCase() === "pending").length;
    const notes = ["MLB", "WNBA"].map(sport => `${sport}: ${refreshSportStatus(sport).used_cache ? "cached real export" : "fresh export"}`).join("; ");
    return ["LineLens Daily Model Brief", `Date: ${today}`, `MLB picks: ${todayRows.filter(row => row.sport === "MLB").length}`, `WNBA picks: ${todayRows.filter(row => row.sport === "WNBA").length}`, `Best real pick: ${best ? `${getGamePick(best, best.sport)} in ${best.away} @ ${best.home} (${formatProbability(getConfidenceScore(best, best.sport))})` : "No current prediction"}`, `Strongest consensus: ${consensus}`, `Yesterday's record: ${record.wins}-${record.losses}${record.pushes ? `-${record.pushes}` : ""}`, `Pending predictions: ${pending}`, `Production models: MLB ${selectedModelEntry("MLB")?.model_name || "not selected"}; WNBA ${selectedModelEntry("WNBA")?.model_name || "not selected"}`, `Data notes: ${notes}`].join("\n");
}

function copyPicksBrief() {
    navigator.clipboard?.writeText(picksBriefText());
    showToast("Daily Model Brief copied");
}

function renderPicks() {
    const allRows = universalPickRows();
    const rows = filteredPicksRows();
    const date = ensurePicksDate(allRows);
    const best = picksSortedRows(allRows.filter(game => gameIsoDate(game) === date)).slice(0, 3);
    const todayCount = allRows.filter(game => gameIsoDate(game) === localDateIso()).length;
    $("#view-picks").innerHTML = `<section class="picks-shell"><section class="panel picks-hero"><div><p class="eyebrow">Multi-sport model intelligence</p><h2>Universal Picks Hub</h2><p class="muted">One daily feed for real MLB and WNBA model predictions. No prediction is shown unless the bundled export contains it.</p></div><div class="report-actions"><button class="btn btn--primary" type="button" data-copy-picks-brief>Copy Daily Brief</button><span class="chip chip--soft">${todayCount} today</span></div></section><section class="panel picks-best"><header class="section-header"><div><p class="eyebrow">Today's Best Picks</p><h2>Highest-conviction real signals</h2></div><span class="muted">${escapeHtml(date ? formatDate(date) : "No date loaded")}</span></header><div class="picks-best-grid">${best.length ? best.map(renderPickCard).join("") : emptyState("No current predictions", "Refresh MLB or WNBA exports to populate this section.")}</div></section>${renderPicksFilters(allRows)}<section class="picks-results"><header class="section-header"><div><p class="eyebrow">Prediction feed</p><h2>${rows.length} picks in view</h2></div><span class="muted">Live and final states join when available</span></header><div class="universal-picks-grid">${rows.length ? rows.map(renderPickCard).join("") : emptyState("No picks match these filters", "Try another date, sport, confidence, or model filter.")}</div></section></section>`;
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
                    <h2>Today’s model pulse</h2>
                <p class="muted">A concise view of the strongest available pick, current game state, and model record across MLB, WNBA, and NFL exports.</p>
                    ${renderQuickActionsV2()}
                    <div class="home-identity-pulse"><span class="lifecycle-status lifecycle-status--live">${lifecycleBoardGames().filter(game => lifecycleStage(game) === "live").length} live</span><span>${lifecycleBoardGames().length} MLB lifecycle rows</span><span>${escapeHtml(selectedModelEntry("MLB")?.model_name || "No production model")}</span></div>
                </div>
                ${renderBestPickMini(best)}
            </section>
            <section class="metric-strip-v2">
                ${homeMetricCard("NFL", "NFL Games", String(state.nfl.games.length), "loaded rows", "blue")}
                ${homeMetricCard("MLB", "MLB Games", String(state.mlb.games.length), "loaded rows", "purple")}
                ${homeMetricCard("WNBA", "WNBA Games", String(state.wnba.games.length), "model rows", "orange")}
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
    const wnbaStatus = refresh.WNBA?.status || (state.wnba.games.length ? "model_generated" : "pending");
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
                ${renderAutomationStep("Refreshing WNBA model line", wnbaStatus, refresh.WNBA?.message || "Retrains when historical inputs are newer than the model artifact, then refreshes today’s board.")}
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
    const wnba = refreshSportStatus("WNBA");
    const liveMeta = normalizeMeta(state.live.payload);
    const liveStatus = state.live.games.length ? (liveMeta.refresh_mode || liveMeta.source_status || "cached") : "missing";
    const recordStatus = state.modelRecord ? "ready" : "missing";
    return `
        <section class="refresh-health-strip" aria-label="Data freshness">
            ${healthChip("MLB", mlb.status || dataMode(state.mlb.payload, state.mlb.games), state.mlb.games.length ? `${state.mlb.games.length} games` : "no rows")}
            ${healthChip("NFL", nfl.status || dataMode(state.nfl.payload, state.nfl.games), state.nfl.games.length ? `${state.nfl.games.length} rows` : "no rows")}
            ${healthChip("WNBA", wnba.status || dataMode(state.wnba.payload, state.wnba.games), state.wnba.games.length ? `${state.wnba.games.length} rows` : "scoreboard/model pending")}
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
    const wnba = refreshSportStatus("WNBA");
    const disabled = state.refreshRuntime.available ? "" : "";
    const commandButtons = context === "settings"
        ? [
            ["startup_auto", "Run Startup Automation Again", "btn--primary"],
            ["bootstrap_env", "Bootstrap Python Environment", ""],
            ["data_real", "Refresh All Real Data", ""],
            ["nfl_real", "Refresh NFL Real Data", ""],
            ["mlb_current", "Refresh MLB Current", ""],
            ["mlb_all", "Run MLB Full Train", ""],
            ["wnba_current", "Refresh WNBA Current", ""],
            ["wnba_all", "Run WNBA Full Train", ""],
            ["odds_snapshots", "Refresh Odds", ""],
            ["score_models", "Score Model Record", ""],
            ["check_data", "Check Data Status", ""],
        ]
        : [
            ["startup_auto", "Run Startup Automation Again", "btn--primary"],
            ["bootstrap_env", "Bootstrap Python Environment", ""],
            ["mlb_current", "Refresh MLB Current", ""],
            ["mlb_all", "Run MLB Full Train", ""],
            ["wnba_current", "Refresh WNBA Current", ""],
            ["wnba_all", "Run WNBA Full Train", ""],
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
                ${card("WNBA refresh", wnba.status, wnba.used_cache ? "using cache" : "scoreboard/model")}
                ${card("Refresh bridge", state.refreshRuntime.available ? "Desktop" : "Local app", state.refreshRuntime.available ? "Tauri command" : "npm run app")}
            </div>
            <div class="refresh-log">
                <div><strong>NFL</strong><span>${escapeHtml(nfl.message)}</span></div>
                <div><strong>MLB</strong><span>${escapeHtml(mlb.message)}</span></div>
                <div><strong>WNBA</strong><span>${escapeHtml(wnba.message)}</span></div>
            </div>
            ${state.refreshRuntime.available ? "" : `<p class="data-status" data-variant="warning">Browser mode can refresh through the local bridge when started with <code>npm run app</code>. Static hosting only reloads cached exports. Manual examples: <code>${escapeHtml(REFRESH_COMMANDS.nfl_real.manual)}</code> or <code>${escapeHtml(REFRESH_COMMANDS.mlb_current.manual)}</code>.</p>`}
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
                <p>Spread review for every loaded NFL matchup.</p>
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
    derivedCache.mlbBoardGames = mlbBoardRowsForDate(selectedDate);
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
    const primary = /^#[0-9a-f]{6}$/i.test(String(meta?.primary || "")) ? meta.primary : null;
    const secondary = /^#[0-9a-f]{6}$/i.test(String(meta?.secondary || "")) ? meta.secondary : null;
    if (!primary && !secondary) {
        derivedCache.teamGradientColors.set(key, "#2e86ab");
        return "#2e86ab";
    }
    // The primary team color is the identity anchor. Choosing the brightest
    // secondary color made Toronto read red, Detroit read orange, etc.
    const color = primary || secondary;
    derivedCache.teamGradientColors.set(key, color);
    return color;
}

function modelNameForGame(game) {
    const raw = game?.model_name
        || game?.model?.model_name
        || latestLogForGame(game)?.model_name
        || selectedModelEntry("MLB")?.model_name
        || normalizeMeta(state.mlb.payload).model_type
        || "MLB model";
    return String(raw);
}

function modelPickLabel(game) {
    const raw = modelNameForGame(game);
    return `${modelIdentity(raw).legend} pick`;
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

function modelConsensusForGame(game) {
    const rawRows = Array.isArray(game?.model_consensus)
        ? game.model_consensus
        : Array.isArray(game?.model_components)
            ? game.model_components
            : [];
    const rows = rawRows.map(row => {
        const modelName = row.model_name || row.model || "Model";
        const homeProbability = safeNumber(row.home_probability ?? row.home_win_probability);
        const pick = row.pick || (homeProbability === null ? null : homeProbability >= 0.5 ? game.home : game.away);
        return { modelName, legend: modelIdentity(modelName).legend, homeProbability, pick };
    }).filter(row => row.pick && row.homeProbability !== null);
    if (!rows.length) return null;
    const votes = rows.reduce((counts, row) => {
        counts[row.pick] = (counts[row.pick] || 0) + 1;
        return counts;
    }, {});
    const productionPick = getGamePick(game, "MLB");
    const consensusPick = Object.entries(votes).sort((a, b) => b[1] - a[1] || (a[0] === productionPick ? -1 : 1))[0]?.[0] || productionPick;
    return {
        rows,
        votes,
        consensusPick,
        consensusCount: votes[consensusPick] || 0,
        total: rows.length,
        productionPick,
    };
}

function renderModelConsensus(game) {
    const consensus = modelConsensusForGame(game);
    if (!consensus) {
        const predictionReady = getGameProbability(game, "MLB") !== null && getGamePick(game, "MLB") !== "-";
        return `<div class="mlb-game-card__consensus mlb-game-card__consensus--pending"><header><span>Model consensus</span><small>${predictionReady ? "Production export" : "Schedule only"}</small></header><strong>${predictionReady ? escapeHtml(getGamePick(game, "MLB")) : "Prediction pending"}</strong><small>${predictionReady ? "Multi-model vote is not available for this row." : "Waiting for required game inputs, including probable pitchers when available."}</small></div>`;
    }
    return `<div class="mlb-game-card__consensus"><header><span>Model consensus</span><strong>${escapeHtml(consensus.consensusPick)} ${consensus.consensusCount}–${consensus.total - consensus.consensusCount}</strong></header><div class="mlb-game-card__consensus-grid">${consensus.rows.map(row => `<span><b>${escapeHtml(row.legend)}</b><em>${escapeHtml(row.pick)} ${formatProbability(row.pick === game.home ? row.homeProbability : 1 - row.homeProbability)}</em></span>`).join("")}</div><footer><span>${escapeHtml(modelPickLabel(game))}: <strong>${escapeHtml(consensus.productionPick)}</strong></span><span>${consensus.consensusCount} of ${consensus.total} agree</span></footer></div>`;
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
    const pick = getGamePick(game, "MLB");
    const predictionReady = getGameProbability(game, "MLB") !== null && pick !== "-";
    const result = modelResultLabel(game);
    const cardResult = result === "Won" ? "MODEL WON" : result === "Lost" ? "MODEL LOST" : result.toUpperCase();
    const modelWon = result === "Won";
    const modelLost = result === "Lost";
    const pickMeta = getTeamMeta("MLB", pick, pick);
    const homeMeta = getTeamMeta("MLB", game.home, game.home_display);
    const awayMeta = getTeamMeta("MLB", game.away, game.away_display);
    const statusLabel = stage === "pregame" ? "UPCOMING" : lifecycleStageLabel(stage).toUpperCase();
    const dateLabel = stage === "pregame" ? `${gameIsoDate(game) === localDateIso() ? "TODAY" : formatDateOnly(gameIsoDate(game), { month: "short", day: "numeric" }).toUpperCase()} · ${getGameTimeLabel(game)}` : stage === "stale" ? "PAST · VERIFY SOURCE" : gameStatusLine(game, live);
    const marketRead = !market.movement.available ? "" : `<div class="mlb-game-card__market"><span>Market ${market.marketProbability === null ? "Linked" : formatProbability(market.marketProbability)}</span>${market.edge === null ? "" : `<strong>Edge ${formatEdge(market.edge)}</strong>`}</div>`;
    const latestPlay = stage === "live" && live?.latest_play ? `<small class="mlb-game-card__play">${escapeHtml(live.latest_play)}</small>` : "";
    return `<article class="mlb-game-card mlb-game-card--${stage} ${modelWon ? "is-model-won" : ""} ${modelLost ? "is-model-lost" : ""} ${selected ? "is-selected" : ""} ${isWatchedGame(game) ? "is-watched" : ""}" style="--away-color:${escapeHtml(teamGradientColor(awayMeta))};--home-color:${escapeHtml(teamGradientColor(homeMeta))};--pick-color:${escapeHtml(teamGradientColor(pickMeta))}" data-lifecycle-game="MLB" data-game-id="${escapeHtml(gameKey(game))}">
        <header class="mlb-game-card__header"><span class="mlb-game-card__status">${statusLabel}</span><span class="mlb-game-card__time">${escapeHtml(dateLabel)}</span>${renderWatchButton(game, "Watch matchup")}</header>
        <div class="mlb-game-card__matchup">
            <div class="mlb-game-card__team">${renderTeamLogo("MLB", awayMeta.abbreviation, "lg", awayMeta.full_name)}<strong>${escapeHtml(awayMeta.abbreviation)}</strong></div>
            <div class="mlb-game-card__at">${score ? `<b>${escapeHtml(score)}</b>` : "VS"}<small>${stage === "live" ? "LIVE SCORE" : stage === "final" ? "FINAL" : "FIRST PITCH"}</small></div>
            <div class="mlb-game-card__team mlb-game-card__team--home">${renderTeamLogo("MLB", homeMeta.abbreviation, "lg", homeMeta.full_name)}<strong>${escapeHtml(homeMeta.abbreviation)}</strong></div>
        </div>
        <div class="mlb-game-card__signal"><span>${escapeHtml(predictionReady ? modelPickLabel(game) : "Prediction status")}</span><strong class="mlb-game-card__signal-pick">${escapeHtml(predictionReady ? pick : "Pending")}</strong><b>${predictionReady ? formatProbability(market.pickProbability) : "Awaiting inputs"}</b></div>
        ${renderMlbOdds(game)}
        ${renderModelConsensus(game)}
        ${marketRead}${latestPlay}
        <footer class="mlb-game-card__footer"><span>${resultChip(cardResult)}</span><button class="btn btn--micro" type="button" data-open-gamecast="MLB" data-game-id="${escapeHtml(gameKey(game))}">${stage === "live" ? "Open GameCast" : "View Matchup"}</button></footer>
    </article>`;
}

function renderLifecycleMatchup(game) {
    if (!game) return `<section id="mlb-matchup-workspace" class="panel lifecycle-matchup lifecycle-matchup--empty">${emptyState("Select a game to inspect the lifecycle", "Open a matchup from the board to see model, market, live, and final accountability in one place.")}</section>`;
    const market = lifecycleMarketRead(game);
    const timeline = lifecycleTimeline(game);
    return `<section id="mlb-matchup-workspace" class="panel lifecycle-matchup"><header class="section-header"><div><p class="eyebrow">Matchup workspace</p><h2>${escapeHtml(game.away)} @ ${escapeHtml(game.home)}</h2><p class="muted">${escapeHtml(lifecycleStageLabel(lifecycleStage(game)))} · ${escapeHtml(game.model_name || "Production model")}</p></div>${renderWatchButton(game, "Watch matchup")}</header><div class="lifecycle-matchup__readout"><div><span>Model pick</span><strong>${escapeHtml(getGamePick(game, "MLB"))}</strong><small>${formatProbability(market.pickProbability)} picked probability</small></div><div><span>Market</span><strong>${market.marketProbability === null ? "Unavailable" : formatProbability(market.marketProbability)}</strong><small>${market.edge === null ? "No joined odds" : `${formatEdge(market.edge)} model edge`}</small></div><div><span>Result</span><strong>${escapeHtml(modelResultLabel(game))}</strong><small>${escapeHtml(finalScoreLabel(liveGameFor(game) || game) || "Pending final")}</small></div></div><ol class="lifecycle-timeline">${timeline.map(item => `<li class="${item.done ? "is-done" : ""}"><i></i><div><strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(item.value)}</span></div></li>`).join("")}</ol>${renderMatchupDetail("MLB", game)}</section>`;
}

function scrollToMlbMatchup() {
    const focus = () => {
        const target = $("#mlb-matchup-workspace");
        if (!target) return;
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        target.classList.remove("is-focus-pulse");
        void target.offsetWidth;
        target.classList.add("is-focus-pulse");
    };
    if (typeof window.requestAnimationFrame === "function") window.requestAnimationFrame(focus);
    else window.setTimeout(focus, 0);
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
    const dateCalendar = renderGameDateCalendar({ sport: "MLB", dates: mlbBoardDates(), selected: selectedDate, games: mlbBoardDateRows(), label: "MLB game dates" });
    return `<section class="lifecycle-shell mlb-lifecycle-shell" style="--scoreboard-accent:#5cc8ff">
        <section class="panel mlb-page-header">
            <div class="mlb-page-header__top"><div><p class="eyebrow">MLB / Daily board</p><h2>MLB Game Board</h2><div class="mlb-selected-date"><strong>${escapeHtml(dateDisplay.monthDay)}</strong><span>${escapeHtml(dateDisplay.season)}</span></div></div><div class="mlb-page-header__actions"><span class="mlb-freshness">Data ${escapeHtml(freshness.status || "pending")} · ${escapeHtml(freshness.last_success_at ? timestamp(freshness.last_success_at) : "freshness unavailable")}</span></div></div>
            <div class="mlb-page-header__controls"><div class="mlb-production" title="Technical model: ${escapeHtml(production?.model_name || "not declared")}"><span>Production model:</span><strong>${escapeHtml(productionIdentity.legend || "Not declared")}</strong></div><div class="mlb-filter-wrap">${renderMlbStageFilters(games)}</div></div>
        </section>
        <section class="panel game-date-calendar-panel">${dateCalendar}</section>
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
    const team = getTeamMeta(game?.sport || "WNBA", code, display);
    const image = logo || team.logo_url;
    return `<div class="scoreboard-game__team">${image ? `<span class="scoreboard-team-mark scoreboard-team-mark--image" style="--scoreboard-color:${scoreboardTeamColor(code)}"><img src="${escapeHtml(image)}" alt="${escapeHtml(team.full_name)} logo" loading="lazy" onerror="this.hidden=true; this.nextElementSibling.hidden=false;" /><i hidden>${escapeHtml(String(code).slice(0, 3).toUpperCase())}</i></span>` : renderTeamLogo(game?.sport || "WNBA", code, "sm", display)}<strong>${escapeHtml(display)}</strong></div>`;
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
    const allGames = scoreboardGames(normalized);
    const dates = scoreboardAvailableDates(normalized);
    const selectedDate = ensureScoreboardDate(normalized, dates);
    const games = allGames.filter(game => gameIsoDate(game) === selectedDate);
    const metadata = normalizeMeta(state.live.payload);
    const sourceDate = metadata.generated_at ? timestamp(metadata.generated_at) : "bundled export status unavailable";
    const mount = $(`#view-${config.view}`);
    if (!mount) return;
    mount.innerHTML = `<section class="scoreboard-shell" style="--scoreboard-accent:${escapeHtml(config.accent)}">
        <section class="panel scoreboard-header"><div><p class="eyebrow">${escapeHtml(config.eyebrow)}</p><h2>${escapeHtml(config.title)}</h2><p class="muted">${escapeHtml(config.description)}</p></div><div class="scoreboard-header__meta"><strong>${games.length} loaded</strong><span>Feed: ${escapeHtml(sourceDate)}</span></div></section>
        <section class="panel game-date-calendar-panel">${renderGameDateCalendar({ sport: normalized, dates, selected: selectedDate, games: allGames, label: `${config.navLabel} game dates` })}</section>
        <section class="panel scoreboard-board"><header class="section-header"><div><p class="eyebrow">${escapeHtml(config.navLabel)}</p><h3>Fixtures, live action, and results</h3></div><span class="scoreboard-source-pill">${games.length ? "Real live export" : "No rows bundled"}</span></header>${games.length ? `<div class="scoreboard-grid">${games.map(game => renderScoreboardCard(game, config)).join("")}</div>` : emptyState(config.emptyTitle, config.emptyCopy)}</section>
    </section>`;
}

function renderSoccer() { renderScoreboardDesk("SOCCER"); }
function renderNBA() { renderScoreboardDesk("NBA"); }
function renderNHL() { renderScoreboardDesk("NHL"); }
function wnbaBoardGames() {
    const configured = state.wnba.games.map(game => ({ ...game, sport: "WNBA", source_type: "current" }));
    const liveRows = liveGames().filter(game => normalizedSportCode(game.sport) === "WNBA").map(game => ({ ...game, sport: "WNBA", source_type: "live" }));
    return mergeCanonicalGameRows([...configured, ...liveRows]).sort((a, b) => String(gameIsoDate(a) || "").localeCompare(String(gameIsoDate(b) || "")) || ((gameTimestamp(a) ?? Number.MAX_SAFE_INTEGER) - (gameTimestamp(b) ?? Number.MAX_SAFE_INTEGER)));
}

function wnbaAvailableDates() {
    return uniqueSortedStrings(wnbaBoardGames().map(game => gameIsoDate(game)).filter(Boolean));
}

function ensureWnbaBoardDate() {
    const dates = wnbaAvailableDates();
    if (!dates.length) return null;
    if (state.selected.wnbaDate && dates.includes(state.selected.wnbaDate)) return state.selected.wnbaDate;
    const today = localDateIso();
    state.selected.wnbaDate = dates.includes(today) ? today : dates[0];
    return state.selected.wnbaDate;
}

function moveWnbaDate(delta) {
    const dates = wnbaAvailableDates();
    if (!dates.length) return null;
    const current = ensureWnbaBoardDate();
    const index = Math.max(0, dates.indexOf(current));
    state.selected.wnbaDate = dates[Math.max(0, Math.min(dates.length - 1, index + delta))];
    persistSettings();
    return state.selected.wnbaDate;
}

function wnbaDateDisplay(iso) {
    if (!iso) return { weekday: "WNBA", monthDay: "No date" };
    const date = new Date(`${iso}T12:00:00`);
    return {
        weekday: date.toLocaleDateString([], { weekday: "short" }),
        monthDay: date.toLocaleDateString([], { month: "short", day: "numeric" }),
    };
}

function renderWnbaDateCalendar() {
    const dates = wnbaAvailableDates();
    const selected = ensureWnbaBoardDate();
    return renderGameDateCalendar({ sport: "WNBA", dates, selected, games: wnbaBoardGames(), label: "WNBA game dates" });
}

function renderWNBA() {
    const allGames = wnbaBoardGames();
    const selectedDate = ensureWnbaBoardDate();
    const games = allGames.filter(game => gameIsoDate(game) === selectedDate);
    const modelGames = games.filter(game => getGameProbability(game, "WNBA") !== null);
    const top = rankRowsByEdge(modelGames, 1)[0]?.game || modelGames[0] || games[0];
    const selected = games.find(game => gameKey(game) === gameKey(state.selected.wnba)) || top || null;
    state.selected.wnba = selected;
    const meta = normalizeMeta(state.wnba.payload);
    const status = refreshSportStatus("WNBA");
    const hasModel = modelGames.length > 0 && meta.real_data !== false;
    const production = selectedModelEntry("WNBA");
    const config = SCOREBOARD_SPORTS.WNBA;
    const dateLabel = wnbaDateDisplay(selectedDate);
    const sourceNotice = hasModel ? "Predictions are model-backed for this selected date." : "Schedule-only mode: real fixtures and scores are shown while required pregame inputs are unavailable. Predictions will appear when the data is ready.";
    const scheduleOnlyGames = games.filter(game => !modelGames.some(modelGame => sameGame(modelGame, game)));
    const cards = hasModel
        ? `${modelGames.length ? renderPredictionCards("WNBA", modelGames, "WNBA") : ""}${scheduleOnlyGames.map(game => renderScoreboardCard(game, config)).join("")}`
        : games.map(game => renderScoreboardCard(game, config)).join("");
    $("#view-wnba").innerHTML = `<section class="scoreboard-shell wnba-model-shell" style="--scoreboard-accent:${escapeHtml(config.accent)}"><section class="panel scoreboard-header wnba-page-header"><div><p class="eyebrow">WNBA / ${hasModel ? "Johto model board" : "live scoreboard"}</p><h2>WNBA Game Board</h2><p class="muted">Real WNBA fixtures with team logos, date navigation, and ${hasModel ? `${escapeHtml(production?.model_name || "Raikou / Entei / Suicune")} home-win probabilities.` : "predictions held until required pregame inputs are available."}</p></div><div class="scoreboard-header__meta"><strong>${games.length} loaded</strong><span>${escapeHtml(dateLabel.weekday)} · ${escapeHtml(dateLabel.monthDay)} · ${escapeHtml(status.status || "cached")}</span></div></section><section class="panel wnba-calendar-panel">${renderWnbaDateCalendar()}</section><p class="data-status wnba-mode-note" data-variant="${hasModel ? "success" : "warning"}"><strong>${hasModel ? "Model board" : "Scoreboard mode"}:</strong> ${escapeHtml(sourceNotice)} ${hasModel ? `Production candidate: ${escapeHtml(production?.model_name || "not declared")}.` : "Refresh the board when new schedule or model inputs are available."}</p><section class="prediction-desk wnba-prediction-desk"><article class="panel prediction-board"><header class="desk-header desk-header--nfl"><div class="desk-date-block"><div><p class="eyebrow">${hasModel ? "WNBA model board" : "WNBA schedule board"}</p><h2>${escapeHtml(dateLabel.weekday)} · ${escapeHtml(dateLabel.monthDay)}</h2><div class="desk-record-line"><strong>${games.length}</strong><span>${modelGames.length} model picks</span><span>${games.filter(game => isFinalSportGame(game)).length} final</span></div></div></div><div class="desk-toolbar"><span class="chip chip--soft">${hasModel ? "Score + Elo baseline" : "Real ESPN rows"}</span><button class="btn btn--small" data-refresh-command="wnba_current">Refresh board</button></div></header>${cards || emptyState("No WNBA games on this date", "Choose another date from the calendar. Refresh the live export to discover new fixtures.")}${hasModel ? renderAnalysisDrawer("WNBA", selected) : ""}</article>${hasModel ? renderPredictionRail("WNBA", modelGames, top, state.wnba.payload) : `<aside class="prediction-rail"><section class="rail-card rail-card--top"><header><h3>WNBA model status</h3><span class="rail-status-pill">waiting for inputs</span></header><div class="rail-performance"><div><span>Current date</span><strong>${escapeHtml(dateLabel.monthDay)}</strong></div><div><span>Model line</span><strong>Raikou · Entei · Suicune</strong></div></div><p class="muted">Real fixtures remain visible; predictions are held until the required model inputs arrive.</p></section></aside>`}</section></section>`;
}

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
    if (sport === "WNBA") return "Home win probability";
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
                <strong>${escapeHtml(sport === "MLB" ? (game.top_factor_label || game.explanation?.top_factors?.[0]?.label || "Model signal") : (game.top_factor_label || (sport === "WNBA" ? "Form + Elo signal" : "Spread signal")))}</strong>
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
            <button class="btn btn--primary full-width" data-select-game="${sport === "MLB" ? "MLB_REVIEW" : sport}" data-game-id="${escapeHtml(gameKey({ ...game, sport }))}">View Full Analysis</button>
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
    const scheduleOnly = isScheduleOnly(game, sport === "MLB" ? state.mlb.payload : sport === "WNBA" ? state.wnba.payload : state.nfl.payload);
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
                ${isNfl ? renderNFLImpact(game) : sport === "WNBA" ? renderWnbaImpact(game) : renderMLBImpact(game)}
                ${renderLineMovement(game, sport)}
                ${renderCLV(game, sport)}
                <div class="detail-card detail-card--compact"><span>Model result</span><strong>${escapeHtml(modelResultLabel({ ...game, sport }))}</strong><small>${escapeHtml(detailResultSubtext(game))}</small></div>
            </div>
            ${sport === "MLB" ? renderPredictionExplanation(game) : sport === "WNBA" ? `<div class="detail-card detail-card--compact"><span>Model inputs</span><strong>Team form + Elo</strong><small>Score-only baseline; advanced/player features are not used.</small></div>` : ""}
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

function renderWnbaImpact(game) {
    return `<div class="detail-card detail-card--compact"><span>Data quality</span><strong>Score + Elo baseline</strong><small>Leakage-safe pregame team form; no player availability inputs.</small></div><div class="detail-card detail-card--compact"><span>Market</span><strong>Odds unavailable</strong><small>WNBA moneyline edge is deferred until a reliable historical odds source is validated.</small></div>`;
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
    const display = oddsDisplayForGame(game);
    const odds = display.snapshot || movement.current;
    if (!odds) return emptyState("No market snapshot", "Run npm run refresh:odds when an ODDS_API_KEY is configured.");
    const side = marketSideForPick(game, sport);
    const modelProbability = modelProbabilityForSide(game, side, sport);
    const implied = marketImplied(odds, side);
    if (sport === "MLB") {
        const awayMeta = getTeamMeta("MLB", game.away, game.away_display);
        const homeMeta = getTeamMeta("MLB", game.home, game.home_display);
        const awayMoneyline = marketLine(odds, "away", "MLB");
        const homeMoneyline = marketLine(odds, "home", "MLB");
        const awaySpread = marketSpreadLine(odds, "away");
        const homeSpread = marketSpreadLine(odds, "home");
        const awaySpreadPrice = safeNumber(odds.spread_away_price_current ?? odds.spread_away_price);
        const homeSpreadPrice = safeNumber(odds.spread_home_price_current ?? odds.spread_home_price);
        const moneyline = `${awayMeta.abbreviation} ${americanOdds(awayMoneyline)} / ${homeMeta.abbreviation} ${americanOdds(homeMoneyline)}`;
        const runLineDisplay = awaySpread === null && homeSpread === null
            ? "Unavailable"
            : `${awayMeta.abbreviation} ${runLine(awaySpread)} ${americanOdds(awaySpreadPrice)} / ${homeMeta.abbreviation} ${runLine(homeSpread)} ${americanOdds(homeSpreadPrice)}`;
        return `
            <div class="gamecast-market">
                ${card("Books", safeNumber(odds.bookmakers_count, 0), "snapshot consensus")}
                ${card("Moneyline", moneyline, display.label)}
                ${card("Run line", runLineDisplay, display.label)}
                ${card("Market implied", formatProbability(implied), `${side} side`)}
                ${card("Model probability", formatProbability(modelProbability), getGamePick(game, sport))}
                ${card("Model edge", formatEdge(movement.marketEdge), display.freshness)}
            </div>
        `;
    }
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
    if (sport === "WNBA") {
        const factors = game.explanation?.top_factors || [];
        return `<div class="gamecast-model-identity"><span>${escapeHtml(game.model_name || "WNBA model")}</span></div><p class="muted">${escapeHtml(game.top_factor_label || "Pregame Elo and recent team form")}. Advanced/player inputs remain unavailable unless exported by the source.</p>${factors.length ? `<div class="factor-list factor-list--compact">${factors.slice(0, 3).map(renderFactorRow).join("")}</div>` : emptyState("No WNBA factor attribution", "The current score + Elo export does not include local factor values.")}`;
    }
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

function deterministicAutopsy(game, sport) {
    const log = latestLogForGame(game);
    const result = accountabilityLabel(log || game);
    if (!["Correct", "Wrong", "Push"].includes(result)) return null;
    const probability = getConfidenceScore(log || game, sport);
    const factors = game.explanation?.top_factors || [];
    const pick = getGamePick(log || game, sport);
    const supports = factors.filter(factor => String(factor.impact || "").toLowerCase().includes(pick === game.home ? "home" : "away"));
    const opposes = factors.filter(factor => String(factor.impact || "").toLowerCase().includes(pick === game.home ? "away" : "home"));
    const movement = lineMovementSummary(game, sport);
    const availability = game.player_availability || game.injury_note || game.availability_note;
    let classification = "Expected result";
    if (availability && /changed|late|updated|out|questionable/i.test(String(availability))) classification = "Late availability change";
    else if (movement.available && movement.marketEdge !== null && Math.sign(movement.marketEdge) !== Math.sign((probability || 0.5) - 0.5)) classification = "Market disagreement";
    else if (result === "Wrong" && probability !== null && probability >= 0.65) classification = "Unexpected variance";
    else if (result === "Wrong" && safeNumber(game.explanation?.data_quality?.feature_missing_count, 0) > 0) classification = "Insufficient context";
    else if (result === "Wrong") classification = "Model weakness";
    return { result, log, probability, pick, supports, opposes, movement, availability, classification };
}

function renderPostgameAutopsy(game, sport) {
    const autopsy = deterministicAutopsy(game, sport);
    if (!autopsy) return `<section class="gamecast-section autopsy-section"><header><h3>Postgame Model Autopsy</h3></header>${emptyState("Autopsy pending", "A deterministic autopsy appears after a logged prediction receives a decisive final result.")}</section>`;
    const final = liveGameFor(game) || game;
    const score = finalScoreLabel(final) || "Final score unavailable";
    return `<section class="gamecast-section autopsy-section"><header class="section-header"><div><h3>Postgame Model Autopsy</h3><p class="muted">Structured from exported prediction, feature, odds, and result fields.</p></div><span class="chip ${autopsy.result === "Correct" ? "chip--success" : "chip--danger"}">${escapeHtml(autopsy.classification)}</span></header><div class="autopsy-grid"><div><span>Original prediction</span><strong>${escapeHtml(autopsy.pick)}</strong><small>${formatProbability(autopsy.probability)} · ${escapeHtml(timestamp(autopsy.log?.generated_at || game.generated_at))}</small></div><div><span>Final result</span><strong>${escapeHtml(autopsy.result)}</strong><small>${escapeHtml(score)}</small></div><div><span>Model used</span><strong>${escapeHtml(autopsy.log?.model_name || game.model_name || "Not declared")}</strong><small>Odds at prediction: ${escapeHtml(autopsy.log?.moneyline_home !== undefined ? formatLine(autopsy.log.moneyline_home, sport) : autopsy.movement.available ? "linked" : "unavailable")}</small></div></div><div class="autopsy-columns"><div><h4>Supporting exported factors</h4>${autopsy.supports.length ? `<ul>${autopsy.supports.slice(0, 4).map(factor => `<li>${escapeHtml(factor.label || factor.feature || "Factor")}</li>`).join("")}</ul>` : `<p class="muted">No supporting factor attribution exported.</p>`}</div><div><h4>Opposing exported factors</h4>${autopsy.opposes.length ? `<ul>${autopsy.opposes.slice(0, 4).map(factor => `<li>${escapeHtml(factor.label || factor.feature || "Factor")}</li>`).join("")}</ul>` : `<p class="muted">No opposing factor attribution exported.</p>`}</div><div><h4>Context change</h4><p class="muted">${escapeHtml(autopsy.availability || (autopsy.movement.available ? "Market snapshot was available; no availability change was exported." : "No player availability or market change was exported."))}</p></div></div></section>`;
}

function renderWnbaMatchupIntelligence(game, live) {
    const values = game.feature_values || {};
    const trend = game.trend || {};
    const metrics = [
        ["Recent form", trend.labels?.includes("Recent form") ? [trend.away?.[1], trend.home?.[1]] : null],
        ["Offensive rating", [values.away_offensive_rating, values.home_offensive_rating]],
        ["Defensive rating", [values.away_defensive_rating, values.home_defensive_rating]],
        ["Net rating", [values.away_net_rating, values.home_net_rating]],
        ["Pace", [values.away_pace, values.home_pace]],
        ["Home / away splits", [values.away_away_win_pct, values.home_home_win_pct]],
        ["Rest days", [values.away_rest_days, values.home_rest_days]],
        ["Back-to-back", [values.away_b2b, values.home_b2b]],
        ["Turnover rate", [values.away_turnover_rate, values.home_turnover_rate]],
        ["Rebounding advantage", [values.away_rebound_rate, values.home_rebound_rate]],
        ["Three-point rate", [values.away_three_point_rate, values.home_three_point_rate]],
    ];
    const valueLabel = value => value === null || value === undefined || value === "" ? "Unavailable" : formatNumber(value, 2);
    const liveRows = [["Quarter / time", live?.period || live?.quarter || live?.clock ? `${live?.period || live?.quarter || ""} · ${live?.clock || ""}` : null], ["Quarter scores", live?.quarter_scores || live?.period_scores || null], ["Team leaders", live?.leaders || null], ["Largest lead", live?.largest_lead || null], ["Lead changes", live?.lead_changes], ["Scoring run", live?.scoring_run || null]];
    const availabilityChanged = Boolean(game.availability_changed || game.prediction_may_be_stale || game.availability_updated_at);
    return `<section class="gamecast-section wnba-intelligence"><header><h3>WNBA matchup intelligence</h3><p class="muted">Basketball-specific fields are shown only when the real export provides them.</p></header><div class="wnba-intelligence-grid">${metrics.map(([label, pair]) => `<div><span>${escapeHtml(label)}</span><strong>${pair && pair.some(value => value !== null && value !== undefined && value !== "") ? `${escapeHtml(valueLabel(pair[0]))} / ${escapeHtml(valueLabel(pair[1]))}` : "Unavailable"}</strong><small>Away / Home</small></div>`).join("")}</div><div class="wnba-intelligence-grid wnba-intelligence-grid--live">${liveRows.map(([label, value]) => `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(valueLabel(value))}</strong><small>live/final export</small></div>`).join("")}</div><p class="data-status" data-variant="${availabilityChanged ? "error" : "warning"}">Player availability: ${escapeHtml(game.player_availability || "Unavailable from the bundled WNBA export")}. ${availabilityChanged ? "Prediction may be stale." : game.player_availability ? "No post-prediction change flag was exported." : "Availability changes cannot be inferred."}</p></section>`;
}

function renderGameCastProvenance(game, sport) {
    const live = liveGameFor(game);
    const odds = latestOddsForGame(game);
    const payload = sport === "MLB" ? state.mlb.payload : sport === "WNBA" ? state.wnba.payload : state.nfl.payload;
    const model = selectedModelEntry(sport);
    return `<div class="gamecast-provenance" aria-label="GameCast data provenance"><span><strong>Prediction</strong>${escapeHtml(timestamp(game.generated_at || normalizeMeta(payload).generated_at))}</span><span><strong>Model</strong>${escapeHtml(model?.model_name || game.model_name || "not declared")}</span><span><strong>Live feed</strong>${escapeHtml(live ? "joined" : "not joined")}</span><span><strong>Odds</strong>${escapeHtml(odds ? oddsFreshness(odds) : "not linked")}</span></div>`;
}

function renderGameCastConsensus(game) {
    const consensus = modelConsensusForGame(game);
    if (!consensus) return emptyState("No consensus available", "Only the production model was exported for this matchup.");
    return `<div class="gamecast-consensus"><header><strong>${escapeHtml(picksConsensus(game).label)}</strong><span>Full model vote</span></header>${consensus.rows.map(row => `<div><span>${escapeHtml(row.legend)}</span><strong>${escapeHtml(row.pick)}</strong><small>${formatProbability(row.pick === game.home ? row.homeProbability : 1 - row.homeProbability)}</small></div>`).join("")}</div>`;
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
            ${sport === "WNBA" ? renderWnbaMatchupIntelligence(game, live) : ""}
            <section class="gamecast-section"><header><h3>Model consensus</h3></header>${renderGameCastConsensus(game)}</section>
            ${renderPostgameAutopsy(game, sport)}
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
            <div class="report-actions"><select id="report-sport-select"><option ${sport === "MLB" ? "selected" : ""}>MLB</option><option ${sport === "NFL" ? "selected" : ""}>NFL</option><option ${sport === "WNBA" ? "selected" : ""}>WNBA</option></select><button class="btn" data-view-link="record">Open Record</button></div>
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
    RandomForestClassifier: { legend: "Zapdos", element: "electric", role: "Fast nonlinear challenger", motif: "Electric branching signals across many trees.", strength: "Captures interactions and remains resilient to noisy feature combinations.", weakness: "Probability behavior can be less smooth and harder to explain locally." },
    GradientBoostingClassifier: { legend: "Lugia", element: "tide", role: "Current production model", motif: "A balanced current built from sequential corrections.", strength: "Strong general-purpose nonlinear fit in the existing MLB comparison.", weakness: "Can overreact to feature drift and depends on careful calibration." },
    HistGradientBoostingClassifier: { legend: "Ho-Oh", element: "phoenix", role: "Modern boosting challenger", motif: "A rebirth loop for efficient histogram splits.", strength: "Efficient nonlinear learning with regularization controls.", weakness: "Only useful when its holdout evidence is present and comparable." },
    Raikou: { legend: "Raikou", element: "storm", role: "WNBA recency / Elo candidate", motif: "A fast electric read on recent team strength.", strength: "Transparent baseline using chronological form, rest, and Elo.", weakness: "Score-only inputs cannot see player availability or advanced efficiency." },
    Entei: { legend: "Entei", element: "ember", role: "WNBA nonlinear challenger", motif: "A heat-driven correction layer for team-form interactions.", strength: "Captures nonlinear combinations of form, margin, and rest.", weakness: "Needs more seasons and richer box-score inputs before stronger claims." },
    Suicune: { legend: "Suicune", element: "frost", role: "WNBA calibrated candidate", motif: "A calmer probability curve over the same leakage-safe inputs.", strength: "Provides a regularized nonlinear candidate selected by holdout evidence.", weakness: "No odds edge or player/injury features in the first release." },
};

function modelIdentity(modelName) {
    return MODEL_IDENTITIES[modelName] || { legend: "Legendary", element: "neutral", role: "Registry model", motif: "Abstract model signal.", strength: "Real registry-backed candidate.", weakness: "Behavior details are not exported." };
}

const MODEL_ART_ASSETS = {
    Lugia: "assets/models/lugia-tide.png",
    Articuno: "assets/models/articuno-frost.png",
    Moltres: "assets/models/moltres-ember.png",
    Zapdos: "assets/models/zapdos-electric.png",
    Raikou: "assets/models/raikou-storm.png",
    Entei: "assets/models/entei-ember.png",
    Suicune: "assets/models/suicune-frost.png",
};

function modelArtAsset(modelName) {
    return MODEL_ART_ASSETS[modelName] || "";
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
    return `<details class="model-profile model-profile--${identity.element}" ${entry.selected ? "open" : ""}><summary><span class="model-profile__crest" aria-hidden="true"><i></i><b>${escapeHtml(identity.legend.slice(0, 2).toUpperCase())}</b></span><span class="model-profile__title"><strong>${escapeHtml(identity.legend)}</strong><small>${escapeHtml(name)}</small></span><span class="model-profile__role">${escapeHtml(identity.role)}</span><span class="model-profile__headline">${formatNumber(metrics.log_loss, 3)}<small>log loss</small></span><span class="model-profile__status ${entry.selected ? "is-selected" : ""}">${entry.selected ? "Production" : "Challenger"}</span></summary><div class="model-profile__body"><div class="model-profile__intro"><p>${escapeHtml(identity.motif)}</p><div><span class="technical-label">Technical model</span><code>${escapeHtml(name)}</code></div></div><div class="model-metric-grid">${renderModelMetric("Accuracy", formatProbability(metrics.accuracy), `N=${metrics.sample_size || entry.test_rows || "-"}`)}${renderModelMetric("Log loss", formatNumber(metrics.log_loss, 3), "lower is better")}${renderModelMetric("Brier", formatNumber(metrics.brier_score, 3), "lower is better")}${renderModelMetric("ROC AUC", formatNumber(metrics.roc_auc, 3), "discrimination")}${renderModelMetric("Calibration", formatEdge(metrics.calibration_error), "absolute error")}${renderModelMetric("Stability", formatNumber(metrics.stability?.stability_score, 3), `${metrics.stability?.blocks || 0} time slices`)}</div><div class="model-profile__facts"><div><span class="eyebrow">Lifecycle</span><p>Trained ${escapeHtml(formatDate(entry.trained_at) || "not exported")}</p><p>Train seasons: ${escapeHtml(trainSeasons)}</p><p>Test season: ${escapeHtml(entry.test_season || "not exported")} · ${escapeHtml(String(entry.feature_count || "-"))} features</p><p>Production fit: ${escapeHtml(String(entry.production_fit_rows || "-"))} completed rows</p></div><div><span class="eyebrow">Strength / weakness</span><p><strong>Strength:</strong> ${escapeHtml(identity.strength)}</p><p><strong>Weakness:</strong> ${escapeHtml(identity.weakness)}</p></div><div><span class="eyebrow">Top factors</span>${topFactors.length ? `<ul>${topFactors.map(factor => `<li>${escapeHtml(factor.feature || factor.label || "feature")}</li>`).join("")}</ul>` : `<p class="muted">Per-model attribution is not exported for this row. The production feature summary is available in Reports.</p>`}</div></div>${card ? `<div class="model-profile__components"><span class="eyebrow">Moltres components</span>${(card.architecture?.base_models || []).map(component => `<span><strong>${escapeHtml(component)}</strong><em>${safeNumber(card.architecture?.weights?.[component]) === null ? "-" : `${(card.architecture.weights[component] * 100).toFixed(0)}%`}</em></span>`).join("") || `<p class="muted">Moltres has not been manually trained in this bundle.</p>`}</div>` : ""}<p class="model-profile__limitation"><strong>Honest limitation:</strong> ${escapeHtml(card?.limitations?.[0] || "Registry metrics describe this exported evaluation only; they do not guarantee future performance.")}</p></div></details>`;
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
        <div class="model-gallery-card__visual"><span>${escapeHtml(identity.legend)}</span><small>${escapeHtml(identity.element)} model line</small></div>
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

function renderWnbaModelLabCard() {
    const selected = selectedModelEntry("WNBA");
    const comparison = getComparisonRows("WNBA");
    const meta = normalizeMeta(state.wnba.payload);
    const candidates = [
        ["Raikou", "LogisticRegression"],
        ["Entei", "GradientBoostingClassifier"],
        ["Suicune", "HistGradientBoostingClassifier"],
    ];
    const rows = comparison.filter(row => row.status === "evaluated" || row.status === "trained");
    const candidateCards = candidates.map(([alias, technicalName]) => {
        const identity = modelIdentity(alias);
        const row = rows.find(item => item.model_name === alias || item.technical_name === technicalName) || {};
        const isSelected = selected && (selected.model_name === alias || selected.model_name === technicalName);
        const status = isSelected ? "PRODUCTION" : Object.keys(row).length ? "EVALUATED" : "AWAITING HOLDOUT";
        const metrics = { ...row.metrics, ...row };
        return `<article class="wnba-model-card wnba-model-card--${identity.element} ${isSelected ? "is-production" : ""}">
            <div class="wnba-model-card__visual"><span>${escapeHtml(alias)}</span><small>${escapeHtml(status)}</small></div>
            <div class="wnba-model-card__body"><div class="wnba-model-card__heading"><div><p class="eyebrow">${isSelected ? "Production candidate" : "WNBA candidate"}</p><h3>${escapeHtml(alias)}</h3><code>${escapeHtml(technicalName)}</code></div><span class="model-gallery-card__badge">${escapeHtml(status)}</span></div><p class="muted">${escapeHtml(identity.role)}</p><div class="model-gallery-card__metrics">${renderModelMetric("Accuracy", formatProbability(metrics.accuracy))}${renderModelMetric("Log loss", formatNumber(metrics.log_loss, 3))}${renderModelMetric("Brier", formatNumber(metrics.brier_score, 3))}${renderModelMetric("ROC AUC", formatNumber(metrics.roc_auc, 3))}</div><p class="wnba-model-card__note">${escapeHtml(Object.keys(row).length ? "Real chronological comparison data loaded." : "Live card is ready; metrics appear after a completed-season holdout.")}</p></div>
        </article>`;
    }).join("");
    const trainedCount = candidates.filter(([alias, technicalName]) => rows.some(row => row.model_name === alias || row.technical_name === technicalName)).length;
    return `<section class="panel wnba-model-lab"><header class="section-header"><div><p class="eyebrow">WNBA / Johto line</p><h2>Raikou · Entei · Suicune</h2><p class="muted">${escapeHtml(selected ? `${modelIdentity(selected.model_name).legend} is the evidence-selected production candidate.` : "Three real-data candidates are staged for the WNBA line; no metrics are invented before the holdout exists.")}</p></div><div class="report-actions"><button class="btn" data-refresh-command="wnba_all">Retrain WNBA line</button><button class="btn btn--primary" data-view-link="wnba">Open WNBA Board</button></div></header><div class="summary-grid summary-grid--compact">${card("Production", selected ? modelIdentity(selected.model_name).legend : "Not selected", selected?.technical_name || "candidate selection")}${card("Evaluated", `${trainedCount} / ${candidates.length}`, "chronological comparison")}${card("Data quality", meta.data_quality || "score + Elo", "advanced/player inputs are separate")}</div><div class="wnba-model-gallery">${candidateCards}</div><p class="muted wnba-model-lab__footnote">${trainedCount ? "Metrics are tied to the real WNBA comparison export." : "Cards remain visible while the historical ESPN cache is assembled; the board continues to show real fixtures in the meantime."}</p></section>`;
}

function renderWnbaPropModelPanel() {
    const registry = state.wnbaPropModelRegistry || {};
    const models = registry.models || [];
    const health = state.wnbaPropModelHealth?.metadata || {};
    return `<section class="panel prop-model-panel"><header class="section-header"><div><p class="eyebrow">WNBA player props</p><h2>Points, rebounds, assists</h2><p class="muted">Separate regression candidates. No prop model is production until real player rows and chronological evaluation support it.</p></div><span class="chip chip--soft">${escapeHtml(health.status || registry.metadata?.status || "Not trained")}</span></header><div class="prop-model-panel__grid">${models.length ? models.map(model => `<article><strong>${escapeHtml(model.target_stat || "Stat")}</strong><span>${escapeHtml(model.algorithm || "Algorithm unavailable")}</span><small>MAE ${formatNumber(model.metrics?.mae, 2)} · RMSE ${formatNumber(model.metrics?.rmse, 2)} · ${escapeHtml(model.status || "challenger")}</small></article>`).join("") : `<p class="muted">No trained WNBA prop artifacts are bundled. Run the manual dataset and training commands when real player box-score data is available.</p>`}</div></section>`;
}

function historyRows() {
    const rows = [
        ...state.mlbBacktest.games.map(game => ({ ...game, sport: "MLB", source_type: "backtest" })),
        ...getLogEntries().map(row => ({ ...row, sport: row.sport || "MLB", source_type: "prediction_log" })),
        ...state.nfl.games.map(game => ({ ...game, sport: "NFL", source_type: "nfl_export" })),
        ...state.wnbaBacktest.games.map(game => ({ ...game, sport: "WNBA", source_type: "backtest" })),
        ...state.wnba.games.map(game => ({ ...game, sport: "WNBA", source_type: "wnba_export" })),
    ];
    const seen = new Set();
    return rows.filter(row => {
        const key = `${row.sport}:${gameKey(row)}:${row.model_name || row.model_type || ""}:${row.source_type}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return Boolean(gameIsoDate(row) || gameSeason(row, row.sport));
    }).sort((a, b) => String(historyRowDate(b)).localeCompare(String(historyRowDate(a))));
}

function historyRowDate(row) {
    return gameIsoDate(row) || String(row.game_date || row.generated_at || "").slice(0, 10);
}

function historyResult(row) {
    return accountabilityLabel(row).toLowerCase().replace("correct", "won").replace("wrong", "lost");
}

function historyFilteredRows() {
    const selected = state.selected;
    const query = String(selected.historyQuery || "").trim().toLowerCase();
    return historyRows().filter(row => {
        const sport = row.sport || "MLB";
        const season = gameSeason(row, sport);
        const result = historyResult(row);
        const confidence = getGameConfidence(row, sport).toLowerCase();
        const model = String(row.model_name || row.model_type || "Unknown");
        const teamText = `${row.home || ""} ${row.away || ""} ${row.home_display || ""} ${row.away_display || ""}`.toLowerCase();
        const date = historyRowDate(row);
        if (selected.historySport !== "all" && sport !== selected.historySport) return false;
        if (selected.historySeason !== "all" && String(season) !== String(selected.historySeason)) return false;
        if (selected.historyResult !== "all" && result !== selected.historyResult) return false;
        if (selected.historyConfidence !== "all" && confidence !== String(selected.historyConfidence).toLowerCase()) return false;
        if (selected.historyModel !== "all" && model !== selected.historyModel) return false;
        if (selected.historyTeam !== "all" && ![row.home, row.away].includes(selected.historyTeam)) return false;
        if (selected.historyFrom && date < selected.historyFrom) return false;
        if (selected.historyTo && date > selected.historyTo) return false;
        if (query && !`${teamText} ${model.toLowerCase()} ${date} ${sport}`.includes(query)) return false;
        return true;
    });
}

function historySelectOptions(values, selected, label = value => value) {
    return values.map(value => `<option value="${escapeHtml(value)}" ${String(selected) === String(value) ? "selected" : ""}>${escapeHtml(label(value))}</option>`).join("");
}

function csvCell(value) {
    return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function exportHistoryCsv() {
    const rows = historyFilteredRows();
    const header = ["date", "sport", "season", "away", "home", "away_score", "home_score", "model", "pick", "confidence", "result", "source"];
    const lines = rows.map(row => [
        historyRowDate(row), row.sport, gameSeason(row, row.sport), row.away_display || row.away, row.home_display || row.home,
        row.away_score, row.home_score, row.model_name || row.model_type, getGamePick(row, row.sport), getGameConfidence(row, row.sport), historyResult(row), row.source_type,
    ].map(csvCell).join(","));
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "linelens-history.csv";
    link.click();
    URL.revokeObjectURL(url);
    showToast(`${rows.length} history rows exported`);
}

function renderHistory() {
    const all = historyRows();
    const rows = historyFilteredRows();
    const seasons = uniqueSortedNumbers(all.map(row => gameSeason(row, row.sport)), "desc");
    const models = uniqueSortedStrings(all.map(row => row.model_name || row.model_type));
    const teams = uniqueSortedStrings(all.flatMap(row => [row.home, row.away]));
    const decided = rows.filter(row => ["won", "lost", "push"].includes(historyResult(row)));
    const wins = decided.filter(row => historyResult(row) === "won").length;
    const latest = rows.slice(0, 6);
    const select = (id, value, options, first) => `<select id="${id}" aria-label="${escapeHtml(first)}"><option value="all">${escapeHtml(first)}</option>${historySelectOptions(options, value)}</select>`;
    const table = rows.slice(0, 150).map(row => `<tr>
        <td>${escapeHtml(formatDate(historyRowDate(row)))}</td>
        <td><span class="chip chip--soft">${escapeHtml(row.sport || "MLB")}</span></td>
        <td><strong>${escapeHtml(row.away || "-")} @ ${escapeHtml(row.home || "-")}</strong><small>${escapeHtml(row.away_display || row.away || "")} at ${escapeHtml(row.home_display || row.home || "")}</small></td>
        <td>${escapeHtml(finalScoreLabel(row) || "Score unavailable")}</td>
        <td>${escapeHtml(row.model_name || row.model_type || "-")}<small>${escapeHtml(getGamePick(row, row.sport))} · ${escapeHtml(getGameConfidence(row, row.sport))}</small></td>
        <td>${confidenceTag(historyResult(row) === "won" ? "Won" : historyResult(row) === "lost" ? "Lost" : historyResult(row) === "push" ? "Push" : "Pending")}</td>
        <td><button class="btn btn--micro" type="button" data-history-open="${escapeHtml(gameKey(row))}" data-history-sport="${escapeHtml(row.sport || "MLB")}">Open GameCast</button></td>
    </tr>`).join("");
    $("#view-history").innerHTML = `
        <section class="module-header panel history-header"><div><p class="eyebrow">History Explorer</p><h2>Find the evidence behind any pick.</h2><p class="muted">Search the cached MLB backtest, logged daily predictions, and NFL historical export without leaving the app.</p></div><div class="report-actions"><button class="btn btn--primary" type="button" data-export-history>Export filtered CSV</button><span class="chip">${rows.length.toLocaleString()} / ${all.length.toLocaleString()} rows</span></div></section>
        <section class="summary-grid history-summary">${card("Filtered rows", rows.length.toLocaleString(), "cached prediction rows")}${card("Decided", decided.length.toLocaleString(), "with a final result")}${card("Record", decided.length ? `${wins}-${decided.length - wins}` : "pending", "filtered result")}${card("Latest season", seasons[0] || "-", "available in export")}</section>
        <section class="panel history-filter-panel"><div class="history-filters"><label>Sport${select("history-sport", selected.historySport, ["MLB", "NFL"], "All sports")}</label><label>Season${select("history-season", selected.historySeason, seasons.map(String), "All seasons")}</label><label>Result${select("history-result", selected.historyResult, ["won", "lost", "push", "pending"], "All results")}</label><label>Confidence${select("history-confidence", selected.historyConfidence, ["High", "Medium", "Low", "Pending"], "All confidence")}</label><label>Model${select("history-model", selected.historyModel, models, "All models")}</label><label>Team${select("history-team", selected.historyTeam, teams, "All teams")}</label><label>From<input id="history-from" type="date" value="${escapeHtml(selected.historyFrom || "")}" /></label><label>To<input id="history-to" type="date" value="${escapeHtml(selected.historyTo || "")}" /></label><label class="history-search">Search<input id="history-search" type="search" placeholder="Team, matchup, model..." value="${escapeHtml(selected.historyQuery || "")}" /></label></div></section>
        <section class="panel history-score-strip"><header class="section-header"><div><p class="eyebrow">Historical score cards</p><h2>Recent cached results</h2></div><span class="muted">GameCast uses the same loaded row</span></header><div class="history-cards">${latest.length ? latest.map(row => `<article class="history-card"><span>${escapeHtml(row.sport || "MLB")} · ${escapeHtml(formatDate(historyRowDate(row)))}</span><strong>${escapeHtml(row.away || "-")} ${safeNumber(row.away_score, "-")} @ ${escapeHtml(row.home || "-")} ${safeNumber(row.home_score, "-")}</strong><small>${escapeHtml(row.model_name || row.model_type || "Model unavailable")} · ${escapeHtml(historyResult(row))}</small><button class="btn btn--micro" type="button" data-history-open="${escapeHtml(gameKey(row))}" data-history-sport="${escapeHtml(row.sport || "MLB")}">Open GameCast</button></article>`).join("") : emptyState("No history matches these filters", "Clear a filter or load the bundled historical exports.")}</div></section>
        <section class="panel"><header class="section-header"><div><p class="eyebrow">Prediction ledger</p><h2>Historical rows</h2></div><span class="muted">Showing up to 150 rows for a fast first render</span></header><div class="table-wrapper"><table class="data-table history-table"><thead><tr><th>Date</th><th>Sport</th><th>Matchup</th><th>Score</th><th>Model / pick</th><th>Result</th><th></th></tr></thead><tbody>${table || `<tr><td colspan="7">No history matches these filters.</td></tr>`}</tbody></table></div></section>
    `;
}

function watchlistRows() {
    const sources = [...allGames(), ...getLogEntries(), ...liveGames()];
    return state.favorites.games.map(id => sources.find(row => gameFavoriteId({ ...row, sport: row.sport || "MLB" }) === id)).filter(Boolean).map(row => ({ ...row, sport: row.sport || "MLB" }));
}

function togglePinnedModel(name) {
    state.selected.pinnedModel = state.selected.pinnedModel === name ? null : name;
    persistSettings();
    renderWatchlist();
    showToast(state.selected.pinnedModel ? `${name} pinned to Watchlist` : "Model unpinned");
}

function renderWatchlist() {
    const watched = watchlistRows();
    const teams = state.favorites.teams.map(id => {
        const [sport, code] = String(id).split(":");
        return { sport, code, meta: getTeamMeta(sport, code, code) };
    });
    const models = modelObservatoryEntries().slice(0, 6);
    const alerts = state.liveRefresh.notifications || [];
    $("#view-watchlist").innerHTML = `
        <section class="module-header panel"><div><p class="eyebrow">Watchlist</p><h2>Your daily follow list.</h2><p class="muted">Keep favorite teams, watched matchups, and one pinned model in one quiet workspace. Everything is stored locally on this device.</p></div><div class="report-actions"><span class="chip">${teams.length} teams</span><span class="chip">${watched.length} games</span></div></section>
        <section class="watchlist-grid">
            <article class="panel"><header class="section-header"><div><p class="eyebrow">Favorite teams</p><h2>Teams you follow</h2></div><button class="btn btn--micro" type="button" data-view-link="teams">Browse teams</button></header><div class="watch-team-list">${teams.length ? teams.map(team => `<div class="watch-team-row">${renderTeamLogo(team.sport, team.code, "sm", team.meta.full_name)}<span><strong>${escapeHtml(team.meta.full_name)}</strong><small>${escapeHtml(team.sport)} · ${escapeHtml(team.code)}</small></span>${renderFavoriteButton(team.sport, team.code, `Remove ${team.meta.full_name}`)}</div>`).join("") : emptyState("No favorite teams yet", "Browse Teams and tap the star on any team.")}</div></article>
            <article class="panel"><header class="section-header"><div><p class="eyebrow">Pinned model</p><h2>${escapeHtml(state.selected.pinnedModel || "Choose a model")}</h2></div><button class="btn btn--micro" type="button" data-view-link="models">Open Model Lab</button></header><p class="muted">Pin the model you want to keep in your daily line of sight. Production status still comes from the registry.</p><div class="watch-model-list">${models.map(model => `<button type="button" class="watch-model-row ${state.selected.pinnedModel === model.model_name ? "is-pinned" : ""}" data-pin-model="${escapeHtml(model.model_name)}"><span>${state.selected.pinnedModel === model.model_name ? "★" : "☆"}</span><strong>${escapeHtml(modelIdentity(model.model_name).legend)}</strong><small>${escapeHtml(model.model_name)} · ${model.selected ? "Production" : "Challenger"}</small></button>`).join("") || emptyState("No model registry rows", "Run MLB training to populate Model Lab.")}</div></article>
        </section>
        <section class="panel"><header class="section-header"><div><p class="eyebrow">Watched games</p><h2>Matchups to revisit</h2></div><button class="btn btn--micro" type="button" data-view-link="mlb">Open MLB board</button></header><div class="watch-game-list">${watched.length ? watched.map(row => `<article class="watch-game-row"><div><span>${escapeHtml(row.sport)} · ${escapeHtml(gameDateDisplay(row, row.sport))}</span><strong>${escapeHtml(row.away || "-")} @ ${escapeHtml(row.home || "-")}</strong><small>${escapeHtml(getGamePick(row, row.sport))} · ${escapeHtml(getGameConfidence(row, row.sport))} · ${escapeHtml(finalScoreLabel(row) || gameStatusLine(row))}</small></div><div class="report-actions"><button class="btn btn--micro" type="button" data-history-open="${escapeHtml(gameKey(row))}" data-history-sport="${escapeHtml(row.sport)}">GameCast</button>${renderWatchButton(row, "Remove from watchlist")}</div></article>`).join("") : emptyState("Your watchlist is empty", "Star a game from the MLB/NFL board or GameCast to keep it here.")}</div></section>
        <section class="panel"><header class="section-header"><div><p class="eyebrow">Recent alerts</p><h2>What changed while you were away</h2></div><button class="btn btn--micro" type="button" data-clear-live-alerts>Clear alerts</button></header><div class="watch-alert-list">${alerts.length ? alerts.slice(0, 8).map(alert => `<article><span>${escapeHtml(alert.sport || "Live")}</span><strong>${escapeHtml(alert.title || "Update")}</strong><small>${escapeHtml(alert.message || "")}</small></article>`).join("") : `<p class="muted">No local alerts yet. Live score changes will appear here when the heartbeat is enabled.</p>`}</div></section>
    `;
}

function renderModels() {
    const entries = modelObservatoryEntries();
    const selected = selectedModelEntry("MLB");
    const comparison = getComparisonRows("MLB");
    const selectedEntry = state.selected.modelName ? entries.find(entry => entry.model_name === state.selected.modelName) : null;
    const detail = selectedEntry ? `<section class="model-drawer"><header class="section-header"><div><p class="eyebrow">Model profile</p><h2>${escapeHtml(modelIdentity(selectedEntry.model_name).legend)}</h2><p class="muted">Expanded technical profile and registry history.</p></div><button class="btn btn--small" type="button" data-model-close>Close profile</button></header>${renderModelProfile(selectedEntry)}<div class="model-history"><p class="eyebrow">Registry history</p>${renderModelVersionHistory(selectedEntry.model_name)}</div></section>` : `<div class="models-gallery-hint"><strong>Select a model to inspect its profile.</strong><span>Metrics stay tied to the real registry and comparison exports; pending models remain visibly pending.</span></div>`;
    const productionMetrics = selected ? { ...(selected.metrics || {}), ...modelComparisonFor(selected.model_name) } : {};
    const leaderboardRows = [...comparison].filter(row => row.status === "trained").sort((a, b) => (safeNumber(a.log_loss, 99) - safeNumber(b.log_loss, 99))).map((row, index) => {
        const identity = modelIdentity(row.model_name);
        const liveRecord = row.model_name === selected?.model_name ? recordLine(getModelRecord("MLB").live_record || getModelRecord("MLB").overall || {}) : "Not tracked";
        return `<tr><td><span class="model-rank">${index + 1}</span><strong>${escapeHtml(identity.legend)}</strong><small>${escapeHtml(row.model_name)}</small></td><td>${escapeHtml(row.model_name === selected?.model_name ? "Production" : identity.role.replace("Current ", ""))}</td><td>${formatNumber(row.log_loss, 4)}</td><td>${formatNumber(row.brier_score, 4)}</td><td>${escapeHtml(liveRecord)}</td></tr>`;
    }).join("");
    $("#view-models").innerHTML = `<section class="models-shell"><section class="models-hero"><div><p class="eyebrow">Model comparison</p><h2>Compare models by sport</h2><p>Review production and challenger evidence, then open the detail view for metrics and limitations.</p><div class="models-hero__production"><span>MLB production model</span><strong>${escapeHtml(modelIdentity(selected?.model_name).legend)}</strong><small>${formatProbability(productionMetrics.accuracy)} holdout accuracy · ${formatNumber(productionMetrics.log_loss, 4)} log loss</small></div></div><div class="models-hero__orb"><span></span><i></i><b></b></div></section>${renderCrossSportModelArena()}${renderModelHealthPanel()}<section class="models-command"><div><span class="eyebrow">Production model</span><strong>${escapeHtml(modelIdentity(selected?.model_name).legend)}</strong><small>${selected ? `trained ${formatDate(selected.trained_at)}` : "No registry selection"}</small></div><div><span class="eyebrow">Model gallery</span><strong>${entries.length}</strong><small>unique MLB algorithms</small></div><div><span class="eyebrow">Evaluation rows</span><strong>${comparison.length}</strong><small>real comparison exports</small></div><div><span class="eyebrow">Moltres</span><strong>${escapeHtml(moltresStatusLabel())}</strong><small>${moltresCard() ? "card loaded" : "manual training pending"}</small></div></section>${renderModelOpsPanel()}<section class="panel model-leaderboard"><header class="section-header"><div><p class="eyebrow">Holdout leaderboard</p><h2>Holdout leaderboard</h2></div><span class="chip chip--soft">lower log loss wins</span></header><div class="table-wrapper"><table class="data-table"><thead><tr><th>Model</th><th>Role</th><th>Log loss</th><th>Brier</th><th>Live record</th></tr></thead><tbody>${leaderboardRows || `<tr><td colspan="5">No comparison rows loaded.</td></tr>`}</tbody></table></div></section><section class="models-legend"><span>Metric guide</span><small>Accuracy ↑</small><small>Log loss ↓</small><small>Brier ↓</small><small>ROC AUC ↑</small><small>Calibration ↓</small><small>Stability ↑</small></section><section class="models-gallery">${entries.length ? entries.map(renderModelGalleryCard).join("") : emptyState("No MLB models in registry", "Train or load a real MLB registry export to populate the model comparison.")}</section>${detail}${renderWnbaModelLabCard()}${renderWnbaPropModelPanel()}</section>`;
}

function renderModelTrustCenter(sport) {
    const selected = selectedModelEntry(sport);
    const record = getModelRecord(sport);
    const live = sport === "MLB" ? (record.live_record || record.overall || {}) : (record.historical_record || record.overall || {});
    const backtest = sport === "MLB" ? record.backtest_record || {} : sport === "WNBA" ? summarizeRecordRows(state.wnbaBacktest.games) : {};
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
            ${card("Features", selected?.feature_count || (sport === "WNBA" ? "score + Elo" : "-"), sport === "MLB" ? "rich MLB feature set" : sport === "WNBA" ? "score-only baseline" : "historical export")}
            ${card(sport === "MLB" ? "Live record" : "Historical record", recordLine(live), formatProbability(live.accuracy))}
            ${card("Backtest", sport === "MLB" ? recordLine(backtest) : sport === "WNBA" ? recordLine(backtest) : "NFL export", sport === "MLB" || sport === "WNBA" ? formatProbability(backtest.accuracy) : "scored from rows")}
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
                ${["MLB", "NFL", "WNBA"].map(value => `<button class="${sport === value ? "is-active" : ""}" data-record-sport="${value}">${value}</button>`).join("")}
            </div>
        </section>
        ${renderModelAccountabilityCenter()}
        ${sport === "MLB" ? renderMlbRecordView() : sport === "WNBA" ? renderWnbaRecordView() : renderNflRecordView()}
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
    if (sport === "WNBA") {
        return getLogEntries().filter(row => row.sport === "WNBA").length
            ? getLogEntries().filter(row => row.sport === "WNBA")
            : state.wnba.games;
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
                <p class="record-start-note">${escapeHtml(recordTrackingStartCopy("MLB"))}</p>
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

function renderWnbaRecordView() {
    const rows = filterRecordRows(recordRowsForSport("WNBA"), "WNBA");
    const summary = summarizeRecordRows(rows);
    const backtest = state.wnbaBacktest.games;
    const backtestSummary = summarizeRecordRows(backtest);
    const selected = selectedModelEntry("WNBA");
    return `<section class="dashboard-grid"><article class="panel record-hero-card"><header><p class="eyebrow">WNBA Model Record</p><h2>${recordLine(summary)}</h2></header><p class="muted">Only exported WNBA model picks are counted. Schedule-only scoreboard rows never enter the record.</p><p class="record-start-note">${escapeHtml(recordTrackingStartCopy("WNBA"))}</p><div class="summary-grid summary-grid--compact">${card("Scored", summary.wins + summary.losses, "logged decisions")}${card("Accuracy", formatProbability(summary.wins + summary.losses ? summary.wins / (summary.wins + summary.losses) : null), "live export")}${card("Pending", summary.pending, "awaiting final")}${card("Production", selected?.model_name || "Not selected", selected?.technical_name || "model registry")}</div></article><article class="panel"><header><p class="eyebrow">WNBA Holdout</p><h2>${recordLine(backtestSummary)}</h2></header><p class="muted">Chronological backtest rows from the completed-season holdout. This remains separate from the live current-season record.</p><div class="summary-grid summary-grid--compact">${card("Rows", backtest.length, "backtest export")}${card("Accuracy", formatProbability(backtestSummary.wins + backtestSummary.losses ? backtestSummary.wins / (backtestSummary.wins + backtestSummary.losses) : null), "holdout rows")}${card("Model", selected?.model_name || "Not selected", "Raikou / Entei / Suicune")}</div></article></section><section class="panel"><header><p class="eyebrow">Record Calendar</p><h2>Recent WNBA accountability</h2></header>${renderRecordCalendar("WNBA")}</section><section class="panel"><header class="section-header"><div><p class="eyebrow">Prediction Log</p><h2>Recent WNBA picks</h2></div>${renderRecordFilters()}</header>${rows.length ? renderRecordPredictionTable(rows.slice(0, 20), "WNBA") : emptyState("No WNBA prediction log rows", "Run npm run refresh:wnba:all after the current season source is available.")}</section>`;
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
    const meta = sport === "MLB" ? normalizeMeta(state.mlb.payload) : sport === "WNBA" ? normalizeMeta(state.wnba.payload) : normalizeMeta(state.nfl.payload);
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
        ${selectedModel ? "" : emptyState("No registry entry", sport === "MLB" ? "Run npm run refresh:mlb:all." : sport === "WNBA" ? "Run npm run refresh:wnba:all." : "NFL registry support is schema-ready.")}
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
        <p class="muted">Last scoring run: ${escapeHtml(timestamp(lastRun))}. ${sport === "NFL" ? "NFL scoring remains schema-ready and depends on exported cover-result fields." : sport === "WNBA" ? "WNBA scoring uses final ESPN scoreboard results; odds are not part of this first model release." : "MLB scoring uses cached MLB Stats API schedule/results when available."}</p>
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
        ${summary.entries.length ? renderPredictionLogTable(summary.entries.slice(0, 6)) : emptyState("No prediction log", sport === "MLB" ? "Run npm run refresh:mlb, then npm run score:models." : sport === "WNBA" ? "Run npm run refresh:wnba:all." : "NFL prediction logging is schema-ready.")}
    `;
}

function renderPredictionLogTable(rows) {
    return `<div class="table-wrapper"><table class="data-table"><thead><tr><th>Date</th><th>Game</th><th>Pick</th><th>Prob</th><th>Result</th></tr></thead><tbody>${rows.map(row => `<tr><td>${formatDate(row.game_date)}</td><td>${escapeHtml(row.away)} @ ${escapeHtml(row.home)}</td><td><strong>${escapeHtml(row.model_pick)}</strong></td><td>${formatProbability(row.confidence || Math.max(safeNumber(row.home_win_probability, 0), safeNumber(row.away_win_probability, 0)))}</td><td>${escapeHtml(row.model_result || row.result_status || "pending")}</td></tr>`).join("")}</tbody></table></div>`;
}

function renderFeatureSummary(sport) {
    if (sport === "WNBA") {
        const summary = state.wnbaFeatureSummary || {};
        const meta = summary.metadata || {};
        const features = summary.features || [];
        return `<header><p class="eyebrow">Feature summary</p><h2>WNBA score + Elo baseline</h2></header><div class="summary-grid summary-grid--compact">${card("Rows", meta.row_count || 0, "real schedule rows")}${card("Completed", meta.completed_rows || 0, "usable outcomes")}${card("Inputs", features.length, "leakage-safe features")}${card("Advanced stats", meta.advanced_stats_status || "pending", "honest source status")}</div>${features.length ? `<div class="stat-list">${features.map(feature => `<div><strong>${escapeHtml(feature)}</strong><span>pregame</span></div>`).join("")}</div>` : emptyState("No WNBA feature summary", "Run npm run refresh:wnba:all.")}`;
    }
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
            <div><p class="eyebrow">Team Profiles</p><h2>Team-level context from prediction exports</h2><p class="muted">Current slate plus every loaded historical prediction row.</p></div>
            <div class="select-row"><select id="team-sport-select"><option ${state.selected.teamSport === "MLB" ? "selected" : ""}>MLB</option><option ${state.selected.teamSport === "NFL" ? "selected" : ""}>NFL</option></select><select id="team-select">${teams.map(team => `<option value="${team.abbreviation}" ${team.abbreviation === state.selected.teamCode ? "selected" : ""}>${team.full_name}</option>`).join("")}</select></div>
        </section>
        ${selected ? renderTeamProfile(selected) : emptyState("No team metadata", "Team metadata file is missing.")}
    `;
}

function renderTeamProfile(team) {
    const games = teamProfileGames(team);
    const probabilityValues = games
        .map(game => {
            const prob = getGameProbability(game, team.sport);
            if (prob === null) return null;
            return game.home === team.abbreviation ? prob : 1 - prob;
        })
        .filter(value => value !== null);
    const avgProb = probabilityValues.length ? probabilityValues.reduce((sum, value) => sum + value, 0) / probabilityValues.length : null;
    const runDifferential = teamAverageRunDifferential(team, games);
    const oldestDate = games.length ? gameIsoDate(games.at(-1)) : null;
    const newestDate = games.length ? gameIsoDate(games[0]) : null;
    const coverage = oldestDate && newestDate ? `${formatDate(oldestDate)} – ${formatDate(newestDate)}` : "No historical rows loaded";
    const tableSource = team.sport === "MLB" ? "MLB_REVIEW_ALL" : "NFL";
    return `
        <section class="team-profile panel">
            <div class="team-profile__hero" style="--team-color:${team.primary}">
                ${renderTeamLogo(team.sport, team.abbreviation, "lg", team.full_name)}
                <div><p class="eyebrow">${team.sport}</p><h2>${escapeHtml(team.full_name)}</h2><p class="muted">${escapeHtml(team.city)} profile across the full loaded prediction history.</p></div>
                ${renderFavoriteButton(team.sport, team.abbreviation, `Favorite ${team.full_name}`)}
            </div>
            <div class="summary-grid summary-grid--compact">
                ${card("Loaded games", games.length, "prediction rows")}
                ${card("Average model probability", formatProbability(avgProb), "team perspective")}
                ${card(team.sport === "MLB" ? "Average run differential" : "ATS context", team.sport === "MLB" ? formatNumber(runDifferential, 2) : "Export dependent", "across available rows")}
                ${card("Data status", games.length ? "Available" : "Limited", team.sport === "MLB" ? "pitcher data optional" : "injury data optional")}
            </div>
            <article class="panel panel--nested team-profile__history"><header><div><p class="eyebrow">All loaded games</p><h2>Team game context</h2><p class="muted">${escapeHtml(coverage)} · ${games.length} rows across current and historical exports.</p></div><span class="chip chip--soft">Historical view</span></header>${games.length ? renderGameTable(team.sport, games, tableSource) : emptyState("No games for this team", "Load a prediction export containing this team.")}</article>
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
            ${state.refreshRuntime.available ? "" : `<p class="data-status" data-variant="warning">The widget opens as a popup in browser mode and refreshes through the local bridge when started with <code>npm run app</code>. Static hosting can only show cached scores.</p>`}
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
        doctorStatus("Player prop markets", Boolean(state.playerProps?.markets?.length), "npm run refresh:props", `${state.playerProps?.markets?.length || 0} normalized rows`),
        doctorStatus("WNBA availability", state.wnbaAvailability?.metadata?.status === "success", "npm run refresh:wnba:availability", `${state.wnbaAvailability?.players?.length || 0} explicit report rows`),
        doctorStatus("Prop matching", Boolean(state.propsDiagnostics), "npm run refresh:props", state.propsDiagnostics ? "WNBA and MLB diagnostics loaded" : "missing diagnostics export"),
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
    const productionModel = selectedModelEntry("MLB");
    const modes = [
        ["App version", state.app.version || APP_VERSION, "Visible release metadata"],
        ["NFL data mode", dataMode(state.nfl.payload, state.nfl.games), "data/predictions/nfl_predictions.json"],
        ["MLB data mode", dataMode(state.mlb.payload, state.mlb.games), "data/predictions/mlb_predictions.json"],
        ["MLB Stats API", "No key required", "schedule/probable pitchers/status/scores"],
        ["NFL data", "nfl-data-py/cached pipeline", "exported NFL predictions or offseason cache"],
        ["Odds API", oddsStatusLabel(), oddsStatusMessage()],
        ["WNBA player props", state.wnbaPropPredictions?.metadata?.status || "not trained", "data/predictions/wnba_prop_predictions.json"],
        ["Prop odds", state.playerProps?.metadata?.status || "no market available", "data/odds/player_props.json"],
        ["Odds quota", state.oddsHealth?.metadata?.quota?.["x-requests-remaining"] || "not exported", "data/odds/odds_health.json"],
        ["Reports mode", state.report?.metadata?.real_data === false ? "missing" : state.report ? "ready" : "missing", "data/reports/model_report.json"],
        ["MLB feature summary", state.featureSummary ? `${state.featureSummary.feature_count || 0} features` : "missing", "data/reports/mlb_feature_summary.json"],
        ["Model comparison", state.modelComparison ? `${(state.modelComparison.models || []).length} rows` : "missing", "data/reports/mlb_model_comparison.json"],
        ["Model registry", state.modelRegistry ? `${(state.modelRegistry.models || []).length} model runs` : "missing", "data/models/model_registry.json"],
        ["Prediction log", state.predictionLog ? `${getLogEntries().length} snapshots` : "missing", "data/tracking/model_predictions_log.json"],
        ["Model record", state.modelRecord ? timestamp(state.modelRecord.metadata?.generated_at) : "missing", "data/tracking/model_record.json"],
        ["MLB training policy", productionModel?.production_fit_policy || "Daily retrain when startup automation runs", productionModel?.production_fit_rows ? `${productionModel.production_fit_rows.toLocaleString()} completed rows in production fit` : "Latest season is held out for evaluation"],
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
            <div class="report-actions"><button class="btn" type="button" data-reopen-onboarding>Reopen onboarding</button><button class="btn btn--primary" type="button" data-open-about>Open About</button></div>
            <span class="chip">${escapeHtml(state.app.version || APP_VERSION)}</span>
        </section>
        ${renderUiPreferencesPanel()}
        ${renderDataDoctorPanel()}
        ${renderLiveWidgetSettings()}
        ${renderRefreshPanel("settings")}
        ${renderCommandConsole("settings")}
        <section class="panel"><div class="settings-grid">${modes.map(([label, status, note]) => `<div class="setting-row"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(status)}</span><code>${escapeHtml(note)}</code></div>`).join("")}</div></section>
        ${dataMode(state.nfl.payload, state.nfl.games) === "missing" ? `<section class="panel">${renderNflManualRecoveryCard()}</section>` : ""}
        <section class="panel settings-support-panel"><header class="section-header"><div><p class="eyebrow">About &amp; Support</p><h2>Project links</h2></div></header><div class="report-actions"><button class="btn btn--primary" type="button" data-open-about>Open About</button><a class="btn" href="RELEASE_NOTES_v4.1.0.md" target="_blank" rel="noopener noreferrer">View release notes</a><button class="btn" type="button" data-reopen-onboarding>Reopen onboarding</button><button class="btn" type="button" data-external-link="https://github.com/VrajP0518/LineLens">View source</button><button class="btn" type="button" data-external-link="https://github.com/VrajP0518/LineLens/issues">Report an issue</button></div></section>
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
            <ol class="onboarding-steps"><li><strong>Find today’s strongest model signal</strong><span>Home puts the best available pick, freshness, production model, and recent record in one glance.</span></li><li><strong>Open a matchup or save it</strong><span>Inspect consensus, odds, factors, GameCast, then star the game or team for Watchlist.</span></li><li><strong>Use Model Lab, Record, and History</strong><span>Compare challengers, verify performance, and discover older MLB seasons without hunting through files.</span></li></ol>
            <footer><label class="onboarding-check"><input id="onboarding-dont-show" type="checkbox" /> Do not show again</label><div class="onboarding-actions"><button class="btn" type="button" data-onboarding-skip>Skip</button><button class="btn btn--primary" type="button" data-onboarding-start>Start Demo</button></div></footer>
        </section>
    `;
}

function renderAbout() {
    const root = $("#view-about");
    if (!root) return;
    const version = state.app.version || APP_VERSION;
    const production = selectedModelEntry("MLB");
    const wnbaProduction = selectedModelEntry("WNBA");
    const generatedAt = [
        state.app.generated_at,
        normalizeMeta(state.mlb.payload).generated_at,
        normalizeMeta(state.wnba.payload).generated_at,
        state.modelRecord?.metadata?.generated_at,
        state.refreshStatus?.generated_at,
    ].filter(Boolean).sort().at(-1);
    const record = getModelRecord("MLB");
    const supportedSports = ["MLB", "WNBA", "NFL", "Soccer", "NBA", "NHL"];
    root.innerHTML = `
        <section class="about-page" aria-labelledby="about-page-title">
            <header class="about-page__header">
                <div>
                    <p class="eyebrow">Product information</p>
                    <h2 id="about-page-title">About LineLens</h2>
                    <p class="about-page__lede">LineLens Sports is a desktop sports-intelligence and model-evaluation application. It brings scoreboards, prediction exports, model comparisons, and accountability records into one local-first workspace.</p>
                </div>
                <div class="about-page__version"><span>Current version</span><strong>${escapeHtml(version)}</strong><small>${escapeHtml(timestamp(generatedAt) || "Bundled data date unavailable")}</small></div>
            </header>

            <div class="about-page__grid">
                <div class="about-page__main">
                    <section class="about-section">
                        <h3>Production models</h3>
                        <div class="about-definition-list">
                            <div><dt>MLB</dt><dd><strong>${escapeHtml(production?.model_name || "Not declared")}</strong><span>Production · ${escapeHtml(production?.technical_name || production?.algorithm || "algorithm unavailable")}</span></dd></div>
                            <div><dt>WNBA</dt><dd><strong>${escapeHtml(wnbaProduction?.model_name || "Not declared")}</strong><span>Production · ${escapeHtml(wnbaProduction?.technical_name || wnbaProduction?.algorithm || "algorithm unavailable")}</span></dd></div>
                            <div><dt>NFL</dt><dd><strong>Historical export</strong><span>No current production registry model is claimed</span></dd></div>
                            <div><dt>Challenger</dt><dd><strong>Moltres</strong><span>${escapeHtml(moltresStatusLabel())}</span></dd></div>
                        </div>
                    </section>

                    <section class="about-section">
                        <h3>Project</h3>
                        <div class="about-action-list">
                            <button class="about-action" type="button" data-external-link="https://github.com/VrajP0518/LineLens"><span>View source</span><small>GitHub repository</small><b aria-hidden="true">↗</b></button>
                            <button class="about-action" type="button" data-external-link="https://github.com/VrajP0518/LineLens/releases"><span>View releases</span><small>Windows builds and release history</small><b aria-hidden="true">↗</b></button>
                            <button class="about-action" type="button" data-external-link="https://github.com/VrajP0518/LineLens/issues"><span>Report an issue</span><small>Open a repository issue</small><b aria-hidden="true">↗</b></button>
                            <a class="about-action" href="RELEASE_NOTES_v4.1.0.md" target="_blank" rel="noopener noreferrer"><span>View release notes</span><small>${escapeHtml(version)} release notes</small><b aria-hidden="true">↗</b></a>
                        </div>
                        <div class="about-meta-row"><span>Build</span><strong>${escapeHtml(state.app.desktop_build || "Desktop build metadata unavailable")}</strong><span>Model record</span><strong>${escapeHtml(timestamp(record?.metadata?.generated_at) || "Unavailable")}</strong></div>
                    </section>

                    <section class="about-section">
                        <h3>Technology</h3>
                        <dl class="about-tech-list">
                            <div><dt>Desktop shell</dt><dd>Tauri</dd></div>
                            <div><dt>Interface</dt><dd>Vanilla HTML, CSS, and JavaScript</dd></div>
                            <div><dt>Modeling</dt><dd>Python, scikit-learn, pandas, NumPy, joblib</dd></div>
                            <div><dt>Data pipelines</dt><dd>MLB Stats API, ESPN scoreboard exports, nfl-data-py / existing NFL pipeline</dd></div>
                            <div><dt>Builds</dt><dd>GitHub Actions for Windows bundles</dd></div>
                        </dl>
                    </section>
                </div>

                <aside class="about-page__side">
                    <section class="about-section about-section--creator">
                        <h3>Created by</h3>
                        <strong class="about-creator-name">Vraj Patel</strong>
                        <p class="muted">Designed and developed by Vraj Patel.</p>
                        <div class="about-creator-actions">
                            <button class="btn" type="button" data-external-link="https://github.com/VrajP0518">GitHub profile</button>
                            <button class="btn" type="button" data-external-link="https://www.linkedin.com/in/vraj-patel-883636288/">LinkedIn profile</button>
                        </div>
                    </section>
                    <section class="about-section">
                        <h3>Supported sports</h3>
                        <p class="about-sport-list">${supportedSports.map(sport => `<span>${escapeHtml(sport)}</span>`).join("")}</p>
                    </section>
                    <section class="about-section">
                        <h3>Data, privacy, and transparency</h3>
                        <ul class="about-list"><li>Predictions and records use real available data.</li><li>Unavailable fields are labelled instead of fabricated.</li><li>Optional API keys remain local and are never shown in the interface.</li><li>Bundled exports let core pages open without Python or live network access.</li><li>Favorites, tracking, and interface preferences use local storage.</li><li>LineLens does not provide betting advice.</li></ul>
                    </section>
                    <section class="about-section about-section--notice">
                        <h3>Disclaimer</h3>
                        <p>LineLens Sports is an educational and portfolio project. Predictions, probabilities, records, market information, and model outputs are provided for demonstration and analysis only and should not be treated as gambling, financial, or betting advice.</p>
                    </section>
                </aside>
            </div>

            <section class="about-section about-section--credits">
                <div><h3>Credits and data sources</h3><p class="muted">LineLens uses the sports feeds, libraries, and build tools documented in the project and labels source-dependent gaps in the interface.</p></div>
                <p class="about-credit-line">MLB Stats API · ESPN scoreboard · optional The Odds API snapshots · nfl-data-py / NFL pipeline · scikit-learn · Tauri · GitHub Actions</p>
                <p class="about-trademark">Pokémon names are used only as informal model codenames. LineLens is not affiliated with or endorsed by Nintendo, The Pokémon Company, or Game Freak.</p>
            </section>
        </section>
    `;
}

function openExternalLink(url) {
    const href = String(url || "").trim();
    if (!/^https:\/\//i.test(href)) {
        showToast("External link unavailable");
        return;
    }
    const opened = window.open(href, "_blank", "noopener,noreferrer");
    if (!opened) showToast("Allow external links to open in your browser");
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
            switchView("about");
            return;
        }
        const externalLink = event.target.closest("[data-external-link]");
        if (externalLink) {
            openExternalLink(externalLink.dataset.externalLink);
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

        const picksSport = event.target.closest("[data-picks-sport]");
        if (picksSport) {
            state.selected.picksSport = picksSport.dataset.picksSport;
            persistSettings();
            renderPicks();
            return;
        }
        const picksShift = event.target.closest("[data-picks-shift]");
        if (picksShift) {
            movePicksDate(Number(picksShift.dataset.picksShift));
            return;
        }
        const propsSport = event.target.closest("[data-props-sport]");
        if (propsSport) {
            state.selected.propsSport = propsSport.dataset.propsSport;
            state.selected.propsDateManual = false;
            persistSettings();
            renderProps();
            return;
        }
        const propsShift = event.target.closest("[data-props-shift]");
        if (propsShift) {
            const dates = [...new Set(propPredictionRows().filter(row => (state.selected.propsSport === "all" || String(row.sport || "").toUpperCase() === state.selected.propsSport) && (!row.candidate_only || row.model_only_pick)).map(row => String(row.game_date || "").slice(0, 10)).filter(Boolean))].sort();
            const current = state.selected.propsDate || dates[0];
            const index = dates.indexOf(current);
            const next = dates[index + Number(propsShift.dataset.propsShift)];
            if (next) {
                state.selected.propsDate = next;
                state.selected.propsDateManual = true;
                persistSettings();
                renderProps();
            }
            return;
        }
        const picksOpen = event.target.closest("[data-picks-open]");
        if (picksOpen) {
            openGameCast(picksOpen.dataset.picksSport, picksOpen.dataset.picksOpen);
            return;
        }
        if (event.target.closest("[data-copy-picks-brief]")) {
            copyPicksBrief();
            return;
        }

        const propOpen = event.target.closest("[data-prop-open]");
        if (propOpen) {
            state.selected.propId = propOpen.dataset.propOpen;
            state.selected.propPlayer = null;
            persistSettings();
            renderProps();
            return;
        }
        const propProfile = event.target.closest("[data-prop-profile]");
        if (propProfile) {
            state.selected.propId = null;
            state.selected.propPlayer = { id: propProfile.dataset.propProfile, sport: propProfile.dataset.propProfileSport };
            persistSettings();
            renderProps();
            return;
        }
        if (event.target.closest("[data-prop-close]")) {
            state.selected.propId = null;
            persistSettings();
            renderProps();
            return;
        }
        if (event.target.closest("[data-prop-profile-close]")) {
            state.selected.propPlayer = null;
            persistSettings();
            renderProps();
            return;
        }

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

        const pinModel = event.target.closest("[data-pin-model]");
        if (pinModel) {
            togglePinnedModel(pinModel.dataset.pinModel);
            return;
        }

        const historyOpen = event.target.closest("[data-history-open]");
        if (historyOpen) {
            const sport = historyOpen.dataset.historySport || "MLB";
            const row = historyRows().find(item => item.sport === sport && gameKey(item) === historyOpen.dataset.historyOpen);
            if (row) openGameCast(sport, row);
            return;
        }

        if (event.target.closest("[data-export-history]")) {
            exportHistoryCsv();
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

        const scoreboardDay = event.target.closest("[data-scoreboard-day]");
        if (scoreboardDay) {
            const sport = normalizedSportCode(scoreboardDay.dataset.scoreboardSport);
            moveScoreboardDate(sport, Number(scoreboardDay.dataset.scoreboardDay));
            renderView(scoreboardViewForSport(sport));
            return;
        }

        const scoreboardDate = event.target.closest("[data-scoreboard-date]");
        if (scoreboardDate) {
            const sport = normalizedSportCode(scoreboardDate.dataset.scoreboardSport);
            setScoreboardDateValue(sport, scoreboardDate.dataset.scoreboardDate);
            renderView(scoreboardViewForSport(sport));
            return;
        }

        const wnbaDay = event.target.closest("[data-wnba-day]");
        if (wnbaDay) {
            moveWnbaDate(Number(wnbaDay.dataset.wnbaDay));
            renderWNBA();
            return;
        }

        const wnbaDate = event.target.closest("[data-wnba-date]");
        if (wnbaDate) {
            state.selected.wnbaDate = wnbaDate.dataset.wnbaDate;
            persistSettings();
            renderWNBA();
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
            sport === "NFL" ? renderNFL() : sport === "WNBA" ? renderWNBA() : renderMLB();
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
                scrollToMlbMatchup();
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
                        : sourceName === "MLB_REVIEW_ALL"
                            ? allMlbReviewRows()
                        : sourceName === "WNBA"
                            ? state.wnba.games
                            : state.mlb.games;
            const game = source.find(item => gameKey({ ...item, sport }) === row.dataset.gameId) || source[Number(row.dataset.gameIndex)];
            state.selected[sport.toLowerCase()] = game;
            persistSettings();
            sport === "NFL" ? renderNFL() : sport === "WNBA" ? renderWNBA() : renderMLB();
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
        if (event.target.id === "wnba-date-picker" && !event.target.dataset.scoreboardDatePicker) {
            state.selected.wnbaDate = event.target.value;
            persistSettings();
            renderWNBA();
        }
        const scoreboardPicker = event.target.closest("[data-scoreboard-date-picker]");
        if (scoreboardPicker) {
            const sport = normalizedSportCode(scoreboardPicker.dataset.scoreboardDatePicker);
            setScoreboardDateValue(sport, event.target.value);
            renderView(scoreboardViewForSport(sport));
        }
        if (["picks-date-picker", "picks-status-filter", "picks-confidence-filter", "picks-model-filter", "picks-sort-select"].includes(event.target.id)) {
            const field = event.target.id.replace("picks-", "").replace("-filter", "");
            if (event.target.id === "picks-date-picker") state.selected.picksDate = event.target.value;
            else if (event.target.id === "picks-status-filter") state.selected.picksStatus = event.target.value;
            else if (event.target.id === "picks-confidence-filter") state.selected.picksConfidence = event.target.value;
            else if (event.target.id === "picks-model-filter") state.selected.picksModel = event.target.value;
            else if (event.target.id === "picks-sort-select") state.selected.picksSort = event.target.value;
            persistSettings();
            renderPicks();
        }
        if (event.target.id === "picks-watchlist-filter") {
            state.selected.picksWatchlist = event.target.checked;
            persistSettings();
            renderPicks();
        }
        if (event.target.id === "picks-disagreement-filter") {
            state.selected.picksDisagree = event.target.checked;
            persistSettings();
            renderPicks();
        }
        if (["props-sport", "props-date", "props-market", "props-side", "props-confidence", "props-game", "props-search", "props-status", "props-sort"].includes(event.target.id)) {
            const mapping = {"props-sport": "propsSport", "props-date": "propsDate", "props-market": "propsMarket", "props-side": "propsSide", "props-confidence": "propsConfidence", "props-game": "propsGame", "props-search": "propsSearch", "props-status": "propsStatus", "props-sort": "propsSort"};
            state.selected[mapping[event.target.id]] = event.target.value;
            if (event.target.id === "props-date") state.selected.propsDateManual = true;
            if (event.target.id === "props-sport") state.selected.propsDateManual = false;
            persistSettings();
            renderProps();
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
        const historyFilters = {
            "history-sport": "historySport",
            "history-season": "historySeason",
            "history-result": "historyResult",
            "history-confidence": "historyConfidence",
            "history-model": "historyModel",
            "history-team": "historyTeam",
            "history-from": "historyFrom",
            "history-to": "historyTo",
        };
        if (historyFilters[event.target.id]) {
            state.selected[historyFilters[event.target.id]] = event.target.value;
            persistSettings();
            renderHistory();
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

    document.addEventListener("input", event => {
        if (event.target.id === "history-search") {
            state.selected.historyQuery = event.target.value;
            renderHistory();
            const input = $("#history-search");
            if (input) {
                input.focus();
                input.setSelectionRange(input.value.length, input.value.length);
            }
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && state.gamecast.open) {
            closeGameCast();
        }
    });

    $("#refresh-btn").addEventListener("click", () => runStartupAutomation());
}

function setupSidebarResize() {
    const handle = $("#sidebar-resizer");
    if (!handle) return;
    const root = document.documentElement;
    const saved = safeNumber(localStorage.getItem("linelens.sidebarWidth.v1"));
    const min = 214;
    const max = 300;
    const apply = width => {
        const value = Math.max(min, Math.min(max, width));
        root.style.setProperty("--sidebar-width", `${value}px`);
        root.style.setProperty("--sidebar-scale", Math.max(0.86, Math.min(1.2, value / 260)).toFixed(3));
        localStorage.setItem("linelens.sidebarWidth.v1", String(Math.round(value)));
    };
    if (saved !== null) apply(saved);
    let dragging = false;
    let startX = 0;
    let startWidth = 260;
    handle.addEventListener("pointerdown", event => {
        if (window.matchMedia("(max-width: 1100px)").matches) return;
        dragging = true;
        startX = event.clientX;
        startWidth = safeNumber(getComputedStyle(root).getPropertyValue("--sidebar-width").replace("px", ""), 260);
        handle.setPointerCapture?.(event.pointerId);
        document.body.classList.add("is-resizing-sidebar");
    });
    handle.addEventListener("pointermove", event => {
        if (dragging) apply(startWidth + event.clientX - startX);
    });
    const stop = () => {
        dragging = false;
        document.body.classList.remove("is-resizing-sidebar");
    };
    handle.addEventListener("pointerup", stop);
    handle.addEventListener("pointercancel", stop);
}

document.addEventListener("DOMContentLoaded", () => {
    setupSidebarResize();
    bindEvents();
    loadAll();
});
