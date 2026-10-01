/* FENIQ hero phoenix in raw WebGL (no library, a few KB).
   The bird is a point cloud sampled from the logo mark: silver wing, orange body.
   It assembles from scattered embers, the wing beats slowly, and it turns toward
   the pointer. Weak devices, slow connections, missing WebGL or reduced motion keep
   the still logo; so does any device that cannot hold the frame rate. */
(() => {
  const stage = document.getElementById("stage"), canvas = document.getElementById("phoenix");
  if (!stage || !canvas) return;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const conn = navigator.connection || {};
  const force = /[?&]fx=force/.test(location.search); // testing aid: skip the device checks
  const weak = !force && (reduce || conn.saveData || /(^|-)2g$/.test(conn.effectiveType || "") ||
               (navigator.deviceMemory && navigator.deviceMemory < 3) ||
               (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4));
  if (weak) return;
  let gl = null;

  const load = src => new Promise((res, rej) => { const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  // The context is created only when the bird wakes, since creating one can block the main
  // thread; a software renderer (no real GPU) is refused outright rather than tried.
  const start = () => {
    gl = canvas.getContext("webgl", { alpha: true, antialias: false, premultipliedAlpha: true, powerPreference: "low-power", failIfMajorPerformanceCaveat: !force });
    if (!gl) return;
    (window.FENIQ_PTS ? Promise.resolve() : load("assets/phoenix-points.js")).then(init).catch(() => {});
  };
  // The still logo holds the space until someone is actually there: the bird wakes on the
  // first pointer, touch, wheel, scroll or key (or after a quiet spell), so its set-up never
  // competes with the page's own loading.
  const WAKE = ["pointermove", "pointerdown", "touchstart", "wheel", "scroll", "keydown"];
  let woken = false;
  const wake = () => {
    if (woken) return; woken = true;
    WAKE.forEach(e => removeEventListener(e, wake, true));
    ("requestIdleCallback" in window) ? requestIdleCallback(start, { timeout: 600 }) : setTimeout(start, 60);
  };
  const arm = () => {
    if (force) return void setTimeout(wake, 300);
    WAKE.forEach(e => addEventListener(e, wake, { capture: true, passive: true }));
    setTimeout(wake, 6000);
  };
  document.readyState === "complete" ? arm() : addEventListener("load", arm, { once: true });

  const VS = `
    attribute vec3 aPos; attribute vec3 aCol; attribute vec3 aMisc; // seed, size, wing weight
    uniform float uTime, uScatter, uPx, uAspect, uFlap, uLine;
    uniform vec2 uRot; uniform vec3 uHinge;
    varying vec3 vC; varying float vA, vL;
    mat3 rY(float a){ float c=cos(a), s=sin(a); return mat3(c,0.,-s, 0.,1.,0., s,0.,c); }
    mat3 rX(float a){ float c=cos(a), s=sin(a); return mat3(1.,0.,0., 0.,c,s, 0.,-s,c); }
    mat3 rZ(float a){ float c=cos(a), s=sin(a); return mat3(c,s,0., -s,c,0., 0.,0.,1.); }
    void main(){
      vec3 p = aPos; float seed = aMisc.x;
      float beat = sin(uTime * 1.6) * uFlap * aMisc.z;
      vec3 q = p - uHinge; q = rZ(beat * .07) * rY(beat * .28) * q; p = q + uHinge;
      p += vec3(sin(uTime*.6+seed)*.012, cos(uTime*.5+seed*1.3)*.014, sin(uTime*.4+seed)*.02);
      p += normalize(p + vec3(.001)) * uScatter * (.4 + fract(seed * 7.13) * .8);
      p = rX(uRot.y) * rY(uRot.x) * p;
      float z = 4.2 - p.z, f = 3.1716; // 1 / tan(17.5deg): a 35deg field of view
      gl_Position = vec4(p.x * f / uAspect, p.y * f, 0., z);
      gl_PointSize = aMisc.y * uPx * 7.5 / z;
      vC = aCol; vL = uLine; vA = uLine > .5 ? .18 : (.72 + .28 * sin(uTime * 1.4 + seed * 3.)) * (aMisc.y > 2.2 ? 1. : .62);
    }`;
  const FS = `
    precision mediump float; varying vec3 vC; varying float vA, vL;
    void main(){
      float d = length(gl_PointCoord - .5); float a = vL > .5 ? vA : (smoothstep(.5, .0, d) * .55 + smoothstep(.22, .0, d) * .6) * vA;
      gl_FragColor = vec4(vC * a, a);
    }`;

  function init(){
    const raw = window.FENIQ_PTS; if (!raw) return;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);
    const U = n => gl.getUniformLocation(prog, n), A = n => gl.getAttribLocation(prog, n);
    const u = { time: U("uTime"), scatter: U("uScatter"), px: U("uPx"), aspect: U("uAspect"), flap: U("uFlap"), line: U("uLine"), rot: U("uRot"), hinge: U("uHinge") };
    const a = { pos: A("aPos"), col: A("aCol"), misc: A("aMisc") };

    const mobile = matchMedia("(max-width:959px)").matches;
    const stepN = mobile ? 2 : 1, n = Math.floor(raw.length / 3 / stepN);
    const H = [.34, -.24, .12];
    const wingW = (x, y) => y < -.42 ? 0 : Math.min(1, Math.hypot(x - H[0], y - H[1]) / 1.3);
    const mix = (c1, c2, t) => c1.map((v, i) => v + (c2[i] - v) * t);
    const SILVER = [.96, .965, .98], ORANGE = [.949, .416, .106], GOLD = [1, .71, .278];
    // interleaved: pos(3) col(3) misc(3)
    const data = new Float32Array(n * 9), P = [], edge = Math.floor(1500 / stepN); // outline samples come last
    for (let i = 0; i < n; i++) {
      const j = i * stepN * 3, x = raw[j] / 1000 * 2.55, y = raw[j + 1] / 1000 * 2.55, o = raw[j + 2] === 1;
      const z = o ? .18 + (Math.random() - .5) * .12 : Math.min(0, x) * .55 + (Math.random() - .5) * .18;
      const c = o ? mix(ORANGE, GOLD, Math.random() * .45) : mix(SILVER, GOLD, Math.random() * .06);
      data.set([x, y, z, ...c, Math.random() * 6.283, o ? 2.3 + Math.random() * 1.4 : (i >= edge ? 2.3 + Math.random() * 1.1 : 1.1 + Math.random() * .9), o ? 0 : wingW(x, y)], i * 9);
      P.push([x, y, z]);
    }
    // light lines between neighbouring outline points, paired at build time (FENIQ_LINES)
    const lines = [], pairs = window.FENIQ_LINES || [];
    for (let k = 0; k < pairs.length; k += 2) {
      const i = pairs[k] / stepN, j = pairs[k + 1] / stepN;
      if (i % 1 || j % 1 || i >= n || j >= n) continue;
      lines.push(...data.subarray(i * 9, i * 9 + 9), ...data.subarray(j * 9, j * 9 + 9));
    }
    const lineData = new Float32Array(lines);
    // embers rising around the bird
    const EN = mobile ? 50 : 120, emb = new Float32Array(EN * 9), speed = new Float32Array(EN);
    for (let i = 0; i < EN; i++) {
      const c = Math.random() > .5 ? GOLD : ORANGE;
      emb.set([(Math.random() - .5) * 3.2, (Math.random() - .5) * 3.2, (Math.random() - .5) * 1.5, ...c, Math.random() * 6.283, 1 + Math.random() * 1.2, 0], i * 9);
      speed[i] = .002 + Math.random() * .006;
    }
    const buf = d => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, d, gl.DYNAMIC_DRAW); return b; };
    const bPts = buf(data), bLines = buf(lineData), bEmb = buf(emb);
    const bind = b => {
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.enableVertexAttribArray(a.pos); gl.vertexAttribPointer(a.pos, 3, gl.FLOAT, false, 36, 0);
      gl.enableVertexAttribArray(a.col); gl.vertexAttribPointer(a.col, 3, gl.FLOAT, false, 36, 12);
      gl.enableVertexAttribArray(a.misc); gl.vertexAttribPointer(a.misc, 3, gl.FLOAT, false, 36, 24);
    };
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.disable(gl.DEPTH_TEST);
    gl.uniform3fv(u.hinge, H);

    let dpr = 1;
    const resize = () => {
      dpr = Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2);
      const w = canvas.clientWidth, h = canvas.clientHeight;
      canvas.width = Math.max(1, w * dpr); canvas.height = Math.max(1, h * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform1f(u.aspect, w / Math.max(1, h)); gl.uniform1f(u.px, dpr);
    };
    resize(); addEventListener("resize", resize);

    let mx = 0, my = 0, tx = 0, ty = 0, scroll = 0, visible = true, intro = 0, dead = false;
    const t0 = performance.now(), ease = x => 1 - Math.pow(1 - x, 3);
    addEventListener("pointermove", e => { tx = e.clientX / innerWidth - .5; ty = e.clientY / innerHeight - .5; }, { passive: true });
    addEventListener("scroll", () => { scroll = Math.min(1, scrollY / Math.max(1, stage.offsetHeight)); }, { passive: true });

    let frames = 0, slow = 0, last = performance.now(), raf = 0;
    const kick = () => { if (!raf && !dead) { last = performance.now(); raf = requestAnimationFrame(frame); } };
    function frame(now){
      raf = 0;
      if (!visible || document.hidden || dead) return;
      const dt = now - last; last = now;
      // auto-degrade: a device that cannot hold ~22fps goes back to the still logo
      if (!force && ++frames > 40 && dt > 45) { if (++slow > 45) { stage.classList.remove("live"); dead = true; return; } } else slow = Math.max(0, slow - 1);
      const t = (now - t0) / 1000;
      intro = Math.min(1, intro + dt / 1400);
      mx += (tx - mx) * .05; my += (ty - my) * .05;
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(u.time, t);
      gl.uniform2f(u.rot, -.2 + mx * .6 + Math.sin(t * .3) * .06 + scroll * .5, my * .3 + Math.sin(t * .4) * .03);
      gl.uniform1f(u.flap, intro);
      gl.uniform1f(u.scatter, (1 - ease(intro)) * 1.6 + scroll * .35);
      gl.uniform1f(u.line, 1); bind(bLines); gl.drawArrays(gl.LINES, 0, lineData.length / 9);
      gl.uniform1f(u.line, 0); bind(bPts); gl.drawArrays(gl.POINTS, 0, n);
      for (let i = 0; i < EN; i++) { emb[i * 9 + 1] += speed[i]; if (emb[i * 9 + 1] > 1.6) emb[i * 9 + 1] = -1.6; }
      gl.uniform1f(u.flap, 0); gl.uniform1f(u.scatter, 0);
      bind(bEmb); gl.bufferSubData(gl.ARRAY_BUFFER, 0, emb); gl.drawArrays(gl.POINTS, 0, EN);
      raf = requestAnimationFrame(frame);
    }
    new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) kick(); }).observe(stage);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) kick(); });
    stage.classList.add("live");
    kick();
  }
})();
