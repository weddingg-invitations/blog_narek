/* =========================================================
   Страница рубрики — только специфика
   Требует shared/shared.js (window.Luys)
   ========================================================= */
(function () {
  "use strict";

  const { $, t, DB, state, articleUrl } = window.Luys;

  /* ---------------------------------------------------------
     URL
     --------------------------------------------------------- */
  function getSlugFromURL() {
    return new URLSearchParams(location.search).get("slug");
  }

  /* ---------------------------------------------------------
     Карточка
     --------------------------------------------------------- */
  function cardHTML(a, i) {
    const delay = (i % 4) * 70;
    return `
      <a class="card card-hover reveal" href="${articleUrl(a.id)}"
         style="--delay:${delay}ms" aria-label="${t(a.title)}">
        <img src="${a.image}" width="800" height="1000" loading="lazy" alt="${t(a.title)}">
        <div class="card__body">
          <h3 class="card__title">${t(a.title)}</h3>
          <span class="card__time">${t(a.author)} · ${t(a.time)}</span>
        </div>
      </a>`;
  }

  /* ---------------------------------------------------------
     Рендер рубрики
     --------------------------------------------------------- */
  function renderCategory() {
    const slug = getSlugFromURL();
    const page = $("#categoryPage");
    const notFound = $("#categoryNotFound");

    if (!slug) {
      page.hidden = true;
      notFound.hidden = false;
      return;
    }

    const cat = DB.getCategoryBySlug(slug);
    if (!cat) {
      page.hidden = true;
      notFound.hidden = false;
      return;
    }

    /* обновляем активный пункт меню и перерисовываем шапку */
    state.currentCategory = cat;
    window.Luys.renderStaticTexts();

    page.hidden = false;
    notFound.hidden = true;

    const list = DB.getArticlesByCategory(cat, state.lang);

    $("#breadcrumbsCurrent").textContent = t(cat);
    $("#categoryTitle").textContent = t(cat);
    $("#categoryCount").textContent = `${list.length} ${t(state.ui.found)}`;
    $("#categoryEmpty").hidden = list.length > 0;
    $("#categoryGrid").innerHTML = list.map((a, i) => cardHTML(a, i)).join("");
  }

  /* ---------------------------------------------------------
     Init
     --------------------------------------------------------- */
  document.addEventListener("DOMContentLoaded", async () => {
    try {
      await window.Luys.initShared({
        onLangChange: () => renderCategory()
      });
      renderCategory();
    } catch (err) {
      console.error(err);
    }
  });
})();