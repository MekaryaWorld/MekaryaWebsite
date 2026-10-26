/* Mekarya homepage behaviour: hero window, entrances, aero track arrows, build tracker demo.
   Every part degrades to readable static content without script. */
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const roots = document.querySelectorAll('.mk');
  if (!roots.length) return;
  if (!reduce) roots.forEach((r) => r.classList.add('mk-js'));

  /* Hero: the window opens to the edges over the first screen of scroll. */
  document.querySelectorAll('.mk-hero').forEach((hero) => {
    if (reduce) return;
    const pic = hero.querySelector('.mk-hero__pic');
    let geo;
    const measure = () => {
      const vw = hero.clientWidth;
      const vh = hero.querySelector('.mk-hero__stage').clientHeight;
      const phone = vw < 990;
      const w = phone ? vw * 0.78 : Math.min(vw * 0.36, (vh - 220) * 0.8);
      const h = w * 1.25;
      const top = phone ? vh * 0.30 : (vh - h) / 2 + 20;
      geo = { l: (vw - w) / 2, r: (vw - w) / 2, t: top, b: Math.max(vh - top - h, 0), vh };
    };
    const update = () => {
      const run = hero.offsetHeight - geo.vh;
      const y = Math.min(Math.max(-hero.getBoundingClientRect().top, 0), run);
      const p = Math.min(y / (geo.vh * (geo.vh < 900 && hero.clientWidth < 990 ? 0.7 : 1)), 1);
      const k = 1 - p;
      const s = hero.style;
      s.setProperty('--mk-it', `${geo.t * k}px`);
      s.setProperty('--mk-ib', `${geo.b * k}px`);
      s.setProperty('--mk-il', `${geo.l * k}px`);
      s.setProperty('--mk-ir', `${geo.r * k}px`);
      s.setProperty('--mk-p', p.toFixed(3));
      const fade = Math.max(1 - p / 0.4, 0);
      s.setProperty('--mk-fade', fade.toFixed(3));
      hero.querySelector('.mk-hero__text').style.visibility = fade > 0 ? 'visible' : 'hidden';
      // the text's own positions follow the window's resting edges
      hero.querySelector('.mk-hero__text').style.setProperty('--mk-ib', `${geo.b}px`);
      hero.querySelector('.mk-hero__text').style.setProperty('--mk-il', `${geo.l}px`);
      hero.querySelector('.mk-hero__text').style.setProperty('--mk-ir', `${geo.r}px`);
    };
    measure(); update();
    window.addEventListener('resize', () => { measure(); update(); });
    window.addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
    if (pic) pic.setAttribute('data-ready', '');
  });

  /* Entrances: each section's parts rise in, staggered. */
  const reveal = document.querySelectorAll('[data-mk-reveal]');
  reveal.forEach((el) => [...el.children].forEach((c, i) => c.style.setProperty('--i', i)));
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    reveal.forEach((el) => io.observe(el));
    // Fallback for fast jumps (anchor links, restored scroll): anything already passed is shown.
    const sweep = () => reveal.forEach((el) => {
      if (!el.classList.contains('is-in') && el.getBoundingClientRect().top < window.innerHeight) el.classList.add('is-in');
    });
    window.addEventListener('scroll', () => requestAnimationFrame(sweep), { passive: true });
    sweep();
  } else reveal.forEach((el) => el.classList.add('is-in'));

  /* Aero track: arrow buttons scroll one card. */
  document.querySelectorAll('[data-mk-track]').forEach((wrap) => {
    const track = wrap.querySelector('.mk-track');
    wrap.querySelectorAll('[data-mk-dir]').forEach((b) => b.addEventListener('click', () => {
      const card = track.querySelector('.mk-card');
      const step = card ? card.getBoundingClientRect().width + 40 : 600;
      track.scrollBy({ left: step * Number(b.dataset.mkDir), behavior: reduce ? 'auto' : 'smooth' });
    }));
  });

  /* Build tracker demo: a sample job card the visitor can step through. */
  document.querySelectorAll('[data-mk-tracker]').forEach((root) => {
    const stages = [...root.querySelectorAll('[data-stage]')];
    const keys = stages.map((li) => li.dataset.stage);
    const frames = [...root.querySelectorAll('[data-frame]')];
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
      msg.innerHTML = '';
      const small = document.createElement('small');
      small.textContent = 'What the customer is told';
      msg.append(small, document.createTextNode(li.dataset.msg));
      bar.style.setProperty('--mk-pct', `${Math.round(((i + 1) / stages.length) * 100)}%`);
      const frame = li.dataset.frame;
      frames.forEach((f) => f.classList.toggle('is-on', f.dataset.frame === frame));
      next.disabled = i === stages.length - 1;
      next.textContent = key === 'design_review' ? 'Customer approves' : 'Next stage';
      revise.hidden = key !== 'design_review';
      if (live) live.textContent = `Stage: ${label}`;
    };
    const go = (to) => { i = to; render(); };
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
  });
})();
