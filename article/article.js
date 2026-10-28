/* =========================================================
   Страница статьи — только специфика
   Требует shared/shared.js (window.Luys)
   ========================================================= */
(function () {
  "use strict";

  const { $, t, DB, articleUrl, categoryUrl } = window.Luys;

  function getArticleIdFromURL() {
    return new URLSearchParams(location.search).get("id");
  }

  function renderArticle() {
    const id = getArticleIdFromURL();
    const page = $("#articlePage");
    const notFound = $("#articleNotFound");
    const inner = $("#articlePageInner");

    if (!page || !notFound || !inner) return;

    if (!id) {
      page.hidden = true;
      notFound.hidden = false;
      return;
    }

    const a = DB.getArticleById(id);
    if (!a) {
      page.hidden = true;
      notFound.hidden = false;
      return;
    }

    page.hidden = false;
    notFound.hidden = true;

    const catMatch = DB.raw.categories.find(c =>
      c.hy === a.category.hy || c.en === a.category.en
    );
    const categoryHref = catMatch ? categoryUrl(catMatch.slug) : "index.html";

    const related = DB.getRelated(id, 3);
    const relatedHTML = related.length ? `
      <section class="article__related">
        <h2 class="article__related-title" data-i18n="readMore">Կարդալ ավելին</h2>
        <div class="article__related-grid">
          ${related.map(r => `
            <a class="card card-hover" href="${articleUrl(r.id)}"
               aria-label="${t(r.title)}">
              <img src="${r.image}" width="800" height="1000" loading="lazy"
                   alt="${t(r.title)}">
              <div class="card__body">
                <h3 class="card__title">${t(r.title)}</h3>
                <span class="card__time">${t(r.author)} · ${t(r.time)}</span>
              </div>
            </a>
          `).join("")}
        </div>
      </section>
    ` : "";

    inner.innerHTML = `
      <a class="article__category" href="${categoryHref}">${t(a.category)}</a>

      <h1 class="article__title">${t(a.title)}</h1>

      <div class="article__meta">
        <span class="article__meta-item"><strong>${t(a.author)}</strong></span>
        ${a.time.hy ? `<span class="article__meta-item">${t(a.time)}</span>` : ""}
      </div>

      <figure class="article__image">
        <img src="${a.image}" width="1600" height="900" alt="${t(a.title)}">
      </figure>

      <p class="article__lead">${t(a.summary)}</p>

      <div class="article__body">
        <p>${t(a.summary)}</p>
        <p>${t(a.summary)}</p>
        <p>${t(a.summary)}</p>
      </div>

      <a class="article__back" href="index.html" data-i18n="backHome">
        Վերադառնալ գլխավոր
      </a>

      ${relatedHTML}
    `;
  }

  document.addEventListener("DOMContentLoaded", async () => {
    try {
      await window.Luys.initShared({
        onLangChange: () => renderArticle()
      });
      renderArticle();
    } catch (err) {
      console.error(err);
    }
  });
})();