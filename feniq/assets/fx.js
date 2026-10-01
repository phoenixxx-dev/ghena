/* FENIQ visual effects: spotlight, tilt, animated beams, before/after, product
   tilt-on-scroll, bento playback, dotted Syria map and rising embers.
   Everything pauses off-screen and switches off under reduced motion. */
(() => {
  const $ = (s, el = document) => el.querySelector(s), $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(pointer:fine)").matches;
  const NS = "http://www.w3.org/2000/svg";
  const onLang = fn => window.FENIQ?.onLang(fn);
  const lang = () => window.FENIQ?.lang || document.documentElement.lang;
  const visible = (el, cb, margin = "0px") => {
    const io = new IntersectionObserver(es => es.forEach(e => cb(e.isIntersecting)), { rootMargin: margin });
    io.observe(el); return io;
  };

  /* ---------- hero spotlight follows the pointer ---------- */
  $$("[data-spot]").forEach(spot => {
    const host = spot.closest("section"); if (!host || !fine) return;
    host.addEventListener("pointermove", e => {
      const r = host.getBoundingClientRect();
      spot.style.setProperty("--sx", e.clientX - r.left + "px"); spot.style.setProperty("--sy", e.clientY - r.top + "px");
    });
  });

  /* ---------- spotlight cards ---------- */
  if (fine) $$(".spot-card").forEach(c => c.addEventListener("pointermove", e => {
    const r = c.getBoundingClientRect();
    c.style.setProperty("--mx", e.clientX - r.left + "px"); c.style.setProperty("--my", e.clientY - r.top + "px");
  }));

  /* ---------- tilt cards with glare ---------- */
  if (fine && !reduce) $$("[data-tilt]").forEach(c => {
    c.addEventListener("pointermove", e => {
      const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      c.style.transform = `perspective(1100px) rotateX(${(.5 - y) * 6}deg) rotateY(${(x - .5) * 7}deg) translateY(-4px)`;
      c.style.setProperty("--gx", x * 100 + "%"); c.style.setProperty("--gy", y * 100 + "%");
    });
    c.addEventListener("pointerleave", () => { c.style.transform = ""; });
  });

  /* ---------- product showcase flattens as it scrolls in ---------- */
  const show = $("#showStage");
  if (show) {
    if (reduce) show.style.setProperty("--p", 1);
    else {
      let raf = 0;
      const upd = () => {
        raf = 0;
        const r = show.getBoundingClientRect(), vh = innerHeight;
        const p = Math.min(1, Math.max(0, (vh - r.top) / (vh * .72)));
        show.style.setProperty("--p", p.toFixed(3));
      };
      addEventListener("scroll", () => { if (!raf) raf = requestAnimationFrame(upd); }, { passive: true });
      addEventListener("resize", upd); requestAnimationFrame(upd);
    }
  }

  /* ---------- play loops only while their section is on screen ---------- */
  function sizeTyped(){ $$(".typed").forEach(t => { t.style.width = "auto"; const w = t.scrollWidth; if (w) t.style.setProperty("--tw", w + 2 + "px"); t.style.width = ""; }); }
  $$("[data-play]").forEach(el => visible(el, on => { if (on) sizeTyped(); el.classList.toggle("play", on && !reduce); }, "0px 0px -10% 0px"));
  $$(".marquee").forEach(el => visible(el, on => el.querySelector(".marquee-track").style.animationPlayState = on ? "running" : "paused"));
  onLang(() => requestAnimationFrame(sizeTyped));

  /* ---------- animated beams: pharmacies → FENIQ → warehouses ---------- */
  const flow = $("#flow");
  if (flow) {
    const svg = $(".beams", flow), hub = $(".hub", flow);
    let anims = [], running = false;
    const edge = (el, toward) => {
      const r = el.getBoundingClientRect(), f = flow.getBoundingClientRect();
      const cx = r.left + r.width / 2 - f.left, cy = r.top + r.height / 2 - f.top;
      const t = toward.getBoundingClientRect(), tx = t.left + t.width / 2 - f.left, ty = t.top + t.height / 2 - f.top;
      const horiz = Math.abs(tx - cx) > Math.abs(ty - cy);
      return horiz ? { x: cx + Math.sign(tx - cx) * r.width / 2, y: cy, h: true } : { x: cx, y: cy + Math.sign(ty - cy) * r.height / 2, h: false };
    };
    const curve = (a, b) => {
      if (a.h) { const k = (b.x - a.x) * .5; return `M${a.x} ${a.y} C${a.x + k} ${a.y} ${b.x - k} ${b.y} ${b.x} ${b.y}`; }
      const k = (b.y - a.y) * .5; return `M${a.x} ${a.y} C${a.x} ${a.y + k} ${b.x} ${b.y - k} ${b.x} ${b.y}`;
    };
    const draw = () => {
      anims.forEach(a => a.cancel()); anims = [];
      const f = flow.getBoundingClientRect();
      svg.setAttribute("viewBox", `0 0 ${f.width} ${f.height}`);
      svg.innerHTML = "";
      const defs = document.createElementNS(NS, "defs"); svg.appendChild(defs);
      const pairs = [];
      $$('[data-side="a"] .node', flow).forEach(n => pairs.push([edge(n, hub), edge(hub, n), false]));
      $$('[data-side="b"] .node', flow).forEach(n => pairs.push([edge(hub, n), edge(n, hub), true]));
      pairs.forEach(([a, b, out], i) => {
        const d = curve(a, b);
        const rail = document.createElementNS(NS, "path"); rail.setAttribute("d", d); rail.setAttribute("class", "rail"); svg.appendChild(rail);
        const id = "bg" + i, g = document.createElementNS(NS, "linearGradient");
        g.setAttribute("id", id); g.setAttribute("gradientUnits", "userSpaceOnUse");
        g.setAttribute("x1", a.x); g.setAttribute("y1", a.y); g.setAttribute("x2", b.x); g.setAttribute("y2", b.y);
        g.innerHTML = '<stop offset="0" stop-color="#FFB547"/><stop offset=".55" stop-color="#F26A1B"/><stop offset="1" stop-color="#FB7C15"/>';
        defs.appendChild(g);
        if (reduce) return;
        const make = (reverse, delay, dur, width, opacity) => {
          const p = document.createElementNS(NS, "path"); p.setAttribute("d", d); p.setAttribute("fill", "none");
          p.setAttribute("stroke", `url(#${id})`); p.setAttribute("stroke-width", width); p.setAttribute("stroke-linecap", "round");
          p.style.opacity = opacity; p.style.filter = "drop-shadow(0 0 5px rgba(242,106,27,.7))";
          svg.appendChild(p);
          const L = p.getTotalLength(), seg = Math.min(90, L * .35);
          p.setAttribute("stroke-dasharray", `${seg} ${L + seg}`);
          const from = reverse ? -L : seg, to = reverse ? seg : -L; // dash enters before the start and leaves past the end
          anims.push(p.animate([{ strokeDashoffset: from }, { strokeDashoffset: to }], { duration: dur, delay, iterations: Infinity, easing: "cubic-bezier(.45,.05,.3,1)" }));
        };
        // orders travel pharmacy → hub → warehouse; status updates travel back
        const base = out ? 700 : 0;
        make(false, base + i % 3 * 450, 2600, 2.4, 1);
        make(true, base + 1600 + i % 3 * 450, 3400, 1.4, .55);
      });
      if (!running) anims.forEach(a => a.pause());
    };
    let ready = false;
    const lazy = new IntersectionObserver(es => {
      if (!es[0].isIntersecting || ready) return;
      ready = true; lazy.disconnect(); draw();
      new ResizeObserver(() => requestAnimationFrame(draw)).observe(flow);
      onLang(() => requestAnimationFrame(draw));
      document.fonts?.ready.then(draw);
    }, { rootMargin: "500px 0px" });
    lazy.observe(flow);
    const stepsEl = $$("#flowSteps li"); let si = 0, timer = 0;
    visible(flow, on => {
      running = on; anims.forEach(a => on ? a.play() : a.pause());
      clearInterval(timer);
      if (on && !reduce && stepsEl.length) timer = setInterval(() => { si = (si + 1) % stepsEl.length; stepsEl.forEach((s, k) => s.classList.toggle("on", k === si)); }, 2800);
    });
  }

  /* ---------- before / after comparison ---------- */
  const ba = $("#ba");
  if (ba) {
    const range = $("#baRange", ba);
    const set = v => ba.style.setProperty("--pos", v + "%");
    range.addEventListener("input", () => set(range.value)); set(range.value);
    if (!reduce) {
      let hinted = false;
      visible(ba, on => {
        if (!on || hinted) return; hinted = true;
        const seq = [50, 40, 60, 50], t0 = performance.now(), dur = 2200;
        const step = now => {
          const k = Math.min(1, (now - t0) / dur), idx = Math.min(seq.length - 2, Math.floor(k * (seq.length - 1)));
          const local = k * (seq.length - 1) - idx, e = .5 - Math.cos(local * Math.PI) / 2;
          const v = seq[idx] + (seq[idx + 1] - seq[idx]) * e; range.value = v; set(v);
          if (k < 1 && document.activeElement !== range) requestAnimationFrame(step);
        };
        setTimeout(() => requestAnimationFrame(step), 400);
      }, "0px 0px -25% 0px");
    }
  }

  /* ---------- dotted Syria map ---------- */
  const mapSvg = $("#syria");
  if (mapSvg) {
    const border = [[35.894,35.917],[35.966,35.91],[36.128,35.832],[36.153,35.833],[36.2,35.938],[36.251,35.972],[36.348,36.004],[36.377,36.172],[36.42,36.203],[36.477,36.221],[36.564,36.224],[36.636,36.234],[36.643,36.264],[36.539,36.457],[36.546,36.507],[36.596,36.701],[36.629,36.778],[36.657,36.802],[36.776,36.793],[36.942,36.759],[36.985,36.703],[37.068,36.653],[37.187,36.656],[37.327,36.646],[37.435,36.642],[37.525,36.679],[37.719,36.743],[37.817,36.766],[37.907,36.795],[38.191,36.901],[38.306,36.894],[38.385,36.879],[38.443,36.863],[38.58,36.788],[38.688,36.715],[38.767,36.693],[38.907,36.695],[39.109,36.681],[39.357,36.682],[39.501,36.701],[39.685,36.738],[40.016,36.826],[40.452,37.009],[40.707,37.097],[40.815,37.108],[40.959,37.109],[41.103,37.085],[41.265,37.07],[41.341,37.071],[41.514,37.089],[41.744,37.127],[41.888,37.156],[42.061,37.207],[42.169,37.288],[42.201,37.297],[42.248,37.283],[42.27,37.276],[42.313,37.229],[42.36,37.109],[42.36,37.096],[42.349,37.061],[42.237,36.962],[42.083,36.826],[41.975,36.741],[41.787,36.597],[41.651,36.566],[41.417,36.514],[41.355,36.464],[41.294,36.384],[41.262,36.273],[41.251,36.203],[41.244,36.073],[41.301,35.939],[41.352,35.809],[41.359,35.724],[41.355,35.641],[41.305,35.551],[41.247,35.427],[41.215,35.288],[41.201,35.028],[41.201,34.806],[41.193,34.769],[41.1,34.613],[40.988,34.429],[40.934,34.387],[40.689,34.332],[40.423,34.198],[40.121,34.047],[39.851,33.912],[39.566,33.768],[39.267,33.62],[39.055,33.514],[38.774,33.372],[38.515,33.236],[38.256,33.099],[38.054,32.995],[37.755,32.83],[37.579,32.733],[37.316,32.591],[37.089,32.466],[36.819,32.318],[36.481,32.361],[36.373,32.388],[36.283,32.457],[36.218,32.495],[36.06,32.533],[35.955,32.667],[35.894,32.714],[35.786,32.735],[35.801,32.782],[35.858,32.863],[35.912,32.95],[35.883,32.999],[35.873,33.039],[35.869,33.089],[35.905,33.136],[35.887,33.193],[35.858,33.25],[35.837,33.278],[35.837,33.33],[35.851,33.37],[35.869,33.433],[35.916,33.466],[35.927,33.5],[35.966,33.535],[36.024,33.563],[36.035,33.585],[36.027,33.598],[35.973,33.624],[35.941,33.667],[35.97,33.733],[35.988,33.752],[36.02,33.783],[36.092,33.832],[36.15,33.839],[36.2,33.839],[36.283,33.835],[36.348,33.827],[36.366,33.839],[36.362,33.854],[36.283,33.894],[36.279,33.926],[36.297,33.959],[36.355,34.011],[36.423,34.051],[36.456,34.058],[36.535,34.134],[36.585,34.221],[36.506,34.433],[36.456,34.466],[36.377,34.495],[36.33,34.5],[36.326,34.514],[36.387,34.566],[36.434,34.613],[36.384,34.658],[36.297,34.679],[36.265,34.632],[36.15,34.629],[35.977,34.629],[35.898,34.853],[35.887,34.948],[35.891,35.061],[35.945,35.224],[35.919,35.299],[35.916,35.351],[35.901,35.42],[35.765,35.571],[35.84,35.849],[35.894,35.917]]; // Natural Earth 1:50m
    const P = ([lon, lat]) => [(lon - 35.4) * 79 + 90, (37.5 - lat) * 96 + 10]; // cos(35°) keeps proportions true
    const poly = border.map(P);
    const inside = (x, y) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
    const cities = [
      {k:"lat", ar:"اللاذقية", en:"Latakia", ll:[35.78,35.52], home:true}, {k:"jab", ar:"جبلة", en:"Jableh", ll:[35.93,35.36], active:true},
      {k:"tar", ar:"طرطوس", en:"Tartus", ll:[35.89,34.89]}, {k:"hom", ar:"حمص", en:"Homs", ll:[36.72,34.73]}, {k:"ham", ar:"حماة", en:"Hama", ll:[36.75,35.13]},
      {k:"alp", ar:"حلب", en:"Aleppo", ll:[37.16,36.2]}, {k:"idl", ar:"إدلب", en:"Idlib", ll:[36.63,35.93]}, {k:"dam", ar:"دمشق", en:"Damascus", ll:[36.29,33.51]},
      {k:"dar", ar:"درعا", en:"Daraa", ll:[36.1,32.62]}, {k:"raq", ar:"الرقة", en:"Raqqa", ll:[39.01,35.95]}, {k:"dez", ar:"دير الزور", en:"Deir ez-Zor", ll:[40.14,35.33]},
      {k:"has", ar:"الحسكة", en:"Hasakah", ll:[40.75,36.5]}
    ];
    const labelled = new Set(["lat","tar","hom","alp","dam","dez"]);
    const home = P(cities[0].ll), jab = P(cities[1].ll);
    // dot matrix: governorate of Latakia glows, the rest waits
    let dots = "", hot = "";
    const step = 10;
    for (let y = 8; y < 530; y += step) for (let x = 8 + (Math.round(y / step) % 2) * step / 2; x < 700; x += step) {
      if (!inside(x, y)) continue;
      const near = Math.hypot(x - home[0], y - home[1]) < 46 || Math.hypot(x - jab[0], y - jab[1]) < 30;
      (near ? (hot += `M${x} ${y}h0`) : (dots += `M${x} ${y}h0`));
    }
    const f = n => n.toFixed(1);
    const curve = (a, b) => { const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2 - Math.hypot(b[0]-a[0], b[1]-a[1]) * .25; return `M${f(a[0])} ${f(a[1])} Q${f(mx)} ${f(my)} ${f(b[0])} ${f(b[1])}`; };
    const drawMap = () => {
      let h = `<path class="dots" d="${dots}"/><path class="dots-hot" d="${hot}"/>`;
      cities.slice(1).forEach(c => { h += `<path class="link${c.active ? "" : " later"}" d="${curve(home, P(c.ll))}"/>`; });
      if (!reduce) { h += `<path class="pulse" d="${curve(home, jab)}"/>`; cities.slice(2, 6).forEach((c, i) => { h += `<path class="pulse" style="animation-delay:${.8 + i * .7}s;opacity:.55" d="${curve(home, P(c.ll))}"/>`; }); }
      cities.forEach(c => {
        const [x, y] = P(c.ll);
        h += c.home ? `<circle class="ring" r="8" cx="${f(x)}" cy="${f(y)}"/><circle class="ring r2" r="8" cx="${f(x)}" cy="${f(y)}"/><circle class="home" r="7.5" cx="${f(x)}" cy="${f(y)}"/>` : `<circle class="city" r="4" cx="${f(x)}" cy="${f(y)}"/>`;
        if (labelled.has(c.k)) { const west = c.ll[0] < 36.2; h += `<text class="${c.home ? "home-t" : ""}" x="${f(west ? x - 14 : x + 12)}" y="${f(y + 5)}" text-anchor="${west ? "end" : "start"}" direction="ltr">${lang() === "en" ? c.en : c.ar}</text>`; }
      });
      mapSvg.innerHTML = h;
    };
    let drawn = false;
    const io = new IntersectionObserver(es => { if (es[0].isIntersecting && !drawn) { drawn = true; drawMap(); io.disconnect(); } }, { rootMargin: "600px 0px" });
    io.observe(mapSvg); onLang(() => drawn && drawMap());
  }

  /* ---------- rising embers in the closing band ---------- */
  $$("canvas.embers").forEach(cv => {
    if (reduce) return;
    const ctx = cv.getContext("2d"); let w, h, dpr, parts = [], on = false, raf = 0;
    const spawn = any => ({ x: Math.random() * w, y: any ? Math.random() * h : h + 10, r: .6 + Math.random() * 1.8, vy: .25 + Math.random() * .8, sway: Math.random() * 6.28, life: .35 + Math.random() * .6, gold: Math.random() > .6 });
    const size = () => { dpr = Math.min(devicePixelRatio || 1, 2); w = cv.clientWidth; h = cv.clientHeight; cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); parts = Array.from({ length: Math.round(Math.min(110, w / 12)) }, () => spawn(true)); };
    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of parts) {
        p.y -= p.vy; p.sway += .02; p.x += Math.sin(p.sway) * .3;
        const a = Math.max(0, Math.min(1, p.y / h)) * p.life;
        ctx.globalAlpha = a; ctx.fillStyle = p.gold ? "#FFB547" : "#F26A1B"; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
        if (p.y < -10) Object.assign(p, spawn(false));
      }
      if (on) raf = requestAnimationFrame(tick);
    };
    let sized = false;
    addEventListener("resize", () => sized && size());
    visible(cv, v => { on = v; cancelAnimationFrame(raf); if (on) { if (!sized) { sized = true; size(); } raf = requestAnimationFrame(tick); } });
  });
})();
