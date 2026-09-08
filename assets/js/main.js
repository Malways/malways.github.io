/* =========================================================
   malways - portfolio interactions
   Vanilla JS, no dependencies.
   ========================================================= */
(() => {
  "use strict";

  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ====================================================== */
  /* i18n - KO / EN switch                                  */
  /* ====================================================== */
  const LANG_KEY = "malways:lang";
  const LANGS = ["ko", "en"];

  const UI = {
    ko: {
      menuOpen: "닫기",
      menuClosed: "메뉴",
    },
    en: {
      menuOpen: "Close",
      menuClosed: "Menu",
    },
  };

  // English is the default; a saved choice always wins.
  function detectLang() {
    let saved = null;
    try { saved = localStorage.getItem(LANG_KEY); } catch (err) { saved = null; }
    return LANGS.includes(saved) ? saved : "en";
  }

  let lang = detectLang();
  const t = () => UI[lang];

  /* ------------------------------------------------------ */
  /* Split headline text into animatable words               */
  /* ------------------------------------------------------ */
  function splitText(el) {
    const source = el.dataset[lang] || el.dataset.text || el.textContent;
    const words = source.trim().split(/\s+/);
    const wasIn = el.classList.contains("is-in");

    el.textContent = "";
    el.classList.add("split-parent");
    el.classList.remove("is-in");

    words.forEach((word, i) => {
      const line = document.createElement("span");
      line.className = "split-line";

      const inner = document.createElement("span");
      inner.className = "split-word";
      inner.style.setProperty("--d", i);
      inner.textContent = word;

      // A word wrapped in {braces} renders as an underlined inline accent.
      if (word.startsWith("{") && word.endsWith("}")) {
        inner.textContent = word.slice(1, -1);
        inner.classList.add("u-link");
      }

      line.appendChild(inner);
      el.appendChild(line);
      el.appendChild(document.createTextNode(" "));
    });

    if (wasIn) {
      // Let the browser register the reset transform before replaying.
      requestAnimationFrame(() => el.classList.add("is-in"));
    }
  }

  /* ------------------------------------------------------ */
  /* Apply a language across the document                    */
  /* ------------------------------------------------------ */
  function applyLang(next, { persist = true } = {}) {
    if (!LANGS.includes(next)) return;
    lang = next;
    document.documentElement.lang = lang;

    if (persist) {
      try { localStorage.setItem(LANG_KEY, lang); } catch (err) { /* private mode */ }
    }

    // Rich text (contains inline markup authored in this file).
    $$("[data-ko-html], [data-en-html]").forEach((el) => {
      const value = el.dataset[lang + "Html"];
      if (value != null) el.innerHTML = value;
    });

    // Plain text.
    $$("[data-ko], [data-en]").forEach((el) => {
      const value = el.dataset[lang];
      if (value == null) return;
      if (el.hasAttribute("data-split")) splitText(el);
      else el.textContent = value;
    });

    // Placeholders.
    $$("[data-ko-ph], [data-en-ph]").forEach((el) => {
      const value = el.dataset[lang + "Ph"];
      if (value != null) el.setAttribute("placeholder", value);
    });

    // Accessible names.
    $$("[data-ko-aria], [data-en-aria]").forEach((el) => {
      const value = el.dataset[lang + "Aria"];
      if (value != null) el.setAttribute("aria-label", value);
    });

    // Switch buttons.
    $$("[data-lang]").forEach((btn) => {
      btn.setAttribute("aria-pressed", String(btn.dataset.lang === lang));
    });

    // Menu button label follows the open/closed state.
    const burgerEl = $(".burger");
    if (burgerEl) {
      const open = burgerEl.getAttribute("aria-expanded") === "true";
      const label = open ? t().menuOpen : t().menuClosed;
      const burgerText = $(".burger__text", burgerEl);
      if (burgerText) burgerText.textContent = label;
      // The label is hidden on narrow screens, so keep an accessible name.
      burgerEl.setAttribute("aria-label", label);
    }

    document.documentElement.classList.add("i18n-ready");
  }

  applyLang(lang, { persist: false });

  $$("[data-lang]").forEach((btn) => {
    btn.addEventListener("click", () => applyLang(btn.dataset.lang));
  });

  // Split any headline that has no translations attached.
  $$("[data-split]").forEach((el) => {
    if (!el.classList.contains("split-parent")) splitText(el);
  });

  /* ====================================================== */
  /* Entrance reveal                                        */
  /* ====================================================== */
  $$("[data-split]").forEach((el) => el.classList.add("is-in"));
  $$("[data-hero-reveal]").forEach((el, i) => {
    setTimeout(() => el.classList.add("is-in"), reduced ? 0 : 120 + i * 90);
  });

  /* ====================================================== */
  /* Scroll reveal                                          */
  /* ====================================================== */
  const revealables = $$("[data-reveal]");

  if ("IntersectionObserver" in window && !reduced) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        io.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.12 });

    revealables.forEach((el) => io.observe(el));
  } else {
    revealables.forEach((el) => el.classList.add("is-in"));
  }

  /* ====================================================== */
  /* Header: hide on scroll down, show on scroll up         */
  /* ====================================================== */
  const header = $(".header");
  const progress = $(".progress");
  let lastY = window.scrollY;
  let ticking = false;

  const onScroll = () => {
    const y = window.scrollY;

    if (header) {
      header.classList.toggle("is-stuck", y > 24);
      const menuOpen = document.body.classList.contains("is-locked");
      header.classList.toggle("is-hidden", y > lastY && y > 220 && !menuOpen);
    }

    if (progress) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform = "scaleX(" + (max > 0 ? y / max : 0) + ")";
    }

    lastY = y;
    ticking = false;
  };

  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(onScroll);
  }, { passive: true });
  onScroll();

  /* ====================================================== */
  /* Fullscreen menu                                        */
  /* ====================================================== */
  const burger = $(".burger");
  const menu = $(".menu");

  if (burger && menu) {
    const setMenu = (open) => {
      burger.setAttribute("aria-expanded", String(open));
      menu.classList.toggle("is-open", open);
      menu.setAttribute("aria-hidden", String(!open));
      document.body.classList.toggle("is-locked", open);
      const label = open ? t().menuOpen : t().menuClosed;
      const labelEl = $(".burger__text", burger);
      if (labelEl) labelEl.textContent = label;
      burger.setAttribute("aria-label", label);
    };

    burger.addEventListener("click", () => {
      setMenu(burger.getAttribute("aria-expanded") !== "true");
    });

    $$("a", menu).forEach((a, i) => {
      a.style.setProperty("--i", i);
      a.addEventListener("click", () => setMenu(false));
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && menu.classList.contains("is-open")) setMenu(false);
    });
  }

  /* ====================================================== */
  /* Parallax on tagged media                               */
  /* ====================================================== */
  const parallaxItems = $$("[data-parallax]");

  if (parallaxItems.length && !reduced) {
    let raf = null;
    const update = () => {
      const vh = window.innerHeight;
      parallaxItems.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.bottom < -200 || rect.top > vh + 200) return;
        const progressed = (rect.top + rect.height / 2 - vh / 2) / vh;
        const strength = parseFloat(el.dataset.parallax) || 14;
        const shift = (-progressed * strength).toFixed(2);
        el.style.transform = "translate3d(0, " + shift + "px, 0) scale(1.08)";
      });
      raf = null;
    };
    const request = () => { if (!raf) raf = requestAnimationFrame(update); };
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);
    update();
  }

  /* ====================================================== */
  /* Filter chips (/claude work log)                        */
  /* ====================================================== */
  const chips = $$("[data-filter]");
  const logItems = $$("[data-tags]");

  if (chips.length && logItems.length) {
    const countOut = $("[data-filter-count]");

    chips.forEach((chip) => {
      chip.addEventListener("click", () => {
        const value = chip.dataset.filter;
        chips.forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));

        logItems.forEach((item) => {
          const tags = (item.dataset.tags || "").split(/\s*,\s*/);
          const show = value === "all" || tags.includes(value);
          item.classList.toggle("is-hidden", !show);
        });

        if (countOut) {
          const shown = logItems.filter((i) => !i.classList.contains("is-hidden")).length;
          countOut.textContent = String(shown).padStart(2, "0");
        }
      });
    });
  }

  /* ====================================================== */
  /* Anchor scrolling with fixed-header offset              */
  /* ====================================================== */
  document.addEventListener("click", (e) => {
    const link = e.target.closest("a[href^='#']");
    if (!link) return;

    const id = link.getAttribute("href");
    if (!id || id === "#") return;

    const target = document.querySelector(id);
    if (!target) return;

    e.preventDefault();
    const offset = header ? header.offsetHeight + 16 : 0;
    const top = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: reduced ? "auto" : "smooth" });
    history.replaceState(null, "", id);
  });

  /* ====================================================== */
  /* Current year                                           */
  /* ====================================================== */
  $$("[data-year]").forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });
})();
