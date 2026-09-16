// Check text against solid surfaces and the worst gradient stop beneath it.
// This is conservative; spatial image/pseudo-element composition also needs screenshots.
module.exports = function contrastReport() {
    const rgb = value => {
        const channels = (value.match(/[\d.]+/g) || []).map(Number);
        if (value.startsWith('color(srgb ')) return channels.map((n, i) => i < 3 ? n * 255 : n);
        return channels;
    };
    const over = (fg, bg) => fg.slice(0, 3).map((channel, i) => channel * (fg[3] ?? 1) + bg[i] * (1 - (fg[3] ?? 1)));
    const luminance = color => color.reduce((sum, c, i) => {
        const n = c / 255;
        return sum + (n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4) * [.2126,.7152,.0722][i];
    }, 0);
    const results = [];
    document.querySelectorAll('.view.is-active *, .topbar *, .sidebar *, .gamecast-drawer *').forEach(el => {
        if (!el.getClientRects().length || el.closest('[inert], [disabled], [aria-hidden="true"]')) return;
        const text = [...el.childNodes].filter(node => node.nodeType === Node.TEXT_NODE).map(node => node.textContent).join('').trim();
        if (!text) return;
        const style = getComputedStyle(el);
        if (style.visibility !== 'visible') return;
        let backgrounds = [[255,255,255]];
        const layers = [];
        for (let parent = el; parent; parent = parent.parentElement) {
            const ps = getComputedStyle(parent);
            const stops = [...ps.backgroundImage.matchAll(/(?:rgba?|color)\([^()]+\)/g)].map(match => rgb(match[0]));
            layers.unshift({ solid: rgb(ps.backgroundColor), stops });
            // An opaque surface shields text from decorative ancestors.
            if ((rgb(ps.backgroundColor)[3] ?? 1) === 1) break;
        }
        layers.forEach(layer => {
            backgrounds = backgrounds.flatMap(bg => {
                const solid = over(layer.solid, bg);
                return layer.stops.length ? layer.stops.map(stop => over(stop, solid)) : [solid];
            }).slice(0, 128);
        });
        const contrast = bg => {
            const a = luminance(over(rgb(style.color), bg)), b = luminance(bg);
            return (Math.max(a,b) + .05) / (Math.min(a,b) + .05);
        };
        const bg = backgrounds.sort((a,b) => contrast(a) - contrast(b))[0];
        const ratio = contrast(bg);
        const large = parseFloat(style.fontSize) >= 24 || (parseFloat(style.fontSize) >= 18.66 && Number(style.fontWeight) >= 700);
        if (ratio < (large ? 3 : 4.5)) results.push({ tag: el.tagName, class: el.className, parent: el.parentElement.className, text: text.slice(0,70), color: style.color, background: bg.map(Math.round), ratio: Number(ratio.toFixed(2)) });
    });
    return results;
};
