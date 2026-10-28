/* =========================================================
   Главная страница — только специфика
   Требует shared/shared.js (window.Luys)
   ========================================================= */
(function () {
  "use strict";

  const { $, t, DB, state, articleUrl, categoryUrl, observeReveals } = window.Luys;

  /* ---------------------------------------------------------
     Локальное состояние
     --------------------------------------------------------- */
  let leadArticle   = null;
  let topStories    = [];
  let allArticles   = [];
  let SLIDERS_DATA  = { editors: [] };
  let activeSwipers = [];

  /* ---------------------------------------------------------
     HERO
     --------------------------------------------------------- */
  function renderHero() {
    if (!leadArticle) return;
    const catEl   = $("#leadCategory");
    const imgEl   = $("#leadImage");
    const titleEl = $("#leadTitle");
    const sumEl   = $("#leadSummary");
    const metaEl  = $("#leadMeta");
    const linkEl  = $("#leadLink");

    if (catEl)   catEl.textContent   = t(leadArticle.category);
    if (imgEl)   imgEl.alt           = t(leadArticle.title);
    if (titleEl) titleEl.textContent = t(leadArticle.title);
    if (sumEl)   sumEl.textContent   = t(leadArticle.summary);
    if (metaEl)  metaEl.textContent  = t(leadArticle.author);
    if (linkEl)  linkEl.dataset.articleId = leadArticle.id;
  }

  /* ---------------------------------------------------------
     TOP STORIES
     --------------------------------------------------------- */
  function renderTopStories() {
    const wrap = $("#topStories");
    if (!wrap) return;

    let html = "";
    for (let i = 0; i < topStories.length && i < 7; i++) {
      const a = topStories[i];
      html += `
        <a class="top-item" href="#" data-article-id="${a.id}">
          <img src="${a.image}" width="64" height="64" loading="lazy" alt="${t(a.title)}">
          <div>
            <span class="top-item__cat">${t(a.category)}</span>
            <div class="top-item__title">${t(a.title)}</div>
          </div>
        </a>`;
    }
    wrap.innerHTML = html;
  }

  /* ---------------------------------------------------------
     Слайдеры (только editors)
     --------------------------------------------------------- */
  function sliderHTML(slider) {
    const slidesHTML = slider.slides.map((s) => `
      <div class="swiper-slide">
        <a class="card card-hover" href="#" aria-label="${t(s.title)}">
          <img src="${s.image}" width="1600" height="900" loading="lazy" alt="${t(s.title)}">
          <div class="card__body">
            <h3 class="card__title">${t(s.title)}</h3>
            <span class="card__time">${t(s.author)} · ${t(s.time)}</span>
          </div>
        </a>
      </div>
    `).join("");

    return `
      <div class="slider-block" data-slider-id="${slider.id}">
        <div class="slider-head">
          <h3 class="slider-head__title">${t(slider.title)}</h3>
          <span class="slider-head__subtitle">${t(slider.subtitle)}</span>
        </div>
        <div class="swiper news-swiper">
          <div class="swiper-wrapper">${slidesHTML}</div>
          <button class="swiper-button-prev" aria-label="Prev"></button>
          <button class="swiper-button-next" aria-label="Next"></button>
          <div class="swiper-pagination"></div>
        </div>
      </div>`;
  }

  function destroySwipers() {
    activeSwipers.forEach(sw => {
      try { sw.destroy(true, true); } catch (e) {}
    });
    activeSwipers = [];
  }

  function renderEditors() {
    const wrap = $("#editorsSliders");
    if (!wrap) return;
    wrap.innerHTML = SLIDERS_DATA.editors.map(sliderHTML).join("");
    initSliders(wrap);
  }

  function initSliders(scope) {
    if (typeof Swiper === "undefined") return;
    scope.querySelectorAll(".news-swiper").forEach((el) => {
      try {
        const swiper = new Swiper(el, {
          speed: 600,
          grabCursor: true,
          spaceBetween: 30,
          slidesPerView: 1,
          breakpoints: {
            500:  { slidesPerView: 2, spaceBetween: 20 },
            700:  { slidesPerView: 3, spaceBetween: 24 },
            1440: { slidesPerView: 4, spaceBetween: 30 }
          },
          autoplay: {
            delay: 6000,
            disableOnInteraction: false,
            pauseOnMouseEnter: true
          },
          pagination: {
            el: el.querySelector(".swiper-pagination"),
            clickable: true
          },
          navigation: {
            nextEl: el.querySelector(".swiper-button-next"),
            prevEl: el.querySelector(".swiper-button-prev")
          },
          keyboard: { enabled: true, onlyInViewport: true },
          a11y: { prevSlideMessage: "Previous slide", nextSlideMessage: "Next slide" }
        });
        activeSwipers.push(swiper);
      } catch (e) {
        /* молча пропускаем */
      }
    });
  }

  /* ---------------------------------------------------------
     Дайджесты (8 штук)
     --------------------------------------------------------- */
  function renderDigests() {
    const byCat = (nameHy) =>
      allArticles.filter(a => a.category.hy === nameHy).slice(0, 3);

    const markup = (arr) => arr.map(a => `
      <a class="digest-item" href="#" data-article-id="${a.id}">
        <img src="${a.image}" width="56" height="56" loading="lazy" alt="${t(a.title)}">
        <div>
          <div class="digest-item__title">${t(a.title)}</div>
          <div class="digest-item__time">${t(a.time)}</div>
        </div>
      </a>`).join("");

    const pairs = [
      { titleId: "#digestEducationTitle",  listId: "#digestEducation",  catHy: "Կրթություն",              uiKey: "educationMore"  },
      { titleId: "#digestScienceTitle",    listId: "#digestScience",    catHy: "Գիտություն",              uiKey: "scienceMore"    },
      { titleId: "#digestCultureTitle",    listId: "#digestCulture",    catHy: "Մշակույթ",                uiKey: "cultureMore"    },
      { titleId: "#digestSportTitle",      listId: "#digestSport",      catHy: "Սպորտ",                   uiKey: "sportMore"      },
      { titleId: "#digestUniversityTitle", listId: "#digestUniversity", catHy: "ՀՀ Բուհեր",               uiKey: "universityMore" },
      { titleId: "#digestCollegeTitle",    listId: "#digestCollege",    catHy: "ՀՀ Քոլեջներ",             uiKey: "collegeMore"    },
      { titleId: "#digestCenterTitle",     listId: "#digestCenter",     catHy: "Ուսումնական կենտրոններ",   uiKey: "centerMore"     },
      { titleId: "#digestAbroadTitle",     listId: "#digestAbroad",     catHy: "Ուսումը արտասահմանում",   uiKey: "abroadMore"     }
    ];

    pairs.forEach(p => {
      const titleEl = $(p.titleId);
      const listEl  = $(p.listId);
      if (titleEl && state.ui[p.uiKey]) titleEl.textContent = t(state.ui[p.uiKey]);
      if (listEl) listEl.innerHTML = markup(byCat(p.catHy));
    });
  }

  /* ---------------------------------------------------------
     Newsletter
     --------------------------------------------------------- */
  function bindNewsletter() {
    const form = $("#newsletterForm");
    if (!form) return;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const inp = form.querySelector("input");
      if (!inp.value.trim()) return;
      form.hidden = true;
      const done = $("#newsletterDone");
      if (done) done.hidden = false;
    });
  }

  /* ---------------------------------------------------------
     Клики по карточкам и слайдам
     --------------------------------------------------------- */
  function bindCardClicks() {
    document.addEventListener("click", (e) => {
      const withId = e.target.closest("[data-article-id]");
      if (withId) {
        e.preventDefault();
        location.href = articleUrl(withId.dataset.articleId);
        return;
      }

      const slideCard = e.target.closest(".news-swiper .card");
      if (slideCard) {
        e.preventDefault();
        const cat = slideCard.closest(".slider-block")
          ?.querySelector(".slider-head__title")?.textContent?.trim();
        if (cat) {
          const match = state.categories.find(c =>
            c.hy === cat || c.en === cat || c.ru === cat
          );
          if (match) {
            location.href = categoryUrl(match.slug);
            return;
          }
        }
        location.href = "index.html";
      }
    });
  }

  /* ---------------------------------------------------------
     Полный рендер
     --------------------------------------------------------- */
  function renderAll() {
    destroySwipers();
    renderHero();
    renderTopStories();
    renderEditors();
    renderDigests();
    if (typeof observeReveals === "function") observeReveals();
  }

  /* ---------------------------------------------------------
     Init
     --------------------------------------------------------- */
  async function boot() {
    try {
      await window.Luys.initShared({
        onLangChange: () => renderAll()
      });

      leadArticle  = DB.getLeadArticle();
      topStories   = DB.getTopStories(7);
      allArticles  = DB.getAll();
      SLIDERS_DATA = {
        editors: DB.getSliders("editors")
      };

      bindNewsletter();
      bindCardClicks();
      renderAll();
    } catch (err) {
      console.error("[home]", err);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();