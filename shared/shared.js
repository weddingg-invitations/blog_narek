/* =========================================================
   Luys — общий модуль (подход 2: header/footer рисует JS)
   Экспортирует window.Luys
   Язык: localStorage (без ?lang= в URL)
   ========================================================= */
(function () {
  "use strict";

  /* =========================================================
     DB — слой доступа к данным
     ========================================================= */
  const DB = {
    raw: null,

    async init() {
      const res = await fetch("data.json");
      if (!res.ok) throw new Error("Не удалось загрузить data.json (status " + res.status + ")");
      this.raw = await res.json();
    },

    getUI() {
      const obj = {};
      for (const row of this.raw.ui) obj[row.key] = { hy: row.hy, en: row.en, ru: row.ru };
      return obj;
    },
    getNav() { return [...this.raw.nav].sort((a, b) => a.sort - b.sort); },
    getCategories() { return this.raw.categories; },

    _articleRow(r) {
      return {
        id: r.id,
        image: r.image,
        category: { hy: r.category_hy, en: r.category_en, ru: r.category_ru },
        title:    { hy: r.title_hy,    en: r.title_en,    ru: r.title_ru },
        summary:  { hy: r.summary_hy,  en: r.summary_en,  ru: r.summary_ru },
        author:   { hy: r.author_hy,   en: r.author_en,   ru: r.author_ru },
        time:     { hy: r.time_hy,     en: r.time_en,     ru: r.time_ru },
        section:  r.section,
        published_at: r.published_at || ""
      };
    },

    getArticleById(id) {
      const row = this.raw.articles.find(a => a.id === id);
      return row ? this._articleRow(row) : null;
    },
    getLeadArticle() {
      const row = this.raw.articles.find(a => a.is_lead === 1);
      return row ? this._articleRow(row) : null;
    },
    getTopStories(limit = 7) {
      return this.raw.articles
        .filter(a => a.is_top === 1)
        .sort((a, b) => a.sort - b.sort)
        .slice(0, limit)
        .map(r => this._articleRow(r));
    },
    getLatest() {
      return this.raw.articles
        .filter(a => a.section === "latest" && a.is_lead !== 1)
        .sort((a, b) => a.sort - b.sort)
        .map(r => this._articleRow(r));
    },
    getAll() { return this.raw.articles.map(r => this._articleRow(r)); },

    getRecent(limit = 8) {
      return [...this.raw.articles]
        .sort((a, b) => {
          const da = a.published_at ? new Date(a.published_at).getTime() : 0;
          const db = b.published_at ? new Date(b.published_at).getTime() : 0;
          return db - da;
        })
        .slice(0, limit)
        .map(r => this._articleRow(r));
    },

    getArticlesByCategory(cat, currentLang) {
      if (!cat) return [];
      const key   = currentLang === "hy" ? "category_hy"
                  : currentLang === "ru" ? "category_ru"
                  : "category_en";
      const value = cat[currentLang];
      return this.raw.articles
        .filter(a => a[key] === value)
        .sort((a, b) => a.sort - b.sort)
        .map(r => this._articleRow(r));
    },

    getCategoryBySlug(slug) {
      return this.raw.categories.find(c => c.slug === slug) || null;
    },

    getRelated(id, limit = 3) {
      const current = this.raw.articles.find(a => a.id === id);
      if (!current) return [];
      return this.raw.articles
        .filter(a =>
          a.id !== id &&
          (a.category_hy === current.category_hy ||
           a.category_en === current.category_en ||
           a.category_ru === current.category_ru)
        )
        .sort((a, b) => a.sort - b.sort)
        .slice(0, limit)
        .map(r => this._articleRow(r));
    },

    getSliders(group) {
      return this.raw.sliders
        .filter(s => s.group === group)
        .sort((a, b) => a.sort - b.sort)
        .map(s => ({
          id: s.id,
          title:    { hy: s.title_hy,    en: s.title_en,    ru: s.title_ru },
          subtitle: { hy: s.subtitle_hy, en: s.subtitle_en, ru: s.subtitle_ru },
          slides: this.raw.slides
            .filter(sl => sl.slider_id === s.id)
            .sort((a, b) => a.sort - b.sort)
            .map(sl => ({
              image:    sl.image,
              category: { hy: sl.category_hy, en: sl.category_en, ru: sl.category_ru },
              title:    { hy: sl.title_hy,    en: sl.title_en,    ru: sl.title_ru },
              summary:  { hy: sl.summary_hy,  en: sl.summary_en,  ru: sl.summary_ru },
              author:   { hy: sl.author_hy,   en: sl.author_en,   ru: sl.author_ru },
              time:     { hy: sl.time_hy,     en: sl.time_en,     ru: sl.time_ru }
            }))
        }));
    }
  };

  /* =========================================================
     Хелперы
     ========================================================= */
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* =========================================================
     Язык
     ========================================================= */
  const LANG_KEY = "luys.lang";
  const DEFAULT_LANG = "hy";
  const SUPPORTED_LANGS = ["hy", "en", "ru"];

  function readInitialLang() {
    let saved = null;
    try { saved = localStorage.getItem(LANG_KEY); } catch (e) {}
    if (saved && SUPPORTED_LANGS.includes(saved)) return saved;
    return DEFAULT_LANG;
  }
  function persistLang(newLang) {
    try { localStorage.setItem(LANG_KEY, newLang); } catch (e) {}
  }

  /* =========================================================
     Состояние
     ========================================================= */
  const state = {
    lang: DEFAULT_LANG,
    ui: {},
    nav: [],
    categories: [],
    currentCategory: null
  };

  const t = (obj) => (obj ? obj[state.lang] : "");

  function getLang() { return state.lang; }

  function setLang(newLang) {
    if (!SUPPORTED_LANGS.includes(newLang)) newLang = DEFAULT_LANG;
    state.lang = newLang;
    document.documentElement.lang = newLang;
    $$(".lang-switch__btn").forEach(b =>
      b.classList.toggle("is-active", b.dataset.lang === newLang)
    );
    persistLang(newLang);
  }

  /* =========================================================
     Ссылки
     ========================================================= */
  function articleUrl(id)   { return `article.html?id=${encodeURIComponent(id)}`; }
  function categoryUrl(slug){ return `category.html?slug=${encodeURIComponent(slug)}`; }
  function aboutUrl()       { return "about.html"; }
  function homeUrl()        { return "index.html"; }
  function searchUrl(q)     { return `search.html?q=${encodeURIComponent(q)}`; }

  /* =========================================================
     Разметка: header и footer
     ========================================================= */
  function headerHTML() {
    return `
      <header class="site-header">
        <div class="container header-inner">
          <div class="header-row header-row--top">
            <a class="brand" href="${homeUrl()}">
              <span class="brand__name" data-i18n="brand">Լույս</span>
              <span class="brand__dot"></span>
            </a>
            <span class="brand__tagline" data-i18n="tagline">Լույսը՝ ամեն օր</span>

            <div class="search" id="searchWrap">
              <span class="search__icon">⌕</span>
              <input id="searchInput" type="search" autocomplete="off" placeholder="Որոնել…"
                data-i18n-placeholder="searchPlaceholder" />
              <button class="search__clear" id="searchClear" hidden data-i18n="clear">Մաքրել</button>
            </div>

            <div class="lang-switch" role="group" aria-label="Language">
              <button class="lang-switch__btn" data-lang="en">EN</button>
              <button class="lang-switch__btn is-active" data-lang="hy">ՀԱՅ</button>
              <button class="lang-switch__btn" data-lang="ru">РУ</button>

              <button class="burger" id="burgerBtn" aria-label="Menu" aria-expanded="false"
                aria-controls="navList">
                <span class="burger__line"></span>
                <span class="burger__line"></span>
                <span class="burger__line"></span>
              </button>
            </div>
          </div>

          <nav class="header-row header-row--nav">
            <ul class="nav" id="navList"></ul>
          </nav>

          <div class="header-row header-row--ticker">
            <span class="live" data-i18n="live">● Live</span>
            <div class="ticker">
              <div class="ticker__track" id="tickerTrack"></div>
            </div>
          </div>
        </div>
      </header>
    `;
  }

  function footerHTML() {
    return `
      <footer class="site-footer">
        <div class="container footer__grid">
          <div class="footer__col">
            <a class="brand" href="${homeUrl()}">
              <span class="brand__name" data-i18n="brand">Լույս</span>
              <span class="brand__dot"></span>
            </a>
            <p class="footer__about" data-i18n="footerAbout">Անկախ լրատվական հարթակ՝ երկու լեզվով։</p>
          </div>
          <div class="footer__col">
            <h4 data-i18n="footerSections">Բաժիններ</h4>
            <ul id="footerNav"></ul>
          </div>
          <div class="footer__col">
            <h4 data-i18n="footerSite">Կայք</h4>
            <ul>
              <li><a href="${aboutUrl()}" class="story-link" data-i18n="about">Մեր մասին</a></li>
              <li><a href="#" class="story-link" data-i18n="contacts">Կապ</a></li>
            </ul>
          </div>
          <div class="footer__col">
            <h4 data-i18n="footerSocial">Հետեվեք մեզ</h4>
            <div class="socials">
              <a href="#" aria-label="Facebook">
                <img src="assets/icons/facebook.png" alt="Facebook" />
              </a>
              <a href="#" aria-label="Instagram">
                <img src="assets/icons/instagram.png" alt="Instagram" />
              </a>
              <a href="#" aria-label="X">
                <img src="assets/icons/x.png" alt="X" />
              </a>
            </div>
          </div>
        </div>
        <div class="container footer__bottom">
          <p>© <span id="year"></span>«Արաքս» հրատարակչություն</p>
        </div>
      </footer>
    `;
  }

  function mountLayout() {
    const main = document.getElementById("main");
    if (!main) return;
    if (document.querySelector(".site-header")) return;
    main.insertAdjacentHTML("beforebegin", headerHTML());
    main.insertAdjacentHTML("afterend", footerHTML());
  }

  /* =========================================================
     Статические тексты
     ========================================================= */
  function renderStaticTexts() {
    document.documentElement.lang = state.lang;
    const { ui, nav } = state;

    $$("[data-i18n]").forEach(el => {
      const key = el.dataset.i18n;
      if (ui[key]) el.textContent = t(ui[key]);
    });
    $$("[data-i18n-placeholder]").forEach(el => {
      const key = el.dataset.i18nPlaceholder;
      if (ui[key]) el.placeholder = t(ui[key]);
    });

    const brandName = $(".brand__name");
    if (brandName) brandName.textContent = t(ui.brand);

    const tagline = $(".brand__tagline");
    if (tagline) tagline.textContent = t(ui.tagline);

    const searchInput = $("#searchInput");
    if (searchInput) searchInput.placeholder = t(ui.searchPlaceholder);

    const searchClear = $("#searchClear");
    if (searchClear) searchClear.textContent = t(ui.clear);

    const live = $(".live");
    if (live) live.textContent = t(ui.live);

    const about = $(".footer__about");
    if (about) about.textContent = t(ui.footerAbout);

    const footerHeads = $$(".footer__col h4");
    if (footerHeads[0]) footerHeads[0].textContent = t(ui.footerSections);
    if (footerHeads[1]) footerHeads[1].textContent = t(ui.footerSite);
    if (footerHeads[2]) footerHeads[2].textContent = t(ui.footerSocial);

    const footerUl = $$(".footer__col ul");
    if (footerUl[0]) {
      footerUl[0].innerHTML = nav
        .map(item => {
          const href = item.slug ? categoryUrl(item.slug) : homeUrl();
          return `<li><a href="${href}" class="story-link">${t(item)}</a></li>`;
        }).join("");
    }
    if (footerUl[1]) {
      footerUl[1].innerHTML =
        `<li><a href="${aboutUrl()}" class="story-link">${t(ui.about)}</a></li>
         <li><a href="#" class="story-link">${t(ui.contacts)}</a></li>`;
    }

    const navList = $("#navList");
    if (navList) {
      navList.innerHTML = nav
        .map(item => {
          const href = item.slug ? categoryUrl(item.slug) : homeUrl();
          const isActive = state.currentCategory &&
            item.slug === state.currentCategory.slug;
          return `<li><a href="${href}"
            class="story-link ${isActive ? "is-active" : ""}">${t(item)}</a></li>`;
        }).join("");
    }

    const sideHeading = $(".side__heading");
    if (sideHeading) sideHeading.textContent = t(ui.topStories);

    const nlTitle = $(".newsletter__title");
    if (nlTitle) nlTitle.textContent = t(ui.newsletterTitle);

    const nlText = $(".newsletter__text");
    if (nlText) nlText.textContent = t(ui.newsletterText);

    const nlInput = $("#newsletterForm input");
    if (nlInput) nlInput.placeholder = t(ui.newsletterPlaceholder);

    const nlButton = $("#newsletterForm button");
    if (nlButton) nlButton.textContent = t(ui.newsletterButton);

    const nlDone = $("#newsletterDone");
    if (nlDone) nlDone.textContent = t(ui.newsletterDone);
  }

  /* =========================================================
     Ticker — 8 самых свежих по published_at, кликабельные
     ========================================================= */
  function renderTicker() {
    const track = $("#tickerTrack");
    if (!track) return;

    const recent = DB.getRecent(8);

    const itemsHTML = recent.map(a => `
      <a class="ticker__item" href="${articleUrl(a.id)}">
        <span class="ticker__cat">${t(a.category)}</span>
        <span class="ticker__title">${t(a.title)}</span>
      </a>
    `).join("");

    track.innerHTML = itemsHTML + itemsHTML;
  }

  /* =========================================================
     Общие события
     ========================================================= */
  function bindCommonEvents(onLangChange) {
    $$(".lang-switch__btn").forEach(btn => {
      btn.addEventListener("click", () => {
        setLang(btn.dataset.lang);
        renderStaticTexts();
        renderTicker();
        if (typeof onLangChange === "function") onLangChange();
      });
    });

    bindSearchSuggest();

    const burger = $("#burgerBtn");
    const navEl = $("#navList");
    if (burger && navEl) {
      burger.addEventListener("click", (e) => {
        e.stopPropagation();
        const open = navEl.classList.toggle("is-open");
        burger.classList.toggle("is-open", open);
        burger.setAttribute("aria-expanded", open ? "true" : "false");
      });
      navEl.addEventListener("click", (e) => {
        if (e.target.closest("a")) {
          navEl.classList.remove("is-open");
          burger.classList.remove("is-open");
          burger.setAttribute("aria-expanded", "false");
        }
      });
      document.addEventListener("click", (e) => {
        if (!navEl.classList.contains("is-open")) return;
        if (e.target.closest(".header-row--nav")) return;
        if (e.target.closest("#burgerBtn")) return;
        if (e.target.closest(".lang-switch")) return;
        navEl.classList.remove("is-open");
        burger.classList.remove("is-open");
        burger.setAttribute("aria-expanded", "false");
      });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && navEl.classList.contains("is-open")) {
          navEl.classList.remove("is-open");
          burger.classList.remove("is-open");
          burger.setAttribute("aria-expanded", "false");
        }
      });
      window.addEventListener("resize", () => {
        if (window.innerWidth >= 900 && navEl.classList.contains("is-open")) {
          navEl.classList.remove("is-open");
          burger.classList.remove("is-open");
          burger.setAttribute("aria-expanded", "false");
        }
      });
    }
  }

  /* =========================================================
     Поиск с подсказками
     ========================================================= */
  function bindSearchSuggest() {
    const input  = $("#searchInput");
    const clear  = $("#searchClear");
    const wrap   = $("#searchWrap");
    if (!input || !wrap) return;

    let suggest = $("#searchSuggest");
    if (!suggest) {
      suggest = document.createElement("div");
      suggest.id = "searchSuggest";
      suggest.className = "search-suggest";
      suggest.hidden = true;
      wrap.appendChild(suggest);
    }

    let activeIndex = -1;
    let currentResults = [];
    const HIDE_DELAY = 150;
    let hideTimer = null;

    function searchArticles(q) {
      const n = q.trim().toLowerCase();
      if (n.length < 2) return [];
      return DB.getAll()
        .filter(a => {
          const hay = [
            a.title.hy, a.title.en, a.title.ru,
            a.summary.hy, a.summary.en, a.summary.ru,
            a.category.hy, a.category.en, a.category.ru
          ].join(" ").toLowerCase();
          return hay.includes(n);
        }).slice(0, 6);
    }

    function itemHTML(a, i) {
      return `
        <a class="search-suggest__item" href="${articleUrl(a.id)}"
           data-index="${i}" data-article-id="${a.id}">
          <img class="search-suggest__img" src="${a.image}"
               width="48" height="48" loading="lazy" alt="">
          <div class="search-suggest__body">
            <div class="search-suggest__cat">${t(a.category)}</div>
            <div class="search-suggest__title">${t(a.title)}</div>
          </div>
        </a>`;
    }

    function renderSuggest(q) {
      currentResults = searchArticles(q);
      activeIndex = -1;
      if (!q.trim() || currentResults.length === 0) { hideSuggest(); return; }
      suggest.innerHTML = currentResults.map((a, i) => itemHTML(a, i)).join("");
      suggest.hidden = false;
    }

    function hideSuggest() {
      suggest.hidden = true;
      suggest.innerHTML = "";
      currentResults = [];
      activeIndex = -1;
    }

    function setActive(idx) {
      const items = $$(".search-suggest__item", suggest);
      items.forEach(it => it.classList.remove("is-active"));
      if (idx < 0 || idx >= items.length) { activeIndex = -1; return; }
      activeIndex = idx;
      items[idx].classList.add("is-active");
      items[idx].scrollIntoView({ block: "nearest" });
    }

    input.addEventListener("input", () => {
      const q = input.value;
      if (clear) clear.hidden = !q.trim();
      renderSuggest(q);
    });

    input.addEventListener("focus", () => {
      if (window.innerWidth < 768) {
        setTimeout(() => {
          input.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 200);
      }
      if (input.value.trim().length >= 2) renderSuggest(input.value);
    });

    input.addEventListener("keydown", (e) => {
      const visible = !suggest.hidden && currentResults.length > 0;
      if (e.key === "ArrowDown" && visible) {
        e.preventDefault();
        setActive(Math.min(activeIndex + 1, currentResults.length - 1));
        return;
      }
      if (e.key === "ArrowUp" && visible) {
        e.preventDefault();
        setActive(Math.max(activeIndex - 1, 0));
        return;
      }
      if (e.key === "Enter") {
        if (visible && activeIndex >= 0) {
          e.preventDefault();
          location.href = articleUrl(currentResults[activeIndex].id);
          return;
        }
        if (input.value.trim()) {
          e.preventDefault();
          location.href = searchUrl(input.value.trim());
        }
        return;
      }
      if (e.key === "Escape") { hideSuggest(); input.blur(); }
    });

    suggest.addEventListener("mousedown", (e) => {
      const link = e.target.closest(".search-suggest__item");
      if (!link) return;
      clearTimeout(hideTimer);
    });

    input.addEventListener("blur", () => {
      hideTimer = setTimeout(hideSuggest, HIDE_DELAY);
    });

    document.addEventListener("click", (e) => {
      if (!wrap.contains(e.target)) hideSuggest();
    });

    if (clear) {
      clear.addEventListener("click", () => {
        input.value = "";
        clear.hidden = true;
        hideSuggest();
        input.focus();
      });
    }
  }

  /* =========================================================
     Reveal
     ========================================================= */
  let observer;
  function observeReveals() {
    if (observer) observer.disconnect();
    observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add("is-visible");
          observer.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });

    $$(".reveal:not(.is-visible)").forEach(el => observer.observe(el));
  }

  /* =========================================================
     Init
     ========================================================= */
  async function initShared(options = {}) {
    try {
      await DB.init();

      state.ui         = DB.getUI();
      state.nav        = DB.getNav();
      state.categories = DB.getCategories();

      state.lang = readInitialLang();

      mountLayout();

      $$(".lang-switch__btn").forEach(b =>
        b.classList.toggle("is-active", b.dataset.lang === state.lang)
      );
      document.documentElement.lang = state.lang;

      const year = $("#year");
      if (year) year.textContent = new Date().getFullYear();

      bindCommonEvents(options.onLangChange);

      renderStaticTexts();
      renderTicker();
      observeReveals();
    } catch (err) {
      console.error("[initShared]", err);
    } finally {
      document.body.classList.remove("is-loading");
      document.documentElement.classList.remove("is-loading");
    }
  }

  /* =========================================================
     Публичный API
     ========================================================= */
  window.Luys = {
    DB,
    $, $$,
    t,
    state,
    getLang, setLang,
    articleUrl, categoryUrl, aboutUrl, homeUrl, searchUrl,
    renderStaticTexts, renderTicker, bindCommonEvents, observeReveals,
    initShared
  };
})();