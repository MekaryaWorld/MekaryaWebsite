/* Mekarya homepage behaviour: fade-in entrances and the build tracker demo.
   Every part degrades to readable static content without script. Safe to load more than once
   (each mk-* section includes it) and re-runs for a section the theme editor re-renders. */
(() => {
  if (window.mkHome) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const reveals = new Set();
  let io;

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
  window.addEventListener('scroll', () => requestAnimationFrame(sweep), { passive: true });
  // Shopify theme editor: re-run for a section after it is re-rendered.
  document.addEventListener('shopify:section:load', (e) => init(e.target));
})();
