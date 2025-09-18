/* =========================================
   Felles script.js for hele nettstedet
   (index + bilutvalg + evt. flere)
   ========================================= */

/* Utils */
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const $  = (sel, root = document) => root.querySelector(sel);
const debounce = (fn, ms = 300) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
};

/* =========================
   GLOBAL ON-LOAD HINT
   ========================= */
// Gir myk on-load overgang for hero-elementer via CSS (body.is-ready)
document.addEventListener("DOMContentLoaded", () => {
  document.body.classList.add("is-ready");
});

/* =========================
   NAV/MENY (tilgjengelig)
   ========================= */

// Lenke-klikk (mobil)
(() => {
  const navMenu   = $("#nav-menu");
  const navToggle = $("#nav-toggle");
  const navClose  = $("#nav-close");
  const body = document.body;
  let lastFocusedBeforeMenu = null;

  function openMenu() {
    if (!navMenu) return;
    navMenu.classList.add("show-menu");
    body.style.overflow = "hidden";
    body.classList.add("nav-open");              // <— NY
    lastFocusedBeforeMenu = document.activeElement;
    const firstLink = navMenu.querySelector(".nav__link");
    firstLink && firstLink.focus();
  }

  function closeMenu() {
    if (!navMenu) return;
    navMenu.classList.remove("show-menu");
    body.style.overflow = "";
    body.classList.remove("nav-open");           // <— NY
    if (navToggle && lastFocusedBeforeMenu === navToggle) navToggle.focus();
  }

  navToggle?.addEventListener("click", openMenu);
  navClose?.addEventListener("click", closeMenu);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && navMenu?.classList.contains("show-menu")) closeMenu();
  });
  navMenu?.addEventListener("click", (e) => { if (e.target === navMenu) closeMenu(); });
  $$(".nav__link").forEach((link) => link.addEventListener("click", closeMenu));
})();

/* =========================
   HEADER BAKGRUNN PÅ SCROLL
   ========================= */
(() => {
  const header = $("#header");
  if (!header) return;
  const onScroll = () => {
    if (window.scrollY >= 50) header.classList.add("scroll-header");
    else header.classList.remove("scroll-header");
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
})();

/* =========================
   AKTIV LENKE I MENYEN (side + ev. seksjon på index)
   ========================= */
(() => {
  const navLinks = Array.from(document.querySelectorAll(".nav__menu .nav__link"));
  if (!navLinks.length) return;

  // Hjelper: rens URL til {pathname, hash} uten domene
  function parse(url) {
    const a = document.createElement("a");
    a.href = url;
    return { path: a.pathname.replace(/\/+$/, ""), hash: a.hash };
  }

  const here   = parse(location.href);
  const isHome = /(?:^|\/)(index\.html)?$/.test(here.path) || here.path === "";

  // 1) Sidespesifikk highlighting (undersider + også på index)
  function setPageActive() {
    // nullstill
    navLinks.forEach(l => {
      l.classList.remove("active-link");
      l.removeAttribute("aria-current");
    });

    // finn beste match (samme pathname)
    let best = null;
    navLinks.forEach(l => {
      const { path, hash } = parse(l.href);

      // hvis lenken peker til samme fil/sti som nåværende side, marker som aktiv
      const samePage = (path || "/") === (here.path || "/");
      // ekstra: hvis vi er på index og lenken er et #anker, lar vi scroll‑logikk ta over senere
      const isSamePageAnchor = isHome && samePage && hash;

      if (samePage && !isSamePageAnchor) {
        best = l;
      }
    });

    if (best) {
      best.classList.add("active-link");
      best.setAttribute("aria-current", "page");
    }
  }

  setPageActive();

  // 2) Seksjons‑highlight kun på forsiden for ankerlenker som peker til samme side
  if (!isHome) return;

  const sectionTargets = navLinks
    .map(l => parse(l.href))
    .filter(p => (p.path === here.path || (p.path === "" && here.path === "")) && p.hash)
    .map(p => document.getElementById(p.hash.slice(1)))
    .filter(Boolean);

  if (!sectionTargets.length) return;

  let ticking = false;
  function updateSectionActive() {
    const scrollY = window.pageYOffset;

    // hvis en seksjon er synlig, marker tilhørende nav‑lenke som aktiv
    let currentId = null;
    sectionTargets.forEach(sec => {
      const h = sec.offsetHeight;
      const t = sec.offsetTop - 80; // offset for header
      if (scrollY > t && scrollY <= t + h) currentId = sec.id;
    });

    if (currentId) {
      navLinks.forEach(l => {
        const { path, hash } = parse(l.href);
        const samePage = (path || "/") === (here.path || "/");
        const isAnchor = samePage && hash === `#${currentId}`;
        if (isAnchor) {
          l.classList.add("active-link");
          l.setAttribute("aria-current", "location");
        } else {
          l.classList.remove("active-link");
          // behold aria-current="page" på den side‑aktive hvis satt
          if (l.getAttribute("aria-current") === "location") {
            l.removeAttribute("aria-current");
          }
        }
      });
    } else {
      // dersom ingen seksjon “eier” view, fall tilbake til side‑aktiv
      setPageActive();
    }
  }

  function onScroll() {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        updateSectionActive();
        ticking = false;
      });
      ticking = true;
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  updateSectionActive();
})();


/* =========================
   SCROLL-TOP KNAPP
   ========================= */
(() => {
  const btn = $("#scroll-top");
  if (!btn) return;
  const show = () => (window.scrollY >= 350 ? btn.classList.add("show") : btn.classList.remove("show"));
  btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  window.addEventListener("scroll", show, { passive: true });
  show();
})();

/* =========================
   PROSJEKT-FILTER (forside, statisk)
   ========================= */
(() => {
  const filterButtons = $$(".projects .filter__btn");
  const projectCards  = $$(".projects .project__card");
  if (!filterButtons.length || !projectCards.length) return;

  function setFilter(value) {
    projectCards.forEach((card) => {
      const match = value === "all" || card.getAttribute("data-category") === value;
      card.classList.toggle("is-hidden", !match);
      card.setAttribute("aria-hidden", String(!match));
      $$("a, button", card).forEach((el) => (el.tabIndex = match ? 0 : -1));
    });
  }

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      filterButtons.forEach((b) => {
        b.classList.remove("filter__btn--active");
        b.setAttribute("aria-selected", "false");
        b.setAttribute("aria-pressed", "false");
      });
      button.classList.add("filter__btn--active");
      button.setAttribute("aria-selected", "true");
      button.setAttribute("aria-pressed", "true");
      setFilter(button.getAttribute("data-filter") || "all");
    });
  });

  const active = document.querySelector(".projects .filter__btn--active");
  if (active) {
    active.setAttribute("aria-selected", "true");
    active.setAttribute("aria-pressed", "true");
  }
  setFilter(active?.getAttribute("data-filter") || "all");
})();

/* =========================
   KONTAKTSKJEMA – VALIDERING + SEND TIL FORMSPREE
   ========================= */
(() => {
  const form = $("#contact-form");
  if (!form) return;

  const thank = $("#thank-you");
  const showAlert = (msg) => alert(msg);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nameEl    = $("#name");
    const emailEl   = $("#email");
    const phoneEl   = $("#phone");
    const messageEl = $("#message");
    const honeypot  = form.querySelector('input[name="_gotcha"], input[name="website"]');

    const name    = nameEl?.value.trim() || "";
    const email   = emailEl?.value.trim() || "";
    const phone   = phoneEl?.value.trim() || "";
    const message = messageEl?.value.trim() || "";

    if (!name || !email || !message) {
      showAlert("Vennligst fyll ut alle obligatoriske felt (*).");
      return;
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailPattern.test(email)) {
      showAlert("Vennligst oppgi en gyldig e-postadresse.");
      emailEl?.focus();
      return;
    }
    if (phone && !/^[0-9 +()\-]{5,}$/.test(phone)) {
      showAlert("Vennligst oppgi et gyldig telefonnummer.");
      phoneEl?.focus();
      return;
    }

    if (honeypot && honeypot.value) return;

    try {
      const data = new FormData(form);
      data.append("_subject", "Ny henvendelse fra kontaktskjema");
      data.append("_replyto", email);

      const res = await fetch(form.action, {
        method: "POST",
        body: data,
        headers: { Accept: "application/json" },
        credentials: "omit"
      });

      if (res.ok) {
        form.reset();

        form.classList.add("is-hidden");
        if (thank) {
          thank.setAttribute("role", "status");
          thank.setAttribute("aria-live", "polite");
          thank.hidden = false;
          requestAnimationFrame(() => thank.classList.add("show"));
          thank.scrollIntoView({ behavior: "smooth", block: "center" });
          const newBtn = $("#thank-new");
          newBtn?.focus();
          newBtn?.addEventListener("click", () => {
            thank.classList.remove("show");
            setTimeout(() => {
              thank.hidden = true;
              form.classList.remove("is-hidden");
              $("#name")?.focus();
            }, 220);
          }, { once: true });
        } else {
          showAlert("Melding sendt! Vi kontakter deg snart.");
        }
        return;
      }

      // Feil fra Formspree
      let msg = "Noe gikk galt. Vennligst prøv igjen.";
      try {
        const j = await res.json();
        if (j?.errors?.length) msg = j.errors.map(e => e.message).join("\n");
      } catch {}
      showAlert(msg);

    } catch (err) {
      console.error(err);
      showAlert("Nettverksfeil – kunne ikke sende. Sjekk tilkoblingen og prøv igjen.");
    }
  });
})();

/* =========================
   COUNTUP (Hero stats)
   ========================= */
(() => {
    const items = $$("[data-countup]");
    if (!items.length) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const formatNumber = (value, decimals) =>
      Number(value).toLocaleString("nb-NO", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    function animateCount(el) {
      const end      = parseFloat(el.getAttribute("data-count-to")) || 0;
      const start    = parseFloat(el.getAttribute("data-start")) || 0;
      const duration = parseInt(el.getAttribute("data-duration"), 10) || 1800;
      const decimals = parseInt(el.getAttribute("data-decimals"), 10) || 0;
      const prefix   = el.getAttribute("data-prefix") || "";
      const suffix   = el.getAttribute("data-suffix") || "";

      if (reduceMotion) {
        el.textContent = `${prefix}${formatNumber(end, decimals)}${suffix}`;
        el.setAttribute("data-counted", "true");
        return;
      }

      let startTime = null;
      const step = (ts) => {
        if (!startTime) startTime = ts;
        const progress = Math.min((ts - startTime) / duration, 1);
        const eased    = easeOutCubic(progress);
        const current  = start + (end - start) * eased;
        el.textContent = `${prefix}${formatNumber(current, decimals)}${suffix}`;
        if (progress < 1) requestAnimationFrame(step);
        else {
          el.textContent = `${prefix}${formatNumber(end, decimals)}${suffix}`;
          el.setAttribute("data-counted", "true");
        }
      };
      requestAnimationFrame(step);
    }

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.querySelectorAll("[data-countup]").forEach((el) => {
            if (el.getAttribute("data-counted") !== "true") animateCount(el);
          });
          obs.unobserve(entry.target);
        });
      },
      { threshold: 0.4 }
    );

    const container = $(".hero__stats");
    if (container) observer.observe(container);
    else items.forEach((el) => observer.observe(el));
})();

/* =========================
   HERO REVEAL & PARALLAX
   ========================= */
(() => {
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Fallback IntersectionObserver hvis ScrollReveal mangler eller bruker ønsker mindre bevegelse
  function fallbackReveal() {
    const targets = $$(".sr-hero-1, .sr-hero-2, .sr-hero-3, .sr-hero-stats, .sr-hero-image, .sr-hero-stats .hero__stat");
    if (!targets.length) return;
    if ("IntersectionObserver" in window && !reduceMotion) {
      const io = new IntersectionObserver((entries, obs) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("revealed");
            obs.unobserve(e.target);
          }
        });
      }, { rootMargin: "0px 0px -10% 0px", threshold: 0.15 });
      targets.forEach((el) => io.observe(el));
    } else {
      targets.forEach((el) => el.classList.add("revealed"));
    }
  }

  // Parallax hint (±5px) på hero-bilde
  function initParallax() {
    if (reduceMotion) return;
    const wrap = document.querySelector(".sr-hero-image[data-parallax]");
    if (!wrap) return;
    let lastY = 0;
    const onScroll = () => {
      const rect = wrap.getBoundingClientRect();
      const vh = window.innerHeight || 800;
      if (rect.top < vh && rect.bottom > 0) {
        const progress = (vh - rect.top) / (vh + rect.height); // 0..1
        const translate = Math.round((progress - 0.5) * 10);   // -5..5px
        if (translate !== lastY) {
          wrap.style.transform = `translateY(${translate}px)`;
          lastY = translate;
        }
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  // Hvis SR ikke finnes, kjør fallback nå
  if (typeof ScrollReveal === "undefined") {
    fallbackReveal();
    initParallax();
  } else {
    // Ellers vil vi også konfigurere SR (selve init gjøres i SR-blokka under)
    // Parallax er uavhengig av SR
    initParallax();
  }
})();

/* =========================
   SCROLL REVEAL – konsistent på alle sider (+ HERO stagger)
   ========================= */
(() => {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.addEventListener("DOMContentLoaded", () => {
    if (typeof ScrollReveal === "undefined" || prefersReducedMotion) return;

    const sr = ScrollReveal({
      origin: "bottom",
      distance: "24px",
      duration: 800,
      delay: 120,
      easing: "cubic-bezier(.2,.6,.2,1)",
      mobile: true,
      cleanup: true,
      reset: false
    });

    // HERO – stagger (matches klassene du har i HTML)
    sr.reveal(".sr-hero-1", { origin: "bottom", delay: 0 });
    sr.reveal(".sr-hero-2", { origin: "bottom", delay: 100 });
    sr.reveal(".sr-hero-3", { origin: "bottom", delay: 200 });
    sr.reveal(".sr-hero-stats .hero__stat", { origin: "bottom", interval: 100, delay: 150 });
    sr.reveal(".sr-hero-image", { origin: "right", distance: "40px", scale: 0.98, delay: 150 });

    // Globale blokker (forside + undersider)
    sr.reveal([
      ".section__header",
      ".section__title",
      ".section__description",
      ".page-hero__content",
      ".page-hero__image",
      ".about__feature",
      ".about__content",
      ".about__image",
      ".about__stats .hero__stat",
      ".timeline__item",
      ".team__card",
      ".badge__item",
      ".cta__container > *",
      ".faq__item",
      ".service__card",
      ".project__card",
      ".testimonial__card",
      ".contact__card",
      ".contact__form",
      ".footer__section"
    ].join(", "), { interval: 100, viewFactor: 0.12 });

    // Header/nav – subtil “drop‑in” ved første last
    sr.reveal(".header", {
      origin: "top",
      distance: "8px",
      duration: 600,
      delay: 80,
      viewFactor: 1
    });

    // Om oss-badge
    sr.reveal(".about__experience", {
      origin: "right",
      distance: "20px",
      duration: 700,
      delay: 160,
      viewFactor: 0.2
    });

    // Kontaktkart (container)
    sr.reveal(".contact__map", {
      origin: "bottom",
      distance: "20px",
      duration: 700,
      delay: 120,
      viewFactor: 0.12
    });

    // Footer nederste rad
    sr.reveal(".footer__bottom", {
      origin: "bottom",
      distance: "12px",
      duration: 600,
      delay: 100,
      viewFactor: 0.2
    });
  });
})();

/* =========================
   HASH OFFSET (fallback)
   ========================= */
(() => {
  function ensureHashOffset() {
    if (window.location.hash) {
      const el = document.getElementById(window.location.hash.substring(1));
      if (el) window.scrollTo({ top: el.offsetTop - 72, behavior: "smooth" });
    }
  }
  window.addEventListener("hashchange", ensureHashOffset);
})();

/* ======================================================
   BILUTVALG-SIDE – Directus: søk, filtrer, sorter, paginer
   Med: AbortController, requestId guard, debounce og cache (SWR)
   ====================================================== */
(() => {
  const carsGrid = $("#cars-grid");
  if (!carsGrid) return; // ikke på bilutvalg-siden

  // UI-refs
  const resultCount   = $("#result-count");
  const searchEl      = $("#search");
  const sortEl        = $("#sort");
  const filterButtons = $$(".projects__filter .filter__btn");
  const filtersForm   = $("#filters-form");
  const applyBtn      = $("#apply-filters");
  const resetBtn      = $("#reset-filters");
  const prevBtn       = $("#prev-page");
  const nextBtn       = $("#next-page");
  const pageIndicator = $("#page-indicator");

  // Mobil filter sheet
  const filtersBtn      = $(".btn--filters");
  const filtersDrawer   = $(".filters-drawer");
  const filtersBackdrop = $(".filters-backdrop");
  const filtersClose    = $(".filters-drawer__close");
  let lastFocusBeforeDrawer = null;

  function openFilters() {
    if (!filtersDrawer) return;
    lastFocusBeforeDrawer = document.activeElement;
    filtersDrawer.classList.add("show");
    filtersBackdrop?.classList.add("show");
    document.body.classList.add("nav-open");
    document.body.style.overflow = "hidden";
    filtersBtn?.setAttribute("aria-expanded", "true");
    // fokus første interaktive
    const first = filtersDrawer.querySelector("input, select, button");
    first && first.focus();
  }
  function closeFilters() {
    if (!filtersDrawer) return;
    filtersDrawer.classList.remove("show");
    filtersBackdrop?.classList.remove("show");
    document.body.classList.remove("nav-open");
    document.body.style.overflow = "";
    filtersBtn?.setAttribute("aria-expanded", "false");
    lastFocusBeforeDrawer && lastFocusBeforeDrawer.focus?.();
  }

  filtersBtn?.addEventListener("click", openFilters);
  filtersClose?.addEventListener("click", closeFilters);
  filtersBackdrop?.addEventListener("click", closeFilters);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && filtersDrawer?.classList.contains("show")) closeFilters();
  });

  // Directus config
  const DIRECTUS_URL  = "https://lasse-bil.directus.app";
  const DIRECTUS_TOKEN = "";          // valgfritt: sett token her hvis du ikke bruker Public
  const ASSET_KEY      = "optimized"; // må matche preset du laget i Directus
  const PAGE_SIZE      = 12;

  // State
  const state = {
    page: 1,
    category: "all",
    query: "",
    sort: "relevance",
    filters: {
      body: [], fuel: [], gear: [],
      "year-min": "", "year-max": "",
      "price-min": "", "price-max": ""
    },
    total: 0,
  };

  // In-memory cache (SWR)
  const cache = new Map();
  const CACHE_TTL_MS = 60_000; // 60s

  // request control
  let currentController = null;
  let lastRequestId = 0;

  // Helpers
  const nok = (v) =>
    v == null ? "" : Number(v).toLocaleString("nb-NO", { style: "currency", currency: "NOK", maximumFractionDigits: 0 });
  const km = (v) => (v == null ? "" : `${Number(v).toLocaleString("nb-NO")} km`);

  function imageUrl(fileId) {
    if (!fileId) return "assets/images/projects/placeholder-car.jpg";
    return `${DIRECTUS_URL}/assets/${fileId}?key=${ASSET_KEY}`;
  }
  const escapeAttr = (str) => (str || "").replace(/"/g, "&quot;");

  function getCarLink(car) {
    return `car.html?id=${encodeURIComponent(car.id)}`;
  }

  function cardTemplate(car) {
    const {
      id, title, mileage, price, year,
      fuel_type, transmission, category, image
    } = car;

    const imgId  = image && (image.id || image);
    const imgSrc = imageUrl(imgId);
    const cat    = (category || "").toString().trim();
    const href   = getCarLink(car);

    return `
      <div class="project__card" data-category="${escapeAttr(cat)}">
        <div class="project__image">
          <a href="${escapeAttr(href)}" class="project__img-link" aria-label="Åpne detaljside for ${escapeAttr(title || "bilen")}">
            <img
              src="${imgSrc}"
              alt="${escapeAttr(title || "Bil")}"
              class="project__img"
              loading="lazy"
              decoding="async"
              onerror="this.onerror=null;this.src='assets/images/projects/placeholder-car.jpg';"
            >
          </a>
          <div class="project__overlay" aria-hidden="true">
            <div class="project__actions">
              <a class="project__btn" href="${escapeAttr(href)}" aria-label="Se detaljer">
                <i class="fas fa-eye" aria-hidden="true"></i>
              </a>
              <a class="project__btn" href="tel:+4732891234" aria-label="Ring oss om ${escapeAttr(title || "bilen")}">
                <i class="fas fa-phone" aria-hidden="true"></i>
              </a>
            </div>
          </div>
        </div>
        <div class="project__content">
          ${cat ? `<span class="project__category">${escapeAttr(cat.charAt(0).toUpperCase() + cat.slice(1))}</span>` : ""}
          <h3 class="project__title">
            <a href="${escapeAttr(href)}" class="project__title-link">${escapeAttr(title || "Uten tittel")}</a>
          </h3>
          <div class="project__details">
            ${year ? `<span class="project__detail"><i class="fas fa-calendar" aria-hidden="true"></i>${year}</span>` : ""}
            ${mileage ? `<span class="project__detail"><i class="fas fa-tachometer-alt" aria-hidden="true"></i>${km(mileage)}</span>` : ""}
            ${fuel_type ? `<span class="project__detail"><i class="fas fa-gas-pump" aria-hidden="true"></i>${escapeAttr(fuel_type)}</span>` : ""}
            ${transmission ? `<span class="project__detail"><i class="fas fa-cog" aria-hidden="true"></i>${escapeAttr(transmission)}</span>` : ""}
          </div>
          <div class="project__price">
            ${price ? `<span class="project__price-amount">${nok(price)}</span>` : ""}
          </div>
          <div class="project__cta-row" style="display:flex;gap:.5rem;flex-wrap:wrap;">
            <a href="${escapeAttr(href)}" class="btn btn--primary btn--small">
              <i class="fas fa-eye" aria-hidden="true"></i> Se detaljer
            </a>
            <a href="index.html#kontakt" class="btn btn--secondary btn--small project__contact-btn">
              <i class="fas fa-paper-plane" aria-hidden="true"></i> Kontakt oss
            </a>
          </div>
        </div>
      </div>
    `;
  }

  /* ---------- Directus spørring ---------- */
  function titleCase(v = "") {
    v = String(v).trim();
    if (!v) return v;
    if (v.toLowerCase() === "elektrisk") return "Elektrisk";
    if (v.toLowerCase() === "hybrid")   return "Hybrid";
    if (v.toLowerCase() === "bensin")   return "Bensin";
    if (v.toLowerCase() === "diesel")   return "Diesel";
    if (v.toLowerCase() === "automat")  return "Automat";
    if (v.toLowerCase() === "manuell")  return "Manuell";
    return v.charAt(0).toUpperCase() + v.slice(1).toLowerCase();
  }

  function buildDirectusFilter() {
    const and = [];
    and.push({ status: { _eq: "published" } });

    if (state.category && state.category !== "all") {
      and.push({ category: { _eq: state.category } });
    }

    if (state.query) {
      const q = state.query;
      and.push({
        _or: [
          { title:        { _icontains: q } },
          { description:  { _icontains: q } },
          { fuel_type:    { _icontains: q } },
          { transmission: { _icontains: q } }
        ],
      });
    }

    const f = state.filters;
    if (f.body?.length) and.push({ category: { _in: f.body } });
    if (f.fuel?.length) and.push({ fuel_type: { _in: f.fuel.map(titleCase) } });
    if (f.gear?.length) and.push({ transmission: { _in: f.gear.map(titleCase) } });
    if (f["year-min"])  and.push({ year:  { _gte: Number(f["year-min"]) } });
    if (f["year-max"])  and.push({ year:  { _lte: Number(f["year-max"]) } });
    if (f["price-min"]) and.push({ price: { _gte: Number(f["price-min"]) } });
    if (f["price-max"]) and.push({ price: { _lte: Number(f["price-max"]) } });

    return { _and: and };
  }

  function sortToDirectus() {
    switch (state.sort) {
      case "price-asc":  return "price";
      case "price-desc": return "-price";
      case "year-desc":  return "-year";
      case "km-asc":     return "mileage";
      default:           return "-date_created";
    }
  }

  function buildKey() {
    return JSON.stringify({
      page: state.page,
      category: state.category,
      query: state.query,
      sort: state.sort,
      filters: state.filters,
      limit: PAGE_SIZE
    });
  }

  async function fetchCarsActual(signal) {
    const params = new URLSearchParams();
    params.set(
      "fields",
      [
        "id","title","description","mileage","price","year",
        "fuel_type","transmission","category","image","status"
      ].join(",")
    );
    params.set("filter", JSON.stringify(buildDirectusFilter()));
    params.set("sort",   sortToDirectus());
    params.set("limit",  String(PAGE_SIZE));
    params.set("page",   String(state.page));
    params.set("meta",   "filter_count");

    const headers = { Accept: "application/json" };
    if (DIRECTUS_TOKEN) headers.Authorization = `Bearer ${DIRECTUS_TOKEN}`;

    const res = await fetch(`${DIRECTUS_URL}/items/cars?${params.toString()}`, {
      headers,
      credentials: "omit",
      cache: "default",
      signal
    });

    if (!res.ok) throw new Error(`HTTP ${res.status} – ${res.statusText}`);
    const json = await res.json();
    return { rows: json.data || [], total: json?.meta?.filter_count ?? 0 };
  }

  /* ---------- UI states ---------- */
  function setLoading() {
    carsGrid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:2rem;color:var(--text-light)">Laster biler …</div>`;
  }
  function setEmpty() {
    carsGrid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:2rem;color:var(--text-light)">Ingen biler matchet filtrene.</div>`;
  }
  function setError(msg) {
    carsGrid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:2rem;">
        <p style="color:var(--error-color);font-weight:600">Kunne ikke hente biler.</p>
        <p style="color:var(--text-light)">${msg || "Prøv igjen senere."}</p>
      </div>`;
  }

  function renderRows(rows) {
    carsGrid.innerHTML = rows.map(cardTemplate).join("");
    if (typeof ScrollReveal !== "undefined") {
      const sr = ScrollReveal();
      sr.reveal(".project__card", { interval: 100, distance: "30px", origin: "bottom", duration: 800 });
    }
  }

  /* ---------- Render med abort, race-guard og cache ---------- */
  async function render({ useCacheFirst = true } = {}) {
    const key = buildKey();
    const now = Date.now();

    if (currentController) currentController.abort();
    currentController = new AbortController();
    const { signal } = currentController;

    const myRequestId = ++lastRequestId;

    // Cache-first (SWR)
    if (useCacheFirst && cache.has(key)) {
      const cached = cache.get(key);
      if (now - cached.ts < CACHE_TTL_MS) {
        renderRows(cached.rows);
        updateMetaUI(cached.total);
        try {
          const fresh = await fetchCarsActual(signal);
          if (myRequestId !== lastRequestId) return;
          cache.set(key, { ...fresh, ts: Date.now() });
          renderRows(fresh.rows);
          updateMetaUI(fresh.total);
          return;
        } catch (_) { return; }
      }
    }

    setLoading();
    try {
      const data = await fetchCarsActual(signal);
      if (myRequestId !== lastRequestId) return;
      cache.set(key, { ...data, ts: Date.now() });

      if (!data.rows.length) setEmpty();
      else renderRows(data.rows);

      updateMetaUI(data.total);
    } catch (e) {
      if (e.name === "AbortError") return;
      console.error(e);
      setError(e.message);
    }
  }

  function updateMetaUI(total) {
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    resultCount  && (resultCount.textContent   = `Viser ${total} bil${total === 1 ? "" : "er"}`);
    pageIndicator && (pageIndicator.textContent = `Side ${state.page} / ${totalPages}`);
    prevBtn && (prevBtn.disabled = state.page <= 1);
    nextBtn && (nextBtn.disabled = state.page >= totalPages);
  }

  /* ---------- Event wiring (med debounce) ---------- */
  // Kategori-chips (øverst)
  const onChipClick = debounce((btn) => {
    filterButtons.forEach((b) => {
      b.classList.remove("filter__btn--active");
      b.setAttribute("aria-selected", "false");
      b.setAttribute("aria-pressed", "false");
    });
    btn.classList.add("filter__btn--active");
    btn.setAttribute("aria-selected", "true");
    btn.setAttribute("aria-pressed", "true");
    state.category = btn.getAttribute("data-filter") || "all";
    state.page = 1;
    render();
  }, 150);

  filterButtons.forEach((btn) => {
    btn.addEventListener("click", () => onChipClick(btn));
  });

  // Søk (debounce)
  const onSearch = debounce((e) => {
    state.query = (e.target.value || "").trim().toLowerCase();
    state.page = 1;
    render();
  }, 300);
  searchEl?.addEventListener("input", onSearch);

  // Sortering (debounce)
  const onSortChange = debounce((e) => {
    state.sort = e.target.value;
    state.page = 1;
    render();
  }, 150);
  sortEl?.addEventListener("change", onSortChange);

  // Sidefiltre – Bruk/Nullstill
  const applyFilters = debounce(() => {
    const form    = new FormData(filtersForm);
    const entries = Object.fromEntries(form.entries());
    state.filters = {
      body:  $$('#filters-form input[name="body"]:checked').map((i) => i.value),
      fuel:  $$('#filters-form input[name="fuel"]:checked').map((i) => i.value),
      gear:  $$('#filters-form input[name="gear"]:checked').map((i) => i.value),
      "year-min":  entries["year-min"]  || "",
      "year-max":  entries["year-max"]  || "",
      "price-min": entries["price-min"] || "",
      "price-max": entries["price-max"] || "",
    };
    state.page = 1;
    render();
    // lukk mobil-sheet hvis åpen
    closeFilters();
  }, 200);

  applyBtn?.addEventListener("click", applyFilters);

  resetBtn?.addEventListener("click", () => {
    filtersForm?.reset();
    state.filters = { body: [], fuel: [], gear: [], "year-min": "", "year-max": "", "price-min": "", "price-max": "" };
    state.page = 1;
    render();
    closeFilters();
  });

  // Paginering
  prevBtn?.addEventListener("click", () => {
    if (state.page > 1) {
      state.page--;
      render({ useCacheFirst: true });
    }
  });
  nextBtn?.addEventListener("click", () => {
    state.page++;
    render({ useCacheFirst: true });
  });

  // Init
  render();
})();
// js/script.js
(function () {
  // Helper: qs / qsa
  const $  = (sel, scope=document) => scope.querySelector(sel);
  const $$ = (sel, scope=document) => Array.from(scope.querySelectorAll(sel));

  // =========================
  // 1) Navigation (mobile)
  // =========================
  const navMenu   = $('#nav-menu');
  const navToggle = $('#nav-toggle');
  const navClose  = $('#nav-close');

  if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
      navMenu.classList.add('show-menu');
      navToggle.setAttribute('aria-expanded', 'true');
    });
  }
  if (navClose && navMenu) {
    navClose.addEventListener('click', () => {
      navMenu.classList.remove('show-menu');
      navToggle?.setAttribute('aria-expanded', 'false');
    });
  }
  // Lukk på link-klikk (mobil)
  $$('.nav__link', navMenu).forEach(link =>
    link.addEventListener('click', () => navMenu.classList.remove('show-menu'))
  );

  // =========================
  // 2) Scroll to top button
  // =========================
  const scrollTopBtn = $('#scroll-top');
  if (scrollTopBtn) {
    const onScroll = () => {
      if (window.scrollY > 500) scrollTopBtn.classList.add('show-scroll');
      else scrollTopBtn.classList.remove('show-scroll');
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    scrollTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  // =========================
  // 3) CountUp (data-countup)
  // =========================
  const counters = $$('[data-countup]');
  if (counters.length) {
    const animate = (el) => {
      const end   = parseFloat(el.getAttribute('data-count-to')) || 0;
      const durMs = parseInt(el.getAttribute('data-duration'), 10) || 2000;
      const suf   = el.getAttribute('data-suffix') || '';
      const start = 0;
      const startTs = performance.now();

      const step = (ts) => {
        const p = Math.min((ts - startTs) / durMs, 1);
        const val = Math.floor(start + (end - start) * p);
        el.textContent = val.toLocaleString('no-NO') + suf;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          animate(e.target);
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.4 });

    counters.forEach(el => io.observe(el));
  }

  // =========================
  // 4) Forms (Formspree + takk)
  // =========================
  const form = $('#contact-form');
  const thank = $('#thank-you');
  if (form) {
    form.addEventListener('submit', async (e) => {
      // Hvis action peker til Formspree kan vi la den poste normalt,
      // men dette fanger og viser "takk" uten redirect.
      e.preventDefault();

      const btn = form.querySelector('.form__submit');
      btn && (btn.disabled = true);

      try {
        const res = await fetch(form.action, {
          method: form.method || 'POST',
          headers: { 'Accept': 'application/json' },
          body: new FormData(form)
        });

        if (res.ok) {
          form.setAttribute('hidden', '');
          thank?.removeAttribute('hidden');
          form.reset();
        } else {
          alert('Noe gikk galt. Prøv igjen, eller send oss en e-post.');
        }
      } catch (err) {
        alert('Fikk ikke sendt skjema. Sjekk nettverksforbindelsen.');
      } finally {
        btn && (btn.disabled = false);
      }
    });
  }

  // =========================
  // 5) FAQ (details eller custom .faq__item)
  // =========================
  // a) <details> varianten – trenger ingen JS, men vi kan legge til små forbedringer
  $$('details.faq__item').forEach(d => {
    d.addEventListener('toggle', () => {
      // Lukk andre når én åpnes
      if (d.open) {
        $$('details.faq__item').forEach(other => { if (other !== d) other.open = false; });
      }
    });
  });

  // b) Knapp/Panel-varianten (dersom siden bruker .faq__question/.faq__answer)
  const faqItems = $$('.faq__item:not(details)');
  if (faqItems.length) {
    faqItems.forEach((item, idx) => {
      const btn = item.querySelector('.faq__question');
      const panel = item.querySelector('.faq__answer');
      if (!btn || !panel) return;

      const pid = panel.id || `faq-panel-${idx+1}`;
      panel.id = pid;
      btn.setAttribute('aria-controls', pid);
      btn.setAttribute('aria-expanded', 'false');
      panel.style.maxHeight = '0px';

      const openItem = () => {
        btn.setAttribute('aria-expanded', 'true');
        item.classList.add('is-open');
        panel.style.maxHeight = panel.scrollHeight + 'px';
      };
      const closeItem = () => {
        btn.setAttribute('aria-expanded', 'false');
        item.classList.remove('is-open');
        panel.style.maxHeight = '0px';
      };

      btn.addEventListener('click', () => {
        const open = item.classList.contains('is-open');
        faqItems.forEach(it => { if (it !== item) it.classList.contains('is-open') && it.querySelector('.faq__question').click(); });
        open ? closeItem() : openItem();
      });

      window.addEventListener('resize', () => {
        if (item.classList.contains('is-open')) {
          panel.style.maxHeight = panel.scrollHeight + 'px';
        }
      }, { passive: true });
    });
  }

  // =========================
  // 6) ScrollReveal (hvis lastet)
  // =========================
  if (window.ScrollReveal) {
    const sr = ScrollReveal();
    // Globale seksjoner
    sr.reveal('.section .section__header, .hero__content', {
      distance: '20px', origin: 'bottom', duration: 700, opacity: 0, easing: 'ease', interval: 100, cleanup: true
    });
    // Kort/galleri
    const revealSelectors = [
      '.service__card', '.team__card', '.logos__item',
      '.testimonial', '.case-card', '.video-card'
    ];
    sr.reveal(revealSelectors.join(', '), {
      distance: '16px', origin: 'bottom', duration: 650, opacity: 0, easing: 'ease', interval: 100, cleanup: true
    });
  }

  // =========================
  // 7) Referanser-spesifikt: Før/Efter compare
  // =========================
  const compareWraps = $$('[data-compare]');
  compareWraps.forEach((wrap) => {
    const beforeImg = $('.compare__img--before', wrap);
    const slider    = $('.compare__slider', wrap);
    if (!beforeImg || !slider) return;

    const setSplit = (val) => {
      const pct = Math.max(0, Math.min(100, val));
      // Flytt "masken" for før-bildet
      beforeImg.style.clipPath = `inset(0 ${100 - pct}% 0 0)`;
      // NB: pseudo-elementet for linje kan ikke manipuleres direkte i JS.
      // Hvis du vil at linjen flytter seg, legg inn et faktisk element og flytt det (kan legges til senere).
    };

    // Init
    setSplit(parseFloat(slider.value || '50'));
    slider.addEventListener('input', (e) => setSplit(parseFloat(e.target.value)));
  });

  // =========================
  // 8) Video-iframe småtilpasninger
  // =========================
  // Hindrer uønsket iOS-zoom/fokus; fortsatt klikkbar
  $$('.video-card__frame iframe').forEach((frame) => {
    frame.setAttribute('tabindex', '-1');
    frame.setAttribute('title', frame.getAttribute('title') || 'Kundevideo');
  });

  // =========================
  // 9) Smooth anchor scroll (ekstra)
  // =========================
  $$('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length > 1) {
        const target = $(id);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  });

  // Ready marker (for CSS hooks)
  document.body.classList.add('is-ready');
})();
