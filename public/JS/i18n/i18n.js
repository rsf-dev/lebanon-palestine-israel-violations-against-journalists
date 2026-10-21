// JS/i18n/i18n.js
// Les traductions sont centralisees dans JS/reglages.js.

export let UI_STRINGS = { fr: { ui: {}, tutorial: {}, loader: {} } };
export let TYPE_LABELS = { fr: {} };

export function configureI18n({ textes, categories } = {}) {
  if (textes && typeof textes === "object") UI_STRINGS = textes;

  const labels = {};
  for (const categorie of categories || []) {
    if (categorie?.enabled === false || !categorie?.cle) continue;
    for (const [lang, label] of Object.entries(categorie.labels || {})) {
      if (!labels[lang]) labels[lang] = {};
      labels[lang][categorie.cle] = label;
    }
  }
  TYPE_LABELS = labels;
}

export function getDisplayLabelForType(type, lang) {
  const dict = TYPE_LABELS[lang] || TYPE_LABELS.fr || {};
  return dict[type] || type;
}

export function getUiStrings(lang) {
  return UI_STRINGS[lang]?.ui || UI_STRINGS.fr?.ui || {};
}

export function applyStaticTextsForLang(lang) {
  const strings = UI_STRINGS[lang] || UI_STRINGS.fr;
  const ui = strings.ui || {};
  document.documentElement.lang = lang;

  const setText = (selector, value) => {
    const element = document.querySelector(selector);
    if (element && value != null) element.textContent = value;
  };

  setText("#floating-title", ui.floatingTitle);
  setText("#floating-subtitle", ui.floatingSubtitle);
  setText("#title-clear-filters", ui.clearFilters);
  setText(".bottom-chart-title", ui.bottomChartTitle);
  setText(".panel-list-title", ui.eventPanelTitle);
  setText("#right-legend-section-title", ui.legendSection);
  setText("#authors-legend-section-title", ui.legendSection);
  setText("#notes-section-title", ui.notesSection);
  setText("#tutorial-replay-btn", ui.tutoButton);
  setText(".utility-menu-field > span", ui.menuLanguage);
  setText("#title-calendar-start-label", ui.titleFilters?.calendarStart);
  setText("#title-calendar-end-label", ui.titleFilters?.calendarEnd);

  const titleFilterGrid = document.querySelector(".title-filter-grid");
  if (titleFilterGrid) titleFilterGrid.setAttribute("aria-label", ui.titleFiltersLabel || "");
  const titleCalendarRow = document.querySelector(".title-calendar-row");
  if (titleCalendarRow) titleCalendarRow.setAttribute("aria-label", ui.dateFiltersLabel || "");
  const supplementFilters = document.getElementById("title-supplement-filters");
  if (supplementFilters) supplementFilters.setAttribute("aria-label", ui.supplementFiltersLabel || "");

  [
    ["title-oblast-select", ui.titleFilters?.areaAria],
    ["ville-select", ui.titleFilters?.locationAria],
    ["title-author-select", ui.titleFilters?.authorAria]
  ].forEach(([id, label]) => {
    const element = document.getElementById(id);
    if (element) element.setAttribute("aria-label", label || "");
  });

  document.querySelectorAll(".panel-close-button").forEach(button => {
    button.textContent = ui.closeButton || "";
    button.setAttribute("aria-label", ui.closeButton || "");
  });

  const eventFooterNote = document.getElementById("event-footer-note");
  if (eventFooterNote) eventFooterNote.innerHTML = ui.eventFooterNote || "";

  const languageToggle = document.querySelector(".utility-menu .language-toggle");
  if (languageToggle) languageToggle.setAttribute("aria-label", ui.menuLanguage || "");
  const utilityToggle = document.getElementById("utility-menu-toggle");
  if (utilityToggle) utilityToggle.setAttribute("aria-label", ui.menuOpen || "");

  [
    ["utility-events-toggle", ui.menuEvents],
    ["utility-regions-mode-toggle", ui.menuRegions],
    ["utility-country-toggle", ui.menuStats],
    ["utility-authors-toggle", ui.menuAuthors],
    ["utility-chart-toggle", ui.menuTimeline],
    ["rsf-cartography-toggle", ui.rsfCartography]
  ].forEach(([id, label]) => {
    const button = document.getElementById(id);
    if (button && label) button.textContent = label;
  });

  setText("#rsf-cartography-title", strings.cartography?.title || ui.rsfCartography);
  const cartographyClose = document.getElementById("rsf-cartography-close");
  if (cartographyClose) cartographyClose.setAttribute("aria-label", strings.cartography?.close || ui.closeButton || "");

  setText("#tutorial-skip-btn", strings.tutorial?.skipLabel);
  setText("#tutorial-lang-btn", ui.tutorialLangButton);
  setText(".loading-subtitle", strings.loader?.subtitle);
  setText(".loading-subtext", strings.loader?.subtext);
  setText("#loading-retry", strings.loader?.retry);
  setText("#country-rank-label", ui.oblastTotalLabel);
  setText("#country-score-label", ui.oblastCitiesLabel);
  setText("#country-name", ui.selectOblast);

  const footer = document.getElementById("footer-credits");
  if (footer && ui.footerCredits) footer.innerHTML = ui.footerCredits;

  window.currentlang = lang;
  bindCreditsModalOnce();
}

function openCreditsModal({ title, html }) {
  const modal = document.getElementById("credits-modal");
  const titleElement = document.getElementById("credits-title");
  const bodyElement = document.getElementById("credits-body");
  if (!modal || !titleElement || !bodyElement) return;

  titleElement.textContent = title || "";
  bodyElement.innerHTML = html || "";
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
}

function closeCreditsModal() {
  const modal = document.getElementById("credits-modal");
  if (!modal) return;
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
}

let creditsBound = false;
function bindCreditsModalOnce() {
  if (creditsBound) return;
  creditsBound = true;

  document.addEventListener("click", event => {
    const openButton = event.target.closest?.("[data-open-credits]");
    const closeButton = event.target.closest?.("[data-close-credits]");

    if (openButton) {
      event.preventDefault();
      const strings = UI_STRINGS[window.currentlang || "fr"] || UI_STRINGS.fr;
      openCreditsModal({
        title: strings.ui?.legendSection || "Credits",
        html: strings.ui?.flaticonCredits || ""
      });
    }
    if (closeButton) {
      event.preventDefault();
      closeCreditsModal();
    }
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeCreditsModal();
  });
}
