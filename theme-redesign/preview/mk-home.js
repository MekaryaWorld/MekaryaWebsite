/* Mekarya homepage behaviour: hero window, entrances, aero track arrows, build tracker demo.
   Every part degrades to readable static content without script. Safe to load more than once
   (each mk-* section includes it) and re-runs for a section the theme editor re-renders. */
(() => {
  if (window.mkHome) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const heroes = new Set();
  const reveals = new Set();
  let io;

  const initHero = (hero) => {
    if (reduce || hero.dataset.mkReady) return;
    hero.dataset.mkReady = '1';
    const text = hero.querySelector('.mk-hero__text');
    const stage = hero.querySelector('.mk-hero__stage');
    const state = { geo: null };
    state.measure = () => {
      const vw = hero.clientWidth;
      const vh = stage.clientHeight;
      const phone = vw < 990;
      const w = phone ? vw * 0.78 : Math.min(vw * 0.36, (vh - 220) * 0.8);
      const h = w * 1.25;
      const top = phone ? vh * 0.30 : (vh - h) / 2 + 20;
      state.geo = { l: (vw - w) / 2, r: (vw - w) / 2, t: top, b: Math.max(vh - top - h, 0), vh, phone };
      text.style.setProperty('--mk-ib', `${state.geo.b}px`);
      text.style.setProperty('--mk-il', `${state.geo.l}px`);
      text.style.setProperty('--mk-ir', `${state.geo.r}px`);
    };
    state.update = () => {
      const g = state.geo;
      if (!hero.isConnected || !g) return;
      const run = Math.max(hero.offsetHeight - g.vh, 1);
      const y = Math.min(Math.max(-hero.getBoundingClientRect().top, 0), run);
      const p = Math.min(y / (g.vh * (g.phone ? 0.7 : 1)), 1);
      const k = 1 - p;
      const s = hero.style;
      s.setProperty('--mk-it', `${g.t * k}px`);
      s.setProperty('--mk-ib', `${g.b * k}px`);
      s.setProperty('--mk-il', `${g.l * k}px`);
      s.setProperty('--mk-ir', `${g.r * k}px`);
      s.setProperty('--mk-p', p.toFixed(3));
      const fade = Math.max(1 - p / 0.4, 0);
      s.setProperty('--mk-fade', fade.toFixed(3));
      text.style.visibility = fade > 0 ? 'visible' : 'hidden';
    };
    state.measure(); state.update();
    heroes.add(state);
  };

  const initTrack = (wrap) => {
    if (wrap.dataset.mkReady) return;
    wrap.dataset.mkReady = '1';
    const track = wrap.querySelector('.mk-track');
    wrap.querySelectorAll('[data-mk-dir]').forEach((b) => b.addEventListener('click', () => {
      const card = track.querySelector('.mk-card');
      const step = card ? card.getBoundingClientRect().width + (parseFloat(getComputedStyle(track).columnGap) || 40) : 600;
      track.scrollBy({ left: step * Number(b.dataset.mkDir), behavior: reduce ? 'auto' : 'smooth' });
    }));
  };

  const initTracker = (root) => {
    if (root.dataset.mkReady) return;
    root.dataset.mkReady = '1';
    const stages = [...root.querySelectorAll('[data-stage]')];
    const keys = stages.map((li) => li.dataset.stage);
    const frameOf = (img) => img.dataset.frame || ((img.className.match(/mk-frame-(\w+)/) || [])[1]);
    const frames = [...root.querySelectorAll('.mk-tracker__frame img')].filter(frameOf);
    const now = root.querySelector('[data-mk-now]');
    const msg = root.querySelector('[data-mk-msg]');
    const bar = root.querySelector('[data-mk-bar]');
    const next = root.querySelector('[data-mk-next]');
    const revise = root.querySelector('[data-mk-revise]');
    const reset = root.querySelector('[data-mk-reset]');
    const live = root.querySelector('[data-mk-live]');
    let i = Math.max(keys.indexOf(root.dataset.start || ''), 0);
    let round = 0;

    const render = () => {
      const li = stages[i];
      const key = li.dataset.stage;
      stages.forEach((s, n) => {
        s.classList.toggle('is-done', n < i && !(s.dataset.stage === 'revision' && round === 0));
        s.classList.toggle('is-now', n === i);
        s.querySelector('button').setAttribute('aria-current', n === i ? 'step' : 'false');
      });
      let label = li.dataset.label;
      if (key === 'revision' && round) label += ` (round ${round})`;
      if (key === 'design_review' && round) label += ` (round ${round + 1})`;
      now.textContent = label;
      msg.textContent = '';
      const small = document.createElement('small');
      small.textContent = msg.dataset.caption || 'What the customer is told';
      msg.append(small, document.createTextNode(li.dataset.msg));
      bar.style.setProperty('--mk-pct', `${Math.round(((i + 1) / stages.length) * 100)}%`);
      frames.forEach((f) => f.classList.toggle('is-on', frameOf(f) === li.dataset.frame));
      next.disabled = i === stages.length - 1;
      next.textContent = key === 'design_review' ? 'Customer approves' : 'Next stage';
      revise.hidden = key !== 'design_review';
      if (live) live.textContent = `Stage: ${label}`;
    };
    const go = (to) => { i = Math.max(to, 0); render(); };
    next.addEventListener('click', () => {
      const key = keys[i];
      if (key === 'design_review') go(keys.indexOf('printing'));
      else if (key === 'revision') go(keys.indexOf('design_review'));
      else if (keys[i + 1] === 'revision') go(i + 2);
      else go(i + 1);
    });
    revise.addEventListener('click', () => { round += 1; go(keys.indexOf('revision')); });
    reset.addEventListener('click', () => { round = 0; go(0); });
    stages.forEach((li, n) => li.querySelector('button').addEventListener('click', () => {
      if (li.dataset.stage === 'revision' && round === 0) round = 1;
      go(n);
    }));
    render();
  };

  const sweep = () => reveals.forEach((el) => {
    if (!el.isConnected) { reveals.delete(el); return; }
    if (el.getBoundingClientRect().top < window.innerHeight) { el.classList.add('is-in'); reveals.delete(el); }
  });

  const init = (scope) => {
    const roots = scope.classList && scope.classList.contains('mk') ? [scope] : [...scope.querySelectorAll('.mk')];
    if (!reduce) roots.forEach((r) => r.classList.add('mk-js'));
    scope.querySelectorAll('.mk-hero').forEach(initHero);
    scope.querySelectorAll('[data-mk-track]').forEach(initTrack);
    scope.querySelectorAll('[data-mk-tracker]').forEach(initTracker);
    scope.querySelectorAll('[data-mk-reveal]').forEach((el) => {
      [...el.children].forEach((c, n) => c.style.setProperty('--i', n));
      if (reduce || !('IntersectionObserver' in window)) { el.classList.add('is-in'); return; }
      if (!io) io = new IntersectionObserver((entries) => entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); reveals.delete(e.target); }
      }), { rootMargin: '0px 0px -8% 0px' });
      io.observe(el);
      reveals.add(el);
    });
    sweep();
  };

  window.mkHome = { init };
  const start = () => init(document);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  window.addEventListener('scroll', () => requestAnimationFrame(() => { heroes.forEach((h) => h.update()); sweep(); }), { passive: true });
  window.addEventListener('resize', () => heroes.forEach((h) => { h.measure(); h.update(); }));
  // Shopify theme editor: re-run for a section after it is re-rendered.
  document.addEventListener('shopify:section:load', (e) => init(e.target));
})();
