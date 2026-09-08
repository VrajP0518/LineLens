// Inspect solid-color text/surface contrast. Review gradients and images visually.
module.exports = function contrastReport() {
    const rgb = value => (value.match(/[\d.]+/g) || []).map(Number);
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
        let bg = [255,255,255], gradients = false;
        const layers = [];
        for (let parent = el; parent; parent = parent.parentElement) {
            const ps = getComputedStyle(parent);
            if (ps.backgroundImage !== 'none') gradients = true;
            layers.unshift(rgb(ps.backgroundColor));
        }
        if (gradients) return;
        layers.forEach(layer => { bg = over(layer, bg); });
        const fg = over(rgb(style.color), bg);
        const a = luminance(fg), b = luminance(bg);
        const ratio = (Math.max(a,b) + .05) / (Math.min(a,b) + .05);
        const large = parseFloat(style.fontSize) >= 24 || (parseFloat(style.fontSize) >= 18.66 && Number(style.fontWeight) >= 700);
        if (ratio < (large ? 3 : 4.5)) results.push({ tag: el.tagName, class: el.className, parent: el.parentElement.className, text: text.slice(0,70), color: style.color, background: bg.map(Math.round), ratio: Number(ratio.toFixed(2)) });
    });
    return results;
};
