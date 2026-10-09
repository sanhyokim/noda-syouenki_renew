/* 野田の消煙機 JL-8A — LP interactions (no dependencies) */
(() => {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  let vw = window.innerWidth, vh = window.innerHeight;

  /* progress of an element scrolling through the viewport while pinned:
     0 when its top hits the top of the viewport, 1 when its bottom hits the bottom */
  const pinProgress = (el) => {
    const r = el.getBoundingClientRect();
    const total = r.height - vh;
    return total > 0 ? clamp(-r.top / total) : 0;
  };

  /* ------------------------------------------------------------------
     Ready / intro
     ------------------------------------------------------------------ */
  const ready = () => requestAnimationFrame(() => document.body.classList.add('is-ready'));
  if (document.fonts && document.fonts.ready) {
    Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 900))]).then(ready);
  } else ready();

  /* ------------------------------------------------------------------
     Header: scrolled / hide on scroll down / theme-aware colour
     ------------------------------------------------------------------ */
  const hd = $('[data-hd]');
  const themed = $$('[data-theme]');
  let lastY = window.scrollY;
  const drawer = $('[data-drawer]');
  const burger = $('[data-burger]');

  const updateHeader = () => {
    const y = window.scrollY;
    const open = burger.getAttribute('aria-expanded') === 'true';
    hd.classList.toggle('is-scrolled', y > 10 && !open);
    if (!open) hd.classList.toggle('is-hidden', y > 480 && y > lastY + 2);
    if (y < lastY - 2) hd.classList.remove('is-hidden');
    lastY = y;
    // theme under the header
    const probe = 40;
    let theme = 'dark';
    for (const el of themed) {
      const r = el.getBoundingClientRect();
      if (r.top <= probe && r.bottom > probe) { theme = el.dataset.theme; }
    }
    hd.classList.toggle('is-light', theme === 'light' && !open);
  };

  const setDrawer = (open) => {
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
    if (open) {
      drawer.hidden = false;
      requestAnimationFrame(() => drawer.classList.add('is-open'));
      document.body.style.overflow = 'hidden';
      hd.classList.remove('is-hidden');
    } else {
      drawer.classList.remove('is-open');
      drawer.hidden = true;
      document.body.style.overflow = '';
    }
    updateHeader();
  };
  burger.addEventListener('click', () => setDrawer(burger.getAttribute('aria-expanded') !== 'true'));
  $$('a', drawer).forEach(a => a.addEventListener('click', () => setDrawer(false)));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !drawer.hidden) { setDrawer(false); burger.focus(); } });

  /* ------------------------------------------------------------------
     Headings: split lines (by <br>) for a masked slide-up reveal
     ------------------------------------------------------------------ */
  $$('.sec__ttl[data-reveal], .dl__ttl').forEach(h => {
    const lines = h.innerHTML.split(/<br\s*\/?>/i).map(l => l.trim()).filter(Boolean);
    h.innerHTML = lines.map((l, i) => `<span class="ln"><span class="ln__in" style="transition-delay:${i * 0.1}s">${l}</span></span>`).join('');
    h.classList.add('split');
    h.setAttribute('data-reveal', '');
  });

  /* ------------------------------------------------------------------
     Reveal on view
     ------------------------------------------------------------------ */
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.01 });
  // stagger siblings
  $$('[data-reveal]').forEach(el => {
    const sibs = Array.from(el.parentElement.children).filter(c => c.hasAttribute('data-reveal'));
    const i = sibs.indexOf(el);
    if (i > 0) el.style.setProperty('--d', `${Math.min(i, 6) * 0.08}s`);
    io.observe(el);
  });

  const flow = $('[data-flow]');
  if (flow) new IntersectionObserver(([e], o) => { if (e.isIntersecting) { flow.classList.add('is-drawn'); o.disconnect(); } }, { threshold: .3 }).observe(flow);

  /* ------------------------------------------------------------------
     Counters
     ------------------------------------------------------------------ */
  const fmt = (n, f) => f === 'comma' ? n.toLocaleString('ja-JP') : String(n);
  const countIO = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target; countIO.unobserve(el);
      const to = +el.dataset.count, f = el.dataset.format;
      if (reduced) { el.textContent = fmt(to, f); return; }
      const t0 = performance.now(), dur = 1800;
      const tick = (t) => {
        const k = clamp((t - t0) / dur);
        const e2 = k === 1 ? 1 : 1 - Math.pow(2, -10 * k);
        el.textContent = fmt(Math.round(to * e2), f);
        if (k < 1) requestAnimationFrame(tick);
      };
      el.textContent = fmt(0, f);
      requestAnimationFrame(tick);
    });
  }, { threshold: 0.6 });
  $$('[data-count]').forEach(el => countIO.observe(el));

  /* ------------------------------------------------------------------
     Smoke (WebGL fragment shader) — hero & download section
     Pointer leaves a trail that "ionises" and clears the smoke.
     ------------------------------------------------------------------ */
  const SMOKE_FS = `
  precision highp float;
  uniform vec2 uRes; uniform float uTime; uniform float uClear; uniform float uSoft;
  uniform vec3 uP[16];
  float hash(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
  float noise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f);
    return mix(mix(hash(i), hash(i+vec2(1,0)), u.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y); }
  float fbm(vec2 p){ float v=0., a=.5; mat2 m=mat2(1.6,1.2,-1.2,1.6); for(int i=0;i<5;i++){ v+=a*noise(p); p=m*p; a*=.5; } return v; }
  void main(){
    vec2 uv = gl_FragCoord.xy / uRes;
    float asp = uRes.x / uRes.y;
    vec2 p = vec2(uv.x*asp, uv.y);
    float t = uTime*.045;
    vec2 q = vec2(fbm(p*1.5 + vec2(0., -t*2.)), fbm(p*1.5 + vec2(5.2, 1.3) - vec2(t*.6, t*2.4)));
    vec2 r = vec2(fbm(p*1.4 + 3.6*q + vec2(1.7, 9.2) - vec2(0., t*3.)), fbm(p*1.4 + 3.6*q + vec2(8.3, 2.8) - vec2(0., t*2.2)));
    float f = fbm(p*1.25 + 3.2*r - vec2(0., t*3.6));
    float dens = smoothstep(.28, .92, f);
    dens *= mix(1.05, .35, uv.y);               // thicker near the ground, rising
    dens *= mix(1., .55, uSoft);
    // pointer trail
    float c = 0., ring = 0.;
    for(int i=0;i<16;i++){
      vec3 P = uP[i];
      if(P.z <= 0.) continue;
      vec2 d = p - vec2(P.x*asp, P.y);
      float l = length(d);
      float rad = .07 + .16*(1.-P.z);
      c += P.z * exp(-(l*l)/(rad*rad));
      ring += P.z * exp(-pow(l - rad*.9, 2.)/ .00035) * .5;
    }
    c = clamp(c, 0., 1.);
    float clearAmt = clamp(c + uClear, 0., 1.);
    float d2 = dens * (1. - clearAmt);
    vec3 bg = mix(vec3(.040,.047,.059), vec3(.085,.062,.050), pow(1.-uv.y, 2.)*(1.-uSoft));
    vec3 smoke = mix(vec3(.16,.15,.15), vec3(.60,.56,.52), f);
    vec3 ember = vec3(1., .40, .15) * pow(1.-uv.y, 3.) * .22 * (1.-uSoft);
    vec3 col = bg + (smoke + ember) * d2;
    // ionised air where cleared
    col += vec3(.23,.36,1.) * (c*.06 + ring*dens*.9) * (1.-uClear);
    // vignette
    col *= mix(1., .72, smoothstep(.4, 1.25, length((uv-.5)*vec2(asp*.8, 1.))));
    gl_FragColor = vec4(col, 1.);
  }`;
  const SMOKE_VS = 'attribute vec2 a; void main(){ gl_Position = vec4(a, 0., 1.); }';

  function Smoke(canvas) {
    const soft = canvas.dataset.smoke === 'soft';
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
    if (!gl) return null;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, SMOKE_VS));
    gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, SMOKE_FS));
    gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return null;
    gl.useProgram(pr);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'a');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = n => gl.getUniformLocation(pr, n);
    const uRes = U('uRes'), uTime = U('uTime'), uClear = U('uClear'), uSoft = U('uSoft'), uP = U('uP');
    const pts = new Float32Array(48);
    let head = 0, lastPX = -1, lastPY = -1;
    let visible = true, clearV = 0, t0 = performance.now(), prev = t0;
    const scale = soft ? .35 : .5;

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(2, Math.round(r.width * dpr * scale));
      canvas.height = Math.max(2, Math.round(r.height * dpr * scale));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    const push = (x, y, s = 1) => {
      if (Math.hypot(x - lastPX, y - lastPY) < .012) return;
      lastPX = x; lastPY = y;
      pts[head * 3] = x; pts[head * 3 + 1] = y; pts[head * 3 + 2] = s;
      head = (head + 1) % 16;
    };
    const host = canvas.parentElement;
    const onMove = (e) => {
      const r = canvas.getBoundingClientRect();
      push((e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height);
    };
    host.addEventListener('pointermove', onMove, { passive: true });
    host.addEventListener('pointerdown', onMove, { passive: true });

    // auto "ghost" sweep at start so the interaction is discoverable
    let ghost = soft || reduced ? 0 : 1;
    const ghostPath = (k) => [lerp(.18, .86, k), .32 + Math.sin(k * Math.PI * 2.2) * .14];

    const frame = (now) => {
      const dt = Math.min(.05, (now - prev) / 1000); prev = now;
      if (visible) {
        if (ghost > 0) {
          const k = clamp((now - t0 - 900) / 3200);
          if (k > 0 && k < 1) { const [x, y] = ghostPath(k); push(x, y, 1); }
          if (k >= 1) ghost = 0;
        }
        for (let i = 0; i < 16; i++) { const z = pts[i * 3 + 2]; if (z > 0) pts[i * 3 + 2] = Math.max(0, z - dt * .55); }
        let target = 0;
        if (!soft) { const r = host.getBoundingClientRect(); target = clamp(-r.top / (r.height * .9)) * .9; }
        clearV = lerp(clearV, target, .08);
        gl.uniform2f(uRes, canvas.width, canvas.height);
        gl.uniform1f(uTime, reduced ? 20 : (now - t0) / 1000 + 20);
        gl.uniform1f(uClear, clearV);
        gl.uniform1f(uSoft, soft ? 1 : 0);
        gl.uniform3fv(uP, pts);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      if (!reduced || ghost) requestAnimationFrame(frame);
    };
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { rootMargin: '100px' }).observe(canvas);
    resize();
    window.addEventListener('resize', resize);
    requestAnimationFrame(frame);
    if (reduced) { // draw one still frame and redraw on resize
      window.addEventListener('resize', () => requestAnimationFrame(frame));
      host.addEventListener('pointermove', () => requestAnimationFrame(frame), { passive: true });
    }
    return {};
  }
  $$('[data-smoke]').forEach(c => { try { Smoke(c); } catch (e) { /* CSS gradient stays as fallback */ } });

  /* ------------------------------------------------------------------
     Statement — characters light up with scroll
     ------------------------------------------------------------------ */
  const fill = $('[data-fill]');
  let fillChars = [];
  if (fill) {
    const wrap = (node) => {
      const out = document.createDocumentFragment();
      node.childNodes.forEach(n => {
        if (n.nodeType === 3) {
          for (const ch of n.textContent) { const s = document.createElement('span'); s.className = 'ch'; s.textContent = ch; out.appendChild(s); }
        } else {
          const clone = n.cloneNode(false); clone.appendChild(wrap(n)); out.appendChild(clone);
        }
      });
      return out;
    };
    const label = fill.textContent;
    const frag = wrap(fill);
    fill.textContent = '';
    fill.appendChild(frag);
    fill.setAttribute('aria-label', label);
    $$('.ch', fill).forEach(c => c.setAttribute('aria-hidden', 'true'));
    fillChars = $$('.ch', fill);
  }
  const updateFill = () => {
    if (!fillChars.length) return;
    const r = fill.getBoundingClientRect();
    const k = reduced ? 1 : clamp((vh * .85 - r.top) / (r.height + vh * .35));
    const n = Math.round(k * fillChars.length);
    fillChars.forEach((c, i) => c.classList.toggle('on', i < n));
  };

  /* ------------------------------------------------------------------
     How it works — electrostatic precipitator simulation (canvas 2D)
     ------------------------------------------------------------------ */
  const howEl = $('[data-how]');
  const esp = (() => {
    const canvas = $('[data-esp]');
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    const steps = $$('[data-step]', howEl);
    const lbls = $$('.how__lbl', howEl);
    const rateEl = $('[data-esp-rate]'), barEl = $('[data-esp-bar]');
    let W = 0, H = 0, dpr = 1, R = null, parts = [], deposits = [], step = -1, phaseK = 0, rateShown = 0, visible = false, last = performance.now();
    const mobile = () => vw < 900;

    const layout = () => {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (mobile()) R = { x0: W * .04, x1: W * .96, y0: H * .29, y1: H * .55 };
      else R = { x0: W * .44, x1: W * .95, y0: H * .30, y1: H * .66 };
      const w = R.x1 - R.x0;
      R.f = R.x0 + w * .12;                 // pre-filter
      R.i0 = R.x0 + w * .2; R.i1 = R.x0 + w * .4;   // ioniser (12kV)
      R.c0 = R.x0 + w * .46; R.c1 = R.x0 + w * .9;  // collector (6kV)
      R.plates = [];
      const n = mobile() ? 6 : 8;
      for (let i = 0; i <= n; i++) R.plates.push(lerp(R.y0, R.y1, i / n));
      // labels
      const top = R.y0 - 34;
      const place = (el, x, y) => { el.style.left = x + 'px'; el.style.top = y + 'px'; };
      if (mobile()) {
        place(lbls[0], R.x0 + 14, R.y1 + 18);
        place(lbls[4], R.x1 - 30, R.y1 + 18);
      } else {
        place(lbls[0], R.x0 - W * .035, top - 18);
        place(lbls[4], R.x1 + W * .03, top - 18);
      }
      place(lbls[1], R.f, top);
      place(lbls[2], (R.i0 + R.i1) / 2, top);
      place(lbls[3], (R.c0 + R.c1) / 2, top);
      const N = mobile() ? 170 : 380;
      parts = Array.from({ length: N }, () => spawn(true));
      deposits = [];
    };
    const spawn = (anywhere) => {
      const pre = R.x0 - (mobile() ? 0 : W * .06);
      return {
        x: anywhere ? lerp(pre, R.x1, Math.random()) : pre - Math.random() * 40,
        y: lerp(R.y0 - 30, R.y1 + 30, Math.random()),
        vx: 40 + Math.random() * 30, vy: (Math.random() - .5) * 30,
        r: .8 + Math.random() * 2.1, q: 0, seed: Math.random() * 100,
        lucky: Math.random() < .09   // ~9% escape (max 91% capture)
      };
    };
    const nearestNeg = (y) => { // negative plates are odd indices
      let best = null, bd = 1e9;
      R.plates.forEach((py, i) => { if (i % 2 === 1) { const d = Math.abs(py - y); if (d < bd) { bd = d; best = py; } } });
      return best;
    };

    const draw = (now) => {
      const dt = Math.min(.04, (now - last) / 1000); last = now;
      if (!visible) { requestAnimationFrame(draw); return; }
      ctx.clearRect(0, 0, W, H);
      const ionOn = step >= 1, colOn = step >= 2;
      const t = now / 1000;

      // housing
      ctx.save();
      ctx.strokeStyle = 'rgba(243,242,238,.16)'; ctx.lineWidth = 1;
      ctx.strokeRect(R.x0, R.y0 - 14, R.x1 - R.x0, R.y1 - R.y0 + 28);
      // pre-filter mesh
      ctx.strokeStyle = step >= 0 ? 'rgba(243,242,238,.42)' : 'rgba(243,242,238,.2)';
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
      ctx.fillStyle = 'rgba(190,160,120,.75)';
      for (const d of deposits) { ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 6.283); ctx.fill(); }

      // particles
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        const inside = p.x > R.f;
        // turbulent before filter, laminar after
        const turb = inside ? .15 : 1;
        p.vy += (Math.sin(t * 1.3 + p.seed + p.x * .02) * 60 * turb - p.vy * (inside ? 3 : .6)) * dt;
        let vxTarget = inside ? 120 : 70;
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
          ctx.fillStyle = `rgba(200,170,140,${a})`;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 1.6, 0, 6.283); ctx.fill();
        }
      }
      ctx.globalCompositeOperation = 'source-over';

      // clean-air streaks at outlet when collecting
      if (colOn) {
        ctx.strokeStyle = 'rgba(243,242,238,.12)';
        for (let i = 0; i < 6; i++) {
          const y = lerp(R.y0 + 8, R.y1 - 8, i / 5);
          const off = ((t * 120 + i * 37) % 80);
          ctx.beginPath(); ctx.moveTo(R.x1 + off - 10, y); ctx.lineTo(R.x1 + off + 26, y); ctx.stroke();
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
    layout();
    setProgress(0);
    requestAnimationFrame(draw);
    return { layout, setProgress };
  })();

  /* ------------------------------------------------------------------
     Product — scroll-scrubbed turntable (60 frames rendered from the 3D model)
     ------------------------------------------------------------------ */
  const turn = (() => {
    const pin = $('[data-turn]');
    const canvas = $('[data-turn-canvas]');
    if (!pin || !canvas) return null;
    const ctx = canvas.getContext('2d');
    const N = 60, frames = new Array(N);
    const feats = $$('[data-feat]', pin);
    const featsWrap = $('[data-feats]', pin);
    let current = -1, started = false, activeFeat = -1;
    const src = i => `assets/img/jl8a/${String(i).padStart(2, '0')}.webp`;
    const drawFrame = (i) => {
      // nearest loaded frame
      let j = i, d = 0;
      while (d < N && !(frames[j] && frames[j].complete && frames[j].naturalWidth)) { d++; j = (i + (d % 2 ? -Math.ceil(d / 2) : Math.ceil(d / 2)) + N) % N; }
      const img = frames[j];
      if (!img || !img.naturalWidth) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    const load = () => {
      if (started) return; started = true;
      // load key frames first, then fill in
      const order = [30, 0, 59, 15, 45];
      for (let s = 8; s >= 1; s = Math.floor(s / 2)) for (let i = 0; i < N; i += s) if (!order.includes(i)) order.push(i);
      order.forEach(i => {
        const im = new Image(); im.decoding = 'async'; im.src = src(i); frames[i] = im;
        im.onload = () => { if (Math.abs(i - current) < 3 || current < 0) drawFrame(current < 0 ? 30 : current); };
      });
    };
    new IntersectionObserver(([e]) => { if (e.isIntersecting) load(); }, { rootMargin: '150% 0px' }).observe(pin);
    const update = () => {
      const k = pinProgress(pin);
      const i = Math.round(k * (N - 1));
      if (i !== current) { current = i; drawFrame(i); }
      const f = Math.min(feats.length - 1, Math.floor(clamp((k - .04) / .92) * feats.length));
      if (f !== activeFeat) {
        activeFeat = f;
        feats.forEach((el, n) => el.classList.toggle('is-active', n === f));
        featsWrap.dataset.progress = `${String(f + 1).padStart(2, '0')} / ${String(feats.length).padStart(2, '0')}`;
      }
    };
    return { update };
  })();

  /* ------------------------------------------------------------------
     Gauges (maintenance)
     ------------------------------------------------------------------ */
  $$('[data-gauge]').forEach(g => {
    const v = +g.dataset.gauge, min = +g.dataset.min, max = +g.dataset.max, tol = +g.dataset.tol;
    const L = Math.PI * 80;
    const k = x => clamp((x - min) / (max - min));
    const ok = $('.gauge__ok', g), val = $('.gauge__val', g), needle = $('.gauge__needle', g);
    ok.style.strokeDasharray = `${(k(v + tol) - k(v - tol)) * L} ${L * 2}`;
    ok.style.strokeDashoffset = `${-k(v - tol) * L}`;
    val.style.strokeDasharray = `0 ${L * 2}`;
    val.style.transition = 'stroke-dasharray 2s cubic-bezier(.2,.7,.1,1)';
    const gio = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return; gio.disconnect();
      val.style.strokeDasharray = `${k(v) * L} ${L * 2}`;
      needle.style.transform = `rotate(${-90 + k(v) * 180}deg)`;
    }, { threshold: .5 });
    gio.observe(g);
  });

  /* ------------------------------------------------------------------
     Gallery drift
     ------------------------------------------------------------------ */
  const gallery = $('[data-gallery]');
  const track = $('[data-gallery-track]');
  const updateGallery = () => {
    if (!gallery || vw <= 720) return;
    const r = gallery.getBoundingClientRect();
    if (r.bottom < 0 || r.top > vh) return;
    const k = clamp((vh - r.top) / (vh + r.height));
    const max = Math.max(0, track.scrollWidth - vw);
    track.style.transform = `translate3d(${-k * max}px,0,0)`;
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
        a.animate([{ height: h + 'px', opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 380, easing: 'cubic-bezier(.7,0,.2,1)' }).onfinish = () => { d.open = false; };
      } else {
        d.open = true;
        const h = a.offsetHeight;
        a.animate([{ height: '0px', opacity: 0 }, { height: h + 'px', opacity: 1 }], { duration: 520, easing: 'cubic-bezier(.2,.7,.1,1)' });
      }
    });
  });

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
     Button light follows pointer
     ------------------------------------------------------------------ */
  if (fine) {
    document.addEventListener('pointermove', (e) => {
      const b = e.target.closest && e.target.closest('.btn');
      if (!b) return;
      const r = b.getBoundingClientRect();
      b.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
      b.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
    }, { passive: true });
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
     Ioniser ring that follows the pointer over smoke areas (desktop)
     ------------------------------------------------------------------ */
  if (fine && !reduced) {
    const ring = document.createElement('div');
    ring.className = 'ion-ring'; ring.setAttribute('aria-hidden', 'true');
    document.body.appendChild(ring);
    let tx = -200, ty = -200, x = -200, y = -200, on = false;
    $$('[data-smoke]').forEach(c => {
      const host = c.parentElement;
      host.addEventListener('pointerenter', () => { on = true; ring.classList.add('is-on'); });
      host.addEventListener('pointerleave', () => { on = false; ring.classList.remove('is-on'); });
    });
    document.addEventListener('pointermove', e => {
      tx = e.clientX; ty = e.clientY;
      const overUi = e.target.closest && e.target.closest('a, button, input, textarea, label, form');
      ring.classList.toggle('is-ui', !!overUi);
    }, { passive: true });
    const loop = () => {
      x = lerp(x, tx, .18); y = lerp(y, ty, .18);
      if (on) ring.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  /* ------------------------------------------------------------------
     Air meter — smoke density falls as the page "cleans" the air
     ------------------------------------------------------------------ */
  const air = $('[data-air]');
  const airVal = air && $('[data-air-val]', air);
  const airBar = air && $('[data-air-bar]', air);
  const updateAir = () => {
    if (!air) return;
    const start = 0;
    const end = howEl ? howEl.getBoundingClientRect().bottom + window.scrollY - vh : document.body.scrollHeight;
    const k = clamp((window.scrollY - start) / Math.max(1, end - start));
    const v = Math.round(lerp(100, 9, k * k * (3 - 2 * k)));
    airVal.textContent = v;
    airBar.style.transform = `scaleY(${v / 100})`;
    air.classList.toggle('is-clean', v <= 9);
    const r = dl.getBoundingClientRect();
    air.classList.toggle('is-hidden', window.scrollY < vh * .5 || (r.top < vh && r.bottom > 0));
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
      updateHeader();
      updateFill();
      if (esp && howEl) esp.setProgress(pinProgress(howEl));
      if (turn) turn.update();
      updateGallery();
      updateMcta();
      updateNav();
      updateAir();
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  let rz;
  window.addEventListener('resize', () => {
    clearTimeout(rz);
    rz = setTimeout(() => {
      const w = window.innerWidth;
      const widthChanged = w !== vw;
      vw = w; vh = window.innerHeight;
      if (esp && widthChanged) esp.layout();
      onScroll();
    }, 120);
  });
  onScroll();
})();
