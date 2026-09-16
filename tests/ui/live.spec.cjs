const { test, expect } = require('@playwright/test');

function event(score = 2, type = { state: 'in', shortDetail: 'Top 5th' }) {
    return { id: 'test-live-1', date: '2026-09-17T00:10:00Z', competitions: [{
        date: '2026-09-17T00:10:00Z', status: { type, period: 5 },
        competitors: [
            { homeAway: 'away', score: String(score), team: { abbreviation: 'NYY', displayName: 'New York Yankees' } },
            { homeAway: 'home', score: '1', team: { abbreviation: 'MIN', displayName: 'Minnesota Twins' } },
        ], situation: { balls: 2, strikes: 1, outs: 1, onFirst: true, lastPlay: { text: 'Single to center.' } },
    }] };
}

async function setup(page, widget = false) {
    const feed = { score: 2, fail: false, partial: false };
    await page.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.hostname === 'site.api.espn.com') {
            if (feed.fail || (feed.partial && url.pathname.includes('/nba/'))) return route.fulfill({ status: 503, body: '{}' });
            return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ events: url.pathname.includes('/mlb/') ? [event(feed.score)] : [] }) });
        }
        if (url.hostname !== '127.0.0.1') return route.abort();
        if (url.pathname.startsWith('/api/')) return route.fulfill({ status: 503, body: '{}' });
        return route.continue();
    });
    await page.addInitScript(() => localStorage.setItem('linelens.settings.v1', JSON.stringify({ onboardingSeen: true, onboardingNever: true })));
    await page.goto(widget ? '/widget.html' : '/');
    await expect.poll(() => page.evaluate(() => state.games?.some(g => g.game_id === 'test-live-1') || state.live?.games.some(g => g.game_id === 'test-live-1'))).toBe(true);
    await expect.poll(() => page.evaluate(() => state.refreshing || state.liveRefresh?.refreshing || false)).toBe(false);
    await page.evaluate(() => { clearInterval(state.timer); clearInterval(state.liveRefresh?.intervalId); });
    return feed;
}

test('Browser heartbeat updates scores, preserves partial data and labels an outage', async ({ page }) => {
    const feed = await setup(page);
    let game = await page.evaluate(() => liveGames().find(g => g.game_id === 'test-live-1'));
    expect(game).toMatchObject({ away_score: 2, home_score: 1, game_date: '2026-09-16', latest_play: 'Single to center.' });
    await page.evaluate(() => applyDataPayload('live', { metadata: { generated_at: '2026-01-01T00:00:00Z' }, games: [] }));
    expect(await page.evaluate(() => liveGames().find(g => g.game_id === 'test-live-1').away_score)).toBe(2);
    feed.score = 4;
    feed.partial = true;
    await page.evaluate(() => refreshLiveHeartbeat({ force: true }));
    expect(await page.evaluate(() => liveGames().find(g => g.game_id === 'test-live-1').away_score)).toBe(4);
    expect(await page.evaluate(() => globalDataHealth().label)).toBe('Partial live feed');
    await page.locator('.nav__item[data-view="mlb"]').click();
    await page.locator('#mlb-date-picker').fill('2026-09-16');
    await page.locator('#mlb-date-picker').dispatchEvent('change');
    await expect(page.locator('.mlb-game-card[data-game-id="test-live-1"] .mlb-live-scoreboard__score')).toHaveText('4 – 1');
    feed.fail = true;
    await page.evaluate(() => {
        state.live.games.forEach(game => { game.fetched_at = '2026-01-01T00:00:00Z'; });
        state.live.payload.metadata.generated_at = '2026-01-01T00:00:00Z';
    });
    await page.evaluate(() => refreshLiveHeartbeat({ force: true }));
    expect(await page.evaluate(() => liveGames().find(g => g.game_id === 'test-live-1'))).toMatchObject({ status: 'Cached', away_score: 4 });
    expect(await page.evaluate(() => state.liveRefresh.lastError)).toContain('unreachable');
    expect(await page.evaluate(() => globalDataHealth().label)).toBe('Cached scores');
});

test('Freshness never expands to the six-hour channel; stale leagues stay cached', async ({ page }) => {
    await setup(page);
    const result = await page.evaluate(() => {
        state.sharedDataStatus = { updated: true };
        const old = new Date(Date.now() - 4 * 60 * 1000).toISOString();
        const fresh = new Date().toISOString();
        state.live.games = [{ sport: 'NBA', game_id: 'old', game_date: '2026-09-16', away: 'NY', home: 'LA', status: 'In Progress', away_score: 30, home_score: 25, fetched_at: old }];
        applyDirectLivePayload({ metadata: { generated_at: fresh, warnings: ['NBA failed'] }, games: [] });
        return { fresh: livePayloadIsFresh({ metadata: { generated_at: old } }), game: liveGames()[0] };
    });
    expect(result.fresh).toBe(false);
    expect(result.game.status).toBe('Cached');
});

test('Score parser preserves postponements, missing scores and native timestamps', async ({ page }) => {
    await setup(page);
    const result = await page.evaluate(payload => {
        const scheduled = LineLensLive.parse('MLB', payload, new Date().toISOString())[0];
        const statuses = ['POSTPONED', 'CANCELED', 'SUSPENDED', 'DELAYED'].map(name => LineLensLive.status({ name, state: 'post' }));
        return { scheduled, statuses, stamp: LineLensLive.normalize({ metadata: { generated_at: 'unix:1789603800' }, games: [] }).metadata.generated_at };
    }, { events: [event(0, { state: 'pre' })] });
    expect(result.scheduled.away_score).toBeNull();
    expect(result.statuses).toEqual(['Postponed', 'Canceled', 'Suspended', 'Delayed']);
    expect(result.stamp).toBe(new Date(1789603800000).toISOString());
    expect(await page.evaluate(() => {
        state.live.games = [];
        return lifecycleStage({ sport: 'MLB', game_id: 'ninth-inning', game_date: '2026-09-16', status: 'In Progress', inning: 9, outs: 3, away_score: 2, home_score: 2 });
    })).toBe('live');
});

test('Browser widget fetches live scores and releases its refresh button', async ({ page }) => {
    const feed = await setup(page, true);
    feed.score = 5;
    await page.evaluate(() => refreshLive());
    expect(await page.evaluate(() => state.games.find(g => g.game_id === 'test-live-1').away_score)).toBe(5);
    await expect(page.locator('[data-refresh-live]').first()).toBeEnabled();
    feed.fail = true;
    await page.evaluate(() => refreshLive());
    expect(await page.evaluate(() => state.refreshStatus)).toContain('cached');
    await expect(page.locator('[data-refresh-live]').first()).toBeEnabled();
});
