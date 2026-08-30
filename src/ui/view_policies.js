/* Small, dependency-free view policy module.
 *
 * The main application is still intentionally loaded as a legacy script while
 * view concerns move out incrementally. Keep this module DOM-only so it can be
 * replaced by view modules without changing the data layer.
 */
(function (global) {
    const ui = global.LineLensUI || {};

    ui.applyRestraintCopy = function applyRestraintCopy(view, root) {
        if (!root) return;
        if (view === "home") {
            root.querySelectorAll(".home-focus-pick > header > .eyebrow, .home-focus-panel > header .eyebrow").forEach(node => node.remove());
            root.querySelector(".home-focus-header > div > .muted")?.remove();
        }
        if (view === "picks") {
            root.querySelector(".picks-best")?.remove();
            root.querySelector(".picks-hero .eyebrow")?.remove();
            root.querySelector(".picks-hero h2")?.replaceChildren(document.createTextNode("Today’s picks"));
            root.querySelector(".picks-hero .muted")?.remove();
            root.querySelector(".picks-hero .chip")?.remove();
        }
    };

    global.LineLensUI = ui;
})(window);
