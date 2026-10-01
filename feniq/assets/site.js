/* FENIQ core behaviour, shared by every page.
   Each block runs only when its elements exist on the page. */

/* ===== Site config: replace with the real accounts before launch ===== */
const CONFIG = {
  whatsapp: "963938456457",  // international format, digits only
  instagram: "https://www.instagram.com/feniqalfeniq",
  facebook: "https://www.facebook.com/share/1EMo7UTS8w/",
  appUrl: ""      // store link for "Get the app"; empty keeps the button on the contact page
};

(() => {
  const root = document.documentElement;
  const $ = (s, el = document) => el.querySelector(s), $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const store = { get(k){ try { return localStorage.getItem(k); } catch(e){ return null; } }, set(k,v){ try { localStorage.setItem(k,v); } catch(e){} } };
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hooks = [];
  let lang = "ar";
  window.FENIQ = { reduce, onLang: fn => hooks.push(fn), get lang(){ return lang; } };
  if (root.lang !== "ar") root.lang = "ar";
  if (root.dir !== "rtl") root.dir = "rtl";

  /* ---------- theme (light by default; navy bands stay navy) ---------- */
  const savedTheme = store.get("feniq-theme");
  if (savedTheme === "dark" || savedTheme === "light") root.dataset.theme = savedTheme;
  $("#themeBtn")?.addEventListener("click", () => {
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    root.dataset.theme = next; store.set("feniq-theme", next);
  });

  /* ---------- mobile menu ---------- */
  const menuBtn = $("#menuBtn");
  const setMenu = open => { document.body.classList.toggle("menu-open", open); menuBtn?.setAttribute("aria-expanded", open); };
  menuBtn?.addEventListener("click", () => setMenu(!document.body.classList.contains("menu-open")));
  $$(".drawer a").forEach(a => a.addEventListener("click", () => setMenu(false)));
  addEventListener("keydown", e => { if (e.key === "Escape") setMenu(false); });

  /* ---------- nav: tone follows the band under it, compacts on scroll ---------- */
  const nav = $(".nav");
  if (nav) {
    const bands = $$("main > section, footer.site");
    const tone = () => {
      const y = nav.getBoundingClientRect().bottom - 20;
      let t = nav.dataset.tone;
      for (const b of bands) { const r = b.getBoundingClientRect(); if (r.top <= y && r.bottom > y) { t = b.matches(".navy, footer.site") ? "dark" : "light"; break; } }
      nav.dataset.tone = t;
      nav.classList.toggle("scrolled", scrollY > 40);
    };
    let ticking = false;
    addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { tone(); ticking = false; }); } }, { passive: true });
    requestAnimationFrame(tone);
  }

  /* ---------- word-by-word reveal for headlines ---------- */
  const splitWords = (el, animate) => {
    const text = el.textContent.trim();
    el.textContent = "";
    text.split(/\s+/).forEach((w, i, all) => {
      const s = document.createElement("span"); s.className = "w"; s.textContent = w; s.style.setProperty("--i", i);
      if (!animate) s.style.animation = "none";
      el.appendChild(s); if (i < all.length - 1) el.appendChild(document.createTextNode(" "));
    });
  };

  /* ---------- language ---------- */
  const SHARED_EN = {
    skip:"Skip to content", navLabel:"Main", themeLabel:"Toggle dark mode", menuLabel:"Menu",
    navHome:"Home", navPh:"Pharmacies", navWh:"Warehouses", navTrust:"Trust & privacy", navAbout:"About", navFaq:"FAQ", navContact:"Contact us",
    navCta:"Get the app", cta1:"Get the app", cta2:"Join as a warehouse", more:"Learn more", demo:"Book an intro", demoData:"Sample data",
    footP:"A digital platform connecting pharmacies with drug warehouses in Syria. Launched in Latakia.",
    fh1:"Platform", fh2:"Company", fh3:"Legal", privacy:"Privacy policy", terms:"Terms of use",
    copy:"© 2026 FENIQ. All rights reserved.", made:"Made in Latakia",
    finH:"Your next order can cost you less.", finP:"Get FENIQ and order from your warehouse in one tap.",
    wa:"WhatsApp", ig:"Instagram", fb:"Facebook", illus:"Illustration", now:"Available now", soon:"Coming soon",
    phoneLabel:"FENIQ app screens",
    e0:"The ordering app between pharmacies and warehouses.", e1:"Smart demand and stock analysis that helps you know what to order and when.", e2:"Medicine delivery from the pharmacy to the patient's home."
  };
  let pageEN = {};
  try { pageEN = JSON.parse($("#i18n-en")?.textContent || "{}"); } catch(e){}
  const EN = { ...SHARED_EN, ...pageEN };
  const AR = {};
  let textEls = [], ariaEls = [], altEls = [], phEls = [], captured = false;
  const capture = () => {
    if (captured) return; captured = true;
    textEls = $$("[data-i18n]"); ariaEls = $$("[data-i18n-aria]"); altEls = $$("[data-i18n-alt]"); phEls = $$("[data-i18n-ph]");
    textEls.forEach(el => AR[el.dataset.i18n] ??= el.classList.contains("reveal-words") ? el.textContent.trim() : el.innerHTML);
    ariaEls.forEach(el => AR[el.dataset.i18nAria] ??= el.getAttribute("aria-label"));
    altEls.forEach(el => AR[el.dataset.i18nAlt] ??= el.getAttribute("alt"));
    phEls.forEach(el => AR[el.dataset.i18nPh] ??= el.getAttribute("placeholder"));
    $$("[data-ar]").forEach(el => AR[el.dataset.ar] = el.dataset.arText);
  };
  $$("[data-ar]").forEach(el => AR[el.dataset.ar] = el.dataset.arText);
  const t = k => { capture(); return (lang === "en" ? EN[k] : AR[k]) ?? AR[k] ?? EN[k] ?? ""; };
  const titles = { ar: document.title, en: EN.docTitle || document.title };
  function applyLang(l){
    capture();
    lang = l; root.lang = l; root.dir = l === "ar" ? "rtl" : "ltr";
    textEls.forEach(el => {
      const v = t(el.dataset.i18n); if (!v) return;
      if (el.classList.contains("reveal-words")) { el.textContent = v; splitWords(el, false); } else el.innerHTML = v;
    });
    ariaEls.forEach(el => el.setAttribute("aria-label", t(el.dataset.i18nAria)));
    altEls.forEach(el => el.setAttribute("alt", t(el.dataset.i18nAlt)));
    phEls.forEach(el => el.setAttribute("placeholder", t(el.dataset.i18nPh)));
    document.title = titles[l];
    const b = $("#langBtn");
    if (b) { b.textContent = l === "ar" ? "EN" : "ع"; b.setAttribute("aria-label", l === "ar" ? "Switch to English" : "التبديل إلى العربية"); }
    $$("[data-en-only]").forEach(el => el.hidden = l !== "en");
    hooks.forEach(fn => fn(l));
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
    hooks.push(syncRole); syncRole();
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

  /* ---------- steps drive the phone (inner pages) ---------- */
  const steps = $$(".step"), apps = $$(".phone-col .phone .app");
  if (steps.length && apps.length) {
    let current = 0, userPicked = false;
    const show = i => { current = i; steps.forEach((s, k) => s.setAttribute("aria-current", k === i)); apps.forEach((a, k) => a.classList.toggle("on", k === i)); };
    steps.forEach((s, i) => s.addEventListener("click", () => { userPicked = true; show(i); }));
    const wide = matchMedia("(min-width:960px)");
    const io = new IntersectionObserver(es => { if (wide.matches) es.forEach(e => { if (e.isIntersecting) show(steps.indexOf(e.target)); }); }, { rootMargin: "-45% 0px -45% 0px" });
    steps.forEach(s => io.observe(s));
    if (!reduce) setInterval(() => { if (!wide.matches && !userPicked && !document.hidden) show((current + 1) % apps.length); }, 3800);
  }
  if (!reduce && matchMedia("(pointer:fine)").matches) $$(".phone-col .phone, .media .phone").forEach(phone => {
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

  if (store.get("feniq-lang") === "en") applyLang("en");

  /* ---------- scroll reveal (content is visible without it) ---------- */
  if (!reduce && "IntersectionObserver" in window) {
    let first = true; // the first report covers what is already on screen: leave that still
    const io = new IntersectionObserver(es => {
      es.forEach(e => { if (!e.isIntersecting) return; if (!first) e.target.classList.add("in"); io.unobserve(e.target); });
      first = false;
    });
    $$(".rv").forEach(el => io.observe(el));
  }
})();
