// src/map.js — 全国SVG地図の描画と状態管理
(function () {
  'use strict';
  const SVGNS = 'http://www.w3.org/2000/svg';
  let svg = null, onPickCb = null, clickable = null;
  const paths = {};   // prefId -> <path>
  const marks = {};   // prefId -> <text> (emoji)

  function renderFull(container, opts) {
    onPickCb = (opts && opts.onPick) || null;
    clickable = null;
    container.innerHTML = '';
    svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('viewBox', MAP_VIEWBOX.join(' '));
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    for (const p of PREFECTURES) {
      const path = document.createElementNS(SVGNS, 'path');
      path.setAttribute('d', p.d);
      path.setAttribute('fill', 'var(--pref)');
      path.setAttribute('stroke', '#20305a');
      path.setAttribute('stroke-width', '1');
      path.setAttribute('data-id', p.id);
      path.style.cursor = 'pointer';
      path.addEventListener('click', () => {
        if (clickable && !clickable.includes(p.id)) return;
        if (onPickCb) onPickCb(p.id);
      });
      svg.appendChild(path);
      paths[p.id] = path;
    }
    container.appendChild(svg);
  }

  const FILL = { target:'var(--pref-target)', hint:'var(--pref-hint)',
                 answered:'var(--pref-answered)', normal:'var(--pref)' };
  function setStates(states) {
    for (const p of PREFECTURES) {
      const st = (states && states[p.id]) || 'normal';
      if (paths[p.id]) paths[p.id].setAttribute('fill', FILL[st] || FILL.normal);
    }
  }
  function markAnswered(prefId, emoji) {
    if (paths[prefId]) paths[prefId].setAttribute('fill', FILL.answered);
    if (marks[prefId]) marks[prefId].remove();
    const p = PREFECTURES.find(x => x.id === prefId);
    const t = document.createElementNS(SVGNS, 'text');
    t.setAttribute('x', p.c[0]); t.setAttribute('y', p.c[1]);
    t.setAttribute('font-size', '18'); t.setAttribute('text-anchor', 'middle');
    t.setAttribute('dominant-baseline', 'central'); t.setAttribute('pointer-events', 'none');
    t.textContent = emoji;
    svg.appendChild(t); marks[prefId] = t;
  }
  function setClickable(ids) { clickable = ids; }
  function flashPref(prefId, kind) {
    const el = paths[prefId]; if (!el) return;
    const orig = el.getAttribute('fill');
    el.setAttribute('fill', kind === 'good' ? 'var(--good)' : 'var(--bad)');
    setTimeout(() => el.setAttribute('fill', orig), 350);
  }
  function reset() {
    for (const id in marks) marks[id].remove();
    for (const k in marks) delete marks[k];
    setStates({});
    clickable = null;
  }
  window.MAP = { renderFull, setStates, markAnswered, setClickable, flashPref, reset };
})();
