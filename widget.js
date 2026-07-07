const WIDGET_KEY = "linelens.liveWidget.v1";

const state = {
    payload: window.__LIVE_SCORES__ || { metadata: { source_status: "missing" }, games: [] },
    teams: window.__TEAM_METADATA__ || { teams: [] },
    sport: "All",
    mode: "Live",
    selectedIndex: 0,
    expanded: false,
    workMode: false,
    refreshInterval: 30,
    refreshing: false,
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

function todayIso() {
    return new Date().toISOString().slice(0, 10);
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
    window.setTimeout(() => toast.classList.remove("is-visible"), 2200);
}

async function fetchJson(url) {
    const response = await fetch(url, { cache: "no-cache" });
    if (!response.ok) throw new Error(`${url} returned ${response.status}`);
    return response.json();
}

async function loadLiveData() {
    let payload = window.__LIVE_SCORES__ || null;
    if (window.location.protocol !== "file:") {
        try {
            payload = await fetchJson("data/live/live_scores.json");
        } catch (_error) {
            // Keep bundled/global data if the JSON fetch is unavailable.
        }
    }
    state.payload = payload || state.payload;
    state.selectedIndex = Math.max(0, Math.min(state.selectedIndex, filteredGames().length - 1));
    render();
}

function gameDate(game) {
    return String(game.game_date || game.game_time || "").slice(0, 10);
}

function isLiveGame(game) {
    const status = String(game.status || game.status_detail || "").toLowerCase();
    return status.includes("progress") || status.includes("live") || status.includes("warmup");
}

function isFinalGame(game) {
    const status = String(game.status || game.status_detail || "").toLowerCase();
    return status.includes("final") || status.includes("completed");
}

function filteredGames() {
    const games = Array.isArray(state.payload?.games) ? state.payload.games : [];
    const today = todayIso();
    return games.filter(game => {
        if (state.sport !== "All" && game.sport !== state.sport) return false;
        if (state.mode === "Live") return isLiveGame(game);
        if (state.mode === "Today") return gameDate(game) === today;
        if (state.mode === "Predictions") return Boolean(game.model?.pick);
        if (state.mode === "Finals") return isFinalGame(game);
        return true;
    }).sort((a, b) => Number(isLiveGame(b)) - Number(isLiveGame(a)));
}

function fallbackGames() {
    return Array.isArray(state.payload?.games) ? state.payload.games : [];
}

function selectedGame() {
    const filtered = filteredGames();
    const source = filtered.length ? filtered : fallbackGames();
    if (!source.length) return null;
    state.selectedIndex = Math.max(0, Math.min(state.selectedIndex, source.length - 1));
    return source[state.selectedIndex];
}

function statusChip(game) {
    const status = game?.status || game?.status_detail || "Pending";
    const tone = isLiveGame(game) ? "live" : isFinalGame(game) ? "final" : "scheduled";
    return `<span class="status-chip status-chip--${tone}">${escapeHtml(status)}</span>`;
}

function scoreValue(value) {
    const score = safeNumber(value);
    return score === null ? "-" : String(score);
}

function scoreRow(game) {
    return `
        <div class="score-row">
            <div class="team-score"><span>${escapeHtml(game.away || "AWAY")}</span><strong>${scoreValue(game.away_score)}</strong></div>
            <div class="score-at">@</div>
            <div class="team-score"><span>${escapeHtml(game.home || "HOME")}</span><strong>${scoreValue(game.home_score)}</strong></div>
        </div>
    `;
}

function countLine(game) {
    const parts = [];
    if (game.inning_state || game.inning) parts.push(`${game.inning_state || ""} ${game.inning || ""}`.trim());
    if (safeNumber(game.outs) !== null) parts.push(`${game.outs} out${Number(game.outs) === 1 ? "" : "s"}`);
    if (safeNumber(game.balls) !== null && safeNumber(game.strikes) !== null) parts.push(`${game.balls}-${game.strikes} count`);
    return parts.join(" · ") || game.status_detail || game.status || "Status unavailable";
}

function basesLine(game) {
    const bases = game.bases || {};
    const occupied = [
        bases.first ? "1st" : null,
        bases.second ? "2nd" : null,
        bases.third ? "3rd" : null,
    ].filter(Boolean);
    return occupied.length ? `Runners: ${occupied.join(" + ")}` : "Bases empty / unavailable";
}

function modelLine(game) {
    const model = game.model || {};
    if (!model.pick) return `<span class="model-line">Model: <strong>No model pick</strong></span>`;
    const probability = model.home_win_probability ?? model.away_win_probability;
    return `<span class="model-line">Model: <strong>${escapeHtml(model.pick)}</strong> ${formatProbability(probability)} · ${formatEdge(model.edge)}</span>`;
}

function latestPlay(game) {
    return game.latest_play || game.live_note || game.live_error || "Pitch-by-pitch unavailable for this game.";
}

function renderCompact(game) {
    if (!game) return renderEmpty();
    return `
        <section class="widget-frame is-compact ${state.workMode ? "is-work-mode" : ""}" data-tauri-drag-region>
            ${renderHeader()}
            <article class="featured-game">
                ${scoreRow(game)}
                <div class="status-line"><span class="live-dot"></span> <strong>${escapeHtml(countLine(game))}</strong> ${statusChip(game)}</div>
                <div class="latest-play">Last play: ${escapeHtml(latestPlay(game))}</div>
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

function renderHeader() {
    return `
        <header class="widget-header" data-tauri-drag-region>
            <div class="widget-title">
                <strong>LineLens Live</strong>
                <span>${escapeHtml(sourceStatusLabel())}</span>
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
        <div class="widget-segments">
            ${["Live", "Today", "Predictions", "Finals"].map(value => `<button data-mode="${value}" class="${state.mode === value ? "is-active" : ""}">${value}</button>`).join("")}
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

function renderGameList(games) {
    if (!games.length) return `<div class="widget-empty"><strong>No scoped games</strong><span>Try Today or Predictions.</span></div>`;
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
    const pitcherText = game.probable_pitchers
        ? `${game.probable_pitchers.away || "TBD"} vs ${game.probable_pitchers.home || "TBD"}`
        : "Unavailable";
    return `
        <section class="game-detail">
            <article class="featured-game">
                ${scoreRow(game)}
                <div class="status-line"><span class="live-dot"></span> <strong>${escapeHtml(countLine(game))}</strong> ${statusChip(game)}</div>
                <div class="base-line">${escapeHtml(basesLine(game))}</div>
                <div class="latest-play">Latest: ${escapeHtml(latestPlay(game))}</div>
                ${modelLine(game)}
            </article>
            <div class="detail-grid">
                <div class="detail-cell"><span>Pitchers</span><strong>${escapeHtml(pitcherText)}</strong></div>
                <div class="detail-cell"><span>Model edge</span><strong>${escapeHtml(formatEdge(game.model?.edge))}</strong></div>
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
        return `<div class="widget-empty"><strong>Play feed unavailable</strong><span>${escapeHtml(game.live_error || "Showing score/status only for this game.")}</span></div>`;
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
            ${renderHeader()}
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
        : "Live widget refresh is available in the Tauri desktop app. Browser mode can run npm run refresh:live manually.";
    return `
        <section class="widget-frame ${state.workMode ? "is-work-mode" : ""}">
            ${renderHeader()}
            ${renderFilters()}
            <div class="widget-empty">
                <strong>No live games loaded</strong>
                <span>${escapeHtml(manual)}</span>
            </div>
        </section>
    `;
}

function sourceStatusLabel() {
    const metadata = state.payload?.metadata || {};
    const count = Array.isArray(state.payload?.games) ? state.payload.games.length : 0;
    return `${metadata.source_status || "cached"} · ${count} games · ${formatTimestamp(metadata.generated_at)}`;
}

function render() {
    const root = $("#widget-root");
    const games = filteredGames();
    const allGames = fallbackGames();
    const source = games.length ? games : allGames;
    const game = selectedGame();
    root.innerHTML = state.expanded ? renderExpanded(game, source) : renderCompact(game);
    root.classList.toggle("is-work-mode", state.workMode);
}

async function refreshLive() {
    if (state.refreshing) return;
    state.refreshing = true;
    try {
        if (isTauri()) {
            showToast("Refreshing live scores...");
            await tauriInvoke("run_refresh_command", { commandName: "live_scores" });
        } else {
            showToast("Browser mode: run npm run refresh:live for live updates.");
        }
        await loadLiveData();
        showToast("Live scores loaded");
    } catch (error) {
        showToast(String(error?.message || error || "Live refresh failed"));
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
        if (event.target.closest("[data-prev-game]")) {
            const count = (filteredGames().length || fallbackGames().length || 1);
            state.selectedIndex = (state.selectedIndex - 1 + count) % count;
            savePrefs();
            render();
        }
        if (event.target.closest("[data-next-game]")) {
            const count = (filteredGames().length || fallbackGames().length || 1);
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
    });
}

function startAutoRefresh() {
    window.clearInterval(state.timer);
    if (!state.refreshInterval) return;
    state.timer = window.setInterval(() => {
        if (isTauri()) refreshLive();
        else loadLiveData();
    }, Math.max(15, state.refreshInterval) * 1000);
}

document.addEventListener("DOMContentLoaded", async () => {
    loadPrefs();
    bindEvents();
    await loadLiveData();
    startAutoRefresh();
});
