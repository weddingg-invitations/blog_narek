/* =========================================================
   Страница «Մեր մասին» — только специфика
   Требует shared/shared.js (window.Luys)
   ========================================================= */
(function () {
  "use strict";

  const { $, t, DB, state } = window.Luys;

  /* ---------------------------------------------------------
     Рендер
     --------------------------------------------------------- */
  function renderAbout() {
    const { ui } = state;

    /* hero */
    const pageTitle = $(".about-hero__title");
    if (pageTitle) pageTitle.textContent = t(ui.aboutTitle);

    const pageSubtitle = $(".about-hero__subtitle");
    if (pageSubtitle) pageSubtitle.textContent = t(ui.aboutSubtitle);

    /* banner */
    const banner = $("#aboutBanner");
    if (banner) {
      banner.alt = t(ui.aboutTitle) || "Luys";
      /* картинка задана в HTML — src="lead.jpg". Позже можно вынести в data.json */
    }

    /* body */
    const body1 = $("#aboutBody1");
    if (body1) body1.textContent = t(ui.aboutBody1);

    const body2 = $("#aboutBody2");
    if (body2) body2.textContent = t(ui.aboutBody2);
    
    /* team */
    const teamTitle = $("#aboutTeamTitle");
    if (teamTitle) teamTitle.textContent = t(ui.aboutTeamTitle);

    /* contacts */
    const contactsTitle = $("#aboutContactsTitle");
    if (contactsTitle) contactsTitle.textContent = t(ui.aboutContactsTitle);

    /* contacts */
    const tell = $("#tell");
    if (tell) tell.textContent = t(ui.tell);

    renderSocials();
  }

  /* ---------------------------------------------------------
     Соцсети
     --------------------------------------------------------- */
  function renderSocials() {
    const wrap = $("#aboutSocials");
    if (!wrap) return;

    const socials = DB.raw.socials || [];

    wrap.innerHTML = socials
      .sort((a, b) => a.sort - b.sort)
      .map(s => `
        <a href="${s.url || '#'}" target="_blank" rel="noopener"
           aria-label="${s.label}"
           class="social-link social-link--${s.key}">
          <span class="abbr">${s.label}</span>
          <span>${t({ hy: s.name_hy, en: s.name_en })}</span>
        </a>
      `)
      .join("");
  }

  /* ---------------------------------------------------------
     Init
     --------------------------------------------------------- */
  document.addEventListener("DOMContentLoaded", async () => {
    try {
      await window.Luys.initShared({
        onLangChange: () => renderAbout()
      });
      renderAbout();
    } catch (err) {
      console.error(err);
    }
  });
})();