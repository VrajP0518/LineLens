"""Validate the durable LineLens interaction and responsive-design contracts."""

from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def main() -> int:
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    app = (ROOT / "app.js").read_text(encoding="utf-8")
    css = (ROOT / "styles.css").read_text(encoding="utf-8")

    require('id="command-palette-btn"' in html, "top-bar quick switch trigger is missing")
    require('id="command-palette-root"' in html, "quick switch dialog mount is missing")
    require(
        all(token in app for token in (
            "function renderCommandPalette",
            "function commandPaletteGameRows",
            "function commandPalettePropRows",
            "function executeCommandPaletteItem",
            'event.key.toLowerCase() === "k"',
            'role="combobox"',
            'role="listbox"',
        )),
        "quick switch search, keyboard, or ARIA contract is incomplete",
    )
    require(
        all(token in css for token in (
            ".command-palette-layer",
            ".command-palette__item.is-active",
            "@media (max-width: 620px)",
            "@media (prefers-reduced-motion: reduce)",
        )),
        "quick switch responsive or reduced-motion styling is incomplete",
    )
    require(
        all(token in html for token in (
            'aria-label="Search and quick switch"',
            'aria-label="Refresh data"',
            'aria-label="About LineLens"',
            'class="topbar-action__icon"',
        ))
        and "Iteration 10: a compact global command bar" in css
        and "grid-template-columns: minmax(0, 1fr) auto" in css
        and ".topbar-action__label" in css,
        "compact top bar does not preserve accessible search, refresh, and About controls",
    )
    require(
        'id="global-health-signal"' in html
        and "function globalDataHealth" in app
        and all(label in app for label in ("Live current", "Cached scores", "Predictions only", "Needs data"))
        and ".global-health-signal[data-tone=" in css,
        "global data health signal is missing an honest live, cached, prediction-only, or missing state",
    )
    require(
        "async function detectBrowserRefreshBridge" in app
        and 'fetch("/api/health"' in app
        and 'payload?.service === "linelens-local-refresh"' in app
        and "return Boolean(state.refreshRuntime.bridgeVerified)" in app,
        "static hosting can be mistaken for a privileged local refresh bridge",
    )
    dpi_audit = (ROOT / "scripts" / "windows_dpi_audit.ps1").read_text(encoding="utf-8")
    require(
        "[double[]]$Scales" in dpi_audit
        and "[int]$ViewportWidth" in dpi_audit
        and '"--window-size=$ViewportWidth,$ViewportHeight"' in dpi_audit,
        "Windows DPI audit cannot reproduce compact viewport regressions",
    )

    require("renderMlbLiveSituation" in app, "live MLB situation view is missing")
    require("mlb-live-scoreboard__score" in css and "mlb-base-state" in css, "live score hierarchy or base state is missing")
    require("@container prediction-board" in css, "NFL board is not container responsive")
    require(
        ".mlb-game-card.is-model-won .mlb-card-flip__face" in css
        and ".mlb-game-card.is-model-lost .mlb-card-flip__face" in css,
        "settled prediction result borders are not visually explicit",
    )
    require(
        ".mlb-card-flip:hover .mlb-card-flip__inner" not in css,
        "MLB cards must flip only from the explicit Details control",
    )
    require(
        'aria-hidden="true" inert' in app and "front.inert = flipped" in app,
        "hidden MLB card faces remain keyboard reachable",
    )

    require("--ll-ink: #f3f6f5" in css, "primary text token is not the high-contrast v6 ink")
    require("clamp(" in css, "fluid sizing contract is missing")
    require(
        "Compact-window shell" in css
        and ".sidebar > .nav" in css
        and "overflow-x: auto" in css,
        "compact windows still place the full vertical sidebar before content",
    )
    visual_audit = (ROOT / "scripts" / "browser_visual_regression.ps1").read_text(encoding="utf-8")
    require(
        "home-mobile" in visual_audit
        and "mlb-calendar-boundary" in visual_audit
        and "390" in visual_audit
        and "audit-date=2026-08-30" in visual_audit
        and "--screenshot=$screenshot" in visual_audit,
        "browser visual regression matrix is missing mobile, calendar-boundary, or screenshot coverage",
    )
    require(
        all(f'data-nav-group="{group}"' in html for group in ("home", "explore", "mine", "analytics", "more"))
        and 'id="notifications-btn"' in html
        and "NAV_SECTIONS_KEY" in app
        and ".nav__section.is-collapsed .nav__item" in css,
        "hierarchical navigation or top-bar notifications are missing",
    )
    require(
        "function renderGameDetailHero" in app
        and "data-picks-edge" in app
        and "data-mlb-tab=\"economics\"" in app
        and "onboardingSports" in app
        and ".game-detail-hero" in css,
        "focused Home, Picks, Game Detail, MLB tabs, or onboarding experience is missing",
    )
    require(
        'src/ui/view_policies.js' in html
        and "applyRestraintCopy" in app
        and (ROOT / "src" / "ui" / "view_policies.js").exists(),
        "frontend view-policy extraction seam is missing",
    )
    require(
        "home-focus-layout" in app
        and "renderHomeFocusLive" in app
        and "renderHomeModelPulse" in app,
        "focused Home pick, live, watchlist, or performance layout is missing",
    )
    require(
        "No picks for today" in app
        and ">History<" in html
        and ">Tracker<" in html
        and "Scores only" in html
        and ">Settings<" in html,
        "first-time navigation and Home positioning are not clear enough",
    )
    require(
        "settings-disclosure" in app
        and "picks-page-header" in app
        and "Data status" in app
        and "Product design audit" in css,
        "restrained settings, picks, data-status, or visual-language pass is missing",
    )
    require(
        "Difference between the model probability and the latest matched market price." in app
        and "marketProbabilityForPick" in app
        and "pick-freshness" in app,
        "prediction cards do not separate model probability, market probability, edge, and freshness",
    )
    require(
        "gamecast-source-health" in app
        and "Cached / verify" in app
        and "No matched real snapshot" in app,
        "GameCast does not make current, cached, and missing source states explicit",
    )
    require(
        "renderConfidenceAnatomy" in app
        and "Evidence coverage is availability, not a quality score" in app
        and "Proper score; not calibration alone" in app,
        "model probability, validation, consensus, and market evidence are not explained separately",
    )
    require(
        ".confidence-anatomy" in css
        and "height: max-content" in css
        and ".moltres-components--compact > div" in css,
        "GameCast evidence panels can collapse or component labels can collide in compact layouts",
    )
    require(
        "renderOperationalModelPassport" in app
        and "A challenger must improve both log loss and Brier" in app
        and "Bundled registry only; no standalone attestation record" in app
        and ".model-passport__timeline" in css,
        "Model Lab lacks an honest production, evaluation-boundary, promotion, and provenance passport",
    )
    require(
        "renderGameCastLiveCommand" in app
        and "Design fixture" in app
        and "not live data" in app
        and "Latest play unavailable from the feed" in app
        and ".gamecast-live-command" in css
        and ".mlb-base-state__label" in css,
        "GameCast live state does not keep score context, bases, latest play, and freshness together",
    )
    require(
        "function underdogPerformanceSummary" in app
        and "Model Brier" in app
        and "Market baseline" in app
        and "average no-vig probability" in app
        and "implied / (implied + opponentImplied)" in app
        and ".underdog-evidence__grid" in css,
        "Underdogs lacks probability-quality evidence against the real market baseline",
    )

    print("PASS: LineLens navigation, accessibility, responsive, live-score, and result-state design contracts")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
