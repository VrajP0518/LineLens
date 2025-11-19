const DATA_URL = "data/predictions.json";

const TEAM_COLORS = {
    ARI: { primary: "#97233F", secondary: "#FFB612" },
    ATL: { primary: "#A71930", secondary: "#000000" },
    BAL: { primary: "#241773", secondary: "#9E7C0C" },
    BUF: { primary: "#00338D", secondary: "#C60C30" },
    CAR: { primary: "#0085CA", secondary: "#101820" },
    CHI: { primary: "#0B162A", secondary: "#C83803" },
    CIN: { primary: "#FB4F14", secondary: "#000000" },
    CLE: { primary: "#311D00", secondary: "#FF3C00" },
    DAL: { primary: "#003594", secondary: "#869397" },
    DEN: { primary: "#FB4F14", secondary: "#002244" },
    DET: { primary: "#0076B6", secondary: "#B0B7BC" },
    GB: { primary: "#203731", secondary: "#FFB612" },
    HOU: { primary: "#03202F", secondary: "#A71930" },
    IND: { primary: "#002C5F", secondary: "#A2AAAD" },
    JAX: { primary: "#006778", secondary: "#9F792C" },
    KC: { primary: "#E31837", secondary: "#FFB81C" },
    LAC: { primary: "#0080C6", secondary: "#FFC20E" },
    LAR: { primary: "#003594", secondary: "#FFA300" },
    LV: { primary: "#000000", secondary: "#A5ACAF" },
    OAK: { primary: "#000000", secondary: "#A5ACAF" },
    MIA: { primary: "#008E97", secondary: "#FC4C02" },
    MIN: { primary: "#4F2683", secondary: "#FFC62F" },
    NE: { primary: "#002244", secondary: "#C60C30" },
    NO: { primary: "#D3BC8D", secondary: "#101820" },
    NYG: { primary: "#0B2265", secondary: "#A71930" },
    NYJ: { primary: "#125740", secondary: "#FFFFFF" },
    PHI: { primary: "#004C54", secondary: "#A5ACAF" },
    PIT: { primary: "#FFB612", secondary: "#101820" },
    SEA: { primary: "#002244", secondary: "#69BE28" },
    SF: { primary: "#AA0000", secondary: "#B3995D" },
    TB: { primary: "#D50A0A", secondary: "#0A0A08" },
    TEN: { primary: "#4B92DB", secondary: "#002A5C" },
    WAS: { primary: "#5A1414", secondary: "#FFB612" },
    WSH: { primary: "#5A1414", secondary: "#FFB612" },
};

const TEAM_ALIASES = {
    JAC: "JAX",
    JACKSONVILLE: "JAX",
    SFO: "SF",
    SANFRANCISCO: "SF",
    WAS: "WSH",
    WFT: "WSH",
    LVR: "LV",
    OAK: "LV",
    SD: "LAC",
    SDG: "LAC",
    LA: "LAR",
    STL: "LAR",
};

const TEAM_NAMES = {
    ARI: "Arizona Cardinals",
    ATL: "Atlanta Falcons",
    BAL: "Baltimore Ravens",
    BUF: "Buffalo Bills",
    CAR: "Carolina Panthers",
    CHI: "Chicago Bears",
    CIN: "Cincinnati Bengals",
    CLE: "Cleveland Browns",
    DAL: "Dallas Cowboys",
    DEN: "Denver Broncos",
    DET: "Detroit Lions",
    GB: "Green Bay Packers",
    HOU: "Houston Texans",
    IND: "Indianapolis Colts",
    JAX: "Jacksonville Jaguars",
    KC: "Kansas City Chiefs",
    LAC: "Los Angeles Chargers",
    LAR: "Los Angeles Rams",
    LV: "Las Vegas Raiders",
    MIA: "Miami Dolphins",
    MIN: "Minnesota Vikings",
    NE: "New England Patriots",
    NO: "New Orleans Saints",
    NYG: "New York Giants",
    NYJ: "New York Jets",
    PHI: "Philadelphia Eagles",
    PIT: "Pittsburgh Steelers",
    SEA: "Seattle Seahawks",
    SF: "San Francisco 49ers",
    TB: "Tampa Bay Buccaneers",
    TEN: "Tennessee Titans",
    WAS: "Washington Commanders",
    WSH: "Washington Commanders",
};

const TEAM_LOGO_BASE = "https://static.www.nfl.com/t_q-best/league/api/clubs/logos";

function canonicalTeamCode(team = "") {
    const upper = team.toString().trim().toUpperCase();
    return TEAM_ALIASES[upper] ?? upper;
}

function buildLogoUrl(teamCode) {
    return `${TEAM_LOGO_BASE}/${teamCode}.png`;
}

function getTeamMeta(team) {
    const code = canonicalTeamCode(team);
    const colors = TEAM_COLORS[code] ?? { primary: "#4dd0fb", secondary: "#7c4dff" };
    return {
        code,
        colors,
        abbreviation: code,
        display: TEAM_NAMES[code] ?? team ?? code,
        logo: buildLogoUrl(code),
    };
}

const elements = {
    season: document.querySelector("#season-select"),
    week: document.querySelector("#week-select"),
    matchup: document.querySelector("#matchup-select"),
    gamesBody: document.querySelector("#games-body"),
    filter: document.querySelector("#table-filter"),
    lastUpdated: document.querySelector("#last-updated"),
    refreshBtn: document.querySelector("#refresh-btn"),
    dataStatus: document.querySelector("#data-status"),
    matchupTitle: document.querySelector("#matchup-title"),
    probHome: document.querySelector("#prob-home"),
    probHomeDetail: document.querySelector("#prob-home-detail"),
    probAwayDetail: document.querySelector("#prob-away-detail"),
    spreadLine: document.querySelector("#spread-line"),
    actualResult: document.querySelector("#actual-result"),
    homeMoneyline: document.querySelector("#home-moneyline"),
    awayMoneyline: document.querySelector("#away-moneyline"),
    probHomeBar: document.querySelector("#prob-home-bar"),
    probAwayBar: document.querySelector("#prob-away-bar"),
    confidenceLabel: document.querySelector("#confidence-label"),
    confidenceCopy: document.querySelector("#confidence-copy"),
    homeTimeline: document.querySelector("#home-timeline"),
    awayTimeline: document.querySelector("#away-timeline"),
    homeTimelineTitle: document.querySelector("#home-timeline-title"),
    awayTimelineTitle: document.querySelector("#away-timeline-title"),
    homeFormChip: document.querySelector("#home-form-chip"),
    awayFormChip: document.querySelector("#away-form-chip"),
    seasonRecordBody: document.querySelector("#season-record-body"),
    weeklyRecordBody: document.querySelector("#weekly-record-body"),
    homeLogo: document.querySelector("#home-logo"),
    awayLogo: document.querySelector("#away-logo"),
    homeInitial: document.querySelector("#home-initial"),
    awayInitial: document.querySelector("#away-initial"),
    homeName: document.querySelector("#home-name"),
    awayName: document.querySelector("#away-name"),
    homeEmblem: document.querySelector("#home-emblem"),
    awayEmblem: document.querySelector("#away-emblem"),
};

let games = [];
let trendChart;
let datasetCache = typeof window !== "undefined" ? window.__PREDICTIONS__ ?? null : null;
let seasonRecords = [];
let weeklyRecords = new Map();

const uniqueSorted = arr => [...new Set(arr)].sort((a, b) => a - b);

function applyTeamEmblem(logoEl, initialEl, wrapperEl, meta) {
    if (!logoEl || !initialEl) return;
    if (!meta) {
        logoEl.hidden = true;
        logoEl.removeAttribute("src");
        initialEl.textContent = "---";
        initialEl.hidden = false;
        if (wrapperEl) {
            wrapperEl.style.removeProperty("background-image");
            wrapperEl.style.removeProperty("border-color");
        }
        return;
    }
    const abbrev = meta.abbreviation ?? meta.code ?? "---";
    initialEl.textContent = abbrev;
    logoEl.hidden = false;
    logoEl.src = meta.logo;
    logoEl.alt = `${meta.display} logo`;
    initialEl.hidden = true;
    const primary = meta.colors?.primary ?? "#4dd0fb";
    const secondary = meta.colors?.secondary ?? primary;
    const gradient = `radial-gradient(circle at 30% 30%, ${hexToRgba(secondary, 0.65)}, ${hexToRgba(primary, 0.95)})`;
    if (wrapperEl) {
        wrapperEl.style.backgroundImage = gradient;
        wrapperEl.style.border = `2px solid ${hexToRgba(primary, 0.85)}`;
    }
    logoEl.onerror = () => {
        logoEl.hidden = true;
        initialEl.hidden = false;
    };
    logoEl.onload = () => {
        logoEl.hidden = false;
        initialEl.hidden = true;
    };
}

function resetMatchupBanner() {
    if (elements.homeName) elements.homeName.textContent = "-";
    if (elements.awayName) elements.awayName.textContent = "-";
    applyTeamEmblem(elements.homeLogo, elements.homeInitial, elements.homeEmblem, null);
    applyTeamEmblem(elements.awayLogo, elements.awayInitial, elements.awayEmblem, null);
    if (elements.homeInitial) elements.homeInitial.textContent = "HME";
    if (elements.awayInitial) elements.awayInitial.textContent = "AWY";
}

async function fetchDataset() {
    const res = await fetch(DATA_URL, { cache: "no-cache" });
    if (!res.ok) {
        throw new Error(`Failed to load ${DATA_URL} (${res.status})`);
    }
    return res.json();
}

function hydrateFilters(dataset) {
    const seasons = uniqueSorted(dataset.map(game => game.season));
    elements.season.innerHTML = seasons.map(season => `<option value="${season}">${season}</option>`).join("");
    elements.season.value = seasons.at(-1);
    renderWeeks();
}

function renderWeeks() {
    const season = Number(elements.season.value);
    const weeks = uniqueSorted(games.filter(game => game.season === season).map(game => game.week));
    elements.week.innerHTML = weeks.map(week => `<option value="${week}">Week ${week}</option>`).join("");
    if (!weeks.length) {
        elements.week.value = "";
        elements.matchup.innerHTML = "";
        elements.gamesBody.innerHTML = "";
        return;
    }
    elements.week.value = weeks.at(-1);
    renderMatchups();
    renderWeeklyRecord();
}

function renderMatchups() {
    const season = Number(elements.season.value);
    const week = Number(elements.week.value);
    const filtered = games.filter(game => game.season === season && game.week === week);
    if (!filtered.length) {
        elements.matchup.innerHTML = "";
        elements.gamesBody.innerHTML = "";
        elements.matchupTitle.textContent = "No games for selection";
        return;
    }
    elements.matchup.innerHTML = filtered
        .map(game => `<option value="${game.id}">${game.away} @ ${game.home}</option>`)
        .join("");
    elements.matchup.value = filtered[0].id;
    updatePanels(filtered[0]);
    renderTable(filtered);
}

function renderTable(rows) {
    elements.gamesBody.innerHTML = rows
        .map(row => `
            <tr data-filter="${row.home}${row.away}">
                <td>${row.home}</td>
                <td>${row.away}</td>
                <td>${formatSpread(row.spread_line)}</td>
                <td>${formatProbability(row.model_home_cover)}</td>
                <td>${formatResult(row)}</td>
            </tr>
        `)
        .join("");
}

function updatePanels(game) {
    const homeMeta = getTeamMeta(game.home);
    const awayMeta = getTeamMeta(game.away);
    elements.matchupTitle.textContent = `${awayMeta.display} @ ${homeMeta.display}`;
    elements.probHome.textContent = formatProbability(game.model_home_cover);
    elements.spreadLine.textContent = formatSpread(game.spread_line);
    elements.actualResult.textContent = formatResult(game);
    elements.homeMoneyline.textContent = formatMoneyline(game.home_moneyline);
    elements.awayMoneyline.textContent = formatMoneyline(game.away_moneyline);

    updateMatchupBanner(homeMeta, awayMeta);
    updateProbabilityBreakdown(game, homeMeta, awayMeta);

    elements.homeTimelineTitle.textContent = `${homeMeta.abbreviation} recent`;
    elements.awayTimelineTitle.textContent = `${awayMeta.abbreviation} recent`;

    setThemeColors(homeMeta, awayMeta);
    renderTimeline(game.home, elements.homeTimeline, elements.homeFormChip, "home");
    renderTimeline(game.away, elements.awayTimeline, elements.awayFormChip, "away");
    updateChart(game, homeMeta, awayMeta);
}

function updateMatchupBanner(homeMeta, awayMeta) {
    if (elements.homeName) elements.homeName.textContent = homeMeta.display;
    if (elements.awayName) elements.awayName.textContent = awayMeta.display;
    applyTeamEmblem(elements.homeLogo, elements.homeInitial, elements.homeEmblem, homeMeta);
    applyTeamEmblem(elements.awayLogo, elements.awayInitial, elements.awayEmblem, awayMeta);
}

function renderSeasonRecord() {
    if (!elements.seasonRecordBody) return;
    if (!seasonRecords.length) {
        elements.seasonRecordBody.innerHTML = `<tr><td colspan="3">No finished games yet.</td></tr>`;
        return;
    }
    elements.seasonRecordBody.innerHTML = seasonRecords
        .map(record => `
            <tr>
                <td>${record.season}</td>
                <td>${formatRecordLine(record)}</td>
                <td>${formatAccuracy(record.accuracy)}</td>
            </tr>
        `)
        .join("");
}

function renderWeeklyRecord() {
    if (!elements.weeklyRecordBody) return;
    const season = Number(elements.season.value);
    const rows = weeklyRecords.get(season) ?? [];
    if (!rows.length) {
        elements.weeklyRecordBody.innerHTML = `<tr><td colspan="3">No completed weeks yet.</td></tr>`;
        return;
    }
    elements.weeklyRecordBody.innerHTML = rows
        .map(record => `
            <tr>
                <td>Week ${record.week}</td>
                <td>${formatRecordLine(record)}</td>
                <td>${formatAccuracy(record.accuracy)}</td>
            </tr>
        `)
        .join("");
}

function renderTimeline(team, mount, chip, side) {
    const gamesForTeam = getRecentGames(team, 5);
    chip.textContent = summarizeForm(gamesForTeam);
    mount.innerHTML = gamesForTeam
        .map(entry => {
            const cls = side === "home" ? "timeline__row timeline__row--home" : "timeline__row timeline__row--away";
            return `
                <div class="${cls}">
                    <strong>${entry.label}</strong>
                    <span>${entry.detail}</span>
                </div>
            `;
        })
        .join("");
}

function summarizeForm(recentGames) {
    const played = recentGames.filter(game => !game.isPending);
    const wins = played.filter(game => game.didWin()).length;
    return played.length ? `${wins}-${played.length - wins} last ${played.length}` : "No data";
}

function getRecentGames(team, limit = 5) {
    return games
        .filter(game => game.home === team || game.away === team)
        .sort((a, b) => (b.season - a.season) || (b.week - a.week))
        .slice(0, limit)
        .map(game => {
            const isHome = game.home === team;
            const opponent = isHome ? game.away : game.home;
            const prefix = `${opponent} (${isHome ? "vs" : "@"})`;
            const outcome = deriveOutcome(game, isHome);
            return {
                label: `${prefix}`,
                detail: `${outcome.result} ${formatScore(game, isHome)}`,
                isPending: outcome.result === "Pending",
                didWin: () => (isHome ? outcome.homeCovered : outcome.awayCovered),
            };
        });
}

function deriveOutcome(game, isHome) {
    const margin = game.cover_margin;
    if (margin === null || margin === undefined) {
        return { result: "Pending", homeCovered: false, awayCovered: false };
    }
    const homeCovered = margin > 0;
    const awayCovered = margin < 0;
    const result = isHome ? (homeCovered ? "W" : "L") : (awayCovered ? "W" : "L");
    return { result, homeCovered, awayCovered };
}

function formatScore(game, isHome) {
    if (game.home_score == null || game.away_score == null) {
        return "";
    }
    return isHome ? `${game.home_score}-${game.away_score}` : `${game.away_score}-${game.home_score}`;
}

function formatSpread(value) {
    if (value == null) return "-";
    return value > 0 ? `+${value.toFixed(1)}` : value.toFixed(1);
}

function formatProbability(value) {
    if (value == null) return "-";
    return `${(value * 100).toFixed(1)}%`;
}

function formatMoneyline(value) {
    if (value == null) return "-";
    return value > 0 ? `+${value}` : `${value}`;
}

function formatAccuracy(value) {
    if (value == null) return "-";
    return `${(value * 100).toFixed(1)}%`;
}

function formatRecordLine(stats) {
    return `${stats.wins}-${stats.losses}-${stats.pushes}`;
}

function formatResult(game) {
    const margin = game.cover_margin;
    if (margin == null) return "Pending";
    if (margin > 0) return "Home covered";
    if (margin < 0) return "Home failed";
    return "Push";
}

function setThemeColors(homeTeamMeta, awayTeamMeta) {
    const homeColor = homeTeamMeta?.colors?.primary ?? "#4dd0fb";
    const awayColor = awayTeamMeta?.colors?.primary ?? "#7c4dff";
    document.documentElement.style.setProperty("--home-color", homeColor);
    document.documentElement.style.setProperty("--away-color", awayColor);
}

function updateChart(game, homeMeta, awayMeta) {
    const ctx = document.querySelector("#trend-chart").getContext("2d");
    const labels = game.trend.labels;
    const homeData = game.trend.home.map(value => value ?? null);
    const awayData = game.trend.away.map(value => value ?? null);
    const homeColor = homeMeta?.colors?.primary ?? "#4dd0fb";
    const awayColor = awayMeta?.colors?.primary ?? "#7c4dff";

    if (!trendChart) {
        trendChart = new Chart(ctx, {
            type: "line",
            data: {
                labels,
                datasets: [
                    {
                        label: homeMeta?.display ?? game.home,
                        data: homeData,
                        borderColor: homeColor,
                        backgroundColor: hexToRgba(homeColor, 0.25),
                        tension: 0.35,
                    },
                    {
                        label: awayMeta?.display ?? game.away,
                        data: awayData,
                        borderColor: awayColor,
                        backgroundColor: hexToRgba(awayColor, 0.25),
                        tension: 0.35,
                    },
                ],
            },
            options: {
                plugins: { legend: { labels: { color: "#f5f6ff" } } },
                scales: {
                    x: { ticks: { color: "#9aa1c6" }, grid: { color: "rgba(255,255,255,0.05)" } },
                    y: { ticks: { color: "#9aa1c6" }, grid: { color: "rgba(255,255,255,0.05)" } },
                },
            },
        });
    } else {
        trendChart.data.labels = labels;
        trendChart.data.datasets[0].label = homeMeta?.display ?? game.home;
        trendChart.data.datasets[0].data = homeData;
        trendChart.data.datasets[0].borderColor = homeColor;
        trendChart.data.datasets[0].backgroundColor = hexToRgba(homeColor, 0.25);
        trendChart.data.datasets[1].label = awayMeta?.display ?? game.away;
        trendChart.data.datasets[1].data = awayData;
        trendChart.data.datasets[1].borderColor = awayColor;
        trendChart.data.datasets[1].backgroundColor = hexToRgba(awayColor, 0.25);
        trendChart.update();
    }
}

function hexToRgba(hex, alpha = 1) {
    const sanitized = hex.replace("#", "");
    if (sanitized.length !== 6) return hex;
    const bigint = parseInt(sanitized, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function bindEvents() {
    elements.season.addEventListener("change", renderWeeks);
    elements.week.addEventListener("change", renderMatchups);
    elements.matchup.addEventListener("change", () => {
        const selected = games.find(game => game.id === elements.matchup.value);
        if (selected) {
            updatePanels(selected);
        }
    });
    elements.filter.addEventListener("input", event => {
        const term = event.target.value.trim().toUpperCase();
        [...elements.gamesBody.children].forEach(row => {
            row.hidden = !row.dataset.filter.toUpperCase().includes(term);
        });
    });
    elements.refreshBtn.addEventListener("click", () => init(true));
}

async function loadDataset(forceReload = false) {
    if (!forceReload && datasetCache) {
        return datasetCache;
    }
    if (!forceReload && window.__PREDICTIONS__) {
        datasetCache = window.__PREDICTIONS__;
        return datasetCache;
    }
    const runningFromFile = window.location.protocol === "file:";
    if (runningFromFile && !forceReload && datasetCache) {
        return datasetCache;
    }
    if (runningFromFile && forceReload) {
        throw new Error("Cannot refresh data without running a local web server.");
    }
    try {
        const payload = await fetchDataset();
        window.__PREDICTIONS__ = payload;
        datasetCache = payload;
        return payload;
    } catch (error) {
        if (!forceReload && datasetCache) {
            return datasetCache;
        }
        if (!forceReload && window.__PREDICTIONS__) {
            return window.__PREDICTIONS__;
        }
        throw error;
    }
}

function setStatus(message, variant = "info") {
    if (!elements.dataStatus) return;
    if (!message) {
        elements.dataStatus.textContent = "";
        elements.dataStatus.hidden = true;
        return;
    }
    elements.dataStatus.textContent = message;
    elements.dataStatus.dataset.variant = variant;
    elements.dataStatus.hidden = false;
}

function applyMeta(meta = {}) {
    if (!elements.lastUpdated) return;
    const timestamp = meta.generated_at
        ? new Date(meta.generated_at).toLocaleString()
        : "Embedded snapshot";
    elements.lastUpdated.textContent = timestamp;
}

function clearUiState() {
    resetMatchupBanner();
    elements.matchupTitle.textContent = "Select a game";
    elements.probHome.textContent = "-";
    if (elements.probHomeDetail) elements.probHomeDetail.textContent = "-";
    if (elements.probAwayDetail) elements.probAwayDetail.textContent = "-";
    elements.spreadLine.textContent = "-";
    elements.actualResult.textContent = "-";
    elements.homeMoneyline.textContent = "-";
    elements.awayMoneyline.textContent = "-";
    if (elements.confidenceLabel) elements.confidenceLabel.textContent = "Select a matchup";
    if (elements.confidenceCopy)
        elements.confidenceCopy.textContent = "We will summarize the edge once you pick a game.";
    setProbabilityFill(elements.probHomeBar, null);
    setProbabilityFill(elements.probAwayBar, null);
    elements.homeTimeline.innerHTML = "";
    elements.awayTimeline.innerHTML = "";
    elements.gamesBody.innerHTML = "";
}

function updateProbabilityBreakdown(game, homeMeta, awayMeta) {
    const homeProb = game.model_home_cover ?? null;
    const awayProb = homeProb == null ? null : 1 - homeProb;
    if (elements.probHomeDetail) {
        elements.probHomeDetail.textContent = formatProbability(homeProb);
        elements.probHomeDetail.title = `${homeMeta.display} cover probability`;
    }
    if (elements.probAwayDetail) {
        elements.probAwayDetail.textContent = formatProbability(awayProb);
        elements.probAwayDetail.title = `${awayMeta.display} cover probability`;
    }
    setProbabilityFill(elements.probHomeBar, homeProb);
    setProbabilityFill(elements.probAwayBar, awayProb);
    updateConfidenceCopy(game, homeProb);
}

function evaluateGameResult(game) {
    if (game.home_cover == null || game.cover_margin == null || game.model_home_cover == null) {
        return null;
    }
    const isPush = Number(game.cover_margin) === 0;
    if (isPush) {
        return { isPush: true, correct: false };
    }
    const predictedHome = game.model_home_cover >= 0.5;
    const actualHome = game.home_cover === 1;
    const correct = predictedHome === actualHome;
    return { isPush: false, correct };
}

function buildSeasonRecords(dataset) {
    const grouped = new Map();
    dataset.forEach(game => {
        const evalResult = evaluateGameResult(game);
        if (!evalResult) return;
        if (!grouped.has(game.season)) {
            grouped.set(game.season, { wins: 0, losses: 0, pushes: 0 });
        }
        const stats = grouped.get(game.season);
        if (evalResult.isPush) stats.pushes += 1;
        else if (evalResult.correct) stats.wins += 1;
        else stats.losses += 1;
    });
    return [...grouped.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([season, stats]) => ({
            season,
            ...stats,
            accuracy: computeAccuracy(stats),
        }));
}

function buildWeeklyRecords(dataset) {
    const perSeason = new Map();
    dataset.forEach(game => {
        const evalResult = evaluateGameResult(game);
        if (!evalResult) return;
        if (!perSeason.has(game.season)) {
            perSeason.set(game.season, new Map());
        }
        const weekMap = perSeason.get(game.season);
        if (!weekMap.has(game.week)) {
            weekMap.set(game.week, { wins: 0, losses: 0, pushes: 0 });
        }
        const stats = weekMap.get(game.week);
        if (evalResult.isPush) stats.pushes += 1;
        else if (evalResult.correct) stats.wins += 1;
        else stats.losses += 1;
    });

    const normalized = new Map();
    perSeason.forEach((weekMap, season) => {
        const rows = [...weekMap.entries()]
            .sort((a, b) => a[0] - b[0])
            .map(([week, stats]) => ({
                week,
                ...stats,
                accuracy: computeAccuracy(stats),
            }));
        normalized.set(season, rows);
    });
    return normalized;
}

function computeAccuracy(stats) {
    const decisive = stats.wins + stats.losses;
    if (!decisive) return null;
    return stats.wins / decisive;
}

function setProbabilityFill(el, prob) {
    if (!el) return;
    const width = prob == null ? 0 : Math.min(1, Math.max(0, prob)) * 100;
    el.style.width = `${width}%`;
    el.style.opacity = prob == null ? 0.2 : 1;
}

function updateConfidenceCopy(game, homeProb) {
    if (!elements.confidenceLabel || homeProb == null) {
        if (elements.confidenceLabel) elements.confidenceLabel.textContent = "Select a matchup";
        if (elements.confidenceCopy)
            elements.confidenceCopy.textContent = "We will summarize the edge once you pick a game.";
        return;
    }
    const awayProb = 1 - homeProb;
    const favoriteIsHome = homeProb >= 0.5;
    const favoriteTeamCode = favoriteIsHome ? game.home : game.away;
    const favoriteMeta = getTeamMeta(favoriteTeamCode);
    const favoriteLabel = favoriteMeta.display;
    const favoriteProb = favoriteIsHome ? homeProb : awayProb;
    const distance = Math.abs(homeProb - 0.5);
    let descriptor;
    if (distance < 0.05) {
        descriptor = {
            label: "Coin flip",
            copy: "Model sees this as a true toss-up. Expect volatility.",
        };
    } else if (distance < 0.12) {
        descriptor = {
            label: "Lean",
            copy: `${favoriteLabel} has a slight edge (${formatProbability(favoriteProb)}).`,
        };
    } else if (distance < 0.2) {
        descriptor = {
            label: "Edge",
            copy: `${favoriteLabel} owns a meaningful cushion (${formatProbability(favoriteProb)}).`,
        };
    } else {
        descriptor = {
            label: "Strong edge",
            copy: `${favoriteLabel} is heavily favored by the model (${formatProbability(favoriteProb)}).`,
        };
    }
    elements.confidenceLabel.textContent = descriptor.label;
    elements.confidenceCopy.textContent = descriptor.copy;
}

async function init(forceReload = false) {
    const runningFromFile = window.location.protocol === "file:";
    setStatus(forceReload ? "Refreshing predictions…" : "Loading predictions…", "info");
    try {
        const payload = await loadDataset(forceReload);
        if (!payload || !Array.isArray(payload.games) || !payload.games.length) {
            throw new Error("Prediction payload is empty.");
        }
        games = payload.games;
        seasonRecords = buildSeasonRecords(games);
        weeklyRecords = buildWeeklyRecords(games);
        applyMeta(payload.meta);
        hydrateFilters(games);
        renderSeasonRecord();
        renderWeeklyRecord();
        if (runningFromFile) {
            setStatus("Snapshot ready. Start a local server to enable refresh.", "warning");
        } else {
            setStatus(forceReload ? "Predictions refreshed." : "Snapshot ready.", "success");
        }
    } catch (error) {
        console.error(error);
        if (games.length) {
            setStatus("Using embedded snapshot. Start a local server to refresh.", "warning");
            renderWeeks();
        } else {
            clearUiState();
            setStatus(
                runningFromFile
                    ? "Unable to load predictions. Make sure web/data/predictions.js exists, then reopen index.html."
                    : "Unable to load predictions. Run export_predictions.py and ensure the assets are reachable.",
                "error",
            );
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    bindEvents();
    init();
});
