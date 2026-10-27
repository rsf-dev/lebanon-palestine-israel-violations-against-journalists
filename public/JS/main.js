// JS/main.js

console.log("main.js loaded", import.meta.url);
window.addEventListener("error", (e) => console.error("window.error", e.error || e.message));
window.addEventListener("unhandledrejection", (e) => console.error("unhandledrejection", e.reason));


const ASSET_VERSION = new URL(import.meta.url).searchParams.get("v") || "dev";
const V = `?v=${encodeURIComponent(ASSET_VERSION)}`;

// Ajoute ?v=... (ou &v=... si l'URL a déjà des params)
function withV(url) {
  if (!url) return "";
  return url.includes("?") ? `${url}&v=${encodeURIComponent(ASSET_VERSION)}` : `${url}${V}`;
}



async function importV(path) {
  const url = `${path}?v=${encodeURIComponent(ASSET_VERSION)}`;
  console.log("[import] start", url);
  const mod = await import(url);
  console.log("[import] done ", url);
  return mod;
}

const { fetchResponse: fetch, validateEvents, parseCoordinate } = await importV("./utils/data.js");
const { REGLAGES, validerReglages } = await importV("./reglages.js");
validerReglages(REGLAGES);
const { initUtilityMenu } = await importV(REGLAGES.fichiers.modules.menu);
const MODULES = REGLAGES.fichiers.modules;

const [
  dates,
  strings,
  security,
  bottomChart,
  eventsRenderer,
  legend,
  oblastFilters,
  playback,
  i18n,
  tutorial,
  occupationLayer,
  occupationLegend,
  panelScroll,
  geojsonLevels,
  mapRendering,
  nearbyNavigation
] = await Promise.all([
  importV(MODULES.dates),
  importV(MODULES.strings),
  importV(MODULES.security),
  importV(MODULES.bottomChart),
  importV(MODULES.eventsRenderer),
  importV(MODULES.legend),
  importV(MODULES.oblastFilters),
  importV(MODULES.playback),
  importV(MODULES.i18n),
  importV(MODULES.tutorial),
  importV(MODULES.occupationLayer),
  importV(MODULES.occupationLegend),
  importV(MODULES.panelScroll),
  importV(MODULES.geojsonLevels),
  importV(MODULES.mapRendering),
  importV(MODULES.nearbyNavigation)
]);


const {
  parseDateFlexible,
  getEventTime,
  formatDateFR,
  startOfDayUTC,
  startOfDay,
  endOfDay
} = dates;

const { normalizeType } = strings;
const { escapeHtml, getSafeHttpUrl } = security;

const { BottomChart } = bottomChart;
const { EventsRenderer } = eventsRenderer;
const { LegendUI } = legend;
const { OblastFilters } = oblastFilters;

const { createPlayback } = playback;
i18n.configureI18n({ textes: REGLAGES.textes, categories: REGLAGES.categories });
const { UI_STRINGS, applyStaticTextsForLang, getDisplayLabelForType, getUiStrings } = i18n;
BottomChart.configureI18n?.(getUiStrings);

const { createTutorial } = tutorial;
const { createOccupationLayerController } = occupationLayer;
const { createOccupationLegend } = occupationLegend;
const { createGeojsonLevelsController } = geojsonLevels;
const { createNearbyNavigator } = nearbyNavigation;
const { createBasemapLayer, createGeojsonRenderer, waitForBasemapReady, applyBasemapTheme, createBasemapControl, validateBasemaps } = mapRendering;
const { initPanelScrollProgress } = panelScroll;



// map.setView pour éviter le scroll en mode embed

/// === CONSTANTES ===

const FILES = REGLAGES.fichiers;
const DATA_FIELDS = REGLAGES.champsDonnees;
const FEATURES = REGLAGES.fonctionnalites;
const MAP_SETTINGS = REGLAGES.carte;
const MAP_CRS = { mercator: L.CRS.EPSG3857 }[MAP_SETTINGS.projection];
if (!MAP_CRS) throw new Error(`Projection non prise en charge : ${MAP_SETTINGS.projection}`);
const DEFAULT_LANGUAGE = REGLAGES.projet.langueParDefaut || "fr";
const ENABLED_CATEGORIES = (REGLAGES.categories || []).filter(categorie => categorie.enabled !== false);

function featureEnabled(name) {
  return FEATURES?.[name]?.enabled !== false;
}

const OBLAST_STATUS_URL = withV(FILES.geojson.statutsRegions);
const ICON_BASE_URL = FILES.assets.dossierIcones;
const iconUrl = (file) => withV(`${ICON_BASE_URL}${file}`);
const DEFAULT_ICON_URL = iconUrl(FILES.assets.iconeParDefaut);
const STATUS_STYLE = REGLAGES.statutsRegions.styles || {};
const INITIAL_CENTER = MAP_SETTINGS.centreInitial;
const INITIAL_ZOOM = MAP_SETTINGS.zoomInitial;
const MIN_ZOOM = MAP_SETTINGS.zoomMinimum;
const MAX_ZOOM = MAP_SETTINGS.zoomMaximum;
const REGIONS_GEOJSON_URL = FILES.geojson.regions;
const OCCUPATION_FILES = (REGLAGES.occupation.fichiers || []).map(file => ({ ...file, url: withV(file.url) }));


function isoToUTCms(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}
const OCCUPATION_MAX_TIMES = OCCUPATION_FILES.map(x => isoToUTCms(x.date));



const OCCUPATION_TYPES = REGLAGES.occupation.types || {};
const TYPE_COLORS = Object.assign(Object.create(null), Object.fromEntries(ENABLED_CATEGORIES.map(categorie => [categorie.cle, categorie.couleur])));
const TYPE_CONFIG = Object.assign(Object.create(null), Object.fromEntries(ENABLED_CATEGORIES.map(categorie => [categorie.cle, { slug: categorie.slug, file: categorie.icone }])));
const TYPE_MAP_TO_CANONICAL = Object.assign(Object.create(null), Object.fromEntries(
  ENABLED_CATEGORIES.flatMap(categorie => [
    categorie.cle,
    ...Object.values(categorie.labels || {}),
    ...(categorie.valeursEntree || [])
  ].filter(Boolean).map(value => [String(value), categorie.cle]))
));
const TYPE_MAP_TO_CANONICAL_NORMALIZED = Object.assign(Object.create(null), Object.fromEntries(
  Object.entries(TYPE_MAP_TO_CANONICAL).map(([value, key]) => [normalizePlainText(value), key])
));
const REGION_MAP_TO_SHAPES = Object.assign(Object.create(null), REGLAGES.zones.aliases || {});
const REGION_BASE_COLORS = Object.assign(Object.create(null), REGLAGES.zones.couleursBase || {});
const AUTHOR_MAP_TO_CANONICAL = Object.assign(Object.create(null), REGLAGES.auteurs.aliases || {});


/// === ÉTAT GLOBAL ===

let map;
let nearbyNavigator = null;
let activeBasemap = null;
let geojsonRenderer = null;
let geojsonLevelsController = null;
let allEvents = [];
let selectedTypes = new Set();
let OccupationCtrl = null;
let OccupationLegend = null;
let basemapControl = null;
let basemapEntries = [];



let selectedOblast = null;
let selectedVille = null;
let selectedAuthor = null;
let activeSupplementFilters = new Set();
let oblastsDisponibles = [];
let villesDisponibles = [];
let statsSelectedOblast = null;
let statsSelectedVille = null;
let statsSelectedAuthor = null;

let currentLang = DEFAULT_LANGUAGE;

// GeoJSON / layers
let mapBorderLayer = null;
let regionsGeojsonData = null;
let regionsGeojsonPromise = null;
let mapBorderSeq = 0;
let oblastStatusSeq = 0;
let currentOblastLayer = null;
let lastHighlightedOblast = null;
let regionsModeActive = featureEnabled("choropleth") && Boolean(FEATURES.choropleth.actifParDefaut);
let regionsChoroplethLayer = null;
let regionsChoroplethSeq = 0;
let regionsChoroplethCounts = new Map();
let regionsChoroplethMaxCount = 1;

let oblastStatusLayer = null;
let oblastStatusData = null;
let oblastStatusPromise = null;

const rightPanelVisibleTypes = new Set(Object.keys(TYPE_CONFIG));
let rightPanelView = "regions";

// Graphs panel droit
let overviewMode = REGLAGES.controles.statistiques.vueParDefaut === "emplacements" ? "villes" : "oblasts";
let rightChartRowsByContainer = new Map(); // containerId -> Map(name -> row parts)
let rightChartLabelTooltip = null;
let rightChartLabelTooltipTimer = 0;
let rightChartTooltipLabel = null;

// Cache datas par langue
const dataByLang = Object.fromEntries((REGLAGES.projet.langues || [DEFAULT_LANGUAGE]).map(lang => [lang, null]));


/// === HELPERS ===

function setupCollapse({ btnId, bodyId, storageKey = null, defaultCollapsed = false }) {
  const btn = document.getElementById(btnId);
  const body = document.getElementById(bodyId);
  if (!btn || !body) return;

  const load = () => {
    if (!storageKey) return defaultCollapsed;
    try {
      const v = localStorage.getItem(storageKey);
      return v === null ? defaultCollapsed : v === "1";
    } catch { return defaultCollapsed; }
  };

  const save = (isCollapsed) => {
    if (!storageKey) return;
    try { localStorage.setItem(storageKey, isCollapsed ? "1" : "0"); } catch { /* Stockage désactivé dans certains contextes intégrés. */ }
  };

  const apply = (isCollapsed) => {
    body.classList.toggle("is-collapsed", isCollapsed);
    btn.textContent = isCollapsed ? "▸" : "▾";
    btn.setAttribute("aria-expanded", isCollapsed ? "false" : "true");
    save(isCollapsed);
  };

  let collapsed = load();
  apply(collapsed);

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    collapsed = !collapsed;
    apply(collapsed);
  });
}



function getTypeSlugFromCategory(category) {
  const cfg = TYPE_CONFIG[category];
  return (cfg && cfg.slug) ? cfg.slug : normalizeType(category);
}

function getFirstConfiguredValue(object, fieldNames = []) {
  if (!object) return undefined;
  for (const field of fieldNames || []) {
    if (Object.prototype.hasOwnProperty.call(object, field)) return object[field];
  }

  const fieldsLower = new Set((fieldNames || []).map(field => String(field).toLowerCase()));
  const matchingKey = Object.keys(object).find(key => fieldsLower.has(String(key).toLowerCase()));
  return matchingKey ? object[matchingKey] : undefined;
}

function buildEventId(ev) {
  const d = String(getFirstConfiguredValue(ev, DATA_FIELDS.date) || ev.date || "");
  const id = getFirstConfiguredValue(ev, DATA_FIELDS.identifiant) || ev.compteur_evenements || "";
  return `event-${normalizeType(ev.lieu)}-${normalizeType(ev.journaliste)}-${normalizeType(d)}-${id}`;
}

function normalizeRegionName(raw) {
  const value = (raw ?? "").toString().trim();
  if (!value) return null;
  return REGION_MAP_TO_SHAPES[value] || value;
}

function normalizeEventType(raw) {
  const value = (raw ?? "").toString().trim();
  if (!value) return REGLAGES.categorieParDefaut;
  return TYPE_MAP_TO_CANONICAL[value] || TYPE_MAP_TO_CANONICAL_NORMALIZED[normalizePlainText(value)] || REGLAGES.categorieParDefaut;
}

function getEventOblast(ev) {
  const region = normalizeRegionName(getFirstConfiguredValue(ev, DATA_FIELDS.zone));
  return REGLAGES.zones.labels?.[region]?.[currentLang] || region;
}

function getEventGeojsonName(ev) {
  return normalizeRegionName(getFirstConfiguredValue(ev, DATA_FIELDS.nomGeojson) ||
    getFirstConfiguredValue(ev, DATA_FIELDS.zone));
}

function normalizeAuthorName(raw) {
  const value = String(raw || "").trim();
  if (!value) return null;
  return AUTHOR_MAP_TO_CANONICAL[value] || value;
}

function getEventAuthor(ev) {
  const author = normalizeAuthorName(getFirstConfiguredValue(ev, DATA_FIELDS.auteur));
  return REGLAGES.auteurs.labels?.[author]?.[currentLang] || author;
}

function getEventMedia(ev) {
  const media = getFirstConfiguredValue(ev, DATA_FIELDS.media) || "";
  return media.toString().trim() || null;
}

function getEventStatus(ev) {
  const status = getFirstConfiguredValue(ev, DATA_FIELDS.statut) || "";
  return status.toString().trim() || null;
}

function cleanOptionalText(value) {
  const text = (value ?? "").toString().trim();
  if (!text) return "";
  if (["#N/A", "N/A", "NA", "null", "undefined"].includes(text)) return "";
  return text;
}

function firstText(...values) {
  for (const value of values) {
    const text = cleanOptionalText(value);
    if (text) return text;
  }
  return "";
}

function getEventComment(ev) {
  return firstText(ev.description, getFirstConfiguredValue(ev, DATA_FIELDS.descriptionGenerique)) || null;
}

function getLocalizedEventDescription(ev, lang) {
  const frenchDescription = firstText(getFirstConfiguredValue(ev, DATA_FIELDS.descriptionFr));
  const englishDescription = firstText(getFirstConfiguredValue(ev, DATA_FIELDS.descriptionEn));
  const genericDescription = firstText(getFirstConfiguredValue(ev, DATA_FIELDS.descriptionGenerique));

  if (lang === "en") {
    return englishDescription || (frenchDescription ? "" : genericDescription);
  }

  return frenchDescription || genericDescription;
}

function normalizePlainText(value) {
  return (value ?? "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function getSupplementFilterConfig(key) {
  if (!featureEnabled("filtresAdditionnels")) return null;
  return (REGLAGES.filtresAdditionnels || []).find(filter => filter.id === key && filter.enabled !== false) || null;
}

const SUPPLEMENT_FILTERS = Object.fromEntries(
  (featureEnabled("filtresAdditionnels") ? REGLAGES.filtresAdditionnels || [] : [])
    .filter(filter => filter.enabled !== false)
    .map(filter => [filter.id, filter])
);

function getSupplementLabel(key) {
  const cfg = getSupplementFilterConfig(key);
  return cfg?.labels?.[currentLang] || cfg?.labels?.fr || key;
}

function eventHasSupplement(ev, key) {
  const cfg = getSupplementFilterConfig(key);
  if (!cfg) return false;

  if (cfg.mode === "categorie_statut") {
    const eventCategory = normalizeEventType(getFirstConfiguredValue(ev, DATA_FIELDS.categorie) || ev.type_violence);
    if (eventCategory !== cfg.categorie) return false;
  }

  const value = getFirstConfiguredValue(ev, [cfg.champ, ...(cfg.champs || [])].filter(Boolean));
  const normalizedValue = normalizePlainText(value);
  return (cfg.valeurs || []).some(accepted => {
    const normalizedAccepted = normalizePlainText(accepted);
    return normalizedValue === normalizedAccepted ||
      (cfg.mode === "categorie_statut" && normalizedValue.includes(normalizedAccepted));
  });
}

function hasTortureAllegation(ev) {
  return eventHasSupplement(ev, "torture");
}

function eventMatchesSupplementFilters(ev) {
  for (const key of activeSupplementFilters) {
    if (!eventHasSupplement(ev, key)) return false;
  }
  return true;
}

function getEventSupplementBadges(ev) {
  return Object.keys(SUPPLEMENT_FILTERS)
    .filter(key => eventHasSupplement(ev, key))
    .map(getSupplementLabel);
}

function getShapeNameForSelectedOblast(oblastName) {
  if (!oblastName) return null;
  const ev0 = allEvents.find(ev => (getEventOblast(ev) || "") === oblastName);
  return ev0 ? getEventGeojsonName(ev0) : oblastName;
}


/// === BOTTOM CHART ===

function isBottomChartOpenDOM() {
  const panel = document.getElementById("bottom-chart-panel");
  if (!panel) return false;
  if (panel.classList.contains("open")) return true;

  if (!panel.classList.contains("collapsed") && panel.getAttribute("aria-hidden") !== "true") {
    return true;
  }

  if (typeof BottomChart?.isOpen === "function") return BottomChart.isOpen();
  return false;
}

function formatDayLabelUTC(dayTs) {
  return formatDateFR(dayTs);
}

function formatDateInputValue(ts) {
  if (!Number.isFinite(ts)) return "";
  const d = new Date(ts);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseDateInputValue(value, { endOfDayValue = false } = {}) {
  const m = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const ts = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return endOfDayValue ? endOfDay(ts) : ts;
}

function getPlaybackTimelineMaxTime() {
  const eventTimes = (allEvents || [])
    .map(ev => getEventTime(ev))
    .filter(Number.isFinite);
  const candidates = [
    ...eventTimes,
    ...OCCUPATION_MAX_TIMES.filter(Number.isFinite)
  ];
  let maxTime = candidates.length ? Math.max(...candidates) : PLAYBACK_START_TIME;
  if (Number.isFinite(PLAYBACK_END_TIME)) maxTime = Math.min(maxTime, PLAYBACK_END_TIME);
  return endOfDay(maxTime);
}

function getPlaybackWindowStartTime() {
  return Number.isFinite(playbackWindowStartTime) ? playbackWindowStartTime : PLAYBACK_START_TIME;
}

function getPlaybackWindowEndTime() {
  return Number.isFinite(playbackCutoffTime) ? playbackCutoffTime : getPlaybackTimelineMaxTime();
}

function eventPassesPlaybackWindow(ev, { startTime = getPlaybackWindowStartTime(), cutoffTime = playbackCutoffTime } = {}) {
  const t = getEventTime(ev);
  if (!Number.isFinite(t)) return false;
  if (Number.isFinite(startTime) && t < startTime) return false;
  if (cutoffTime !== null && Number.isFinite(cutoffTime) && t > cutoffTime) return false;
  return true;
}

function updatePlaybackDateUI() {
  const el = document.querySelector(".playback-date");
  if (!el) return;

  if (playbackCutoffTime == null) {
    el.textContent = "";
    return;
  }

  const startTime = getPlaybackWindowStartTime();
  el.textContent = Number.isFinite(startTime)
    ? `${formatDateFR(startTime)} - ${formatDateFR(playbackCutoffTime)}`
    : formatDateFR(playbackCutoffTime);
}

function setPlaybackWindowStartFromTimeline(ts, { allowBeforeMin = false, allowBeyondMax = false, ignoreCurrentEnd = false } = {}) {
  Playback.pause?.();

  const dayStart = startOfDayUTC(ts);
  if (!Number.isFinite(dayStart)) return;

  const defaultMinStart = startOfDayUTC(PLAYBACK_START_TIME);
  const minStart = allowBeforeMin ? Math.min(defaultMinStart, dayStart) : defaultMinStart;
  const timelineMaxStart = startOfDayUTC(getPlaybackTimelineMaxTime());
  const maxStart = allowBeyondMax ? Math.max(timelineMaxStart, dayStart) : timelineMaxStart;
  const endDay = !ignoreCurrentEnd && Number.isFinite(playbackCutoffTime) ? startOfDayUTC(playbackCutoffTime) : null;
  const upperBound = Number.isFinite(endDay) ? Math.min(endDay, maxStart) : maxStart;
  const nextStart = Math.min(Math.max(dayStart, minStart), upperBound);

  playbackWindowStartTime = nextStart;
  updatePlaybackDateUI?.();
}

function setPlaybackCutoffFromTimeline(ts, { allowBeforeMin = false, allowBeyondMax = false } = {}) {
  Playback.pause?.();

  const startTime = getPlaybackWindowStartTime();
  const minEnd = Number.isFinite(startTime)
    ? startOfDayUTC(startTime) + (24 * 3600 * 1000) - 1
    : null;
  const maxEnd = allowBeyondMax ? Math.max(getPlaybackTimelineMaxTime(), endOfDay(ts)) : getPlaybackTimelineMaxTime();
  const defaultMinBound = PLAYBACK_START_TIME;
  const minBound = Number.isFinite(minEnd)
    ? minEnd
    : (allowBeforeMin ? Math.min(defaultMinBound, ts) : defaultMinBound);
  const nextCutoff = Math.min(Math.max(ts, minBound), maxEnd);

  let idx = -1;
  for (let i = 0; i < playbackSequence.length; i++) {
    const t = getEventTime(playbackSequence[i]);
    if (!Number.isFinite(t)) continue;
    if (t <= nextCutoff) idx = i;
    else break;
  }

  setPlaybackState({
    playbackCutoffTime: nextCutoff,
    playbackIndex: idx
  });

  OccupationCtrl?.setForTime?.(nextCutoff);
  updatePlaybackDateUI?.();
}

function updateBottomChart(force = false) {
  BottomChart.update({
    force,

    getState: () => ({
      allEvents,
      selectedTypes,
      selectedOblast: statsSelectedOblast,
      selectedVille: statsSelectedVille,
      selectedAuthor,
      supplementFilterKey: Array.from(activeSupplementFilters).sort().join("|"),
      playbackActive,
      playbackWindowStartTime: getPlaybackWindowStartTime(),
      playbackCutoffTime,
      currentLang,
      getEventOblast,
      getEventAuthor,
      eventMatchesSupplementFilters
    }),

    pausePlayback: Playback.pause,
    render: afficherEvenements,

    setPlaybackWindowStartTime: setPlaybackWindowStartFromTimeline,
    setPlaybackCutoffTime: setPlaybackCutoffFromTimeline,

    getDisplayLabelForType: (type) => getDisplayLabelForType(type, currentLang),
    getUiStrings,
    typeConfigKeys: Object.keys(TYPE_CONFIG),
    typeColors: TYPE_COLORS,
    formatDayLabelUTC,
    getEventTime,
    startOfDayUTC,
    playbackStartTime: PLAYBACK_START_TIME,
    playbackMaxTime: getPlaybackTimelineMaxTime()
  });
}

function getAppState() {
  return {
    allEvents,
    selectedTypes,
    setSelectedTypes: (next) => { selectedTypes = next; },
  };
}


/// === ICÔNES ===

function createMarkerIcon(type) {
  const cfg = TYPE_CONFIG[type];
  if (!cfg) return L.icon({ iconUrl: DEFAULT_ICON_URL, iconSize: [24, 24] });

  const element = document.createElement("div");
  element.className = "marker-icon marker-" + normalizeType(cfg.slug);
  element.style.backgroundImage = "url(" + JSON.stringify(iconUrl(cfg.file)) + ")";
  return L.divIcon({
    html: element,
    className: "",
    iconSize: [36, 36],
    popupAnchor: [0, -12]
  });
}

function createLegendIcon(type) {
  const cfg = TYPE_CONFIG[type];
  const url = cfg ? iconUrl(cfg.file) : DEFAULT_ICON_URL;
  return L.icon({ iconUrl: url, iconSize: [36, 36] });
}


function getLegendIconUrl(type) {
  return createLegendIcon(type).options.iconUrl;
}



/// === PANELS (gauche/droite) ===

function syncUtilityMenuState() {
  const eventPanelOpen = document.getElementById("event-panel")?.classList.contains("expanded");
  const countryPanelOpen = document.getElementById("country-panel")?.classList.contains("expanded");
  const chartOpen = document.getElementById("bottom-chart-panel")?.classList.contains("open");

  document.getElementById("utility-events-toggle")?.classList.toggle("active", !!eventPanelOpen);
  document.getElementById("utility-country-toggle")?.classList.toggle("active", !!countryPanelOpen && rightPanelView === "regions");
  document.getElementById("utility-authors-toggle")?.classList.toggle("active", !!countryPanelOpen && rightPanelView === "authors");
  document.getElementById("utility-chart-toggle")?.classList.toggle("active", !!chartOpen);

  const regionsBtn = document.getElementById("utility-regions-mode-toggle");
  regionsBtn?.classList.toggle("active", regionsModeActive);
  regionsBtn?.setAttribute("aria-pressed", regionsModeActive ? "true" : "false");
}

function setPanelExpanded(expanded) {
  const panel = document.getElementById("event-panel");
  if (!panel) return;

  const shouldExpand = expanded === "toggle"
    ? !panel.classList.contains("expanded")
    : !!expanded;
  const countryPanel = document.getElementById("country-panel");

  panel.classList.toggle("expanded", shouldExpand);
  panel.classList.toggle("collapsed", !shouldExpand);

  if (shouldExpand) {
    countryPanel?.classList.remove("expanded");
    countryPanel?.classList.add("collapsed");
  }

  syncUtilityMenuState();
}

function setRightPanelExpanded(expanded) {
  const panel = document.getElementById("country-panel");
  if (!panel) return;

  const shouldExpand = expanded === "toggle"
    ? !panel.classList.contains("expanded")
    : !!expanded;
  const eventPanel = document.getElementById("event-panel");

  panel.classList.toggle("expanded", shouldExpand);
  panel.classList.toggle("collapsed", !shouldExpand);

  if (shouldExpand) {
    eventPanel?.classList.remove("expanded");
    eventPanel?.classList.add("collapsed");
  }

  syncUtilityMenuState();
}

function setRightPanelView(nextView, { force = false } = {}) {
  if (nextView !== "regions" && nextView !== "authors") return;
  if (!force && rightPanelView === nextView) return;

  rightPanelView = nextView;
  document.getElementById("right-view-regions")?.classList.toggle("hidden", rightPanelView !== "regions");
  document.getElementById("right-view-authors")?.classList.toggle("hidden", rightPanelView !== "authors");

  if (rightPanelView === "authors") {
    updateAuthorPanelHeading();
  } else {
    updateOblastPanel(selectedOblast);
  }

  renderRightPanelBody();
  syncUtilityMenuState();
}

function openRegionsPanelFromMenu() {
  const panel = document.getElementById("country-panel");
  const isSameViewOpen = panel?.classList.contains("expanded") && rightPanelView === "regions";
  if (isSameViewOpen) {
    setRightPanelExpanded(false);
    return;
  }
  setRightPanelView("regions");
  setRightPanelExpanded(true);
}

function openAuthorsPanelFromMenu() {
  const panel = document.getElementById("country-panel");
  const isSameViewOpen = panel?.classList.contains("expanded") && rightPanelView === "authors";
  if (isSameViewOpen) {
    setRightPanelExpanded(false);
    return;
  }
  setRightPanelView("authors");
  setRightPanelExpanded(true);
}


/// === LISTE : focus event ===

function highlightEventInList(ev) {
  const targetId = buildEventId(ev);
  const target = document.getElementById(targetId);
  const list = document.getElementById("event-list");
  if (!target || !list) return;

  const EMBED_MODE = window.self !== window.top;

  setTimeout(() => {
    if (!EMBED_MODE) {
      target.scrollIntoView({ behavior: "auto", block: "start" });
    } else {
      const listRect = list.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();

      const top =
        list.scrollTop +
        (targetRect.top - listRect.top) -
        12; // petit padding visuel

      list.scrollTo({ top, behavior: "auto" });
    }

    target.classList.add("highlighted");
    setTimeout(() => target.classList.remove("highlighted"), 1500);
  }, 150);
}


function spiderfyIfClustered(clusterGroup, marker, { zoom = null } = {}) {
  if (!clusterGroup || !marker) return;

  if (Number.isFinite(zoom) && map.getZoom() < zoom) {
    map.setZoom(zoom, { animate: true });
  }

  clusterGroup.zoomToShowLayer(marker, () => {
    const parent = clusterGroup.getVisibleParent(marker);
    if (parent && parent !== marker && typeof parent.spiderfy === "function") parent.spiderfy();
    if (marker.getLatLng) map.panTo(marker.getLatLng(), { animate: true });
  });
}

function focusEvent(ev, marker = null) {
  setPanelExpanded(true);
  highlightEventInList(ev);
  const EMBED_MODE = window.self !== window.top;

  if (marker?.getLatLng) map.setView(marker.getLatLng(), map.getZoom(), { animate: true });
  else if (Number.isFinite(ev?.lat) && Number.isFinite(ev?.lng)) map.setView([ev.lat, ev.lng], map.getZoom(), { animate: true });

  spiderfyIfClustered(EventsRenderer.getClusterGroup(), marker, { zoom: null });
}


/// === OBLAST STATUS (layer) ===

let oblastStatusByShapeName = null;

async function loadOblastStatusJson() {
  if (!featureEnabled("statutsRegions") || !OBLAST_STATUS_URL) return null;
  if (oblastStatusData) return oblastStatusData;
  if (!oblastStatusPromise) {
    oblastStatusPromise = (async () => {
      const resp = await fetch(OBLAST_STATUS_URL);
      if (!resp.ok) return null;
      const rows = await resp.json();
      oblastStatusByShapeName = new Map();
      for (const row of rows) {
        const shapeName = row.geojson || row.Geojson || row.shapeName || row.ShapeName || row.region || row.Region;
        if (shapeName) oblastStatusByShapeName.set(shapeName, row);
      }
      oblastStatusData = rows;
      return rows;
    })().then(rows => {
      if (!rows) oblastStatusPromise = null;
      return rows;
    }).catch(error => {
      oblastStatusPromise = null;
      throw error;
    });
  }
  return oblastStatusPromise;
}

async function loadOblastsGeojson() {
  if (regionsGeojsonData) return regionsGeojsonData;
  if (!regionsGeojsonPromise) {
    regionsGeojsonPromise = (async () => {
      const resp = await fetch(withV(REGIONS_GEOJSON_URL));
      if (!resp.ok) throw new Error(`GeoJSON ${REGIONS_GEOJSON_URL}: HTTP ${resp.status}`);
      regionsGeojsonData = await resp.json();
      return regionsGeojsonData;
    })().catch(error => {
      regionsGeojsonPromise = null;
      throw error;
    });
  }
  return regionsGeojsonPromise;
}

async function renderOblastStatusLayer() {
  if (!map || !featureEnabled("statutsRegions") || regionsModeActive) return;

  const seq = ++oblastStatusSeq;
  const [statuses, oblastGeo] = await Promise.all([loadOblastStatusJson(), loadOblastsGeojson()]);
  if (!statuses || !oblastGeo || seq !== oblastStatusSeq || regionsModeActive) return;
  if (oblastStatusLayer) return;

  const byShapeName = new Map();
  (oblastGeo.features || []).forEach(f => {
    const name = f?.properties?.shapeName || f?.properties?.name || f?.properties?.region;
    if (name) byShapeName.set(name, f);
  });

  const features = [];
  for (const row of statuses) {
    const shapeName = row.geojson || row.Geojson || row.shapeName || row.ShapeName || row.region || row.Region;
    const statut = row.statut || row.Statut || row.status || row.Status;
    const regionName = row.region || row.Region || row.oblast || row.Oblast || shapeName;

    const src = byShapeName.get(shapeName);
    if (!src) continue;

    features.push({
      ...src,
      properties: {
        ...(src.properties || {}),
        statut,
        oblast_fr: regionName
      }
    });
  }

  oblastStatusLayer = geojsonRenderer.createLayer(
    { type: "FeatureCollection", features },
    {
      interactive: false,
      className: "oblast-status-layer",
      style: (feature) => {
        const statut = feature?.properties?.statut;
        return { ...REGLAGES.stylesGeojson.statutsRegions, ...(STATUS_STYLE[statut] || {}) };
      }
    }
  ).addTo(map);
}


/// === OBLAST HIGHLIGHT ===

function clearOblastHighlight() {
  if (currentOblastLayer && map) {
    map.removeLayer(currentOblastLayer);
    currentOblastLayer = null;
  }
}

async function highlightOblastByShapeName(shapeName) {
  if (!shapeName || !map) return;
  if (regionsModeActive) return;
  if (lastHighlightedOblast === shapeName) return;

  lastHighlightedOblast = shapeName;
  clearOblastHighlight();

  const data = await loadOblastsGeojson();
  if (!data || regionsModeActive || lastHighlightedOblast !== shapeName) return;

  const feature = (data.features || []).find(f => (
    f?.properties?.shapeName ||
    f?.properties?.name ||
    f?.properties?.region ||
    ""
  ) === shapeName);
  if (!feature) return;

  currentOblastLayer = geojsonRenderer.createLayer(feature, {
    style: REGLAGES.stylesGeojson.selection,
    interactive: false,
    className: "oblast-highlight"
  }).addTo(map);
}

async function highlightOblastForEvent(ev) {
  const shapeName = getEventGeojsonName(ev);
  if (!shapeName) return;
  return highlightOblastByShapeName(shapeName);
}


/// === CONTOUR / EMPRISE GEOGRAPHIQUE ===

async function loadMapBorder() {
  if (!map || !featureEnabled("contour") || regionsModeActive) return;
  const seq = ++mapBorderSeq;
  const data = await loadOblastsGeojson();
  if (!data || seq !== mapBorderSeq || regionsModeActive || mapBorderLayer) return;

  mapBorderLayer = geojsonRenderer.createLayer(data, {
    style: feature => {
      const settings = REGLAGES.stylesGeojson.contour;
      const color = settings.color || getRegionBaseColor(getFeatureShapeName(feature));
      return { ...settings, color, fillColor: settings.fillColor || color };
    },
    interactive: false,
    className: "map-border"
  }).addTo(map);

  const bounds = mapBorderLayer.getBounds();
  if (MAP_SETTINGS.ajusterVueAuContour && bounds.isValid()) {
    map.fitBounds(bounds, { padding: [24, 24], maxZoom: MAP_SETTINGS.zoomMaximumContour });
  }
}

function removeMapBorderLayer() {
  mapBorderSeq++;
  if (mapBorderLayer && map) {
    map.removeLayer(mapBorderLayer);
  }
  mapBorderLayer = null;
}

function hexToRgb(hex) {
  const raw = (hex || "").replace("#", "").trim();
  const value = raw.length === 3
    ? raw.split("").map(ch => ch + ch).join("")
    : raw;
  const n = parseInt(value, 16);
  return {
    r: (n >> 16) & 255,
    g: (n >> 8) & 255,
    b: n & 255
  };
}

function mixHexColor(from, to, t) {
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  const x = Math.max(0, Math.min(1, t));
  const c = {
    r: Math.round(a.r + (b.r - a.r) * x),
    g: Math.round(a.g + (b.g - a.g) * x),
    b: Math.round(a.b + (b.b - a.b) * x)
  };
  return `rgb(${c.r}, ${c.g}, ${c.b})`;
}

function getRegionCountColor(count, maxCount) {
  const settings = REGLAGES.choropleth;
  if (!count) return settings.couleurSansCas;
  const t = maxCount > 0 ? Math.log1p(count) / Math.log1p(maxCount) : 0;
  return mixHexColor(settings.couleurMinimum, settings.couleurMaximum, t);
}

function getRegionBaseColor(shapeName) {
  const normalized = normalizeRegionName(shapeName);
  return REGION_BASE_COLORS[normalized] || REGLAGES.zones.couleurParDefaut;
}

function clearRegionsChoroplethLayer({ cancelPending = false } = {}) {
  if (cancelPending) regionsChoroplethSeq++;
  if (regionsChoroplethLayer && map) {
    map.removeLayer(regionsChoroplethLayer);
  }
  regionsChoroplethLayer = null;
}

function getFeatureShapeName(feature) {
  const props = feature?.properties || {};
  return normalizeRegionName(
    props.shapeName ||
    props.name ||
    props.region ||
    props.Region ||
    props.NAME ||
    props.nom ||
    props.Nom
  );
}

function getOblastDisplayNameForShape(shapeName) {
  if (!shapeName) return null;
  const ev0 = (allEvents || []).find(ev => getEventGeojsonName(ev) === shapeName);
  return ev0 ? getEventOblast(ev0) : REGLAGES.zones.labels?.[shapeName]?.[currentLang] || shapeName;
}

function getRegionCountLabel(count) {
  const ui = UI_STRINGS[currentLang]?.ui || UI_STRINGS[DEFAULT_LANGUAGE]?.ui || {};
  return count === 1
    ? ui.caseSingular
    : String(ui.casePlural || "{count}").replace("{count}", count);
}

function eventPassesRegionsChoroplethFilters(ev) {
  const typeOK = selectedTypes.size === 0 || selectedTypes.has(ev.type_violence);
  const authorOK = !selectedAuthor || getEventAuthor(ev) === selectedAuthor;
  const supplementOK = eventMatchesSupplementFilters(ev);
  const playbackOK = eventPassesPlaybackWindow(ev);
  return typeOK && authorOK && supplementOK && playbackOK;
}

function getRegionTooltipContent(shapeName) {
  const label = getOblastDisplayNameForShape(shapeName) || shapeName;
  const count = regionsChoroplethCounts.get(shapeName) || 0;
  return `${escapeHtml(label)} · ${escapeHtml(getRegionCountLabel(count))}`;
}

function getRegionChoroplethStyle(feature) {
  const shapeName = getFeatureShapeName(feature);
  const count = regionsChoroplethCounts.get(shapeName) || 0;
  const opacity = count ? REGLAGES.choropleth.opaciteAvecCas : REGLAGES.choropleth.opaciteSansCas;
  return {
    stroke: true,
    fill: true,
    color: REGLAGES.choropleth.contour,
    weight: REGLAGES.choropleth.epaisseurContour,
    opacity: 1,
    fillColor: getRegionCountColor(count, regionsChoroplethMaxCount),
    fillOpacity: opacity
  };
}

async function renderRegionsChoroplethLayer() {
  if (!map || !featureEnabled("choropleth") || !regionsModeActive) {
    clearRegionsChoroplethLayer({ cancelPending: true });
    return;
  }

  const seq = ++regionsChoroplethSeq;
  const data = await loadOblastsGeojson();
  if (!data || seq !== regionsChoroplethSeq || !regionsModeActive) return;

  const countsByShape = new Map();
  for (const ev of (allEvents || []).filter(eventPassesRegionsChoroplethFilters)) {
    const shapeName = getEventGeojsonName(ev);
    if (!shapeName) continue;
    countsByShape.set(shapeName, (countsByShape.get(shapeName) || 0) + 1);
  }

  regionsChoroplethCounts = countsByShape;
  regionsChoroplethMaxCount = Math.max(1, ...countsByShape.values());

  // Les filtres changent les couleurs et les compteurs, pas les geometries.
  if (regionsChoroplethLayer) {
    regionsChoroplethLayer.setStyle(getRegionChoroplethStyle);
    regionsChoroplethLayer.eachLayer(layer => {
      layer.getTooltip()?.setContent(getRegionTooltipContent(getFeatureShapeName(layer.feature)));
    });
    return;
  }

  regionsChoroplethLayer = geojsonRenderer.createLayer(data, {
    pane: "overlayPane",
    className: "regions-choropleth-layer",
    style: getRegionChoroplethStyle,
    onEachFeature: (feature, layer) => {
      const shapeName = getFeatureShapeName(feature);
      layer.bindTooltip(getRegionTooltipContent(shapeName), {
        sticky: true,
        direction: "top",
        className: "regions-choropleth-tooltip"
      });

      layer.on({
        tooltipopen: event => {
          event.tooltip.setContent(getRegionTooltipContent(shapeName));
        },
        click: (e) => {
          L.DomEvent.stop(e);
          e?.originalEvent?.target?.blur?.();
          if (!regionsChoroplethCounts.get(shapeName)) return;
          const nextOblast = getOblastDisplayNameForShape(shapeName);
          if (nextOblast) applyTitleOblastFilter(nextOblast);
        }
      });
    }
  }).addTo(map);
}

function setRegionsMode(active) {
  const next = featureEnabled("choropleth") && Boolean(active);
  if (regionsModeActive === next) return;

  regionsModeActive = next;
  lastHighlightedOblast = null;
  clearOblastHighlight();
  oblastStatusSeq++;

  if (regionsModeActive) {
    removeMapBorderLayer();
    if (oblastStatusLayer && map) map.removeLayer(oblastStatusLayer);
    oblastStatusLayer = null;
  } else {
    clearRegionsChoroplethLayer({ cancelPending: true });
    loadMapBorder().catch(showLoadingError);
    renderOblastStatusLayer().catch(showLoadingError);
  }

  afficherEvenements();
  syncUtilityMenuState();
}


/// === PANEL DROIT : légendes des filtres par type, communes aux deux vues ===

function ensureRightPanelLegend({ onChange } = {}) {
  document.querySelectorAll(".right-panel-legend").forEach(legend => {
    legend.replaceChildren();

    Object.keys(TYPE_CONFIG).forEach(type => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "chart-tab-btn right-panel-legend-button";
      item.dataset.type = type;
      item.classList.toggle("active", rightPanelVisibleTypes.has(type));
      item.setAttribute("aria-pressed", String(rightPanelVisibleTypes.has(type)));

      const sw = document.createElement("span");
      sw.className = "bottom-chart-swatch";
      sw.style.background = TYPE_COLORS[type] || REGLAGES.stylesGeojson?.fallbackColor || "#999";
      sw.setAttribute("aria-hidden", "true");

      const lab = document.createElement("span");
      lab.textContent = getDisplayLabelForType(type, currentLang);
      item.append(sw, lab);

      item.addEventListener("click", () => {
        if (rightPanelVisibleTypes.has(type)) rightPanelVisibleTypes.delete(type);
        else rightPanelVisibleTypes.add(type);

        document.querySelectorAll(".right-panel-legend-button").forEach(button => {
          const isOn = rightPanelVisibleTypes.has(button.dataset.type);
          button.classList.toggle("active", isOn);
          button.setAttribute("aria-pressed", String(isOn));
        });
        onChange?.();
      });

      legend.appendChild(item);
    });
  });
}


/// === PANEL DROIT (stats) ===

function getStatusForShapeName(shapeName) {
  if (!shapeName) return null;
  return oblastStatusByShapeName?.get(shapeName) || null;
}

async function updateOblastPanel(oblastName) {
  const nameEl = document.getElementById("country-name");
  const chartTabsEl = document.getElementById("country-chart-tabs");
  if (!nameEl) return;

  let statusEl = document.getElementById("country-status");
  if (!statusEl) {
    statusEl = document.createElement("div");
    statusEl.id = "country-status";
    statusEl.className = "country-status";
    nameEl.insertAdjacentElement("afterend", statusEl);
  }

  if (!oblastName) {
    nameEl.textContent = UI_STRINGS[currentLang].ui.selectOblast;
    statusEl.style.display = "none";

    ensureRightPanelLegend({ onChange: () => renderRightPanelBody() });
    renderRightPanelBody();
    return;
  }

  nameEl.innerHTML = `
    <span class="country-title-text">${escapeHtml(oblastName)}</span>
    <button id="country-clear-filter" class="country-clear-btn" title="${escapeHtml(UI_STRINGS[currentLang].ui.clearFilters)}" aria-label="${escapeHtml(UI_STRINGS[currentLang].ui.clearFilters)}">✕</button>
  `;

  const clearBtn = document.getElementById("country-clear-filter");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      Playback.pause();
      OblastFilters.clearFiltersPreservePlayback({ resetZoom: false });
      setRightPanelExpanded(true);
    });
  }

  await loadOblastStatusJson();
  const shapeName = getShapeNameForSelectedOblast(oblastName);
  const st = getStatusForShapeName(shapeName);

  if (!st) {
    statusEl.style.display = "none";
  } else {
    const statusValue = st.statut || st.Statut || st.status || st.Status || "";
    const statusLabelEn = st.statut_en || st.Statut_en || st.status_en || st.Status_en || statusValue;
    const style = STATUS_STYLE[statusValue] || { fillColor: REGLAGES.stylesGeojson?.fallbackColor || "#999" };
    const statusLabel = (currentLang === "en") ? statusLabelEn : statusValue;

    statusEl.style.display = "flex";
    statusEl.replaceChildren();

    const dot = document.createElement("span");
    dot.className = "country-status-dot";
    dot.style.background = style.fillColor;
    dot.title = statusLabel;
    dot.dataset.tooltip = statusLabel;
    dot.setAttribute("role", "img");
    dot.setAttribute("aria-label", statusLabel);
    dot.tabIndex = 0;
    statusEl.appendChild(dot);
  }

  if (chartTabsEl) chartTabsEl.innerHTML = "";

  ensureRightPanelLegend({ onChange: () => renderRightPanelBody() });
  renderRightPanelBody();
}


/// === PANEL DROIT : construction + rendu ===

function updateAuthorPanelHeading() {
  const nameEl = document.getElementById("country-name");
  if (!nameEl) return;

  nameEl.textContent = UI_STRINGS[currentLang]?.ui?.menuAuthors || "Auteurs";
  const statusEl = document.getElementById("country-status");
  if (statusEl) statusEl.style.display = "none";
}

function renderRightPanelBody() {
  hideRightChartLabelTooltip();
  if (rightPanelView === "authors") {
    renderOverviewStackedChart("authors", {
      containerId: "authors-chart-container",
      showTabs: false
    });
    return;
  }

  renderOverviewStackedChart(overviewMode, {
    containerId: "country-chart-container",
    showTabs: true
  });
}

function buildStackedCountsByGroup({ groupBy, onlyOblast = null, startTime = null, cutoffTime = null }) {
  const allCats = Object.keys(TYPE_CONFIG);
  const keyFn = (ev) => {
    if (groupBy === "villes") return ev.lieu || null;
    if (groupBy === "authors") return getEventAuthor(ev) || null;
    return getEventOblast(ev) || null;
  };

  const counts = Object.create(null);
  for (const ev of allEvents) {
    if (!eventMatchesSupplementFilters(ev)) continue;
    if (onlyOblast && getEventOblast(ev) !== onlyOblast) continue;
    if (selectedOblast && groupBy !== "oblasts" && getEventOblast(ev) !== selectedOblast) continue;
    if (selectedVille && groupBy !== "villes" && ev.lieu !== selectedVille) continue;
    if (selectedAuthor && groupBy !== "authors" && getEventAuthor(ev) !== selectedAuthor) continue;

    if (!eventPassesPlaybackWindow(ev, { startTime, cutoffTime })) continue;

    const g = keyFn(ev);
    if (!g) continue;

    const type = ev.type_violence;
    if (!TYPE_CONFIG[type]) continue;
    if (selectedTypes.size && !selectedTypes.has(type)) continue;
    if (!rightPanelVisibleTypes.has(type)) continue;

    if (!counts[g]) {
      counts[g] = Object.create(null);
      for (const cat of allCats) counts[g][cat] = 0;
    }
    counts[g][type] += 1;
  }

  const rows = Object.entries(counts).map(([name, byType]) => {
    const total = allCats.reduce((acc, cat) => acc + (byType[cat] || 0), 0);
    return { name, byType, total };
  });

  rows.sort((a, b) => b.total - a.total);
  return { rows, allCats };
}

function getOrCreateRightChartWrapper(container) {
  let chartWrapper = container.querySelector(".chart-bars");
  if (!chartWrapper) {
    container.innerHTML = "";
    chartWrapper = document.createElement("div");
    chartWrapper.className = "chart-bars";
    container.appendChild(chartWrapper);
  }
  return chartWrapper;
}

function hideRightChartLabelTooltip() {
  clearTimeout(rightChartLabelTooltipTimer);
  if (rightChartLabelTooltip) rightChartLabelTooltip.hidden = true;
  rightChartTooltipLabel?.removeAttribute("aria-describedby");
  rightChartTooltipLabel = null;
}

function bindRightChartLabelTooltip(label) {
  if (!rightChartLabelTooltip) {
    rightChartLabelTooltip = document.createElement("div");
    rightChartLabelTooltip.id = "chart-label-tooltip";
    rightChartLabelTooltip.className = "chart-label-tooltip";
    rightChartLabelTooltip.setAttribute("role", "tooltip");
    rightChartLabelTooltip.hidden = true;
    document.body.appendChild(rightChartLabelTooltip);
    document.addEventListener("scroll", hideRightChartLabelTooltip, true);
    window.addEventListener("resize", hideRightChartLabelTooltip);
    document.addEventListener("keydown", event => {
      if (event.key === "Escape") hideRightChartLabelTooltip();
    });
  }

  const schedule = () => {
    hideRightChartLabelTooltip();
    rightChartLabelTooltipTimer = setTimeout(() => {
      if (!label.isConnected || !label.getClientRects().length) return;

      const tooltip = rightChartLabelTooltip;
      tooltip.textContent = label.textContent;
      tooltip.hidden = false;
      const rect = label.getBoundingClientRect();
      const gap = 8;
      const left = Math.max(gap, Math.min(rect.left, window.innerWidth - tooltip.offsetWidth - gap));
      const top = rect.bottom + gap + tooltip.offsetHeight <= window.innerHeight - gap
        ? rect.bottom + gap
        : Math.max(gap, rect.top - tooltip.offsetHeight - gap);
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
      label.setAttribute("aria-describedby", tooltip.id);
      rightChartTooltipLabel = label;
    }, 1000);
  };

  label.addEventListener("pointerenter", schedule);
  label.addEventListener("pointerleave", hideRightChartLabelTooltip);
  label.addEventListener("focus", schedule);
  label.addEventListener("blur", hideRightChartLabelTooltip);
  label.addEventListener("click", hideRightChartLabelTooltip);
  label.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      label.click();
    }
  });
}

function getRightChartRowsMap(containerId) {
  if (!rightChartRowsByContainer.has(containerId)) {
    rightChartRowsByContainer.set(containerId, new Map());
  }
  return rightChartRowsByContainer.get(containerId);
}

function upsertRightChartRow({ chartWrapper, containerId, name, allCats }) {
  const rowsMap = getRightChartRowsMap(containerId);
  let entry = rowsMap.get(name);
  if (entry && entry.rowEl?.isConnected) return entry;

  const row = document.createElement("div");
  row.className = "chart-bar-row";
  row.style.willChange = "transform";

  const label = document.createElement("span");
  label.className = "chart-bar-label";
  label.textContent = name;
  label.tabIndex = 0;
  label.setAttribute("role", "button");
  bindRightChartLabelTooltip(label);

  const bar = document.createElement("div");
  bar.className = "chart-bar";

  const value = document.createElement("span");
  value.className = "chart-bar-value";
  value.textContent = "0";

  row.appendChild(label);
  row.appendChild(bar);
  row.appendChild(value);
  chartWrapper.appendChild(row);

  const segElsByType = new Map();
  for (const cat of allCats) {
    const seg = document.createElement("div");
    seg.className = `chart-bar-segment chart-bar-fill chart-bar-fill-${getTypeSlugFromCategory(cat)}`;
    seg.style.width = "0%";
    seg.style.transition = "width 220ms ease";
    bar.appendChild(seg);
    segElsByType.set(cat, seg);
  }

  entry = { rowEl: row, labelEl: label, barEl: bar, valueEl: value, segElsByType };
  rowsMap.set(name, entry);
  return entry;
}

function animateReorderFLIPWithFirst(items, firstTopByEl) {
  requestAnimationFrame(() => {
    for (const it of items) {
      const row = it.rowEl;
      const firstTop = firstTopByEl.get(row);
      if (firstTop == null) continue;

      const lastTop = row.getBoundingClientRect().top;
      const dy = firstTop - lastTop;
      if (!dy) continue;

      row.style.transition = "none";
      row.style.transform = `translateY(${dy}px)`;

      requestAnimationFrame(() => {
        row.style.transition = "transform 220ms ease";
        row.style.transform = "translateY(0)";
      });
    }
  });
}

function renderOverviewStackedChart(groupBy, { containerId = "country-chart-container", showTabs = true } = {}) {
  const container = document.getElementById(containerId);
  const tabsEl = document.getElementById("country-chart-tabs");
  if (!container) return;

  const ui = UI_STRINGS[currentLang]?.ui;
  const configuredViews = new Set(REGLAGES.controles.statistiques.vues || ["zones", "emplacements"]);

  // boutons toggle "Oblasts / Villes"
  if (tabsEl && showTabs) {
    tabsEl.innerHTML = "";

    const btnOb = document.createElement("button");
    btnOb.className = "chart-tab-btn";
    btnOb.type = "button";
    btnOb.textContent = ui?.oblastsBtn ?? "Zones";
    btnOb.setAttribute("aria-pressed", groupBy === "oblasts" ? "true" : "false");
    if (groupBy === "oblasts") btnOb.classList.add("active");
    btnOb.addEventListener("click", () => {
      overviewMode = "oblasts";
      renderRightPanelBody();
      syncUtilityMenuState();
    });

    const btnVi = document.createElement("button");
    btnVi.className = "chart-tab-btn";
    btnVi.type = "button";
    btnVi.textContent = ui?.villesBtn ?? "Emplacements";
    btnVi.setAttribute("aria-pressed", groupBy === "villes" ? "true" : "false");
    if (groupBy === "villes") btnVi.classList.add("active");
    btnVi.addEventListener("click", () => {
      overviewMode = "villes";
      renderRightPanelBody();
      syncUtilityMenuState();
    });

    if (configuredViews.has("zones")) tabsEl.appendChild(btnOb);
    if (configuredViews.has("emplacements")) tabsEl.appendChild(btnVi);
  } else if (tabsEl && !showTabs) {
    tabsEl.innerHTML = "";
  }

  // cutoff à date + filtre villes si oblast filtré
  const startTime = getPlaybackWindowStartTime();
  const cutoffTime = playbackCutoffTime;
  const onlyOblast = (groupBy === "villes") ? statsSelectedOblast : null;


  const { rows, allCats } = buildStackedCountsByGroup({
    groupBy,
    onlyOblast,
    startTime,
    cutoffTime
  });

  if (!rows.length) {
    container.innerHTML = `<p class="chart-placeholder">${ui?.chartNoEvents ?? "Aucune donnée"}</p>`;
    return;
  }

  const MAX_ROWS = groupBy === "authors"
    ? REGLAGES.controles.statistiques.lignesMaximumAuteurs
    : groupBy === "villes"
      ? REGLAGES.controles.statistiques.lignesMaximumEmplacements
      : REGLAGES.controles.statistiques.lignesMaximumZones;
  const shown = rows.slice(0, MAX_ROWS);
  const maxTotal = shown[0]?.total || 1;
  const chartWrapper = getOrCreateRightChartWrapper(container);
  const rowsMap = getRightChartRowsMap(containerId);
  const usedNames = new Set();
  const rowEntries = [];
  const firstTopByEl = new Map();


  for (const { name } of shown) {
    const entry = upsertRightChartRow({ chartWrapper, containerId, name, allCats });
    entry.rowEl.style.display = ""; // visible
    usedNames.add(name);
    rowEntries.push(entry);
    firstTopByEl.set(entry.rowEl, entry.rowEl.getBoundingClientRect().top);
  }

  for (const [name, entry] of rowsMap.entries()) {
    if (!entry?.rowEl?.isConnected) continue;
    if (!usedNames.has(name)) {
      entry.rowEl.style.display = "none";
      entry.rowEl.style.order = "9999";
    }
  }

  shown.forEach(({ name, byType, total }, idx) => {
    const entry = rowsMap.get(name);
    if (!entry) return;

    entry.rowEl.style.order = String(idx);

    entry.rowEl.classList.toggle(
      "is-current-country",
      (groupBy === "oblasts" && statsSelectedOblast && name === statsSelectedOblast) ||
      (groupBy === "villes" && statsSelectedVille && name === statsSelectedVille) ||
      (groupBy === "authors" && statsSelectedAuthor && name === statsSelectedAuthor)
    );

    entry.valueEl.textContent = String(total);

    entry.labelEl.style.cursor = "pointer";
    entry.labelEl.onclick = () => {
      Playback.pause?.();

      if (groupBy === "oblasts") {
        setRightPanelView("regions");
        selectedOblast = name;
        selectedVille = null;
        statsSelectedOblast = name;
        statsSelectedVille = null;


        const input = document.getElementById("lieu-filter");
        if (input) input.value = name;

        villesDisponibles = Array.from(new Set(
          allEvents.filter(ev => getEventOblast(ev) === name).map(ev => ev.lieu)
        ))
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }));

        OblastFilters.initVilleDropdown();
        updateOblastPanel(name);
        setRightPanelExpanded(true);

        const ev0 = allEvents.find(ev => getEventOblast(ev) === name);
        if (ev0) highlightOblastForEvent?.(ev0);

        zoomToOblast(name);
        setPanelExpanded(true);
        afficherEvenements();
      } else if (groupBy === "authors") {
        selectedAuthor = name;
        statsSelectedAuthor = name;
        setRightPanelView("authors");
        setRightPanelExpanded(true);
        updateBottomChart(true);
        afficherEvenements();
        syncTitleFilterControls();
      } else {
        const ville = name;
        setRightPanelView("regions");

        const ev0 = allEvents.find(ev =>
          ev.lieu === ville && (!selectedOblast || getEventOblast(ev) === selectedOblast)
        );
        const ob = ev0 ? getEventOblast(ev0) : null;

        if (!ob) {
          selectedVille = ville;
          afficherEvenements();
          return;
        }

        selectedOblast = ob;
        selectedVille = ville;
        statsSelectedOblast = ob;
        statsSelectedVille = ville;


        const input = document.getElementById("lieu-filter");
        if (input) input.value = ob;

        villesDisponibles = Array.from(
          new Set(allEvents.filter(ev => getEventOblast(ev) === ob).map(ev => ev.lieu))
        )
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }));

        OblastFilters.initVilleDropdown();
        const select = document.getElementById("ville-select");
        if (select) select.value = ville;

        setPanelExpanded(true);
        updateOblastPanel(ob);
        setRightPanelExpanded(true);

        if (ev0) highlightOblastForEvent?.(ev0);
        afficherEvenements();

        if (Number.isFinite(ev0?.lat) && Number.isFinite(ev0?.lng) && map) {
          map.setView([ev0.lat, ev0.lng], 7, { animate: true });
        }
      }
    };

    const totalWidthPct = (total / maxTotal) * 100;
    for (const cat of allCats) {
      const v = byType[cat] || 0;
      const seg = entry.segElsByType.get(cat);
      if (!seg) continue;

      const segPct = (total > 0) ? (v / total) * totalWidthPct : 0;
      seg.style.width = `${segPct}%`;
      seg.style.display = v > 0 ? "block" : "none";
    }
  });

  animateReorderFLIPWithFirst(rowEntries, firstTopByEl);
}

function setStatsSelection({ oblast = null, ville = null, author = null } = {}) {
  statsSelectedOblast = oblast;
  statsSelectedVille = ville;
  statsSelectedAuthor = author;

  // panel droit : titre + graphs
  updateOblastPanel(oblast);

  // graphs (si ton updateOblastPanel appelle déjà renderOverviewStackedChart, tu peux enlever la ligne)
  // bottom chart : si ouvert, refresh immédiat
  if (BottomChart?.isOpen?.()) updateBottomChart(true);
}


/// === RENDU ÉVÉNEMENTS ===

function getTitleFilterLabel(key) {
  const labels = getUiStrings(currentLang).titleFilters || {};
  return labels[key] || key;
}

function populateTitleOblastSelect() {
  const select = document.getElementById("title-oblast-select");
  if (!select) return;

  const previous = selectedOblast || "";
  select.innerHTML = "";

  const optAll = document.createElement("option");
  optAll.value = "";
  optAll.textContent = getTitleFilterLabel("allAreas");
  select.appendChild(optAll);

  (oblastsDisponibles || []).forEach(oblast => {
    const opt = document.createElement("option");
    opt.value = oblast;
    opt.textContent = oblast;
    select.appendChild(opt);
  });

  select.value = (oblastsDisponibles || []).includes(previous) ? previous : "";
}

function getAvailableAuthors() {
  return Array.from(new Set((allEvents || []).map(ev => getEventAuthor(ev))))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }));
}

function populateTitleAuthorSelect(authors = getAvailableAuthors()) {
  const select = document.getElementById("title-author-select");
  if (!select) return;

  const previous = selectedAuthor || "";
  select.innerHTML = "";

  const optAll = document.createElement("option");
  optAll.value = "";
  optAll.textContent = getTitleFilterLabel("allAuthors");
  select.appendChild(optAll);

  (authors || []).forEach(author => {
    const opt = document.createElement("option");
    opt.value = author;
    opt.textContent = author;
    select.appendChild(opt);
  });

  select.value = (authors || []).includes(previous) ? previous : "";
}

function syncSupplementFilterButtons() {
  document.querySelectorAll("[data-supplement-filter]").forEach(btn => {
    const key = btn.dataset.supplementFilter;
    const active = activeSupplementFilters.has(key);
    btn.textContent = getSupplementLabel(key);
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

function buildSupplementFilterButtons() {
  const container = document.getElementById("title-supplement-filters");
  if (!container) return;

  const filters = featureEnabled("filtresAdditionnels")
    ? (REGLAGES.filtresAdditionnels || []).filter(filter => filter.enabled !== false)
    : [];
  container.replaceChildren();
  container.hidden = filters.length === 0;

  for (const filter of filters) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.supplementFilter = filter.id;
    button.addEventListener("click", () => toggleSupplementFilter(filter.id));
    container.appendChild(button);
  }

  syncSupplementFilterButtons();
}

function buildRelatedMaps() {
  const grid = document.getElementById("rsf-cartography-grid");
  if (!grid) return;
  grid.replaceChildren();

  for (const relatedMap of REGLAGES.cartesLiees || []) {
    const link = document.createElement("a");
    link.className = "rsf-cartography-link";
    const safeHref = getSafeHttpUrl(relatedMap.href);
    if (safeHref) link.href = safeHref;
    else { link.removeAttribute("href"); link.hidden = true; }
    link.target = "_blank";
    link.rel = "noopener noreferrer";

    const image = document.createElement("img");
    image.src = withV(relatedMap.image);
    image.alt = "";
    image.loading = "lazy";

    const label = document.createElement("span");
    label.textContent = relatedMap.labels?.[currentLang] || relatedMap.labels?.[DEFAULT_LANGUAGE] || "";
    link.append(image, label);
    grid.appendChild(link);
  }
}

function getTitleCalendarLabel(key) {
  return getTitleFilterLabel(key);
}

function isPlaybackWindowDefault() {
  const startTime = getPlaybackWindowStartTime();
  const endTime = getPlaybackWindowEndTime();
  return Number.isFinite(startTime) &&
    Number.isFinite(endTime) &&
    startOfDayUTC(startTime) === startOfDayUTC(PLAYBACK_START_TIME) &&
    startOfDayUTC(endTime) >= startOfDayUTC(getPlaybackTimelineMaxTime());
}

function syncTitleCalendarControls() {
  const startInput = document.getElementById("title-calendar-start");
  const endInput = document.getElementById("title-calendar-end");
  const startControl = document.getElementById("title-calendar-start-button");
  const endControl = document.getElementById("title-calendar-end-button");
  const startLabel = document.getElementById("title-calendar-start-label");
  const endLabel = document.getElementById("title-calendar-end-label");
  if (!startInput && !endInput && !startControl && !endControl) return;

  const startTime = getPlaybackWindowStartTime();
  const endTime = getPlaybackWindowEndTime();
  const minValue = formatDateInputValue(PLAYBACK_START_TIME);
  const maxValue = formatDateInputValue(getPlaybackTimelineMaxTime());
  const startValue = formatDateInputValue(startTime);
  const endValue = formatDateInputValue(endTime);
  const startIsDefault = startOfDayUTC(startTime) === startOfDayUTC(PLAYBACK_START_TIME);
  const endIsDefault = startOfDayUTC(endTime) >= startOfDayUTC(getPlaybackTimelineMaxTime());

  if (startLabel) startLabel.textContent = getTitleCalendarLabel("calendarStart");
  if (endLabel) endLabel.textContent = getTitleCalendarLabel("calendarEnd");

  if (startInput) {
    startInput.min = minValue;
    startInput.max = endValue || maxValue;
    startInput.value = startValue;
    startInput.title = formatDateFR(startTime);
  }

  if (startControl) {
    startControl.title = formatDateFR(startTime);
    startControl.setAttribute("aria-label", `${getTitleCalendarLabel("calendarStart")} ${formatDateFR(startTime)}`);
  }

  if (endInput) {
    endInput.min = startValue || minValue;
    endInput.max = maxValue;
    endInput.value = endValue;
    endInput.title = formatDateFR(endTime);
  }

  if (endControl) {
    endControl.title = formatDateFR(endTime);
    endControl.setAttribute("aria-label", `${getTitleCalendarLabel("calendarEnd")} ${formatDateFR(endTime)}`);
  }

  startControl?.classList.toggle("active", !startIsDefault);
  endControl?.classList.toggle("active", !endIsDefault);
}

function openTitleDateInput(input) {
  if (!input) return;

  if (input.type !== "date") input.type = "date";
  input.focus({ preventScroll: true });

  if (typeof input.showPicker === "function") {
    try {
      input.showPicker();
      return;
    } catch (err) {
      // showPicker can fail for visually hidden inputs; click fallback below.
    }
  }

  input.click();
}

function applyTitleCalendarInputs() {
  const startInput = document.getElementById("title-calendar-start");
  const endInput = document.getElementById("title-calendar-end");

  const nextStart = parseDateInputValue(startInput?.value);
  const nextEnd = parseDateInputValue(endInput?.value, { endOfDayValue: true });

  if (Number.isFinite(nextStart)) setPlaybackWindowStartFromTimeline(nextStart);
  if (Number.isFinite(nextEnd)) setPlaybackCutoffFromTimeline(nextEnd);

  afficherEvenements();
  renderRightPanelBody();
  updateBottomChart(true);
  syncTitleFilterControls();
}

function resetPlaybackWindowToDefault() {
  playbackWindowStartTime = PLAYBACK_START_TIME;
  setPlaybackCutoffFromTimeline(getPlaybackTimelineMaxTime());
}

function syncTitleFilterControls() {
  const oblastSelect = document.getElementById("title-oblast-select");
  if (oblastSelect && oblastSelect.value !== (selectedOblast || "")) {
    oblastSelect.value = selectedOblast || "";
  }

  populateTitleAuthorSelect();
  const authorSelect = document.getElementById("title-author-select");
  if (authorSelect && authorSelect.value !== (selectedAuthor || "")) {
    authorSelect.value = selectedAuthor || "";
  }

  syncSupplementFilterButtons();
  syncTitleCalendarControls();

  const villeSelect = document.getElementById("ville-select");
  syncTitleClearButton();
  if (!villeSelect) return;

  const hasOblast = Boolean(selectedOblast);
  if (!hasOblast && selectedVille) {
    selectedVille = null;
    statsSelectedVille = null;
  }

  const villes = hasOblast
    ? (villesDisponibles.length ? villesDisponibles : getVillesForOblast(selectedOblast))
    : getAllVilles();

  if (selectedVille && !villes.includes(selectedVille)) {
    selectedVille = null;
    statsSelectedVille = null;
  }

  populateTitleVilleSelect(villes);
  villeSelect.classList.remove("hidden");
  villeSelect.disabled = !hasOblast;
  villeSelect.classList.toggle("is-muted", !hasOblast);
  villeSelect.setAttribute("aria-disabled", hasOblast ? "false" : "true");
  villeSelect.title = hasOblast
    ? ""
    : getTitleFilterLabel("selectAreaFirst");
  syncTitleClearButton();
}

function populateTitleVilleSelect(villes) {
  const select = document.getElementById("ville-select");
  if (!select) return;

  const previous = selectedVille || "";
  select.innerHTML = "";

  const optAll = document.createElement("option");
  optAll.value = "";
  optAll.textContent = getTitleFilterLabel("allLocations");
  select.appendChild(optAll);

  (villes || []).forEach(ville => {
    const opt = document.createElement("option");
    opt.value = ville;
    opt.textContent = ville;
    select.appendChild(opt);
  });

  select.value = (villes || []).includes(previous) ? previous : "";
  select.onchange = () => {
    Playback.pause?.();
    selectedVille = select.value || null;
    statsSelectedVille = selectedVille;

    afficherEvenements();

    if (!selectedVille || !map) return;
    const ev0 = allEvents.find(ev =>
      ev.lieu === selectedVille && (!selectedOblast || getEventOblast(ev) === selectedOblast)
    );
    if (ev0 && Number.isFinite(ev0.lat) && Number.isFinite(ev0.lng)) {
      map.setView([ev0.lat, ev0.lng], 7, { animate: true });
    }
  };
}

function getVillesForOblast(oblast) {
  return Array.from(
    new Set(
      allEvents
        .filter(ev => getEventOblast(ev) === oblast)
        .map(ev => ev.lieu)
    )
  )
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }));
}

function getAllVilles() {
  return Array.from(new Set((allEvents || []).map(ev => ev.lieu)))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }));
}

function getAllEventTypes() {
  return Array.from(new Set((allEvents || []).map(ev => ev.type_violence))).filter(Boolean);
}

function updateFloatingSubtitleFromData() {
  const subtitleEl = document.getElementById("floating-subtitle");
  if (!subtitleEl || !allEvents.length) return;

  if (REGLAGES.projet.resumeDynamique?.enabled === false) {
    subtitleEl.textContent = getUiStrings(currentLang).floatingSubtitle || "";
    return;
  }

  const years = allEvents
    .map(ev => {
      const t = getEventTime(ev);
      return Number.isFinite(t) ? new Date(t).getUTCFullYear() : null;
    })
    .filter(Number.isFinite);

  const startYear = years.length ? Math.min(...years) : null;
  const endYear = years.length ? Math.max(...years) : null;
  const ui = getUiStrings(currentLang);
  const template = startYear && endYear
    ? ui.floatingSubtitleSummary
    : ui.floatingSubtitleSummaryNoPeriod;
  let summary = String(template || ui.floatingSubtitle || "")
    .replace("{startYear}", startYear ?? "")
    .replace("{endYear}", endYear ?? "")
    .replace("{total}", allEvents.length);
  for (const counter of REGLAGES.projet.resumeDynamique?.compteurs || []) {
    const count = allEvents.filter(ev => ev.type_violence === counter.categorie).length;
    summary = summary.replace(`{${counter.placeholder}}`, count);
  }
  subtitleEl.textContent = summary;
}

function hasActiveTitleFilters() {
  const allTypeCount = getAllEventTypes().length;
  const allTypesSelected = allTypeCount === 0 || selectedTypes.size === 0 || selectedTypes.size === allTypeCount;
  return Boolean(selectedOblast || selectedVille || selectedAuthor || activeSupplementFilters.size || !isPlaybackWindowDefault()) || !allTypesSelected;
}

function syncTitleClearButton() {
  const clearBtn = document.getElementById("title-clear-filters");
  if (clearBtn) {
    clearBtn.hidden = REGLAGES.controles.panneauTitre.afficherEffacerFiltres === false || !hasActiveTitleFilters();
  }
}

function applyTitleOblastFilter(oblast) {
  Playback.pause?.();

  setRightPanelView("regions");
  selectedOblast = oblast || null;
  selectedVille = null;
  statsSelectedOblast = selectedOblast;
  statsSelectedVille = null;
  villesDisponibles = selectedOblast ? getVillesForOblast(selectedOblast) : [];

  if (selectedOblast) {
    updateOblastPanel(selectedOblast);
    setRightPanelExpanded(true);
    const ev0 = allEvents.find(ev => getEventOblast(ev) === selectedOblast);
    if (ev0) highlightOblastForEvent(ev0);
    zoomToOblast(selectedOblast);
  } else {
    OblastFilters.clearFiltersPreservePlayback({ resetZoom: false });
  }

  afficherEvenements();
  syncTitleFilterControls();
}

function applyTitleAuthorFilter(author) {
  Playback.pause?.();

  selectedAuthor = author || null;
  statsSelectedAuthor = selectedAuthor;

  if (selectedAuthor) {
    setRightPanelView("authors");
    setRightPanelExpanded(true);
  } else if (rightPanelView === "authors") {
    updateAuthorPanelHeading();
    renderRightPanelBody();
  }

  afficherEvenements();
  updateBottomChart(true);
  syncTitleFilterControls();
}

function toggleSupplementFilter(key) {
  if (!SUPPLEMENT_FILTERS[key]) return;
  Playback.pause?.();

  if (activeSupplementFilters.has(key)) activeSupplementFilters.delete(key);
  else activeSupplementFilters.add(key);

  syncTitleFilterControls();
  afficherEvenements();
  renderRightPanelBody();
  updateBottomChart(true);
}

function applyInterfaceSettings() {
  document.title = REGLAGES.projet.titreHtml;
  const robots = document.querySelector('meta[name="robots"]');
  if (robots) robots.content = REGLAGES.projet.indexationMoteurs ? "index, follow" : "noindex, nofollow";

  const favicon = document.querySelector('link[rel="icon"]');
  if (favicon) favicon.href = withV(FILES.assets.favicon);
  const stylesheet = document.getElementById("app-stylesheet");
  if (stylesheet && FILES.assets.feuilleDeStyle) stylesheet.href = withV(FILES.assets.feuilleDeStyle);
  document.querySelectorAll(".floating-logo img").forEach(image => { image.src = withV(FILES.assets.logo); });

  const panelControls = REGLAGES.controles.panneauTitre;
  const titlePanel = document.getElementById("floating-controls");
  titlePanel?.classList.toggle("collapsed", panelControls.ouvertParDefaut === false);
  document.getElementById("map-title-toggle")?.setAttribute("aria-expanded", panelControls.ouvertParDefaut === false ? "false" : "true");
  document.getElementById("title-oblast-select")?.toggleAttribute("hidden", panelControls.afficherZone === false);
  document.getElementById("ville-select")?.toggleAttribute("hidden", panelControls.afficherEmplacement === false);
  document.getElementById("title-author-select")?.toggleAttribute("hidden", panelControls.afficherAuteur === false || !featureEnabled("auteurs"));
  document.getElementById("title-date-filters")?.toggleAttribute("hidden", panelControls.afficherDates === false);
  document.getElementById("header-legend")?.toggleAttribute("hidden", panelControls.afficherCategories === false);

  const featureSelectors = {
    listeCas: ["#utility-events-toggle", "#event-panel"],
    statistiques: ["#utility-country-toggle", "#country-panel"],
    auteurs: ["#utility-authors-toggle"],
    chronologie: ["#utility-chart-toggle", "#bottom-chart-panel"],
    tutoriel: ["#tutorial-replay-btn", "#tutorial-overlay"],
    langues: [".utility-menu-field"],
    rsfCartographie: ["#rsf-cartography-toggle", "#rsf-cartography-modal"],
    choropleth: ["#utility-regions-mode-toggle"]
  };
  for (const [feature, selectors] of Object.entries(featureSelectors)) {
    for (const selector of selectors) {
      document.querySelector(selector)?.toggleAttribute("hidden", !featureEnabled(feature));
    }
  }

  document.getElementById("title-playback-controls")?.toggleAttribute("hidden", !featureEnabled("lecture"));
  const playbackControls = REGLAGES.controles.lecture;
  document.getElementById("playback-prev")?.toggleAttribute("hidden", playbackControls.afficherPrecedent === false);
  document.getElementById("playback-toggle")?.toggleAttribute("hidden", playbackControls.afficherLecturePause === false);
  document.getElementById("playback-next")?.toggleAttribute("hidden", playbackControls.afficherSuivant === false);
  document.getElementById("playback-end")?.toggleAttribute("hidden", playbackControls.afficherFin === false);

  const speed = document.getElementById("playback-speed");
  if (speed) {
    speed.replaceChildren();
    for (const value of playbackControls.vitesses || [1]) {
      const option = document.createElement("option");
      option.value = String(value);
      option.textContent = `${value}x`;
      option.selected = Number(value) === Number(playbackControls.vitesseParDefaut);
      speed.appendChild(option);
    }
  }

  const utilityPanel = document.getElementById("utility-menu-panel");
  const menuElements = {
    langues: document.querySelector(".utility-menu-field"),
    tutoriel: document.getElementById("tutorial-replay-btn"),
    listeCas: document.getElementById("utility-events-toggle"),
    choropleth: document.getElementById("utility-regions-mode-toggle"),
    statistiques: document.getElementById("utility-country-toggle"),
    auteurs: document.getElementById("utility-authors-toggle"),
    chronologie: document.getElementById("utility-chart-toggle"),
    rsfCartographie: document.getElementById("rsf-cartography-toggle")
  };
  for (const key of REGLAGES.controles.menu.ordre || []) {
    if (menuElements[key]) utilityPanel?.appendChild(menuElements[key]);
  }

  buildSupplementFilterButtons();
  buildRelatedMaps();
}

function clearTitleFilters({ resetZoom = false } = {}) {
  Playback.pause?.();

  selectedOblast = null;
  selectedVille = null;
  selectedAuthor = null;
  statsSelectedOblast = null;
  statsSelectedVille = null;
  statsSelectedAuthor = null;
  villesDisponibles = [];
  selectedTypes = new Set(allEvents.map(ev => ev.type_violence));
  activeSupplementFilters.clear();
  resetPlaybackWindowToDefault();
  BottomChart.resetZoom?.();

  OblastFilters.clearFiltersPreservePlayback({ resetZoom });
  clearOblastHighlight();
  lastHighlightedOblast = null;
  setRightPanelView("regions");
  updateOblastPanel(null);
  LegendUI.syncHeaderLegendSelection?.();
  LegendUI.syncMenuLegendFromSelection?.();

  afficherEvenements();
  syncTitleFilterControls();
}

function initRsfCartographyModal() {
  const trigger = document.getElementById("rsf-cartography-toggle");
  const modal = document.getElementById("rsf-cartography-modal");
  const closeButton = document.getElementById("rsf-cartography-close");
  if (!trigger || !modal) return;

  const closeModal = () => {
    modal.hidden = true;
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
  };

  const openModal = () => {
    const utilityMenu = document.getElementById("utility-menu");
    const utilityPanel = document.getElementById("utility-menu-panel");
    const utilityToggle = document.getElementById("utility-menu-toggle");
    utilityMenu?.classList.remove("open");
    if (utilityPanel) utilityPanel.hidden = true;
    utilityToggle?.setAttribute("aria-expanded", "false");

    modal.hidden = false;
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
    closeButton?.focus();
  };

  trigger.addEventListener("click", openModal);
  modal.querySelectorAll("[data-close-rsf-cartography]").forEach(button => {
    button.addEventListener("click", closeModal);
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !modal.hidden) closeModal();
  });
}

function initHarmonizedShell() {
  initPanelScrollProgress({ getLanguage: () => currentLang });
  const titlePanel = document.getElementById("floating-controls");
  const titleToggle = document.getElementById("map-title-toggle");
  const oblastSelect = document.getElementById("title-oblast-select");
  const authorSelect = document.getElementById("title-author-select");
  const calendarStartButton = document.getElementById("title-calendar-start-button");
  const calendarEndButton = document.getElementById("title-calendar-end-button");
  const calendarStart = document.getElementById("title-calendar-start");
  const calendarEnd = document.getElementById("title-calendar-end");
  const clearBtn = document.getElementById("title-clear-filters");

  const toggleTitle = () => {
    if (!titlePanel || !titleToggle) return;
    titlePanel.classList.toggle("collapsed");
    titleToggle.setAttribute("aria-expanded", titlePanel.classList.contains("collapsed") ? "false" : "true");
  };

  titleToggle?.addEventListener("click", toggleTitle);
  titleToggle?.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleTitle();
    }
  });

  oblastSelect?.addEventListener("change", () => applyTitleOblastFilter(oblastSelect.value));
  authorSelect?.addEventListener("change", () => applyTitleAuthorFilter(authorSelect.value));
  calendarStartButton?.addEventListener("click", (event) => {
    event.preventDefault();
    openTitleDateInput(calendarStart);
  });
  calendarEndButton?.addEventListener("click", (event) => {
    event.preventDefault();
    openTitleDateInput(calendarEnd);
  });
  calendarStartButton?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openTitleDateInput(calendarStart);
  });
  calendarEndButton?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openTitleDateInput(calendarEnd);
  });
  calendarStart?.addEventListener("change", applyTitleCalendarInputs);
  calendarEnd?.addEventListener("change", applyTitleCalendarInputs);
  clearBtn?.addEventListener("click", () => clearTitleFilters({ resetZoom: false }));


  document.getElementById("utility-events-toggle")?.addEventListener("click", () => setPanelExpanded("toggle"));
  document.getElementById("utility-regions-mode-toggle")?.addEventListener("click", () => setRegionsMode(!regionsModeActive));
  document.getElementById("utility-country-toggle")?.addEventListener("click", openRegionsPanelFromMenu);
  document.getElementById("utility-authors-toggle")?.addEventListener("click", openAuthorsPanelFromMenu);
  document.getElementById("utility-chart-toggle")?.addEventListener("click", () => {
    BottomChart.toggle(updateBottomChart);
    syncUtilityMenuState();
  });
  document.getElementById("close-event-panel")?.addEventListener("click", () => setPanelExpanded(false));
  document.getElementById("close-country-panel")?.addEventListener("click", () => setRightPanelExpanded(false));
  document.getElementById("close-bottom-chart")?.addEventListener("click", () => {
    BottomChart.hide();
    syncUtilityMenuState();
  });
  initRsfCartographyModal();
  syncUtilityMenuState();
}

function afficherEvenements({ renderGeography = true } = {}) {
  EventsRenderer.render({
    allEvents,
    selectedTypes,
    selectedOblast,
    selectedVille,
    selectedAuthor,
    playbackWindowStartTime: getPlaybackWindowStartTime(),
    playbackCutoffTime,
    currentLang,

    getEventTime,
    getEventOblast,
    getEventAuthor,
    getEventMedia,
    getEventStatus,
    getEventComment,
    hasTortureAllegation,
    eventMatchesSupplementFilters,
    getEventSupplementBadges,
    startOfDayUTC,
    formatDateFR,
    buildEventId,
    normalizeType,

    getDisplayLabelForType: (type) => getDisplayLabelForType(type, currentLang),
    getUiStrings,

    createMarkerIcon,
    getLegendIconUrl,

    pausePlayback: Playback.pause,
    focusEvent,
    setRightPanelExpanded,
    updateHeaderLegendCounts: LegendUI.updateHeaderLegendCounts,
    updateBottomChart,
    caseFields: REGLAGES.listeCas?.champsSupplementaires || [],
    attachToMap: !regionsModeActive || Boolean(selectedOblast)


  });

  if (renderGeography && regionsModeActive) renderRegionsChoroplethLayer().catch(showLoadingError);
  else if (renderGeography) clearRegionsChoroplethLayer();

  if (document.getElementById("country-chart-container") || document.getElementById("authors-chart-container")) {
    renderRightPanelBody();
  }

  OccupationCtrl?.setForTime(playbackCutoffTime);

  const occ = OccupationCtrl?.getCurrent?.();
  if (occ?.date) {
    OccupationLegend?.setDate(formatOccupationDate(occ.date));
  }

  syncTitleFilterControls();
  nearbyNavigator?.refresh();
}

function formatOccupationDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));

  return currentLang === "fr"
    ? dt.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })
    : dt.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
}



/// === PLAYBACK (state + module) ===

const PLAYBACK_START_DATE_STR = REGLAGES.lecture.dateDebut;
const PLAYBACK_END_DATE_STR = REGLAGES.lecture.dateFin;
const PLAYBACK_END_TIME = PLAYBACK_END_DATE_STR
  ? endOfDay(parseDateFlexible(PLAYBACK_END_DATE_STR)?.getTime())
  : null;
const PLAYBACK_START_TIME =
  parseDateFlexible(PLAYBACK_START_DATE_STR)?.getTime() || Date.UTC(2025, 0, 1);

const PLAYBACK_CUES = REGLAGES.lecture.reperes || [];

let playbackActive = false;
let playbackSpeed = Number(REGLAGES.controles.lecture.vitesseParDefaut) || 1;
let playbackTimer = null;
let playbackSequence = [];
let playbackIndex = -1;
let playbackWindowStartTime = PLAYBACK_START_TIME;
let playbackCutoffTime = null;

function getPlaybackState() {
  return {
    allEvents,
    playbackActive,
    playbackSpeed,
    playbackTimer,
    playbackSequence,
    playbackIndex,
    playbackWindowStartTime,
    playbackCutoffTime
  };
}

function setPlaybackState(patch) {
  if ("playbackActive" in patch) playbackActive = patch.playbackActive;
  if ("playbackSpeed" in patch) playbackSpeed = patch.playbackSpeed;
  if ("playbackTimer" in patch) playbackTimer = patch.playbackTimer;
  if ("playbackSequence" in patch) playbackSequence = patch.playbackSequence;
  if ("playbackIndex" in patch) playbackIndex = patch.playbackIndex;
  if ("playbackWindowStartTime" in patch) playbackWindowStartTime = patch.playbackWindowStartTime;
  if ("playbackCutoffTime" in patch) playbackCutoffTime = patch.playbackCutoffTime;
}

function ensurePlaybackToast() {
  let el = document.getElementById("playback-toast");
  if (el) return el;

  el = document.createElement("div");
  el.id = "playback-toast";
  el.className = "playback-toast hidden";
  el.innerHTML = `
    <div class="playback-toast-inner">
      <div class="playback-toast-header">
        <div class="playback-toast-title"></div>
        <div class="playback-toast-date"></div>
      </div>
      <div class="playback-toast-body"></div>
    </div>
  `;
  document.body.appendChild(el);
  return el;
}

let toastTimer = null;

function showPlaybackMessage({ title, dateLabel, body, durationMs = 7600 }) {
  const toast = ensurePlaybackToast();
  if (!toast) return;

  const tEl = toast.querySelector(".playback-toast-title");
  const dEl = toast.querySelector(".playback-toast-date");
  const bEl = toast.querySelector(".playback-toast-body");

  if (tEl) tEl.textContent = title || "";
  if (dEl) dEl.textContent = dateLabel ? `— ${dateLabel}` : "";
  if (bEl) bEl.textContent = body || "";

  toast.classList.remove("hidden");
  toast.classList.add("show");

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.classList.add("hidden"), 250);
  }, durationMs);
}

const Playback = createPlayback({
  getState: getPlaybackState,
  setState: setPlaybackState,
  PLAYBACK_START_TIME,
  PLAYBACK_START_DATE_STR,
  PLAYBACK_END_TIME,
  PLAYBACK_END_DATE_STR,
  EXTRA_MAX_TIMES: OCCUPATION_MAX_TIMES,
  getEventTime,
  startOfDay,
  endOfDay,
  formatDateFR,
  getWindowStartTime: getPlaybackWindowStartTime,
  buildEventId,
  render: afficherEvenements,

  contextCues: PLAYBACK_CUES,
  parseDateFlexible,
  onContextCue: ({ key, durationMs, ts }) => {
    const dict = UI_STRINGS[currentLang]?.playbackMessages || {};
    const title = dict[`${key}_title`] || "";
    const body = dict[`${key}_body`] || "";
    if (!title && !body) return;

    const dateLabel = ts ? formatDateFR(ts) : "";
    showPlaybackMessage({ title, dateLabel, body, durationMs });
  }
});


/// === TUTORIEL (module) ===

const Tutorial = createTutorial({
  getState: () => ({ currentLang, allEvents }),
  getEventOblast,
  setPanelExpanded,
  setRightPanelExpanded,
  updateOblastPanel,
  highlightOblastForEvent,
  clearOblastHighlight,
  render: afficherEvenements,
  UI_STRINGS,

  showBottomChart: () => BottomChart.show(updateBottomChart),
  hideBottomChart: () => BottomChart.hide(),
  updateBottomChart: () => updateBottomChart(true)
});


/// === DATA LOADERS ===

async function loadEventsForLang(lang) {
  if (dataByLang[lang]) return dataByLang[lang];

  const base = FILES.donnees[lang] || FILES.donnees[DEFAULT_LANGUAGE] || FILES.donnees.fr;
  const resp = await fetch(withV(base));
  if (!resp.ok) throw new Error(`Erreur de chargement ${base} : ${resp.status}`);

  const data = validateEvents(await resp.json(), REGLAGES.champsDonnees);

  data.forEach((ev, index) => {
    ev.date = getFirstConfiguredValue(ev, DATA_FIELDS.date) || "";
    ev.lieu = getFirstConfiguredValue(ev, DATA_FIELDS.emplacement) || "";
    ev.journaliste = getFirstConfiguredValue(ev, DATA_FIELDS.personne) || `Cas ${index + 1}`;
    ev.description = getLocalizedEventDescription(ev, lang);
    const rawType = getFirstConfiguredValue(ev, DATA_FIELDS.categorie) || REGLAGES.categorieParDefaut;
    ev.type_violence_original = rawType;
    ev.type_violence = normalizeEventType(rawType);
    ev.compteur_evenements = getFirstConfiguredValue(ev, DATA_FIELDS.identifiant) || index + 1;
    ev.auteur = normalizeAuthorName(getFirstConfiguredValue(ev, DATA_FIELDS.auteur)) || "";
    ev.media = getEventMedia(ev) || "";
    ev.statut_evenement = getEventStatus(ev) || "";
    ev.allegations_torture = hasTortureAllegation(ev);
    ev.lien = getFirstConfiguredValue(ev, DATA_FIELDS.lien) || "";

    const lat = getFirstConfiguredValue(ev, DATA_FIELDS.latitude);
    const lng = getFirstConfiguredValue(ev, DATA_FIELDS.longitude);
    ev.lat = parseCoordinate(lat, 90);
    ev.lng = parseCoordinate(lng, 180);

    const region = normalizeRegionName(getFirstConfiguredValue(ev, DATA_FIELDS.zone));
    if (region) {
      ev.Oblast = region;
      ev.Region = region;
    }

    const shapeName = getEventGeojsonName(ev);
    if (shapeName && !ev.Geojson) ev.Geojson = shapeName;
  });

  dataByLang[lang] = data;
  return data;
}


/// === LANGUE ===

let languageChangeSequence = 0;
async function setLanguage(lang) {
  const sequence = ++languageChangeSequence;
  if (!(REGLAGES.projet.langues || []).includes(lang)) return;
  if (lang === currentLang) return;

  Playback.pause();
  let nextEvents;
  try { nextEvents = await loadEventsForLang(lang); }
  catch (error) { console.error("Changement de langue impossible", error); return; }
  if (sequence !== languageChangeSequence) return;
  Playback.stop(true);

  currentLang = lang;
  geojsonLevelsController?.setLanguage(currentLang);
  allEvents = nextEvents;
  refreshBasemapControl();
  OccupationLegend?.update();

  selectedTypes = new Set(Object.keys(TYPE_CONFIG));
  selectedAuthor = null;
  statsSelectedAuthor = null;

  oblastsDisponibles = OblastFilters.buildOblastListFromEvents(allEvents);
  OblastFilters.setOblastsList(oblastsDisponibles);
  populateTitleOblastSelect();
  populateTitleAuthorSelect();
  OblastFilters.clearFiltersPreservePlayback({ resetZoom: false });

  LegendUI.init({
    getState: getAppState,
    getLegendIconUrl,
    getDisplayLabelForType: (type) => getDisplayLabelForType(type, currentLang),
    pausePlayback: Playback.pause,
    render: afficherEvenements
  });
  LegendUI.buildMenuLegend();
  LegendUI.initHeaderLegend();
  ensureRightPanelLegend({ onChange: () => renderRightPanelBody() });

  Playback.buildPlaybackSequence();
  updatePlaybackDateUI();

  afficherEvenements();
  applyStaticTextsForLang(lang);
  buildSupplementFilterButtons();
  buildRelatedMaps();
  updateFloatingSubtitleFromData();
  setRightPanelView(rightPanelView, { force: true });
  syncTitleFilterControls();
}

/// === LOADING OVERLAY ===

let loadingProgress = 0;
let loadingOverlayDone = false;

function setLoadingProgress(pct) {
  const bar = document.getElementById("loading-bar-fill");
  if (!bar) return;
  loadingProgress = Math.max(loadingProgress, Math.min(100, pct));
  bar.style.width = loadingProgress + "%";
}

function hideLoadingOverlay() {
  if (loadingOverlayDone) return;
  loadingOverlayDone = true;
  const overlay = document.getElementById("loading-overlay");
  if (!overlay) return;
  // Laisse la barre atteindre 100 % avant le fondu de l'unique loader.
  setTimeout(() => {
    overlay.classList.add("is-complete");
    setTimeout(() => overlay.remove(), 400);
  }, 400);
}

function showLoadingError(error) {
  console.error("Impossible de terminer le chargement de la carte", error);
  const strings = UI_STRINGS[currentLang].loader;
  const subtext = document.querySelector(".loading-subtext");
  if (subtext) subtext.textContent = strings.error;
  const retry = document.getElementById("loading-retry");
  if (retry) retry.hidden = false;
}

function setTheme(fond) {
  applyBasemapTheme(fond);
  if (allEvents.length) updateBottomChart(true);
}

function refreshBasemapControl() {
  if (basemapControl) { map.removeControl(basemapControl); basemapControl = null; }
  if (!map || basemapEntries.length < 2) return;
  basemapControl = createBasemapControl({ L, map, entries: basemapEntries, lang: currentLang });
}

async function zoomToOblast(oblastName) {
  if (!map || !oblastName) return;

  const data = await loadOblastsGeojson();
  if (!data) return;

  const shapeName = getShapeNameForSelectedOblast(oblastName);
  if (!shapeName) return;

  const feature = (data.features || []).find(f => (
    f?.properties?.shapeName ||
    f?.properties?.name ||
    f?.properties?.region ||
    ""
  ) === shapeName);
  if (!feature) return;

  const bounds = L.geoJSON(feature).getBounds();
  if (!bounds?.isValid?.() || !bounds.isValid()) return;

  map.fitBounds(bounds, { padding: [30, 30], maxZoom: MAP_SETTINGS.zoomSurZone, animate: true });
}

/// === INIT MAP ===

async function initMap() {
  const initialBasemap = validateBasemaps(MAP_SETTINGS.fonds);
  setTheme(initialBasemap);
  setLoadingProgress(10);
  applyStaticTextsForLang(currentLang);

  map = L.map("map", {
    crs: MAP_CRS,
    minZoom: MIN_ZOOM,
    maxZoom: MAX_ZOOM,
    zoomSnap: MAP_SETTINGS.zoomSnap,
    zoomDelta: MAP_SETTINGS.zoomDelta,
    wheelPxPerZoomLevel: MAP_SETTINGS.wheelPxPerZoomLevel,
    scrollWheelZoom: MAP_SETTINGS.scrollWheelZoom,
    zoomControl: false
  }).setView(INITIAL_CENTER, INITIAL_ZOOM);
  geojsonRenderer = createGeojsonRenderer({ L, getMaplibreMap: () => activeBasemap?.getMaplibreMap?.() || null, defaultStyle: REGLAGES.stylesGeojson.defaut });
  geojsonLevelsController = createGeojsonLevelsController({ map, L, createGeojsonLayer: geojsonRenderer.createLayer, levels: FILES.geojson.niveauxAdministratifs, defaultStyle: REGLAGES.stylesGeojson?.niveauxAdministratifs, loadGeoJSON: async file => {
    const response = await fetch(withV(file));
    if (!response.ok) throw new Error(`GeoJSON ${file}: HTTP ${response.status}`);
    return response.json();
  }, lang: currentLang });
  L.control.zoom({ position: "topleft" }).addTo(map);

  // Panes Leaflet (ordre d'empilement)
  if (featureEnabled("occupationLayer") && OCCUPATION_FILES.length) {
    map.createPane("pane-occupation");
    map.getPane("pane-occupation").style.zIndex = 200;
  }

  map.createPane("pane-events");
  map.getPane("pane-events").style.zIndex = 600;  // au-dessus de tout si tu veux


  if (featureEnabled("occupationLayer") && OCCUPATION_FILES.length) {
    OccupationLegend = createOccupationLegend({
      getLang: () => currentLang,
      getStrings: () => UI_STRINGS,
      typesConfig: OCCUPATION_TYPES
    });
    OccupationLegend.mount(map);
  }

  EventsRenderer.init({ leafletMap: map });

  if (featureEnabled("navigationProche")) {
    nearbyNavigator = createNearbyNavigator({
      L, map,
      settings: FEATURES.navigationProche,
      getClusterGroup: () => EventsRenderer.getClusterGroup(),
      isEnabled: () => !regionsModeActive,
      getLang: () => currentLang,
      getStrings: () => getUiStrings(currentLang).navigationProche || {},
      onNavigate: () => Playback.pause()
    });
  }

  OblastFilters.init({
    map,
    INITIAL_CENTER,
    INITIAL_ZOOM,
    getState: () => ({
      allEvents,
      oblastsDisponibles,
      villesDisponibles,
      currentLang,
      selectedOblast
    }),

    setSelectedOblast: (v) => { selectedOblast = v; statsSelectedOblast = v; },
    setSelectedVille: (v) => { selectedVille = v; statsSelectedVille = v; },
    setVillesDisponibles: (v) => { villesDisponibles = v; },
    setOblastsDisponibles: (v) => { oblastsDisponibles = v; },

    pausePlayback: Playback.pause,
    afficherEvenements,
    highlightOblastForEvent,
    clearOblastHighlight,
    resetLastHighlightedOblast: () => { lastHighlightedOblast = null; },
    updateOblastPanel,
    setRightPanelExpanded,
    zoomToOblast,
    getEventOblast,
    getUiStrings: () => UI_STRINGS[currentLang].ui
  });

  setLoadingProgress(20);

  window.initialMapCenter = INITIAL_CENTER;
  window.initialMapZoom = INITIAL_ZOOM;
  window.minMapZoom = MIN_ZOOM;
  window.maxMapZoom = MAX_ZOOM;

  window.resetMapView = function () {
    Playback.stop(true);
    resetPlaybackWindowToDefault();
    BottomChart.resetZoom?.();
    selectedAuthor = null;
    statsSelectedAuthor = null;
    activeSupplementFilters.clear();
    regionsModeActive = featureEnabled("choropleth") && Boolean(FEATURES.choropleth.actifParDefaut);
    clearRegionsChoroplethLayer({ cancelPending: true });
    removeMapBorderLayer();
    oblastStatusSeq++;
    if (oblastStatusLayer) map.removeLayer(oblastStatusLayer);
    oblastStatusLayer = null;
    if (!regionsModeActive) {
      loadMapBorder().catch(showLoadingError);
      renderOblastStatusLayer().catch(showLoadingError);
    }
    setRightPanelView("regions");
    OblastFilters.clearFiltersPreservePlayback({ resetZoom: true });
    lastHighlightedOblast = null;
    updateOblastPanel(null);
    afficherEvenements();
    BottomChart.hide();
    syncTitleFilterControls();
    syncUtilityMenuState();
  };

  const fonds = Object.create(null);
  let defaultBasemap = null;
  basemapEntries = [];
  for (const basemap of MAP_SETTINGS.fonds || []) {
    const label = basemap.labels?.[currentLang] || basemap.labels?.[DEFAULT_LANGUAGE] || basemap.id;
    const layer = createBasemapLayer(basemap, { L, settings: MAP_SETTINGS });
    layer.on("add", () => {
      activeBasemap = layer;
      geojsonRenderer.refresh();
      setTheme(basemap);
    });
    layer.on("remove", () => {
      if (activeBasemap === layer) {
        activeBasemap = null;
        queueMicrotask(() => { if (!activeBasemap) geojsonRenderer.refresh(); });
      }
    });
    fonds[label] = layer;
    basemapEntries.push({ config: basemap, layer });
    if (basemap.actifParDefaut || !defaultBasemap) defaultBasemap = layer;
  }

  defaultBasemap?.addTo(map);
  if (Object.keys(fonds).length > 1) refreshBasemapControl();

  [allEvents] = await Promise.all([
    loadEventsForLang(currentLang),
    regionsModeActive || featureEnabled("contour") || featureEnabled("statutsRegions") ? loadOblastsGeojson() : Promise.resolve(),
    loadOblastStatusJson()
  ]);

  if (featureEnabled("occupationLayer") && OCCUPATION_FILES.length) {
    OccupationCtrl = createOccupationLayerController({
      map,
      createGeojsonLayer: geojsonRenderer.createLayer,
      files: OCCUPATION_FILES,
      typesConfig: OCCUPATION_TYPES,
      defaultStyle: REGLAGES.stylesGeojson.occupation,
      defaultIndex: REGLAGES.occupation.indexParDefaut
    });
    await OccupationCtrl.setForTime(null);
  }

  setLoadingProgress(50);

  currentLang = DEFAULT_LANGUAGE;
  applyStaticTextsForLang(currentLang);
  updateFloatingSubtitleFromData();

  setLoadingProgress(65);

  selectedTypes = new Set(Object.keys(TYPE_CONFIG));
  oblastsDisponibles = OblastFilters.buildOblastListFromEvents(allEvents);
  OblastFilters.setOblastsList(oblastsDisponibles);
  populateTitleOblastSelect();
  populateTitleAuthorSelect();

  ensureRightPanelLegend({ onChange: () => renderRightPanelBody() });

  LegendUI.init({
    getState: getAppState,
    getLegendIconUrl,
    getDisplayLabelForType: (type) => getDisplayLabelForType(type, currentLang),
    pausePlayback: Playback.pause,
    render: afficherEvenements
  });

  LegendUI.buildMenuLegend();
  LegendUI.initHeaderLegend();

  updateOblastPanel(null);

  Playback.buildPlaybackSequence();
  const maxPlaybackCandidates = [
    ...allEvents.map(ev => getEventTime(ev)).filter(Number.isFinite),
    ...OCCUPATION_MAX_TIMES.filter(Number.isFinite)
  ];
  const maxPlaybackT = maxPlaybackCandidates.length ? Math.max(...maxPlaybackCandidates) : null;

  BottomChart.computeGlobalDays(
    allEvents,
    PLAYBACK_START_TIME,
    getEventTime,
    startOfDayUTC,
    maxPlaybackT
  );

  afficherEvenements({ renderGeography: false });

  if (regionsModeActive) await renderRegionsChoroplethLayer();
  else await Promise.all([loadMapBorder(), renderOblastStatusLayer()]);
  setLoadingProgress(90);
  await waitForBasemapReady(defaultBasemap, { timeoutMs: MAP_SETTINGS.delaiChargementMaximum });
  setLoadingProgress(100);
  hideLoadingOverlay();

  if (featureEnabled("tutoriel") && FEATURES.tutoriel?.demarrageAutomatique && !Tutorial.hasSeen()) {
    setTimeout(() => Tutorial.start(), 900);
  }
}


/// === LANCEMENT GLOBAL ===

function onDomReady(fn) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", fn, { once: true });
  } else {
    fn();
  }
}

let appBooted = false;
onDomReady(() => {
  initUtilityMenu();
  if (appBooted) return;
  appBooted = true;
  applyInterfaceSettings();
  initHarmonizedShell();

  // Tutorial UI
  const tutNext = document.getElementById("tutorial-next-btn");
  const tutSkip = document.getElementById("tutorial-skip-btn");
  const tutReplay = document.getElementById("tutorial-replay-btn");
  const tutLangBtn = document.getElementById("tutorial-lang-btn");

  if (tutNext) tutNext.addEventListener("click", () => Tutorial.next());
  if (tutSkip) tutSkip.addEventListener("click", () => Tutorial.skip());
  if (tutReplay) tutReplay.addEventListener("click", () => Tutorial.start());

  if (tutLangBtn) {
    tutLangBtn.addEventListener("click", async () => {
      const newLang = (currentLang === "en") ? "fr" : "en";
      await setLanguage(newLang);
      if (Tutorial.isActive() && Tutorial.getStep() > 0) Tutorial.goToStep(Tutorial.getStep());
    });
  }

  // Lang buttons
  document.querySelectorAll(".lang-btn").forEach(btn => {
    const available = (REGLAGES.projet.langues || []).includes(btn.dataset.lang);
    btn.hidden = !available;
    const initiallyActive = btn.dataset.lang === DEFAULT_LANGUAGE;
    btn.classList.toggle("lang-active", initiallyActive);
    btn.classList.toggle("active", initiallyActive);
    btn.setAttribute("aria-pressed", initiallyActive ? "true" : "false");
    btn.addEventListener("click", async () => {
      const lang = btn.dataset.lang;
      await setLanguage(lang);
      document.querySelectorAll(".lang-btn").forEach(b => {
        const active = b.dataset.lang === lang;
        b.classList.toggle("lang-active", active);
        b.classList.toggle("active", active);
        b.setAttribute("aria-pressed", active ? "true" : "false");
      });
    });
  });

  // Playback controls
  const pbToggle = document.getElementById("playback-toggle");
  const pbPrev = document.getElementById("playback-prev");
  const pbNext = document.getElementById("playback-next");
  const pbSpeed = document.getElementById("playback-speed");
  const pbEnd = document.getElementById("playback-end");

  if (pbToggle) pbToggle.addEventListener("click", () => {
    Playback.toggle();
    if (!BottomChart.isOpen()) {
      BottomChart.show(updateBottomChart);
    }
    syncUtilityMenuState();
  });

  if (pbPrev) pbPrev.addEventListener("click", () => { Playback.pause(); Playback.stepPrev(); });
  if (pbNext) pbNext.addEventListener("click", () => { Playback.pause(); Playback.stepNext(); });
  if (pbEnd) pbEnd.addEventListener("click", () => Playback.goToEnd());

  if (pbSpeed) {
    pbSpeed.addEventListener("change", () => {
      const nextSpeed = parseFloat(pbSpeed.value) || 1;
      setPlaybackState({ playbackSpeed: nextSpeed });

      if (getPlaybackState().playbackActive) {
        Playback.stop(false);
        Playback.start();
      }
    });
  }

  // Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      Playback.pause();
      OblastFilters.clearFiltersPreservePlayback({ resetZoom: true });
      BottomChart.hide();
      syncUtilityMenuState();
    }
  });

  // Floating controls (Leaflet)
  const floating = document.getElementById("floating-controls");
  if (floating && window.L && L.DomEvent) {
    L.DomEvent.disableClickPropagation(floating);
    L.DomEvent.disableScrollPropagation(floating);
  }

  setupCollapse({
    btnId: "collapse-right-legend",
    bodyId: "right-panel-legend",
    storageKey: "collapse.rightLegend.v2",
    defaultCollapsed: true
  });

  setupCollapse({
    btnId: "collapse-authors-legend",
    bodyId: "authors-panel-legend",
    storageKey: "collapse.authorsLegend.v1",
    defaultCollapsed: true
  });

  setupCollapse({
    btnId: "collapse-bottom-legend",
    bodyId: "bottom-chart-legend",
    storageKey: "collapse.bottomLegend.v2",
    defaultCollapsed: true
  });

  setupCollapse({
    btnId: "collapse-notes",
    bodyId: "notes-body",
    storageKey: "collapse.notes.template",
    defaultCollapsed: false
  });

  document.getElementById("loading-retry")?.addEventListener("click", () => window.location.reload());
  initMap().catch(showLoadingError);
});
