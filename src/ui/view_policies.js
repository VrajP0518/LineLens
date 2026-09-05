/* Small, dependency-free view policy module.
 *
 * The main application is still intentionally loaded as a legacy script while
 * view concerns move out incrementally. Keep this module DOM-only so it can be
 * replaced by view modules without changing the data layer.
 */
(function (global) {
    const ui = global.LineLensUI || {};

    const headingReplacements = new Map([
        ["Production model pulse", "Recent model results"],
        ["Signal board", "Models and records"],
        ["What deserves attention now", "Current games and picks"],
        ["Highest-conviction board reads", "Model picks"],
        ["Can the model back it up?", "Performance summary"],
        ["Scoring receipt", "Result status"],
        ["Measure the process, not just the pick", "Recent model results"],
        ["Scores that explain their freshness", "Live scores"],
        ["Scores, odds, props, and predictions just work", "Shared data"],
        ["Update models without reinstalling LineLens", "Model updates"],
        ["Widget and app heartbeat", "Live-score refresh"],
        ["Sprint 5 diagnostics", "Client diagnostics"],
        ["Grounded explanations", "Model differences"],
        ["Safe what-if simulator", "Scenario test"],
        ["Compare models by sport", "Model comparison"],
        ["Your daily follow list.", "Watchlist"],
        ["What changed while you were away", "Recent alerts"],
    ]);

    const quietNormalStates = new Set([
        "ready", "current", "available", "success", "connected", "healthy",
        "stable", "linked", "baseline", "all feeds current", "up to date",
        "desktop storage", "real live export",
    ]);

    function simplifyHeadings(root) {
        root.querySelectorAll("h1, h2, h3").forEach(node => {
            const replacement = headingReplacements.get(node.textContent.trim());
            if (replacement) node.textContent = replacement;
        });

        root.querySelectorAll(".section-header .eyebrow, .module-header .eyebrow, .models-hero .eyebrow, .picks-hero .eyebrow, .props-header .eyebrow, .scoreboard-header .eyebrow, .about-page__header .eyebrow").forEach(node => node.remove());

        root.querySelectorAll(".chip, .model-ops-card__status, .model-gallery-card__badge").forEach(node => {
            if (quietNormalStates.has(node.textContent.trim().toLowerCase())) node.remove();
        });
    }

    ui.applyRestraintCopy = function applyRestraintCopy(view, root) {
        if (!root) return;
        simplifyHeadings(root);
        if (view === "home") {
            root.querySelectorAll(".home-focus-pick > header > .eyebrow, .home-focus-panel > header .eyebrow").forEach(node => node.remove());
            root.querySelector(".home-focus-header > div > .muted")?.remove();
        }
        if (view === "picks") {
            root.querySelector(".picks-best")?.remove();
            root.querySelector(".picks-hero .eyebrow")?.remove();
            root.querySelector(".picks-hero h2")?.replaceChildren(document.createTextNode("Today's picks"));
            root.querySelector(".picks-hero .muted")?.remove();
            root.querySelector(".picks-hero .chip")?.remove();
        }
        if (view === "models") {
            root.querySelector(".models-hero > div > p:not(.eyebrow)")?.remove();
            root.querySelector(".model-health-dashboard > .section-header .chip")?.remove();
            const strategyCopy = root.querySelector(".strategy-lab-panel .section-header .muted");
            if (strategyCopy) strategyCopy.textContent = "Metrics from scored prediction records. Pending and unscored rows are excluded.";
        }
        if (view === "props") {
            const noProps = root.querySelector(".props-header h2")?.textContent.trim() === "No qualified props";
            if (noProps) {
                root.querySelector(".props-header__status")?.remove();
                root.querySelector(".props-feed > .section-header")?.remove();
                root.querySelectorAll(".props-feed .empty-state strong").forEach(node => node.remove());
            }
        }
        if (view === "watchlist") {
            const intro = root.querySelector(".module-header .muted");
            if (intro) intro.textContent = "Favorite teams, saved games, and your pinned model. Saved on this device.";
            const pinnedCopy = [...root.querySelectorAll(".panel > .muted")].find(node => node.textContent.includes("daily line of sight"));
            if (pinnedCopy) pinnedCopy.textContent = "Pin a model for quick access. Production status comes from its evaluation record.";
        }
        if (view === "record") {
            root.querySelector(".accountability-center > .section-header .eyebrow")?.remove();
            const settled = root.querySelector(".record-reconciliation > .section-header .chip--success");
            settled?.remove();
        }
        root.querySelectorAll(".game-detail-hero .eyebrow").forEach(node => node.remove());
        const gameDetailTitle = root.querySelector(".game-detail-hero h3");
        if (gameDetailTitle?.textContent.endsWith(" is the current model lean")) {
            gameDetailTitle.textContent = gameDetailTitle.textContent.replace(" is the current model lean", " is the current model pick");
        }
        const gameDetailCopy = root.querySelector(".game-detail-hero__intro > p:not(.eyebrow)");
        if (gameDetailCopy) gameDetailCopy.textContent = "Current prediction, market comparison, and live result.";
    };

    global.LineLensUI = ui;
})(window);
