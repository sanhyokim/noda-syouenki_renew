/* 野田の消煙機 JL-8A — LP interactions (no dependencies) */
(() => {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let vh = window.innerHeight;

  /* ------------------------------------------------------------------
     Header & drawer
     ------------------------------------------------------------------ */
  const hd = $('[data-hd]');
  const drawer = $('[data-drawer]');
  const burger = $('[data-burger]');
  const hdH = () => hd.offsetHeight;

  const setDrawer = (open) => {
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
    if (open) {
      drawer.hidden = false;
      requestAnimationFrame(() => drawer.classList.add('is-open'));
      document.body.style.overflow = 'hidden';
    } else {
      drawer.classList.remove('is-open');
      drawer.hidden = true;
      document.body.style.overflow = '';
    }
  };
  burger.addEventListener('click', () => setDrawer(burger.getAttribute('aria-expanded') !== 'true'));
  $$('a', drawer).forEach(a => a.addEventListener('click', () => setDrawer(false)));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !drawer.hidden) { setDrawer(false); burger.focus(); } });

  /* ------------------------------------------------------------------
     Reveal on view (siblings stagger slightly)
     ------------------------------------------------------------------ */
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.01 });
  $$('[data-reveal]').forEach(el => {
    const sibs = Array.from(el.parentElement.children).filter(c => c.hasAttribute('data-reveal'));
    const i = sibs.indexOf(el);
    if (i > 0) el.style.setProperty('--d', `${Math.min(i, 5) * 0.08}s`);
    io.observe(el);
  });

  /* inspection sheet: values are written in, then stamped */
  const board = $('[data-sheet]');
  if (board) {
    new IntersectionObserver(([e], o) => {
      if (e.isIntersecting) { board.classList.add('is-in'); o.disconnect(); }
    }, { threshold: 0.35 }).observe(board);
  }

  /* ------------------------------------------------------------------
     How it works — electrostatic precipitator simulation (canvas 2D)
     ------------------------------------------------------------------ */
  const howEl = $('[data-how]');
  const esp = (() => {
    const canvas = $('[data-esp]');
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    const steps = $$('[data-step]', howEl);
    const lbls = $$('.esp__lbl', howEl);
    const rateEl = $('[data-esp-rate]'), barEl = $('[data-esp-bar]');
    let W = 0, H = 0, dpr = 1, R = null, parts = [], deposits = [], step = -1, phaseK = 0, rateShown = 0, visible = false, last = performance.now();
    const mobile = () => window.innerWidth < 900;

    const layout = () => {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height;
      if (!W || !H) return;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      R = mobile()
        ? { x0: W * .07, x1: W * .93, y0: H * .37, y1: H * .73 }
        : { x0: W * .13, x1: W * .88, y0: H * .33, y1: H * .74 };
      const w = R.x1 - R.x0;
      R.f = R.x0 + w * .1;                            // pre-filter
      R.i0 = R.x0 + w * .19; R.i1 = R.x0 + w * .39;   // ioniser (12kV)
      R.c0 = R.x0 + w * .46; R.c1 = R.x0 + w * .92;   // collector (6kV)
      R.plates = [];
      const n = mobile() ? 6 : 8;
      for (let i = 0; i <= n; i++) R.plates.push(lerp(R.y0, R.y1, i / n));
      // labels
      const place = (el, x, y) => { el.style.left = x + 'px'; el.style.top = y + 'px'; };
      const top = R.y0 - 22;
      place(lbls[0], mobile() ? 12 : 22, R.y1 + 26);
      place(lbls[4], W - (mobile() ? 12 : 22), R.y1 + 26);
      place(lbls[1], R.f, window.innerWidth <= 720 ? top - 34 : top);   // staggered up on phones (leader line in CSS)
      place(lbls[2], (R.i0 + R.i1) / 2, top);
      place(lbls[3], (R.c0 + R.c1) / 2, top);
      const N = mobile() ? 170 : 340;
      parts = Array.from({ length: N }, () => spawn(true));
      deposits = [];
    };
    const spawn = (anywhere) => ({
      x: anywhere ? lerp(-10, R.x1, Math.random()) : -10 - Math.random() * 40,
      y: lerp(R.y0 - 30, R.y1 + 30, Math.random()),
      vx: 40 + Math.random() * 30, vy: (Math.random() - .5) * 30,
      r: .8 + Math.random() * 2.1, q: 0, seed: Math.random() * 100,
      lucky: Math.random() < .09   // ~9% escape (max 91% capture)
    });
    const nearestNeg = (y) => { // negative plates are odd indices
      let best = null, bd = 1e9;
      R.plates.forEach((py, i) => { if (i % 2 === 1) { const d = Math.abs(py - y); if (d < bd) { bd = d; best = py; } } });
      return best;
    };

    const draw = (now) => {
      const dt = Math.min(.04, (now - last) / 1000) * (reduced ? .3 : 1); last = now;   // slower when the OS asks for less motion
      if (!visible || !R) { requestAnimationFrame(draw); return; }
      ctx.clearRect(0, 0, W, H);
      const ionOn = step >= 1, colOn = step >= 2;
      const t = now / 1000;

      // housing
      ctx.save();
      ctx.strokeStyle = 'rgba(243,242,238,.18)'; ctx.lineWidth = 1;
      ctx.strokeRect(R.x0, R.y0 - 14, R.x1 - R.x0, R.y1 - R.y0 + 28);
      // pre-filter mesh
      ctx.strokeStyle = step >= 0 ? 'rgba(243,242,238,.45)' : 'rgba(243,242,238,.2)';
      ctx.setLineDash([2, 4]);
      for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(R.f + k * 4, R.y0 - 14); ctx.lineTo(R.f + k * 4, R.y1 + 14); ctx.stroke(); }
      ctx.setLineDash([]);
      // ioniser wires
      const wires = mobile() ? 4 : 6;
      for (let i = 0; i < wires; i++) {
        const x = lerp(R.i0, R.i1, (i + .5) / wires);
        ctx.strokeStyle = ionOn ? 'rgba(111,139,255,.9)' : 'rgba(243,242,238,.18)';
        ctx.beginPath(); ctx.moveTo(x, R.y0 - 14); ctx.lineTo(x, R.y1 + 14); ctx.stroke();
        if (ionOn) {
          const g = ctx.createLinearGradient(x - 14, 0, x + 14, 0);
          const a = .16 + .1 * Math.sin(t * 9 + i * 1.7);
          g.addColorStop(0, 'rgba(58,92,255,0)'); g.addColorStop(.5, `rgba(111,139,255,${a})`); g.addColorStop(1, 'rgba(58,92,255,0)');
          ctx.fillStyle = g; ctx.fillRect(x - 14, R.y0 - 14, 28, R.y1 - R.y0 + 28);
        }
      }
      // collector plates
      R.plates.forEach((py, i) => {
        const neg = i % 2 === 1;
        ctx.strokeStyle = colOn ? (neg ? 'rgba(111,139,255,.95)' : 'rgba(243,242,238,.55)') : 'rgba(243,242,238,.18)';
        ctx.lineWidth = neg && colOn ? 2 : 1;
        ctx.beginPath(); ctx.moveTo(R.c0, py); ctx.lineTo(R.c1, py); ctx.stroke();
      });
      ctx.lineWidth = 1;
      ctx.restore();

      // deposits on plates (captured oil mist)
      ctx.fillStyle = 'rgba(214,170,96,.8)';
      for (const d of deposits) { ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 6.283); ctx.fill(); }

      // particles
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        const inside = p.x > R.f;
        // turbulent before filter, laminar after
        const turb = inside ? .15 : 1;
        p.vy += (Math.sin(t * 1.3 + p.seed + p.x * .02) * 60 * turb - p.vy * (inside ? 3 : .6)) * dt;
        const vxTarget = inside ? 120 : 70;
        p.vx += (vxTarget - p.vx) * dt * 2;
        if (inside) { // funnel into the duct band
          if (p.y < R.y0 + 2) p.vy += (R.y0 + 6 - p.y) * 6 * dt;
          if (p.y > R.y1 - 2) p.vy -= (p.y - R.y1 + 6) * 6 * dt;
        }
        // charging
        if (ionOn && p.x > R.i0 && p.x < R.i1 && !p.lucky) p.q = Math.min(1, p.q + dt * 3.2);
        // collection
        if (colOn && p.q > .2 && p.x > R.c0 && p.x < R.c1) {
          const ty = nearestNeg(p.y);
          p.vy += Math.sign(ty - p.y) * 900 * p.q * dt;
          if (Math.abs(ty - p.y) < 2.2) {
            deposits.push({ x: p.x, y: ty + (Math.random() - .5) * 2, r: Math.max(.6, p.r * .7) });
            if (deposits.length > 900) deposits.splice(0, deposits.length - 900);
            parts[i] = spawn(false); continue;
          }
        }
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.x > W + 20 || (mobile() && p.x > R.x1 + 30)) { parts[i] = spawn(false); continue; }
        // draw
        const after = p.x > R.x1;
        if (p.q > .05) {
          ctx.fillStyle = `rgba(111,139,255,${.35 + .55 * p.q})`;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 2.5 * p.q, 0, 6.283); ctx.fill();
          ctx.fillStyle = `rgba(220,228,255,${.8 * p.q})`;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r * .6, 0, 6.283); ctx.fill();
        } else {
          const a = after ? .22 : .5;
          ctx.fillStyle = `rgba(206,168,120,${a})`;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 1.6, 0, 6.283); ctx.fill();
        }
      }
      ctx.globalCompositeOperation = 'source-over';

      // clean-air streaks at the outlet once collecting
      if (colOn) {
        ctx.strokeStyle = 'rgba(243,242,238,.16)';
        for (let i = 0; i < 6; i++) {
          const y = lerp(R.y0 + 8, R.y1 - 8, i / 5);
          const off = ((t * 120 + i * 37) % 60);
          ctx.beginPath(); ctx.moveTo(R.x1 + off - 10, y); ctx.lineTo(R.x1 + off + 20, y); ctx.stroke();
        }
      }

      // capture-rate meter
      const target = step >= 2 ? 91 * clamp(phaseK * 1.6) : 0;
      rateShown = lerp(rateShown, target, .06);
      if (rateEl) rateEl.textContent = Math.round(rateShown);
      if (barEl) barEl.style.width = rateShown + '%';
      requestAnimationFrame(draw);
    };
    const setProgress = (k) => {
      const s = k < .3 ? 0 : k < .6 ? 1 : 2;
      phaseK = s === 2 ? (k - .6) / .4 : 0;
      if (s !== step) {
        step = s;
        steps.forEach((el, i) => el.classList.toggle('is-active', i === s));
        $$('[data-step-lbl]', howEl).forEach(el => el.classList.toggle('is-active', +el.dataset.stepLbl <= s));
        if (s < 2) deposits = [];
      }
    };
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { rootMargin: '50px' }).observe(canvas);
    // re-lay out whenever the panel itself changes size (width or height)
    let rt;
    new ResizeObserver(() => {
      clearTimeout(rt);
      rt = setTimeout(() => {
        const r = canvas.getBoundingClientRect();
        if (Math.abs(r.width - W) > 1 || Math.abs(r.height - H) > 1) layout();
      }, 120);
    }).observe(canvas);
    layout();
    setProgress(0);
    requestAnimationFrame(draw);
    return { setProgress };
  })();

  /* progress through the pinned section: 0 when it docks under the header, 1 when it releases */
  const pinProgress = (el) => {
    const r = el.getBoundingClientRect();
    const top = hdH();
    const total = r.height - (vh - top);
    return total > 0 ? clamp((top - r.top) / total) : 0;
  };

  /* ------------------------------------------------------------------
     Video facade (YouTube loads only on click)
     ------------------------------------------------------------------ */
  $$('[data-video]').forEach(v => {
    $('button', v).addEventListener('click', () => {
      const f = document.createElement('iframe');
      f.src = `https://www.youtube-nocookie.com/embed/${v.dataset.video}?autoplay=1&mute=1&playsinline=1&rel=0`;
      f.title = '野田の消煙機 稼働動画';
      f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      f.allowFullscreen = true;
      v.innerHTML = ''; v.appendChild(f);
    }, { once: true });
  });

  /* ------------------------------------------------------------------
     FAQ — animated open / close
     ------------------------------------------------------------------ */
  $$('.qa').forEach(d => {
    const s = $('summary', d), a = $('.qa__a', d);
    s.addEventListener('click', (e) => {
      if (reduced || !a.animate) return;
      e.preventDefault();
      if (d.open) {
        const h = a.offsetHeight;
        a.animate([{ height: h + 'px', opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 320, easing: 'cubic-bezier(.7,0,.2,1)' }).onfinish = () => { d.open = false; };
      } else {
        d.open = true;
        const h = a.offsetHeight;
        a.animate([{ height: '0px', opacity: 0 }, { height: h + 'px', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.2,.7,.1,1)' });
      }
    });
  });

  /* ------------------------------------------------------------------
     Electricity cost estimate (300W × hours × days × 31円/kWh)
     ------------------------------------------------------------------ */
  const calc = $('[data-calc]');
  if (calc) {
    const hours = $('#c-hours', calc), days = $('#c-days', calc);
    const outH = $('[data-calc-hours]', calc), outD = $('[data-calc-days]', calc), outY = $('[data-calc-yen]', calc);
    const update = () => {
      const h = +hours.value, d = +days.value;
      const yen = Math.round(0.3 * h * d * 31 / 10) * 10;
      outH.textContent = Number.isInteger(h) ? String(h) : h.toFixed(1);
      outD.textContent = String(d);
      outY.textContent = yen.toLocaleString('ja-JP');
    };
    hours.addEventListener('input', update);
    days.addEventListener('input', update);
    update();
  }

  /* ------------------------------------------------------------------
     Form — inline validation + progress
     ------------------------------------------------------------------ */
  const form = $('[data-form]');
  if (form) {
    const req = ['shop', 'name', 'tel', 'email'].map(n => form.elements[n]);
    const agree = form.elements.agree;
    const prog = $('[data-form-progress]', form);
    const msg = $('[data-form-msg]', form);
    const messages = {
      shop: '貴店名または貴社名を入力してください。',
      name: '担当者名を入力してください。',
      tel: '電話番号を正しく入力してください。',
      email: 'メールアドレスを正しく入力してください（例：info@example.com）。',
      agree: 'プライバシーポリシーへの同意が必要です。'
    };
    const check = (el, show) => {
      const field = el.closest('.field');
      const err = $('.field__err', field);
      const ok = el.type === 'checkbox' ? el.checked : (el.value.trim() !== '' && el.checkValidity());
      if (show) {
        field.classList.toggle('is-error', !ok);
        field.classList.toggle('is-ok', ok && el.type !== 'checkbox');
        err.textContent = ok ? '' : messages[el.name];
        el.setAttribute('aria-invalid', String(!ok));
      }
      return ok;
    };
    const count = () => { prog.textContent = req.filter(el => check(el, false)).length; };
    req.concat(agree).forEach(el => {
      el.addEventListener('blur', () => { if (el.value || el.type === 'checkbox') check(el, true); });
      el.addEventListener('input', () => { count(); if (el.closest('.field').classList.contains('is-error')) check(el, true); });
      el.addEventListener('change', () => { count(); if (el.type === 'checkbox') check(el, true); });
    });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const bad = req.concat(agree).filter(el => !check(el, true));
      if (bad.length) { bad[0].focus(); return; }
      const endpoint = form.dataset.endpoint;
      const btn = $('.form__submit', form);
      if (!endpoint) {
        msg.textContent = '【プレビュー】送信先が未設定のため、送信は行われていません。';
        return;
      }
      btn.disabled = true;
      try {
        const res = await fetch(endpoint, { method: 'POST', body: new FormData(form) });
        if (!res.ok) throw new Error(res.status);
        form.classList.add('is-sent');
        msg.textContent = 'ありがとうございます。資料ダウンロード用のメールをお送りしました。';
      } catch (err) {
        msg.textContent = '送信できませんでした。時間をおいて再度お試しいただくか、お電話（0120-77-3408）でご連絡ください。';
        btn.disabled = false;
      }
    });
  }

  /* ------------------------------------------------------------------
     Nav: highlight the section in view
     ------------------------------------------------------------------ */
  const navLinks = $$('.gnav a');
  const navTargets = navLinks.map(a => $(a.getAttribute('href')));
  const updateNav = () => {
    let cur = -1;
    navTargets.forEach((t, i) => { if (t && t.getBoundingClientRect().top < vh * .4) cur = i; });
    if (cur >= 0 && navTargets[cur].getBoundingClientRect().bottom < vh * .2) cur = -1;
    navLinks.forEach((a, i) => { if (i === cur) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
  };

  /* ------------------------------------------------------------------
     Mobile fixed CTA
     ------------------------------------------------------------------ */
  const mcta = $('[data-mcta]');
  const hero = $('.hero');
  const dl = $('#download');
  const updateMcta = () => {
    if (!mcta) return;
    const past = hero.getBoundingClientRect().bottom < vh * .4;
    const r = dl.getBoundingClientRect();
    const atForm = r.top < vh * .8 && r.bottom > 0;
    mcta.classList.toggle('is-show', past && !atForm);
  };

  /* ------------------------------------------------------------------
     Main scroll loop
     ------------------------------------------------------------------ */
  let ticking = false;
  const onScroll = () => {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      if (esp && howEl) esp.setProgress(pinProgress(howEl));
      updateMcta();
      updateNav();
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  let rz;
  window.addEventListener('resize', () => {
    clearTimeout(rz);
    rz = setTimeout(() => {
      vh = window.innerHeight;
      onScroll();
    }, 120);
  });
  onScroll();
})();
