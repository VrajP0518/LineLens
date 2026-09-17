/* Presentation only: no feed state, probabilities, or timestamps are rewritten. */
(function (global) {
    const paths = {
        home: '<path d="m3 10 9-7 9 7v10h-6v-7H9v7H3Z"/>',
        picks: '<path d="M5 5h14M5 12h10M5 19h6"/><path d="m15 17 2 2 4-5"/>',
        props: '<circle cx="12" cy="7" r="3"/><path d="M5 21v-3a7 7 0 0 1 14 0v3M9 17h6"/>',
        mlb: '<circle cx="12" cy="12" r="9"/><path d="M6 5c7 3 7 11 0 14M18 5c-7 3-7 11 0 14"/>',
        nfl: '<path d="M3 20C1 8 8 1 21 3c2 12-5 19-18 17Z"/><path d="m8 16 8-8m-8 4 4 4m-1-7 4 4"/>',
        wnba: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3v18M6 5c8 3 8 11 0 14M18 5c-8 3-8 11 0 14"/>',
        nhl: '<ellipse cx="12" cy="9" rx="9" ry="4"/><path d="M3 9v6c0 5 18 5 18 0V9"/>',
        soccer: '<circle cx="12" cy="12" r="9"/><path d="m12 7 5 4-2 6H9l-2-6Zm0-4v4m5 4 4-2m-6 8 2 3m-8-3-2 3m0-9-4-2"/>',
        watchlist: '<path d="m12 3 3 6 6 1-4 5 1 6-6-3-6 3 1-6-4-5 6-1Z"/>',
        tracking: '<rect x="5" y="5" width="14" height="16" rx="1"/><path d="M9 3h6v4H9zM8 12h8M8 16h5"/>',
        models: '<path d="m12 3 9 5-9 5-9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5"/>',
        reports: '<path d="M5 21V3h10l4 4v14ZM9 11h6M9 15h6M9 7h2"/>',
        record: '<path d="M4 3v18h17M8 17v-6m5 6V6m5 11v-8"/>',
        foryou: '<path d="M4 5h16M4 12h16M4 19h16"/><circle cx="8" cy="5" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="10" cy="19" r="2"/>',
        history: '<path d="M4 8a9 9 0 1 1-1 8M3 3v6h6M12 7v5l3 2"/>',
        teams: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 4v3"/>',
        settings: '<path d="M3 6h18M3 18h18"/><circle cx="8" cy="6" r="3"/><circle cx="16" cy="18" r="3"/>',
    };
    paths.nba = paths.wnba;
    document.querySelectorAll('.nav__item[data-view]').forEach(button => {
        const mark = button.querySelector('.nav-sport-mark');
        if (mark && paths[button.dataset.view]) mark.innerHTML = `<svg viewBox="0 0 24 24" focusable="false">${paths[button.dataset.view]}</svg>`;
    });

    const media = global.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let revealObserver;
    const animated = new WeakSet();
    global.LineLensUI.animateView = function animateView(root) {
        revealObserver?.disconnect();
        if (!root || media.matches || !('IntersectionObserver' in global)) return;
        revealObserver = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                const element = entry.target;
                revealObserver.unobserve(element);
                if (animated.has(element)) return;
                animated.add(element);
                const delay = Number(element.dataset.motionDelay || 0);
                // Visible by default; animate only after entry. Failed observers never hide data.
                element.animate([
                    { opacity: .85, transform: 'translateY(6px)' },
                    { opacity: 1, transform: 'translateY(0)' },
                ], { duration: 180, delay, easing: 'ease-out' });
            });
        }, { threshold: .08, rootMargin: '0px 0px -24px 0px' });
        root.querySelectorAll('.edition-league, .edition-section-head, .edition-review').forEach((element, index) => {
            element.classList.remove('ll-scroll-reveal');
            element.dataset.motionDelay = String(Math.min(index % 3 * 25, 50));
            revealObserver.observe(element);
        });
    };
    function paint() {
        frame = 0;
        const hero = document.querySelector('.view.is-active .edition-hero');
        if (!hero) return;
        const offset = media.matches ? 0 : Math.min(360, Math.max(0, -hero.getBoundingClientRect().top));
        hero.style.setProperty('--cover-shift', `${offset * .15}px`);
        hero.style.setProperty('--cover-turn', `${offset * .035}deg`);
    }
    // One passive listener, no scroll hijacking, timers, or render-loop work when idle.
    global.addEventListener('scroll', () => { if (!frame) frame = requestAnimationFrame(paint); }, { passive: true });
    media.addEventListener('change', () => {
        paint();
        if (media.matches) {
            revealObserver?.disconnect();
            document.getAnimations().forEach(animation => animation.cancel());
        } else global.LineLensUI.animateView(document.querySelector('.view.is-active'));
    });
    global.LineLensUI.sportsArtwork = () => `<div class="edition-art" aria-hidden="true"><div class="edition-art__orbit"></div><span class="edition-art__label">THE GAME / THE NUMBERS</span><img class="edition-art__basketball" src="assets/editorial-basketball.svg" alt="" width="320" height="320" /><img class="edition-art__baseball" src="assets/editorial-baseball.svg" alt="" width="320" height="320" /><img class="edition-art__football" src="assets/editorial-football.svg" alt="" width="360" height="220" /><span class="edition-art__index">LL / 01</span></div>`;
})(window);
