/* FENIQ site behaviour, shared by every page.
   Each block only runs when its elements are on the page. */

/* ===== Site config: replace with the real accounts before launch ===== */
const CONFIG = {
  whatsapp: "",   // e.g. "963933000000" (international format, digits only)
  instagram: "",  // e.g. "https://instagram.com/feniq"
  facebook: "",   // e.g. "https://facebook.com/feniq"
  appUrl: ""      // store link for "Get the app"; empty keeps the button on the contact page
};

(() => {
  const root = document.documentElement;
  const $ = (s, el = document) => el.querySelector(s), $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const store = { get(k){ try { return localStorage.getItem(k); } catch(e){ return null; } }, set(k,v){ try { localStorage.setItem(k,v); } catch(e){} } };
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const langHooks = [];
  root.lang = "ar"; root.dir = "rtl";

  /* ---------- theme (light by default, dark on request) ---------- */
  const savedTheme = store.get("feniq-theme");
  if (savedTheme === "dark" || savedTheme === "light") root.dataset.theme = savedTheme;
  $("#themeBtn")?.addEventListener("click", () => {
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    root.dataset.theme = next; store.set("feniq-theme", next);
  });

  /* ---------- mobile menu ---------- */
  const menuBtn = $("#menuBtn");
  menuBtn?.addEventListener("click", () => {
    const open = !document.body.classList.contains("menu-open");
    document.body.classList.toggle("menu-open", open);
    menuBtn.setAttribute("aria-expanded", open);
  });
  $$(".drawer a").forEach(a => a.addEventListener("click", () => { document.body.classList.remove("menu-open"); menuBtn?.setAttribute("aria-expanded", false); }));

  /* ---------- language ---------- */
  const SHARED_EN = {
    skip:"Skip to content", navLabel:"Main", themeLabel:"Toggle dark mode", menuLabel:"Menu",
    navHome:"Home", navPh:"Pharmacies", navWh:"Warehouses", navTrust:"Trust & privacy", navAbout:"About", navFaq:"FAQ", navContact:"Contact",
    navCta:"Get the app", cta1:"Get the app", cta2:"Join as a warehouse", more:"Learn more", demo:"Book an intro", demoData:"Sample data",
    footP:"A digital platform connecting pharmacies with drug warehouses in Syria. Launched in Latakia.",
    fh1:"Platform", fh2:"Company", fh3:"Legal", privacy:"Privacy policy", terms:"Terms of use",
    copy:"© 2026 FENIQ. All rights reserved.", made:"Made in Latakia",
    finH:"Your next order can cost you less.", finP:"Get FENIQ and order from your warehouse in one tap.",
    wa:"WhatsApp", ig:"Instagram", fb:"Facebook", illus:"Illustration",
    phoneLabel:"FENIQ app screens", now:"Available now", soon:"Coming soon",
    e0:"The ordering app between pharmacies and warehouses.", e1:"Smart demand and stock analysis that helps you know what to order and when.", e2:"Medicine delivery from the pharmacy to the patient's home."
  };
  let pageEN = {};
  try { pageEN = JSON.parse($("#i18n-en")?.textContent || "{}"); } catch(e){}
  const EN = { ...SHARED_EN, ...pageEN };
  const AR = {};
  const textEls = $$("[data-i18n]"), ariaEls = $$("[data-i18n-aria]"), phEls = $$("[data-i18n-ph]");
  textEls.forEach(el => AR[el.dataset.i18n] ??= el.innerHTML);
  ariaEls.forEach(el => AR[el.dataset.i18nAria] ??= el.getAttribute("aria-label"));
  phEls.forEach(el => AR[el.dataset.i18nPh] ??= el.getAttribute("placeholder"));
  $$("[data-ar]").forEach(el => AR[el.dataset.ar] = el.dataset.arText);
  let lang = "ar";
  const t = k => (lang === "en" ? EN[k] : AR[k]) ?? AR[k] ?? EN[k] ?? "";
  const titles = { ar: document.title, en: EN.docTitle || document.title };
  function applyLang(l){
    lang = l; root.lang = l; root.dir = l === "ar" ? "rtl" : "ltr";
    textEls.forEach(el => { const v = t(el.dataset.i18n); if (v) el.innerHTML = v; });
    ariaEls.forEach(el => el.setAttribute("aria-label", t(el.dataset.i18nAria)));
    phEls.forEach(el => el.setAttribute("placeholder", t(el.dataset.i18nPh)));
    document.title = titles[l];
    const b = $("#langBtn");
    if (b) { b.textContent = l === "ar" ? "EN" : "ع"; b.setAttribute("aria-label", l === "ar" ? "Switch to English" : "التبديل إلى العربية"); }
    $$("[data-en-only]").forEach(el => el.hidden = l !== "en");
    langHooks.forEach(fn => fn());
    store.set("feniq-lang", l);
  }
  $("#langBtn")?.addEventListener("click", () => applyLang(lang === "ar" ? "en" : "ar"));

  /* ---------- outbound links from config ---------- */
  if (CONFIG.whatsapp) $$("[data-wa]").forEach(a => { a.href = "https://wa.me/" + CONFIG.whatsapp; a.target = "_blank"; a.rel = "noopener"; });
  if (CONFIG.instagram) $$("[data-ig]").forEach(a => { a.href = CONFIG.instagram; a.target = "_blank"; a.rel = "noopener"; });
  if (CONFIG.facebook) $$("[data-fb]").forEach(a => { a.href = CONFIG.facebook; a.target = "_blank"; a.rel = "noopener"; });
  if (CONFIG.appUrl) $$("[data-app]").forEach(a => { a.href = CONFIG.appUrl; a.target = "_blank"; a.rel = "noopener"; });

  /* ---------- contact form: role + validation + WhatsApp ---------- */
  const form = $("#form");
  if (form) {
    const roleWh = $("#roleWh"), rolePh = $("#rolePh");
    const syncRole = () => { const l = $("#lOrg"); if (l) l.textContent = t(roleWh.checked ? "fOrgWh" : "fOrgPh"); };
    if (location.hash === "#warehouse") roleWh.checked = true;
    if (location.hash === "#pharmacy") rolePh.checked = true;
    [rolePh, roleWh].forEach(r => r.addEventListener("change", syncRole));
    langHooks.push(syncRole); syncRole();
    form.addEventListener("submit", e => {
      e.preventDefault();
      const F = form.elements;
      const name = F["name"].value.trim(), phone = F["phone"].value.replace(/[\s-]/g, "");
      const okName = name.length > 1, okPhone = /^(\+?963|0)?9\d{8}$/.test(phone);
      F["name"].setAttribute("aria-invalid", !okName); $("#eName").hidden = okName;
      F["phone"].setAttribute("aria-invalid", !okPhone); $("#ePhone").hidden = okPhone;
      if (!okName) return F["name"].focus();
      if (!okPhone) return F["phone"].focus();
      const text = [roleWh.checked ? t("roleWh") : t("rolePh"), `${t("fName")}: ${name}`,
        F["org"].value && `${$("#lOrg").textContent}: ${F["org"].value}`, `${t("fPhone")}: ${phone}`,
        `${t("fCity")}: ${F["city"].value}`, F["msg"] && F["msg"].value].filter(Boolean).join("\n");
      if (CONFIG.whatsapp) {
        const a = document.createElement("a");
        a.href = "https://wa.me/" + CONFIG.whatsapp + "?text=" + encodeURIComponent(text); a.target = "_blank"; a.rel = "noopener";
        document.body.appendChild(a); a.click(); a.remove();
      }
      $("#done").hidden = false;
    });
  }

  /* ---------- how it works: steps drive the phone ---------- */
  const steps = $$(".step"), apps = $$(".phone .app");
  if (steps.length && apps.length) {
    let current = 0, userPicked = false;
    const show = i => { current = i; steps.forEach((s, k) => s.setAttribute("aria-current", k === i)); apps.forEach((a, k) => a.classList.toggle("on", k === i)); };
    steps.forEach((s, i) => s.addEventListener("click", () => { userPicked = true; show(i); }));
    const wide = matchMedia("(min-width:960px)");
    const io = new IntersectionObserver(es => { if (wide.matches) es.forEach(e => { if (e.isIntersecting) show(steps.indexOf(e.target)); }); }, { rootMargin: "-45% 0px -45% 0px" });
    steps.forEach(s => io.observe(s));
    if (!reduce) setInterval(() => { if (!wide.matches && !userPicked && !document.hidden) show((current + 1) % apps.length); }, 3800);
  }
  // any phone tilts toward the pointer
  if (!reduce && matchMedia("(pointer:fine)").matches) $$(".phone").forEach(phone => {
    const base = () => (phone.classList.contains("flat") ? 10 : 16) * (root.dir === "rtl" ? -1 : 1);
    phone.parentElement.addEventListener("pointermove", e => {
      const r = phone.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      phone.style.setProperty("--ry", base() + x * 14 + "deg"); phone.style.setProperty("--rx", 6 - y * 10 + "deg");
    });
    phone.parentElement.addEventListener("pointerleave", () => { phone.style.removeProperty("--ry"); phone.style.removeProperty("--rx"); });
  });

  /* ---------- savings curve (illustrative shape, no figures) ---------- */
  const svLine = $("#svLine");
  if (svLine) {
    const pts = []; let v = 0;
    for (let i = 0; i <= 12; i++) { v += 6 + Math.sin(i * 1.7) * 3 + i * .9; pts.push([i / 12 * 380 + 10, 160 - v * .95]); }
    const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
    svLine.setAttribute("d", d);
    $("#svArea").setAttribute("d", d + ` L${pts.at(-1)[0]} 170 L${pts[0][0]} 170 Z`);
    const end = pts.at(-1); $("#svEnd").setAttribute("cx", end[0]); $("#svEnd").setAttribute("cy", end[1]);
  }

  /* ---------- warehouse dashboard tabs ---------- */
  const tabs = $$(".dash .side [role=tab]");
  tabs.forEach(tb => tb.addEventListener("click", () => {
    tabs.forEach(x => x.setAttribute("aria-selected", x === tb));
    $$(".dash-view").forEach(v => v.classList.toggle("on", v.id === tb.getAttribute("aria-controls")));
  }));

  /* ---------- Syria network map ---------- */
  const mapSvg = $("#syria");
  if (mapSvg) {
    const border = [[35.95,35.92],[36.15,35.82],[36.37,36.03],[36.6,36.22],[36.68,36.83],[37.07,36.62],[38.2,36.9],[39.2,36.66],[40.8,37.1],[42.35,37.23],[41.84,36.6],[41.29,36.36],[41.38,35.63],[41.0,34.42],[38.79,33.38],[36.84,32.31],[35.72,32.71],[35.83,33.28],[36.07,33.82],[36.61,34.2],[36.45,34.59],[35.99,34.64],[35.9,35.41]];
    const P = ([lon, lat]) => [(lon - 35.4) * 96 + 90, (37.5 - lat) * 96 + 10];
    const cities = [
      {k:"lat", ar:"اللاذقية", en:"Latakia", ll:[35.78,35.52], home:true}, {k:"jab", ar:"جبلة", en:"Jableh", ll:[35.93,35.36], active:true},
      {k:"tar", ar:"طرطوس", en:"Tartus", ll:[35.89,34.89]}, {k:"hom", ar:"حمص", en:"Homs", ll:[36.72,34.73]}, {k:"ham", ar:"حماة", en:"Hama", ll:[36.75,35.13]},
      {k:"alp", ar:"حلب", en:"Aleppo", ll:[37.16,36.2]}, {k:"idl", ar:"إدلب", en:"Idlib", ll:[36.63,35.93]}, {k:"dam", ar:"دمشق", en:"Damascus", ll:[36.29,33.51]},
      {k:"dar", ar:"درعا", en:"Daraa", ll:[36.1,32.62]}, {k:"raq", ar:"الرقة", en:"Raqqa", ll:[39.01,35.95]}, {k:"dez", ar:"دير الزور", en:"Deir ez-Zor", ll:[40.14,35.33]},
      {k:"has", ar:"الحسكة", en:"Hasakah", ll:[40.75,36.5]}
    ];
    const labelled = new Set(["lat","tar","hom","alp","dam","dez"]);
    let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const pharm = Array.from({length:22}, (_, i) => { const c = i < 16 ? [35.84,35.53] : [35.97,35.37]; const a = rnd() * 6.283, r = .06 + rnd() * .2; return [c[0] + Math.cos(a) * r * .9, c[1] + Math.sin(a) * r * .8]; });
    const f = n => n.toFixed(1);
    const drawMap = () => {
      const home = P(cities[0].ll);
      const curve = (a, b) => { const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2 - Math.hypot(b[0]-a[0], b[1]-a[1]) * .22; return `M${f(a[0])} ${f(a[1])} Q${f(mx)} ${f(my)} ${f(b[0])} ${f(b[1])}`; };
      let h = `<path class="land" d="M${border.map(p => P(p).map(f).join(" ")).join(" L")} Z"/>`;
      cities.slice(1).forEach(c => { h += `<path class="link${c.active ? "" : " later"}" d="${curve(home, P(c.ll))}"/>`; });
      pharm.forEach(p => { const q = P(p); h += `<path class="link" style="opacity:.35" d="M${f(home[0])} ${f(home[1])} L${f(q[0])} ${f(q[1])}"/>`; });
      h += `<path class="pulse" d="${curve(home, P(cities[1].ll))}"/>`;
      pharm.slice(0, 5).forEach((p, i) => { const q = P(p); h += `<path class="pulse" style="animation-delay:${i * .6}s" d="M${f(home[0])} ${f(home[1])} L${f(q[0])} ${f(q[1])}"/>`; });
      pharm.forEach(p => { const q = P(p); h += `<circle class="ph" r="2.6" cx="${f(q[0])}" cy="${f(q[1])}"/>`; });
      cities.forEach(c => {
        const [x, y] = P(c.ll);
        h += c.home ? `<circle class="ring" r="7" cx="${f(x)}" cy="${f(y)}"/><circle class="home" r="7" cx="${f(x)}" cy="${f(y)}"/>` : `<circle class="city" r="4" cx="${f(x)}" cy="${f(y)}"/>`;
        // coastal labels sit over the sea (west), inland ones to the east, so none cover the network
        if (labelled.has(c.k)) { const west = c.ll[0] < 36.2; h += `<text class="${c.home ? "home-t" : ""}" x="${f(west ? x - 12 : x + 12)}" y="${f(y + 5)}" text-anchor="${west ? "end" : "start"}" direction="ltr">${lang === "en" ? c.en : c.ar}</text>`; }
      });
      mapSvg.innerHTML = h;
    };
    drawMap(); langHooks.push(drawMap);
  }

  if (store.get("feniq-lang") === "en") applyLang("en");

  /* ---------- scroll reveal (content is visible without it) ---------- */
  if (!reduce && "IntersectionObserver" in window) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -8% 0px" });
    $$(".rv").forEach(el => { if (el.getBoundingClientRect().top > innerHeight) io.observe(el); });
  }
})();
