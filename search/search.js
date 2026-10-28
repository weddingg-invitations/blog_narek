/* =========================================================
   Страница поиска — только специфика
   Требует shared/shared.js (window.Luys)
   ========================================================= */
(function () {
  "use strict";

  const { $, t, DB, state, articleUrl } = window.Luys;

  /* ---------------------------------------------------------
     URL
     --------------------------------------------------------- */
  function getQueryFromURL() {
    return new URLSearchParams(location.search).get("q") || "";
  }

  /* ---------------------------------------------------------
     Поиск по статьям
     --------------------------------------------------------- */
  function searchArticles(q) {
    const n = q.trim().toLowerCase();
    if (!n) return [];

    return DB.getAll().filter(a => {
      const hay = [
        a.title.hy, a.title.en,
        a.summary.hy, a.summary.en,
        a.category.hy, a.category.en
      ].join(" ").toLowerCase();
      return hay.includes(n);
    });
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
     Рендер страницы
     --------------------------------------------------------- */
  function renderSearch() {
    const q = getQueryFromURL();

    const titleEl   = $("#searchTitle");
    const countEl   = $("#searchCount");
    const gridEl    = $("#searchGrid");
    const emptyEl   = $("#searchEmpty");
    const hintEl    = $("#searchHint");
    const inputEl   = $("#searchPageInput");

    /* заголовок в шапке окна */
    document.title = q
      ? `${q} — Լույս · Luys`
      : `Որոնում — Լույս · Luys`;

    /* поле на странице — подставляем запрос */
    if (inputEl) inputEl.value = q;

    /* пустой запрос — показываем подсказку */
    if (!q.trim()) {
      titleEl.textContent = t(state.ui.searchResults);
      countEl.textContent = "";
      gridEl.innerHTML = "";
      hintEl.hidden = false;
      emptyEl.hidden = true;
      return;
    }

    /* есть запрос — ищем */
    hintEl.hidden = true;

    const results = searchArticles(q);

    titleEl.textContent = `${t(state.ui.searchResults)} — “${q}”`;
    countEl.textContent = `${results.length} ${t(state.ui.found)}`;

    if (results.length === 0) {
      gridEl.innerHTML = "";
      emptyEl.hidden = false;
      return;
    }

    emptyEl.hidden = true;
    gridEl.innerHTML = results.map((a, i) => cardHTML(a, i)).join("");

    window.Luys.observeReveals();
  }

  /* ---------------------------------------------------------
     Форма поиска на странице
     --------------------------------------------------------- */
  function bindForm() {
    const form  = $("#searchPageForm");
    const input = $("#searchPageInput");
    if (!form || !input) return;

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const q = input.value.trim();
      if (!q) return;
      location.href = `search.html?q=${encodeURIComponent(q)}`;
    });
  }

  /* ---------------------------------------------------------
     Init
     --------------------------------------------------------- */
  document.addEventListener("DOMContentLoaded", async () => {
    try {
      await window.Luys.initShared({
        onLangChange: () => renderSearch()
      });

      bindForm();
      renderSearch();
    } catch (err) {
      console.error(err);
    }
  });
})();