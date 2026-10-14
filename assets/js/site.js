/* 野田の消煙機 LP — page scripts (no dependencies) */
(() => {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- header shadow once the page scrolls ---------- */
  const hd = $('[data-hd]');
  if (hd) {
    const onScroll = () => hd.classList.toggle('is-scrolled', window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- stores ticker: a second copy makes the loop seamless ---------- */
  const track = $('[data-ticker]');
  if (track) {
    const list = $('.ticker__list', track);
    const copy = list.cloneNode(true);
    copy.setAttribute('aria-hidden', 'true');
    $$('img', copy).forEach(img => img.setAttribute('alt', ''));
    track.appendChild(copy);
  }

  /* ---------- problem scene: numbers pop in and light up with their card ---------- */
  const map = $('[data-map]');
  if (map) {
    const nos = $$('.map__no', map);
    const cards = $$('.worry[data-no]');
    const light = n => {
      map.classList.toggle('has-on', !!n);
      nos.forEach(g => g.classList.toggle('is-on', g.dataset.no === n));
      cards.forEach(c => c.classList.toggle('is-on', c.dataset.no === n));
    };
    cards.forEach(c => {
      c.addEventListener('pointerenter', () => light(c.dataset.no));
      c.addEventListener('pointerleave', () => light(null));
    });
    nos.forEach(g => g.addEventListener('pointerenter', () => light(g.dataset.no)));
    map.addEventListener('pointerleave', () => light(null));
    map.classList.add('is-ready');
    new IntersectionObserver(([e]) => {
      map.classList.toggle('is-vis', e.isIntersecting);
      if (e.isIntersecting) map.classList.add('is-in');
    }, { threshold: .3 }).observe(map);
  }

  /* ---------- flow: the rail fills as the page scrolls, lighting each number ---------- */
  const steps = $('[data-steps]');
  if (steps) {
    const items = $$('.step', steps);
    const nos = items.map(li => $('.step__no', li));
    let centers = [], top = 0, len = 1, frame = 0, idle = 0;
    const measure = () => {
      const box = steps.getBoundingClientRect();
      centers = nos.map(n => { const b = n.getBoundingClientRect(); return b.top + b.height / 2 - box.top; });
      top = centers[0];
      len = Math.max(1, centers[centers.length - 1] - top);
      steps.style.setProperty('--rail-top', `${top}px`);
      steps.style.setProperty('--rail-len', `${len}px`);
    };
    const update = () => {
      frame = 0;
      const mark = innerHeight * .6 - steps.getBoundingClientRect().top;   // the reading line, in list coordinates
      const p = Math.min(1, Math.max(0, (mark - top) / len));
      steps.style.setProperty('--p', p.toFixed(4));
      items.forEach((li, i) => li.classList.toggle('is-on', mark >= centers[i] - 2));
      steps.classList.toggle('is-moving', p > 0 && p < 1);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    const refresh = () => { measure(); if (!reduced) update(); };
    refresh();
    if (!reduced) {   // with less motion: everything stays lit and the rail stays full
      steps.classList.add('is-ready');
      new IntersectionObserver(([e]) => {
        if (e.isIntersecting) { refresh(); addEventListener('scroll', onScroll, { passive: true }); }
        else removeEventListener('scroll', onScroll);
      }, { rootMargin: '20% 0px' }).observe(steps);
    }
    addEventListener('resize', () => { clearTimeout(idle); idle = setTimeout(refresh, 150); });
  }

  /* ---------- FAQ: mark the category being read in the side index ---------- */
  const faq = $('[data-faq]');
  if (faq) {
    const cats = $$('.faq__cat', faq);
    const byId = new Map(cats.map(a => [a.hash.slice(1), a]));
    const io = new IntersectionObserver(es => {
      es.forEach(e => {
        if (e.isIntersecting) cats.forEach(a => a.classList.toggle('is-cur', a === byId.get(e.target.id)));
      });
    }, { rootMargin: '-35% 0px -60% 0px' });   // a thin band a third of the way down the screen
    $$('.faq__grp', faq).forEach(g => io.observe(g));
  }

  /* ---------- YouTube: load the player only when asked ---------- */
  $$('[data-video]').forEach(frame => {
    const btn = $('.video__play', frame);
    const thumb = $('[data-video-thumb]', frame);
    if (thumb) thumb.addEventListener('error', () => thumb.remove(), { once: true });
    btn.addEventListener('click', () => {
      const id = frame.dataset.video;
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&rel=0&playsinline=1`;
      iframe.title = '野田の消煙機 稼働動画';
      iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      iframe.allowFullscreen = true;
      frame.replaceChildren(iframe);
    });
  });

  /* ---------- phone bar: step aside while the form is on screen ---------- */
  const bar = $('[data-fixbar]');
  const formCard = $('.form-card');
  if (bar && formCard) {
    let formVisible = false, typing = false;
    const sync = () => bar.classList.toggle('is-hidden', formVisible || typing);
    new IntersectionObserver(([e]) => { formVisible = e.isIntersecting; sync(); }, { rootMargin: '0px 0px -20% 0px' }).observe(formCard);
    document.addEventListener('focusin', e => { typing = !!e.target.closest('input, textarea, select'); sync(); });
    document.addEventListener('focusout', () => { typing = false; sync(); });
  }

  /* ---------- remember where the visitor came from (sent with the form) ---------- */
  const SRC_KEY = 'noda_src';
  try {
    const p = new URLSearchParams(location.search);
    const keep = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'yclid', 'fbclid'].forEach(k => { if (p.get(k)) keep[k] = p.get(k); });
    if (Object.keys(keep).length) sessionStorage.setItem(SRC_KEY, JSON.stringify(keep));
    if (!sessionStorage.getItem(SRC_KEY + '_ref') && document.referrer) sessionStorage.setItem(SRC_KEY + '_ref', document.referrer);
  } catch (_) { /* storage may be unavailable */ }

  /* ---------- forms: 資料請求 (data-form="download") and お問い合わせ (data-form="contact") ---------- */
  const form = $('[data-form]');
  if (form) {
    const formId = form.dataset.form || 'download';
    const done = $('[data-form-done]');
    const msg = $('[data-form-msg]');
    const submit = $('[data-submit]', form);
    const label = $('[data-submit-label]', form);
    const labelText = label.textContent;
    const endpoint = (form.dataset.endpoint || '').trim();

    // full-width letters, digits and symbols (common with Japanese input) → half-width
    const toHalf = s => s.replace(/[！-～]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)).replace(/　/g, ' ').replace(/[‐－―ー−]/g, '-');

    const rules = {
      name: (v, el) => v.trim() ? '' : `${el.dataset.label || '担当者名'}を入力してください。`,
      email: v => {
        if (!v.trim()) return 'メールアドレスを入力してください。';
        return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'メールアドレスの形式をご確認ください（例：info@example.com）。';
      },
      tel: v => {
        if (!v.trim()) return '';
        const digits = v.replace(/\D/g, '');
        return digits.length >= 10 && digits.length <= 11 ? '' : '電話番号は数字10〜11桁で入力してください（ハイフンはあってもなくても大丈夫です）。';
      },
      pref: v => v ? '' : '都道府県を選んでください。',
      message: v => v.trim() ? '' : 'お問い合わせ内容を入力してください。',
      agree: (v, el) => el.checked ? '' : 'プライバシーポリシーへの同意が必要です。'
    };

    const errEl = el => document.getElementById('e-' + ({ email: 'mail' }[el.name] || el.name));
    const check = (el) => {
      const rule = rules[el.name];
      if (!rule) return true;
      if (el.name === 'email' || el.name === 'tel') {
        const half = toHalf(el.value);
        if (half !== el.value) el.value = half;
      }
      const err = rule(el.value, el);
      const out = errEl(el);
      if (out) out.textContent = err;
      el.setAttribute('aria-invalid', err ? 'true' : 'false');
      const field = el.closest('.field');
      if (field) field.classList.toggle('is-ok', !err && el.type !== 'checkbox' && !!el.value.trim());
      return !err;
    };

    const inputs = Object.keys(rules).map(n => form.elements[n]).filter(Boolean);
    inputs.forEach(el => {
      el.addEventListener('blur', () => { if (el.value || el.dataset.touched) check(el); el.dataset.touched = '1'; });
      el.addEventListener(el.type === 'checkbox' || el.tagName === 'SELECT' ? 'change' : 'input', () => { if (el.tagName === 'SELECT' || el.getAttribute('aria-invalid') === 'true') check(el); });
    });

    const setBusy = (on) => {
      submit.disabled = on;
      submit.setAttribute('aria-busy', on ? 'true' : 'false');
      label.textContent = on ? '送信しています…' : labelText;
    };
    const showDone = (preview) => {
      form.hidden = true;
      if (preview && !$('.form-done__preview', done)) {
        const p = document.createElement('p');
        p.className = 'form-done__preview';
        p.textContent = '※ これはプレビューです。送信先が未設定のため、実際には送信されていません。';
        done.appendChild(p);
      }
      done.hidden = false;
      done.focus({ preventScroll: true });
      done.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      msg.textContent = ''; msg.classList.remove('is-info');
      const bad = inputs.filter(el => !check(el));
      if (bad.length) {
        msg.textContent = bad.length > 1 ? `入力内容をご確認ください（${bad.length}か所）。` : '入力内容をご確認ください。';
        bad[0].focus();
        return;
      }
      const fd = new FormData(form);
      if (fd.get('website')) { showDone(false); return; }   // bot trap filled: pretend it worked
      fd.delete('website');
      fd.set('form', formId);
      fd.set('page', location.href.split('#')[0]);
      try {
        const src = JSON.parse(sessionStorage.getItem(SRC_KEY) || '{}');
        Object.entries(src).forEach(([k, v]) => fd.set(k, v));
        const ref = sessionStorage.getItem(SRC_KEY + '_ref');
        if (ref) fd.set('referrer', ref);
      } catch (_) { /* ignore */ }

      const track = () => {
        const purpose = fd.get('purpose') || fd.get('kind') || '';
        const pref = fd.get('pref') || '';
        (window.dataLayer = window.dataLayer || []).push({ event: 'generate_lead', form_id: formId, purpose, pref });
        if (typeof window.gtag === 'function') window.gtag('event', 'generate_lead', { form_id: formId, purpose, pref });
      };

      if (!endpoint) { track(); showDone(true); return; }

      setBusy(true);
      try {
        const res = await fetch(endpoint, { method: 'POST', body: new URLSearchParams(fd), headers: { Accept: 'application/json' } });
        let ok = res.ok;
        try { const data = await res.clone().json(); if (data && (data.ok === false || data.result === 'error')) ok = false; } catch (_) { /* not JSON */ }
        if (!ok) throw new Error('HTTP ' + res.status);
        track();
        showDone(false);
      } catch (err) {
        msg.innerHTML = '送信できませんでした。通信状況をご確認のうえ、もう一度お試しください。<br>お急ぎの方はお電話（<a href="tel:0120773408">0120-77-3408</a>）でもご相談いただけます。';
        setBusy(false);
      }
    });
  }

  /* ---------- 仕組み: electrostatic precipitator simulation ---------- */
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  const initEsp = (root) => {
    root.setAttribute('data-nesp-ready', '');
    const q = (s) => root.querySelector(s);
    const qa = (s) => Array.from(root.querySelectorAll(s));
    const pin = q('.nesp-pin'), sticky = q('.nesp-sticky'), canvas = q('.nesp-canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const steps = qa('.nesp-step'), lbls = qa('.nesp-lbl'), stepLbls = qa('[data-step-lbl]');
    const rateEl = q('[data-nesp-rate]'), barEl = q('[data-nesp-bar]');
    const narrow = () => root.clientWidth < 900;
    const phone = () => root.clientWidth <= 720;
    let W = 0, H = 0, R = null, parts = [], deposits = [], step = -1, phaseK = 0, rateShown = 0;
    let visible = false, last = performance.now(), top = -1, topAt = 0, auto = false, autoT = 0, missed = 0;

    /* height of the fixed header, read from what covers the top of the screen */
    const fixedTop = () => {
      if (root.dataset.offset) return Math.max(0, parseInt(root.dataset.offset, 10) || 0);
      let y = 1;
      for (let i = 0; i < 4; i++) {
        let bottom = 0;
        for (const el of document.elementsFromPoint(window.innerWidth / 2, y)) {
          if (root.contains(el)) continue;
          for (let n = el; n && n !== document.body && n !== document.documentElement; n = n.parentElement) {
            const cs = getComputedStyle(n);
            if (cs.position === 'fixed' || cs.position === 'sticky') {
              const r = n.getBoundingClientRect();
              if (r.top <= y && r.bottom > y && r.height < window.innerHeight * .3) bottom = Math.max(bottom, r.bottom);
              break;
            }
          }
        }
        if (!bottom) break;
        y = bottom + 1;
      }
      return Math.round(y - 1);
    };
    const setTop = (v) => { if (v !== top) { top = v; root.style.setProperty('--nesp-top', v + 'px'); } };
    const setAuto = () => { auto = true; autoT = 0; root.classList.add('is-auto'); };

    const layout = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height;
      if (!W || !H) return;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      R = narrow()
        ? { x0: W * .07, x1: W * .93, y0: H * .37, y1: H * .73 }
        : { x0: W * .13, x1: W * .88, y0: H * .33, y1: H * .74 };
      const w = R.x1 - R.x0;
      R.f = R.x0 + w * .1;                            // pre-filter
      R.i0 = R.x0 + w * .19; R.i1 = R.x0 + w * .39;   // ioniser (12kV)
      R.c0 = R.x0 + w * .46; R.c1 = R.x0 + w * .92;   // collector (6kV)
      R.plates = [];
      const n = narrow() ? 6 : 8;
      for (let i = 0; i <= n; i++) R.plates.push(lerp(R.y0, R.y1, i / n));
      const place = (el, x, y) => { el.style.left = x + 'px'; el.style.top = y + 'px'; };
      const lt = R.y0 - 22;
      place(lbls[0], narrow() ? 12 : 22, R.y1 + 26);
      place(lbls[4], W - (narrow() ? 12 : 22), R.y1 + 26);
      place(lbls[1], R.f, phone() ? lt - 34 : lt);   // staggered up on phones (leader line in CSS)
      place(lbls[2], (R.i0 + R.i1) / 2, lt);
      place(lbls[3], (R.c0 + R.c1) / 2, lt);
      parts = Array.from({ length: narrow() ? 170 : 340 }, () => spawn(true));
      deposits = [];
    };
    const spawn = (anywhere) => ({
      x: anywhere ? lerp(-10, R.x1, Math.random()) : -10 - Math.random() * 40,
      y: lerp(R.y0 - 30, R.y1 + 30, Math.random()),
      vx: 40 + Math.random() * 30, vy: (Math.random() - .5) * 30,
      r: .8 + Math.random() * 2.1, q: 0, seed: Math.random() * 100,
      lucky: Math.random() < .09   // ~9% escape (max 91% capture)
    });
    const nearestNeg = (y) => {   // negative plates are odd indices
      let best = null, bd = 1e9;
      R.plates.forEach((py, i) => { if (i % 2 === 1) { const d = Math.abs(py - y); if (d < bd) { bd = d; best = py; } } });
      return best;
    };

    const setProgress = (k) => {
      const s = k < .3 ? 0 : k < .6 ? 1 : 2;
      phaseK = s === 2 ? (k - .6) / .4 : 0;
      if (s !== step) {
        step = s;
        steps.forEach((el, i) => el.classList.toggle('is-active', i === s));
        stepLbls.forEach(el => el.classList.toggle('is-active', +el.dataset.stepLbl <= s));
        if (s < 2) deposits = [];
      }
    };
    /* 0 when the stage docks under the header, 1 when it lets go */
    const progress = () => {
      const total = pin.offsetHeight - sticky.offsetHeight;
      return total > 0 ? clamp((top - pin.getBoundingClientRect().top) / total) : 0;
    };

    const draw = (dt, now) => {
      ctx.clearRect(0, 0, W, H);
      const ionOn = step >= 1, colOn = step >= 2;
      const t = now / 1000;

      // housing
      ctx.save();
      ctx.strokeStyle = 'rgba(243,242,238,.18)'; ctx.lineWidth = 1;
      ctx.strokeRect(R.x0, R.y0 - 14, R.x1 - R.x0, R.y1 - R.y0 + 28);
      // pre-filter mesh
      ctx.strokeStyle = 'rgba(243,242,238,.45)';
      ctx.setLineDash([2, 4]);
      for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(R.f + k * 4, R.y0 - 14); ctx.lineTo(R.f + k * 4, R.y1 + 14); ctx.stroke(); }
      ctx.setLineDash([]);
      // ioniser wires
      const wires = narrow() ? 4 : 6;
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
        const turb = inside ? .15 : 1;   // turbulent before the filter, laminar after
        p.vy += (Math.sin(t * 1.3 + p.seed + p.x * .02) * 60 * turb - p.vy * (inside ? 3 : .6)) * dt;
        p.vx += ((inside ? 120 : 70) - p.vx) * dt * 2;
        if (inside) {   // funnel into the duct band
          if (p.y < R.y0 + 2) p.vy += (R.y0 + 6 - p.y) * 6 * dt;
          if (p.y > R.y1 - 2) p.vy -= (p.y - R.y1 + 6) * 6 * dt;
        }
        if (ionOn && p.x > R.i0 && p.x < R.i1 && !p.lucky) p.q = Math.min(1, p.q + dt * 3.2);   // charging
        if (colOn && p.q > .2 && p.x > R.c0 && p.x < R.c1) {   // collection
          const ty = nearestNeg(p.y);
          p.vy += Math.sign(ty - p.y) * 900 * p.q * dt;
          if (Math.abs(ty - p.y) < 2.2) {
            deposits.push({ x: p.x, y: ty + (Math.random() - .5) * 2, r: Math.max(.6, p.r * .7) });
            if (deposits.length > 900) deposits.splice(0, deposits.length - 900);
            parts[i] = spawn(false); continue;
          }
        }
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.x > W + 20 || (narrow() && p.x > R.x1 + 30)) { parts[i] = spawn(false); continue; }
        if (p.q > .05) {
          ctx.fillStyle = `rgba(111,139,255,${.35 + .55 * p.q})`;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 2.5 * p.q, 0, 6.283); ctx.fill();
          ctx.fillStyle = `rgba(220,228,255,${.8 * p.q})`;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r * .6, 0, 6.283); ctx.fill();
        } else {
          ctx.fillStyle = `rgba(206,168,120,${p.x > R.x1 ? .22 : .5})`;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 1.6, 0, 6.283); ctx.fill();
        }
      }
      ctx.globalCompositeOperation = 'source-over';

      // clean-air streaks at the outlet once collecting
      if (colOn) {
        ctx.strokeStyle = 'rgba(243,242,238,.16)';
        for (let i = 0; i < 6; i++) {
          const y = lerp(R.y0 + 8, R.y1 - 8, i / 5);
          const off = (t * 120 + i * 37) % 60;
          ctx.beginPath(); ctx.moveTo(R.x1 + off - 10, y); ctx.lineTo(R.x1 + off + 20, y); ctx.stroke();
        }
      }

      // capture-rate meter
      const target = step >= 2 ? 91 * clamp(phaseK * 1.6) : 0;
      rateShown = lerp(rateShown, target, .06);
      rateEl.textContent = Math.round(rateShown);
      barEl.style.width = rateShown + '%';
    };

    const frame = (now) => {
      requestAnimationFrame(frame);
      const real = Math.min(.04, (now - last) / 1000); last = now;
      if (!visible || !R) return;
      if (auto) {
        // 3s filter → 3s charging → 8s collecting, on a loop
        autoT = (autoT + real) % 14;
        setProgress(autoT < 3 ? autoT / 3 * .3 : autoT < 6 ? .3 + (autoT - 3) / 3 * .3 : .6 + Math.min(1, (autoT - 6) / 5) * .4);
      } else {
        if (now - topAt > 400) { topAt = now; setTop(fixedTop()); }
        const k = progress();
        setProgress(k);
        // if the stage scrolls away instead of sticking, fall back to the loop
        if (k > .08 && k < .92) {
          missed = Math.abs(sticky.getBoundingClientRect().top - top) > 6 ? missed + 1 : 0;
          if (missed > 20) setAuto();
        }
      }
      draw(real * (reduced ? .3 : 1), now);   // slower when the OS asks for less motion
    };

    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { rootMargin: '50px' }).observe(canvas);
    let rt;
    new ResizeObserver(() => {
      clearTimeout(rt);
      rt = setTimeout(() => {
        const r = canvas.getBoundingClientRect();
        if (Math.abs(r.width - W) > 1 || Math.abs(r.height - H) > 1) layout();
      }, 120);
    }).observe(canvas);
    setTop(fixedTop());
    layout();
    setProgress(0);
    requestAnimationFrame(frame);
  };
  $$('[data-nesp]:not([data-nesp-ready])').forEach(initEsp);
})();
