/* FENIQ hero phoenix: a Three.js particle field sampled from the logo mark.
   Progressive: weak devices, slow connections, no WebGL or reduced motion keep the still logo. */
(() => {
  const stage = document.getElementById("stage"), canvas = document.getElementById("phoenix");
  if (!stage || !canvas) return;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const conn = navigator.connection || {};
  const weak = reduce || conn.saveData || /(^|-)2g$/.test(conn.effectiveType || "") ||
               (navigator.deviceMemory && navigator.deviceMemory < 3) ||
               (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4);
  const hasGL = (() => { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl") || c.getContext("experimental-webgl")); } catch(e){ return false; } })();
  if (weak || !hasGL) return;

  const load = src => new Promise((res, rej) => { const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  const start = () => Promise.all([
    window.THREE ? null : load("https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"),
    window.FENIQ_PTS ? null : load("assets/phoenix-points.js")
  ]).then(init).catch(() => {});
  ("requestIdleCallback" in window) ? requestIdleCallback(start, { timeout: 1500 }) : setTimeout(start, 600);

  function init(){
    const THREE = window.THREE, raw = window.FENIQ_PTS; if (!THREE || !raw) return;
    const mobile = matchMedia("(max-width:959px)").matches;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: "low-power" });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2));
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, .1, 50); camera.position.set(0, 0, 4.2);

    const step = mobile ? 2 : 1, n = Math.floor(raw.length / 3 / step);
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), seedA = new Float32Array(n), size = new Float32Array(n);
    const cOr = new THREE.Color("#F26A1B"), cWing = new THREE.Color("#E8E9EC"), cGold = new THREE.Color("#FFB547");
    for (let i = 0; i < n; i++) {
      const j = i * step * 3, x = raw[j] / 1000 * 2.1, y = raw[j+1] / 1000 * 2.1, o = raw[j+2] === 1;
      // depth: the wing sweeps back, the body sits forward
      pos[i*3] = x; pos[i*3+1] = y; pos[i*3+2] = o ? .18 + (Math.random() - .5) * .12 : Math.min(0, x) * .55 + (Math.random() - .5) * .18;
      const c = o ? cOr.clone().lerp(cGold, Math.random() * .45) : cWing.clone().lerp(cOr, Math.random() * .08);
      col[i*3] = c.r; col[i*3+1] = c.g; col[i*3+2] = c.b;
      seedA[i] = Math.random() * 6.283; size[i] = o ? 1.25 + Math.random() : .8 + Math.random() * .9;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    geo.setAttribute("seed", new THREE.BufferAttribute(seedA, 1));
    geo.setAttribute("size", new THREE.BufferAttribute(size, 1));
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, vertexColors: true, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uScatter: { value: 1.6 }, uPx: { value: renderer.getPixelRatio() } },
      vertexShader: `
        attribute float seed; attribute float size; varying vec3 vC; varying float vA;
        uniform float uTime; uniform float uScatter; uniform float uPx;
        void main(){
          vC = color;
          vec3 p = position;
          p += vec3(sin(uTime*.6+seed)*.012, cos(uTime*.5+seed*1.3)*.014, sin(uTime*.4+seed)*.02);
          p += normalize(p + vec3(.001)) * uScatter * (.4 + fract(seed) * .8);
          vec4 mv = modelViewMatrix * vec4(p, 1.);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = size * uPx * (7.5 / -mv.z);
          vA = .55 + .45 * sin(uTime * 1.4 + seed * 3.);
        }`,
      fragmentShader: `
        varying vec3 vC; varying float vA;
        void main(){ float d = length(gl_PointCoord - .5); gl_FragColor = vec4(vC, smoothstep(.5, .0, d) * vA); }`
    });
    const points = new THREE.Points(geo, mat);

    // light lines: join each outline point to its nearest neighbour
    const lpos = [], edgeStart = Math.floor(1500 / step);
    for (let i = edgeStart; i < n; i++) {
      let best = -1, bd = 1e9;
      for (let k = edgeStart; k < n; k++) { if (k === i) continue;
        const dx = pos[i*3]-pos[k*3], dy = pos[i*3+1]-pos[k*3+1], dz = pos[i*3+2]-pos[k*3+2], d = dx*dx+dy*dy+dz*dz;
        if (d < bd) { bd = d; best = k; } }
      if (best >= 0 && bd < .012) lpos.push(pos[i*3],pos[i*3+1],pos[i*3+2],pos[best*3],pos[best*3+1],pos[best*3+2]);
    }
    const lgeo = new THREE.BufferGeometry(); lgeo.setAttribute("position", new THREE.Float32BufferAttribute(lpos, 3));
    const lines = new THREE.LineSegments(lgeo, new THREE.LineBasicMaterial({ color: "#F26A1B", transparent: true, opacity: .22, blending: THREE.AdditiveBlending, depthWrite: false }));

    // embers rising around the bird
    const EN_N = mobile ? 60 : 140, epos = new Float32Array(EN_N * 3), espd = new Float32Array(EN_N);
    for (let i = 0; i < EN_N; i++) { epos[i*3] = (Math.random() - .5) * 3; epos[i*3+1] = (Math.random() - .5) * 3; epos[i*3+2] = (Math.random() - .5) * 1.5; espd[i] = .002 + Math.random() * .006; }
    const egeo = new THREE.BufferGeometry(); egeo.setAttribute("position", new THREE.BufferAttribute(epos, 3));
    const embers = new THREE.Points(egeo, new THREE.PointsMaterial({ color: "#FB7C15", size: .025, transparent: true, opacity: .7, blending: THREE.AdditiveBlending, depthWrite: false }));

    const bird = new THREE.Group(); bird.add(points, lines); scene.add(bird, embers);
    const resize = () => { const r = canvas.getBoundingClientRect(); renderer.setSize(r.width, r.height, false); camera.aspect = r.width / r.height; camera.updateProjectionMatrix(); };
    resize(); addEventListener("resize", resize);

    let mx = 0, my = 0, tx = 0, ty = 0, scroll = 0, visible = true, intro = 0;
    const t0 = performance.now(), easeOut = x => 1 - Math.pow(1 - x, 3);
    addEventListener("pointermove", e => { tx = e.clientX / innerWidth - .5; ty = e.clientY / innerHeight - .5; }, { passive: true });
    addEventListener("scroll", () => { scroll = Math.min(1, scrollY / Math.max(1, stage.offsetHeight)); }, { passive: true });
    new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) { last = performance.now(); loop(); } }).observe(stage);

    let frames = 0, slow = 0, last = performance.now(), dead = false;
    function loop(){
      if (!visible || document.hidden || dead) return;
      const now = performance.now(), dt = now - last; last = now;
      // auto-degrade: if the device can't hold ~22fps, stop and keep the still logo
      if (++frames > 30 && dt > 45) { if (++slow > 40) { stage.classList.remove("live"); renderer.dispose(); dead = true; return; } } else slow = Math.max(0, slow - 1);
      const t = (now - t0) / 1000;
      intro = Math.min(1, intro + .012);
      mx += (tx - mx) * .05; my += (ty - my) * .05;
      bird.rotation.y = -.35 + mx * .6 + Math.sin(t * .3) * .06 + scroll * .5;
      bird.rotation.x = my * .3 + Math.sin(t * .4) * .03;
      bird.position.y = Math.sin(t * .8) * .03 + scroll * .25;
      mat.uniforms.uTime.value = t;
      mat.uniforms.uScatter.value = (1 - easeOut(intro)) * 1.6 + scroll * .35;
      for (let i = 0; i < EN_N; i++) { epos[i*3+1] += espd[i]; if (epos[i*3+1] > 1.6) epos[i*3+1] = -1.6; }
      egeo.attributes.position.needsUpdate = true;
      renderer.render(scene, camera);
      requestAnimationFrame(loop);
    }
    stage.classList.add("live");
    document.addEventListener("visibilitychange", () => { if (!document.hidden) { last = performance.now(); loop(); } });
    loop();
  }
})();
