/* Keyless scoreboard transport shared by the browser app and widget. */
(function (global) {
    const feeds = [
        ['MLB', 'baseball', 'mlb'], ['NFL', 'football', 'nfl'],
        ['WNBA', 'basketball', 'wnba'], ['NBA', 'basketball', 'nba'],
        ['NHL', 'hockey', 'nhl'], ['SOCCER', 'soccer', 'fifa.world'],
    ];
    function timestamp(value) {
        const raw = String(value || '');
        const ms = raw.startsWith('unix:') ? Number(raw.slice(5)) * 1000 : Date.parse(raw);
        return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
    }
    function fresh(value, now = Date.now()) {
        const parsed = timestamp(value);
        return parsed !== null && now - Date.parse(parsed) <= 180000;
    }
    function status(type = {}) {
        const label = `${type.name || ''} ${type.description || ''} ${type.detail || ''}`;
        for (const [pattern, name] of [[/postpon/i, 'Postponed'], [/cancel/i, 'Canceled'], [/suspend/i, 'Suspended'], [/delay/i, 'Delayed']]) {
            if (pattern.test(label)) return name;
        }
        return type.completed || type.state === 'post' ? 'Final' : type.state === 'in' ? 'In Progress' : 'Scheduled';
    }
    function localDate(value) {
        const date = new Date(value);
        if (!Number.isFinite(date.getTime())) return null;
        return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
    }
    function parse(sport, payload, fetchedAt) {
        if (!Array.isArray(payload?.events)) throw new Error(`${sport} returned an invalid scoreboard`);
        return payload.events.flatMap(event => {
            const competition = event.competitions?.[0];
            const away = competition?.competitors?.find(item => item.homeAway === 'away');
            const home = competition?.competitors?.find(item => item.homeAway === 'home');
            if (!away || !home) return [];
            const progress = competition.status || event.status || {};
            const type = progress.type || {};
            const state = status(type);
            const situation = competition.situation;
            const gameTime = competition.date || event.date;
            const score = side => state === 'Scheduled' || side.score == null || side.score === '' || !Number.isFinite(Number(side.score)) ? null : Number(side.score);
            return [{
                sport, game_id: String(event.id || competition.id || ''),
                game_time: gameTime, game_date: localDate(gameTime),
                status: state, status_detail: state === 'Scheduled' ? state : type.shortDetail || type.detail || state,
                source: 'ESPN Scoreboard API', source_status: 'direct_live_fresh', source_type: 'live', fetched_at: fetchedAt,
                away: away.team?.abbreviation, home: home.team?.abbreviation,
                away_display: away.team?.displayName, home_display: home.team?.displayName,
                away_logo: away.team?.logo, home_logo: home.team?.logo,
                away_score: score(away), home_score: score(home),
                inning: sport === 'MLB' ? progress.period ?? null : null,
                inning_state: sport === 'MLB' ? type.shortDetail || null : null,
                period: sport !== 'MLB' ? progress.period ?? null : null,
                clock: progress.displayClock || null,
                balls: situation?.balls ?? null, strikes: situation?.strikes ?? null, outs: situation?.outs ?? null,
                bases: situation ? { first: Boolean(situation.onFirst || situation.runnerOnFirst), second: Boolean(situation.onSecond || situation.runnerOnSecond), third: Boolean(situation.onThird || situation.runnerOnThird) } : null,
                latest_play: situation?.lastPlay?.text || null,
            }];
        });
    }
    async function fetchScores() {
        const results = await Promise.allSettled(feeds.map(async ([sport, category, league]) => {
            let error;
            for (let attempt = 0; attempt < 2; attempt++) {
                const controller = new AbortController();
                const timer = setTimeout(() => controller.abort(), 8000);
                try {
                    const response = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${category}/${league}/scoreboard?limit=1000`, { cache: 'no-store', signal: controller.signal });
                    if (!response.ok) throw new Error(`${sport} scoreboard returned HTTP ${response.status}`);
                    return { sport, games: parse(sport, await response.json(), new Date().toISOString()), attempts: attempt + 1 };
                } catch (failure) { error = failure; }
                finally { clearTimeout(timer); }
            }
            throw error;
        }));
        const games = [], warnings = [], providerAttempts = [];
        results.forEach((result, index) => {
            const sport = feeds[index][0];
            if (result.status === 'fulfilled') {
                games.push(...result.value.games);
                providerAttempts.push({ provider: `ESPN ${sport}`, sport, status: 'fresh', rows: result.value.games.length, attempts: result.value.attempts });
            } else {
                const error = `${sport}: ${result.reason?.message || 'Scoreboard unavailable'}`;
                warnings.push(error);
                providerAttempts.push({ provider: `ESPN ${sport}`, sport, status: 'failed', error });
            }
        });
        if (warnings.length === feeds.length) throw new Error('Live score providers are unreachable. Check your connection or network access to site.api.espn.com. Cached scores remain available.');
        return { metadata: { generated_at: new Date().toISOString(), source: 'Direct ESPN scoreboard feeds', source_status: warnings.length ? 'direct_live_partial' : 'direct_live_fresh', refresh_mode: 'direct_live', freshness_sla_seconds: 180, warnings, provider_attempts: providerAttempts, row_count: games.length }, games };
    }
    // Native timestamps use unix:seconds; preserve fetch time on every row so
    // one healthy league cannot make another league's old scores look current.
    function normalize(payload) {
        if (!Array.isArray(payload?.games)) throw new Error('Invalid live score response');
        const generatedAt = timestamp(payload.metadata?.generated_at);
        return { ...payload, metadata: { ...payload.metadata, generated_at: generatedAt }, games: payload.games.map(game => ({ ...game, game_date: localDate(game.game_time) || game.game_date, fetched_at: timestamp(game.fetched_at) || generatedAt })) };
    }
    global.LineLensLive = { fetchScores, parse, status, timestamp, fresh, normalize };
})(window);
