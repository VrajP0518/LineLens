const { test, expect } = require('@playwright/test');
const path = require('node:path');
const fs = require('node:fs');

async function openView(page, view) {
    page.on('pageerror', error => console.error(error.stack));
    // Exercise the bundled/offline client, never start a real refresh pipeline.
    await page.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.hostname !== '127.0.0.1') return route.abort();
        if (url.pathname.startsWith('/api/')) return route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"Offline browser test"}' });
        return route.continue();
    });
    await page.addInitScript(() => {
        localStorage.setItem('linelens.settings.v1', JSON.stringify({ onboardingSeen: true, onboardingNever: true }));
    });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#app-loading')).toBeHidden({ timeout: 30000 });
    if (view !== 'home') {
        const item = page.locator(`.nav__item[data-view="${view}"]`);
        if (!await item.isVisible()) await item.locator('..').locator('[data-nav-toggle]').click();
        await item.click();
    }
    await expect(page.locator(`#view-${view}`)).toHaveClass(/is-active/);
    await expect(page.locator('#app-loading')).toBeHidden({ timeout: 30000 });
    await expect(page.locator(`#view-${view}`)).not.toBeEmpty();
    await page.evaluate(() => document.fonts.ready);
}

for (const width of [390, 768, 1440]) {
    for (const view of ['home', 'picks', 'mlb', 'props', 'models', 'record', 'settings', 'watchlist', 'nfl', 'wnba', 'nba', 'reports', 'history', 'teams', 'tracking']) {
        test(`${view} layout at ${width}px`, async ({ page }) => {
            const errors = [];
            page.on('pageerror', error => { errors.push(error.message); console.error(`${view}: ${error.message}`); });
            await page.setViewportSize({ width, height: 1000 });
            await openView(page, view);
            const overflow = await page.evaluate(() => {
                const viewport = document.documentElement.clientWidth;
                const horizontalScrollOwner = element => {
                    for (let node = element.parentElement; node; node = node.parentElement) {
                        if (['auto','scroll'].includes(getComputedStyle(node).overflowX)) return true;
                    }
                    return false;
                };
                return {
                    document: document.documentElement.scrollWidth > viewport + 1,
                    text: [...document.querySelectorAll('.view.is-active h1, .view.is-active h2, .view.is-active h3, .view.is-active p')]
                        .filter(el => el.getClientRects().length && !horizontalScrollOwner(el))
                        .filter(el => el.scrollWidth > el.clientWidth + 2 || el.getBoundingClientRect().right > viewport + 2)
                        .map(el => el.textContent.trim().slice(0, 90)),
                };
            });
            await page.screenshot({ path: `artifacts/editorial-tests/${view}-${width}.png`, fullPage: true, animations: 'disabled' });
            if (width === 1440) {
                const contrast = await page.evaluate(require('./contrast.cjs'));
                fs.writeFileSync(`artifacts/editorial-tests/${view}-contrast.json`, JSON.stringify(contrast, null, 2));
                expect(contrast).toEqual([]);
            }
            expect(overflow).toEqual({ document: false, text: [] });
            expect(errors).toEqual([]);
            if (process.env.CAPTURE_README === '1' && ['home','picks','mlb','nfl'].includes(view) && [390,1440].includes(width)) {
                const folder = path.join(__dirname, '../../docs/images');
                fs.mkdirSync(folder, { recursive: true });
                await page.screenshot({ path: path.join(folder, `editorial-${view}-${width}.png`), fullPage: ['home','nfl'].includes(view), animations: 'disabled' });
            }
        });
    }
}

test('Home navigation, keyboard search, and reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openView(page, 'home');
    await expect(page.locator('.edition-art img')).toHaveCount(3);
    await expect(page.locator('.edition-art__baseball')).toHaveCSS('transform', 'none');
    await page.getByRole('button', { name: 'Explore picks' }).click();
    await expect(page.locator('#view-picks')).toHaveClass(/is-active/);
    await expect(page.locator('.nav__item[data-view="picks"]')).toHaveAttribute('aria-current','page');
    await page.keyboard.press('Control+k');
    await expect(page.locator('[role="combobox"]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('[role="combobox"]')).not.toBeVisible();
});

test('Scroll illustration moves without hiding page content', async ({ page }) => {
    await openView(page, 'home');
    const ball = page.locator('.edition-art__baseball');
    const before = await ball.evaluate(el => getComputedStyle(el).transform);
    await page.evaluate(() => window.scrollTo(0, 450));
    await expect.poll(() => ball.evaluate(el => getComputedStyle(el).transform)).not.toBe(before);
    await expect(page.locator('.edition-review')).toHaveCSS('opacity','1');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(ball).toHaveCSS('transform','none');
});

for (const width of [390, 1440]) {
    test(`Matchup details at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 1000 });
        await openView(page, 'picks');
        await page.locator('#view-picks [data-picks-open]').first().click();
        const drawer = page.locator('.gamecast-drawer');
        await expect(drawer).toBeVisible();
        await expect(page.locator('.app-shell')).toHaveAttribute('inert', '');
        await expect(drawer.locator('[data-close-gamecast]')).toBeFocused();
        const bounds = await drawer.boundingBox();
        expect(bounds.x).toBeGreaterThanOrEqual(-1);
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(width + 1);
        await page.screenshot({ path: `artifacts/editorial-tests/gamecast-${width}.png`, animations: 'disabled' });
        const contrast = await page.evaluate(require('./contrast.cjs'));
        fs.writeFileSync(`artifacts/editorial-tests/gamecast-${width}-contrast.json`, JSON.stringify(contrast, null, 2));
        expect(contrast).toEqual([]);
        if (process.env.CAPTURE_README === '1' && width === 1440) await page.screenshot({ path: 'docs/images/editorial-gamecast-1440.png', animations: 'disabled' });
        await page.keyboard.press('Escape');
        await expect(drawer).not.toBeVisible();
        await expect(page.locator('#view-picks [data-picks-open]').first()).toBeFocused();
    });
}

test('NFL separates current fixtures from historical predictions', async ({ page }) => {
    await openView(page, 'nfl');
    await expect(page.locator('.nfl-current-shell')).toBeVisible();
    await expect(page.locator('.nfl-prediction-notice')).toBeVisible();
    await page.locator('[data-nfl-board="archive"]').click();
    await expect(page.locator('.nfl-current-shell')).not.toBeVisible();
    await page.locator('[data-nfl-board="current"]').click();
    await expect(page.locator('.nfl-current-shell')).toBeVisible();
});

test('Calendar remains chronological across an August/September boundary', async ({ page }) => {
    await openView(page, 'mlb');
    const picker = page.locator('#mlb-date-picker');
    await picker.fill('2026-08-30');
    await picker.dispatchEvent('change');
    const dates = await page.locator('#view-mlb .game-date-chip').evaluateAll(nodes => nodes.map(node => ({ iso: node.dataset.scoreboardDate, text: node.querySelector('strong').textContent })));
    expect(dates.length).toBeGreaterThan(0);
    expect(dates.map(row => row.iso)).toEqual(dates.map(row => row.iso).sort());
    for (const row of dates) {
        const month = new Date(`${row.iso}T12:00:00`).toLocaleDateString('en-US', {month: 'long'});
        expect(row.text).toContain(month);
    }
});
