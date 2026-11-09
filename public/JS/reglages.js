// JS/reglages.js
// Configuration centrale de la carte Liban / Palestine / Israel.

export const REGLAGES = {
  projet: {
    titreHtml: "Liban, Palestine, Israël - monitoring des violations envers les journalistes - RSF",
    langueParDefaut: "fr",
    langues: ["fr", "en"],
    indexationMoteurs: false,
    resumeDynamique: {
      enabled: true,
      compteurs: [
        { placeholder: "imprisonments", categorie: "Emprisonnement" },
        { placeholder: "killings", categorie: "Assassinat" }
      ]
    }
  },

  fichiers: {
    donnees: { fr: "evenements.json", en: "evenements.json" },
    geojson: {
      regions: "geojson/allregions.geojson",
      statutsRegions: "statut_regions.json",
      niveauxAdministratifs: []
    },
    assets: {
      feuilleDeStyle: "css/style.css",
      logo: "logo.svg",
      favicon: "logo.svg",
      dossierIcones: "icons/",
      iconeParDefaut: "autre.png"
    },
    modules: {
      dates: "./utils/dates.js",
      strings: "./utils/strings.js",
      security: "./utils/security.js",
      bottomChart: "./charts/bottomChart.js",
      eventsRenderer: "./events/eventsRenderer.js",
      panelScroll: "./ui/panelScroll.js",
      legend: "./ui/legend.js",
      oblastFilters: "./ui/oblastFilters.js",
      playback: "./playback/playback.js",
      i18n: "./i18n/i18n.js",
      tutorial: "./tutorial/tutorial.js",
      occupationLayer: "./maps/occupationLayer.js",
      occupationLegend: "./ui/occupationLegend.js",
      menu: "./ui/menu.js",
      mapRendering: "./maps/rendering.js",
      nearbyNavigation: "./maps/nearbyNavigation.js",
      geojsonLevels: "./maps/geojsonLevels.js"
    }
  },

  champsDonnees: {
    date: ["date", "date_evenement", "date_event", "date_iso"],
    emplacement: ["lieu", "ville", "Ville", "city", "City", "location", "Location"],
    personne: ["journaliste", "Journaliste", "name", "Name", "nom", "Nom"],
    descriptionFr: ["description_FR", "Description_FR", "description_fr", "Description_fr", "descriptionFr", "DescriptionFr"],
    descriptionEn: ["description_EN", "Description_EN", "description_en", "Description_en", "descriptionEn", "DescriptionEn", "summary_EN", "Summary_EN", "summary_en", "Summary_en"],
    descriptionGenerique: ["description", "Description", "commentaire", "Commentaire", "summary", "Summary"],
    categorie: ["type_violence", "type", "Type", "category", "Category"],
    identifiant: ["compteur_evenements", "id", "ID"],
    latitude: ["lat", "latitude", "Latitude"],
    longitude: ["lng", "lon", "longitude", "Longitude"],
    zone: ["region", "Region", "oblast", "Oblast", "pays", "Pays"],
    nomGeojson: ["geojson", "Geojson", "shapeName", "ShapeName"],
    auteur: ["auteur", "Auteur", "author", "Author", "auteur_infraction"],
    media: ["media", "Media", "Media_FR", "media_fr"],
    statut: ["statut", "Statut", "status", "Status", "statut_evenement"],
    torture: ["Allegations_torture", "allegations_torture"],
    lien: ["lien", "Lien", "link", "Link", "lien_CP"]
  },

  carte: {
    // Projections : "mercator" (EPSG:3857, compatible avec les fonds actuels) ; "naturalEarth2" (Proj4Leaflet et fonds compatibles requis).
    projection: "mercator",
    centreInitial: [32.1, 35.4],
    zoomInitial: 7,
    zoomMinimum: 5,
    zoomMaximum: 18,
    zoomDelta: 0.5,
    zoomSnap: 0.1,
    wheelPxPerZoomLevel: 60,
    scrollWheelZoom: true,
    // Attente maximale des tuiles et du rendu, en millisecondes.
    delaiChargementMaximum: 30000,
    zoomSurZone: 10,
    zoomMaximumContour: 7,
    ajusterVueAuContour: true,

    cleCarto: "",
    attribution: '<a href="https://openfreemap.org/" target="_blank" rel="noopener noreferrer">OpenFreeMap</a> &copy; <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener noreferrer">OpenMapTiles</a> Data from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
    // "maplibre" : style vectoriel ; "raster" : tuiles image. Un seul actifParDefaut: true.
    // Pour changer le fond initial, mettre son actifParDefaut à true et les autres à false.

    // theme : "light" ou "dark" ; une seule entrée actifParDefaut: true.
    // maxNativeZoom évite de demander au fournisseur des tuiles inexistantes.
    fonds: [
      {
        id: "positron",
        labels: {
          fr: "Clair",
          en: "Light",
          es: "Claro"
        },
        type: "maplibre",
        url: "https://tiles.openfreemap.org/styles/positron",
        options: {
          attributionControl: false
        },
        theme: "light",
        actifParDefaut: false
      },
      {
        id: "dark",
        labels: {
          fr: "Sombre",
          en: "Dark",
          es: "Oscuro"
        },
        type: "maplibre",
        url: "https://tiles.openfreemap.org/styles/dark",
        options: {
          attributionControl: false
        },
        theme: "dark",
        actifParDefaut: false
      },
      {
        id: "fiord",
        labels: {
          fr: "Fiord",
          en: "Fiord",
          es: "Fiord"
        },
        type: "maplibre",
        url: "https://tiles.openfreemap.org/styles/fiord",
        options: {
          attributionControl: false
        },
        theme: "dark",
        actifParDefaut: true
      },
      {
        id: "liberty",
        labels: {
          fr: "Liberty",
          en: "Liberty",
          es: "Liberty"
        },
        type: "maplibre",
        url: "https://tiles.openfreemap.org/styles/liberty",
        options: {
          attributionControl: false
        },
        theme: "light",
        actifParDefaut: false
      },
      {
        id: "bright",
        labels: {
          fr: "Bright",
          en: "Bright",
          es: "Bright"
        },
        type: "maplibre",
        url: "https://tiles.openfreemap.org/styles/bright",
        options: {
          attributionControl: false
        },
        theme: "light",
        actifParDefaut: false
      },
      {
        id: "satellite",
        labels: {
          fr: "Satellite",
          en: "Satellite",
          es: "Satélite"
        },
        type: "raster",
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        options: {
          maxNativeZoom: 23
        },
        theme: "dark",
        attribution: "Tiles &copy; Esri",
        actifParDefaut: false
      },
      {
        id: "relief",
        labels: {
          fr: "Relief",
          en: "Relief",
          es: "Relieve"
        },
        type: "raster",
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}",
        options: {
          maxNativeZoom: 13
        },
        theme: "light",
        attribution: "Tiles &copy; Esri",
        actifParDefaut: false
      }
    ],

  },

  categorieParDefaut: "Emprisonnement",
  categories: [
    {
      cle: "Emprisonnement",
      slug: "emprisonnement",
      icone: "emprisonne.png",
      couleur: "#00A5B5",
      labels: { fr: "Emprisonnement", en: "Detention" },
      valeursEntree: ["Emprisonne", "Emprisonné", "Imprisonment", "Imprisoned"]
    },
    {
      cle: "Assassinat",
      slug: "assassinat",
      icone: "assassinat.png",
      couleur: "#dc143c",
      labels: { fr: "Assassinat", en: "Killing" },
      valeursEntree: ["Assassination", "Killed", "Tue", "Tué", "Tués", "Atteinte a la vie (tues)", "Atteinte à la vie (tués)"]
    }
  ],
  listeCas: { champsSupplementaires: [] },
  stylesGeojson: {
    // color / opacity / weight : couleur, opacité et épaisseur du contour.
    // fillColor / fillOpacity : couleur et opacité du remplissage.
    // stroke / fill : afficher le contour / le remplissage.
    defaut: {
      stroke: true, color: "#3388ff", weight: 3, opacity: 1,
      fill: true, fillColor: null, fillOpacity: 0.2
    },
    // null : reprendre zones.couleursBase ; une couleur fixe remplace celle des zones.
    // fillColor: null reprend la couleur du contour.
    contour: {
      stroke: true, color: null, weight: 1.2, opacity: 0.82,
      fill: true, fillColor: null, fillOpacity: 0.2
    },
    selection: {
      stroke: true, color: "#FED501", weight: 1, opacity: 1,
      fill: true, fillColor: "#FED501", fillOpacity: 0.15
    },
    // statutsRegions.styles complète ce style pour chaque statut.
    statutsRegions: {
      stroke: true, color: "#999", weight: 1.4, opacity: 0.9,
      fill: true, fillColor: "#999", fillOpacity: 0.025
    },
    niveauxAdministratifs: {
      stroke: true, color: "#64748b", weight: 1, opacity: 0.8,
      fill: true, fillColor: "#64748b", fillOpacity: 0
    },
    // occupation.types[].style peut remplacer ces valeurs (module optionnel).
    occupation: {
      stroke: true, color: "#3388ff", weight: 0.8, opacity: 1,
      fill: true, fillColor: null, fillOpacity: 0.2
    },
    fallbackColor: "#999"
  },

  zones: {
    labels: {
      "Bande de Gaza": { fr: "Bande de Gaza", en: "Gaza Strip" },
      "Cisjordanie": { fr: "Cisjordanie", en: "West Bank" },
      "Israel": { fr: "Israël", en: "Israel" },
      "Liban": { fr: "Liban", en: "Lebanon" }
    },
    aliases: {
      "Gaza": "Bande de Gaza",
      "Bande de Gaza": "Bande de Gaza",
      "Cisjordanie": "Cisjordanie",
      "Cisjordanie occupee": "Cisjordanie",
      "Cisjordanie occupée": "Cisjordanie",
      "West Bank": "Cisjordanie",
      "Israel": "Israel",
      "Israël": "Israel",
      "Liban": "Liban",
      "Lebanon": "Liban"
    },
    couleursBase: {
      "Bande de Gaza": "#2FBF71",
      "Cisjordanie": "#2FBF71",
      "Israel": "#F7D457",
      "Liban": "#E4312A"
    },
    couleurParDefaut: "#015CBB"
  },

  // Libellés des emplacements ; les valeurs Ville des cas restent les clés source.
  emplacements: {
    labels: {
      "Abu Dis": { fr: "Abu Dis", en: "Abu Dis" },
      "Al 'Ubeidiya": { fr: "Al 'Ubeidiya", en: "Al 'Ubeidiya" },
      "Al Ahli Baptist Hospital": { fr: "Al Ahli Baptist Hospital", en: "Al Ahli Baptist Hospital" },
      "Al Jala": { fr: "Al Jala", en: "Al Jala" },
      "Al Maghazi": { fr: "Al Maghazi", en: "Al Maghazi" },
      "Al Mawasi": { fr: "Al Mawasi", en: "Al Mawasi" },
      "Al Shati": { fr: "Al Shati", en: "Al Shati" },
      "Al Tayri": { fr: "Al Tayri", en: "Al Tayri" },
      "Al Tuffah": { fr: "Al Tuffah", en: "Al Tuffah" },
      "Al Zahra": { fr: "Al Zahra", en: "Al Zahra" },
      "Al Zawayda": { fr: "Al Zawayda", en: "Al Zawayda" },
      "Alma El Chaeb": { fr: "Alma El Chaeb", en: "Alma Shaab" },
      "Ashdod": { fr: "Ashdod", en: "Ashdod" },
      "Awarta": { fr: "Awarta", en: "Awarta" },
      "Bayt Rima (nord-ouest de Ramallah)": { fr: "Bayt Rima (nord-ouest de Ramallah)", en: "Bayt Rima (northwest of Ramallah)" },
      "Beit Hanoun": { fr: "Beit Hanoun", en: "Beit Hanoun" },
      "Beit Lahya": { fr: "Beit Lahya", en: "Beit Lahiya" },
      "Beit Liqya": { fr: "Beit Liqya", en: "Beit Liqya" },
      "Beitunia": { fr: "Beitunia", en: "Beitunia" },
      "Bethléem": { fr: "Bethléem", en: "Bethlehem" },
      "Bureij": { fr: "Bureij", en: "Bureij" },
      "Burham": { fr: "Burham", en: "Burham" },
      "Checkpoint du corridor de Netzarim": { fr: "Checkpoint du corridor de Netzarim", en: "Netzarim corridor checkpoint" },
      "Complexe hospitalier Al Naser": { fr: "Complexe hospitalier Al Naser", en: "Nasser Medical Complex" },
      "Deir Sharaf": { fr: "Deir Sharaf", en: "Deir Sharaf" },
      "Deir al-Balah": { fr: "Deir al-Balah", en: "Deir al-Balah" },
      "Dheisheh": { fr: "Dheisheh", en: "Dheisheh" },
      "Doura (au sud d'Hébron)": { fr: "Doura (au sud d'Hébron)", en: "Dura (south of Hebron)" },
      "Gaza city": { fr: "Gaza city", en: "Gaza City" },
      "Hasbaya": { fr: "Hasbaya", en: "Hasbaya" },
      "Huwara": { fr: "Huwara", en: "Huwara" },
      "Hébron": { fr: "Hébron", en: "Hebron" },
      "Hôpital al-Shifa": { fr: "Hôpital al-Shifa", en: "Al-Shifa Hospital" },
      "Jabalia": { fr: "Jabalia", en: "Jabalia" },
      "Jezzine": { fr: "Jezzine", en: "Jezzine" },
      "Jénine": { fr: "Jénine", en: "Jenin" },
      "Jérusalem-Est": { fr: "Jérusalem-Est", en: "East Jerusalem" },
      "Kafr Qallil": { fr: "Kafr Qallil", en: "Kafr Qallil" },
      "Kfar Aza": { fr: "Kfar Aza", en: "Kfar Aza" },
      "Khan Younès": { fr: "Khan Younès", en: "Khan Younis" },
      "Kharbatha Bani Harith": { fr: "Kharbatha Bani Harith", en: "Kharbatha Bani Harith" },
      "Naplouse": { fr: "Naplouse", en: "Nablus" },
      "Nazareth": { fr: "Nazareth", en: "Nazareth" },
      "Niha": { fr: "Niha", en: "Niha" },
      "Nuseirat": { fr: "Nuseirat", en: "Nuseirat" },
      "Ofer": { fr: "Ofer", en: "Ofer" },
      "Pont du Roi Hussein": { fr: "Pont du Roi Hussein", en: "King Hussein Bridge" },
      "Ramallah": { fr: "Ramallah", en: "Ramallah" },
      "Rimal": { fr: "Rimal", en: "Rimal" },
      "Réïm": { fr: "Réïm", en: "Re'im" },
      "Sa'Ir": { fr: "Sa'Ir", en: "Sa'ir" },
      "Sheikh Radwan": { fr: "Sheikh Radwan", en: "Sheikh Radwan" },
      "Tayr Harfa": { fr: "Tayr Harfa", en: "Tayr Harfa" },
      "Tulkarem": { fr: "Tulkarem", en: "Tulkarm" },
      "Umm al-Fahm": { fr: "Umm al-Fahm", en: "Umm al-Fahm" },
      "Yatta": { fr: "Yatta", en: "Yatta" },
      "Zeitoun": { fr: "Zeitoun", en: "Zeitoun" },
      "Zikim": { fr: "Zikim", en: "Zikim" }
    }
  },

  statutsEvenements: {
    labels: {
      "en cours": { fr: "En cours", en: "Ongoing" },
      "termine": { fr: "Terminé", en: "Ended" }
    }
  },

  auteurs: {
    labels: {
      "Armée israélienne": { fr: "Armée israélienne", en: "Israeli army" },
      "Autorité palestinienne": { fr: "Autorité palestinienne", en: "Palestinian Authority" },
      "Autorités libanaises": { fr: "Autorités libanaises", en: "Lebanese authorities" },
      "Inconnu": { fr: "Inconnu", en: "Unknown" },
      "Hezbollah": { fr: "Hezbollah", en: "Hezbollah" },
      "Hamas": { fr: "Hamas", en: "Hamas" }
    },
    aliases: {
      "Armée Israélienne": "Armée israélienne",
      "Armée Israéelienne": "Armée israélienne",
      "Armée Israëlienne": "Armée israélienne",
      "Armee Israelienne": "Armée israélienne",
      "Armee israelienne": "Armée israélienne"
    }
  },

  fonctionnalites: {
    listeCas: { enabled: true },
    statistiques: { enabled: true },
    auteurs: { enabled: true },
    chronologie: { enabled: true },
    lecture: { enabled: true },
    tutoriel: {
      enabled: true, // Le tutoriel reste accessible depuis le menu.
      demarrageAutomatique: false // true : ouverture automatique à la première visite.
    },
    langues: { enabled: true },
    rsfCartographie: { enabled: true },
    contour: { enabled: true },
    statutsRegions: { enabled: true },
    filtresAdditionnels: { enabled: true },
    occupationLayer: { enabled: false },
    navigationProche: {
      enabled: true, // Test de navigation vers le groupe ou événement hors écran le plus proche.
      zoomMinimum: 11,
      maximumVisibles: 1, // Afficher le bouton lorsqu'il reste 0 ou 1 groupe/événement visible.
      margeDesktop: 56, // Marges du bouton au bord de la zone libre, en pixels.
      margeMobile: 20,
      espacementComposants: 12,
      seuilMobile: 768,
      dureeDeplacement: 0.65 // Secondes ; le zoom final reste inchangé.
    },
    choropleth: {
      enabled: true, // Conserve le bouton du choroplèthe dans le menu.
      // false : démarrer en mode marqueurs ; true : démarrer en choroplèthe.
      actifParDefaut: false
    }
  },

  controles: {
    panneauTitre: {
      ouvertParDefaut: true,
      afficherZone: true,
      afficherEmplacement: true,
      afficherAuteur: true,
      afficherDates: true,
      afficherCategories: true,
      afficherEffacerFiltres: true
    },
    lecture: {
      vitesses: [0.5, 1, 2],
      vitesseParDefaut: 1,
      afficherPrecedent: true,
      afficherLecturePause: true,
      afficherSuivant: true,
      afficherFin: true
    },
    statistiques: {
      vues: ["zones", "emplacements", "auteurs"],
      vueParDefaut: "zones",
      lignesMaximumZones: 27,
      lignesMaximumEmplacements: 100,
      lignesMaximumAuteurs: 100
    },
    menu: {
      ordre: ["langues", "tutoriel", "listeCas", "choropleth", "statistiques", "auteurs", "chronologie", "rsfCartographie"]
    }
  },

  filtresAdditionnels: [
    {
      id: "torture",
      enabled: true,
      mode: "valeurs",
      champs: ["Allegations_torture", "allegations_torture"],
      valeurs: ["oui", "yes", "true", "1", true, 1],
      labels: { fr: "Cas de torture", en: "Cases involving torture" }
    },
    {
      id: "ongoing_imprisonment",
      enabled: true,
      mode: "categorie_statut",
      categorie: "Emprisonnement",
      champs: ["Statut", "statut", "status", "Status", "statut_evenement"],
      valeurs: ["en cours", "ongoing"],
      labels: { fr: "Cas en cours", en: "Ongoing cases" }
    }
  ],

  choropleth: {
    couleurSansCas: "#7890a0",
    couleurMinimum: "#f7d457",
    couleurMaximum: "#76001f",
    contour: "rgba(255,255,255,0.82)",
    epaisseurContour: 0.6, // Constante au survol, comme sur la carte Bilan.
    opaciteSansCas: 0.42,
    opaciteAvecCas: 0.9
  },

  statutsRegions: {
    styles: {
      "Actif": { color: "#E4312A", fillColor: "#E4312A" },
      "Active": { color: "#E4312A", fillColor: "#E4312A" },
      "A surveiller": { color: "#FF9800", fillColor: "#FF9800" },
      "Watch": { color: "#FF9800", fillColor: "#FF9800" }
    }
  },

  occupation: {
    indexParDefaut: 0,
    fichiers: [],
    types: {
      type01: { i18nKey: "type01", color: "#C70900", style: { weight: 1, fillOpacity: 0.35 } },
      type02: { i18nKey: "type02", color: "#FF9800", style: { weight: 1, fillOpacity: 0.40 } },
      type03: { i18nKey: "type03", color: "#14c414", style: { weight: 1, fillOpacity: 0.40 } },
      type04: { i18nKey: "type04", color: "#607D8B", style: { weight: 1, fillOpacity: 0.45 } }
    }
  },

  lecture: {
    dateDebut: "2020-01-10",
    dateFin: null,
    reperes: []
  },

  cartesLiees: [
    { href: "https://rsf-carte-journalistes-tues-disparus-otages-detenus-2025.rsf.org/", image: "assets/carte_bilan.png", labels: { fr: "Violences contre les journalistes dans le monde (édition 2025)", en: "Violence against journalists worldwide (2025 edition)" } },
    { href: "https://ukraine-mobilisation.rsf.org/", image: "assets/carte_ukraine.png", labels: { fr: "Surveillance des violences contre les journalistes en Ukraine", en: "Monitoring violence against journalists in Ukraine" } },
    { href: "https://grands-lacs.rsf.org/", image: "assets/grands-lacs.png", labels: { fr: "Surveillance des violences contre les journalistes dans la région des Grands Lacs africains", en: "Monitoring violence against journalists in Africa's Great Lakes region" } },
    { href: "https://routes-de-l-exil.data.rsf.org/", image: "assets/carte_exil.png", labels: { fr: "Les journalistes sur les routes de l'exil (édition 2021 à 2025)", en: "Journalists on the routes of exile (2021 to 2025 edition)" } },
    { href: "https://mexico-press-violations.data.rsf.org/", image: "assets/carte_mexique.png", labels: { fr: "Surveillance des assassinats de journalistes au Mexique", en: "Monitoring murders of journalists in Mexico" } },
    { href: "https://lebanon-palestine-israel-violations-against-journalists.data.rsf.org/", image: "assets/carte_moyen_orient.png", labels: { fr: "Surveillance des violations envers les journalistes au Liban, en Palestine et en Israël", en: "Monitoring violations against journalists in Lebanon, Palestine and Israel" } }
  ],

  textes: {
    fr: {
      occupationLegend: { title: "Couche contextuelle", datePrefix: "Situation au", type01: "Zone de contexte 1", type02: "Zone de contexte 2", type03: "Zone de contexte 3", type04: "Zone de contexte 4", source: "Source : à compléter" },
      loader: { subtitle: "Monitoring des violations envers les journalistes au Liban, en Palestine et en Israël", subtext: "Chargement de la carte...", error: "Impossible de charger la carte. Réessayez.", retry: "Réessayer" },
      tutorial: {
        step1: { title: "Bienvenue", subtitle: "Comment utiliser cette carte", body: "Cette carte présente les cas documentés par RSF au Liban, en Palestine et en Israël.", body2: "Les zones, auteurs, catégories et périodes peuvent être explorés depuis les contrôles de la carte dans le composant situé en bas à gauche de l'écran.", nextLabel: "Montrez-moi" },
        step2: { title: "Filtres de la carte", subtitle: "Zones, emplacements, auteurs et catégories", body: "Ce composant situé en bas à gauche regroupe aussi les principaux filtres.", body2: "Le filtre 'en cours' permet d'isoler les journalistes actuellement détenus dans la zone. Les détentions peuvent aller de l'emprisonnement à l'assignation à résidence dans de rares cas.", nextLabel: "Suivant" },
        step3: { title: "Menu de navigation", subtitle: "Panneaux et modes", body: "Le menu rassemble la liste des cas, le mode de carte choroplèthe, les statistiques, les auteurs et la chronologie.", body2: "Le mode choroplèthe, qui permet de voir la répartition des violences par région, peut être activé ou désactivé depuis le menu.", nextLabel: "Suivant" },
        step4: { title: "Liste des cas", subtitle: "Depuis la liste", body: "La liste affiche les cas documentés et leur description, ainsi que les détails rassemblés par RSF.", body2: "Cliquez sur un cas pour centrer la carte sur son emplacement.", nextLabel: "Suivant" },
        step5: { title: "Lecture et chronologie", subtitle: "Explorer une période", body: "Le module lecture rejoue les cas dans l'ordre chronologique.", body2: "Les boutons 'début', 'fin' et la chronologie permettent de définir la période visible, soit en sélectionnant la date, soit en déplaçant les curseurs sur la timeline.", nextLabel: "Suivant" },
        step6: { title: "Statistiques", subtitle: "Zones, emplacements et auteurs", body: "Le panneau statistiques affiche les répartitions des cas selon les zones, emplacements et auteurs.", body2: "Cliquez sur un label pour zoomer sur la zone concernée et/ou filtrer la carte.", nextLabel: "Terminer" },
        skipLabel: "Passer"
      },
      ui: {
        selectOblast: "Cliquez sur une zone, un emplacement ou un auteur ci-dessous",
        eventPanelTitle: "Liste des cas",
        closeButton: "Fermer",
        clearFilters: "Supprimer les filtres",
        legendSection: "Légende",
        notesSection: "Notes",
        eventFooterNote: "<b>Note :</b> cette carte recense les cas documentés par RSF dans le cadre de son monitoring. Les auteurs indiqués correspondent aux informations disponibles à date de publication.",
        floatingTitle: "Liban, Palestine, Israël : monitoring des violations envers les journalistes",
        floatingSubtitle: "Cas documentés par RSF.",
        floatingSubtitleSummary: "De {startYear} à {endYear}, {total} cas documentés : {imprisonments} emprisonnements et {killings} assassinats.",
        floatingSubtitleSummaryNoPeriod: "Dans le jeu de données actuel, {total} cas documentés : {imprisonments} emprisonnements et {killings} assassinats.",
        panelWhenOblast: "Les statistiques apparaîtront ici dès qu'une zone, un emplacement ou un auteur sera sélectionné.",
        chartNoEvents: "Cette zone n'a pas de cas dans les catégories disponibles.",
        chartNoEventsCategory: "Aucun cas pour cette catégorie.",
        chartSearchOblast: "Sélectionnez une zone, un emplacement ou un auteur pour afficher les statistiques.",
        oblastTotalLabel: "Total de cas :",
        oblastCitiesLabel: "Emplacements concernés :",
        tutoButton: "Tutoriel",
        tutorialLangButton: "Switch to English",
        menuLanguage: "Langue",
        menuEvents: "Liste des cas",
        menuRegions: "Carte choroplèthe",
        menuStats: "Statistiques",
        menuAuthors: "Auteurs",
        menuTimeline: "Chronologie",
        menuOpen: "Ouvrir le menu",
        navigationProche: { evenement: "Rejoindre l’événement le plus proche", groupe: "Rejoindre le groupe le plus proche ({count} événements)" },
        rsfCartography: "RSF cartographie",
        bottomChartTitle: "Évolution par type de violence",
        oblastsBtn: "Zones",
        villesBtn: "Emplacements",
        authorsBtn: "Auteurs",
        titleFiltersLabel: "Filtres de la carte",
        dateFiltersLabel: "Filtres de dates",
        supplementFiltersLabel: "Filtres complémentaires",
        titleFilters: { allAreas: "Toutes les zones", allLocations: "Tous les emplacements", allAuthors: "Tous les auteurs", calendarStart: "Début", calendarEnd: "Fin", selectAreaFirst: "Sélectionnez d'abord une zone", areaAria: "Zone", locationAria: "Emplacement", authorAria: "Auteur" },
        eventCardLabels: { type: "Type", area: "Zone", location: "Emplacement", media: "Média", author: "Auteur", status: "Statut", torture: "Allégations de torture", readMore: "↪ Lire plus", undated: "Sans date" },
        chartFilterLabels: { author: "Auteur : ", year: "Année : ", country: "Pays : ", area: "Zone : ", location: "Emplacement : ", noFilterSelected: "Pas de filtre sélectionné", noData: "Aucune donnée", filterAction: "Filtrer" },
        timelinePanPrevious: "Déplacer la chronologie vers la gauche",
        timelinePanNext: "Déplacer la chronologie vers la droite",
        timelineZoomOut: "Dézoomer la chronologie",
        timelineZoomInPrefix: "Zoomer la chronologie x",
        timelineZoomYear: "Zoomer sur cette année",
        caseSingular: "1 cas",
        casePlural: "{count} cas",
        footerCredits: `<b>Graphiques et carte :</b> <i>Reporters sans Frontières</i><br><b>Source données :</b> <i>RSF, monitoring Liban / Palestine / Israël.</i><br><b>Géométries :</b> <i>geoBoundaries, données simplifiées.</i>`,
        flaticonCredits: `<ul class="credits-list"><li>Icônes issues du kit cartographique RSF / Christina Atik</li></ul>`
      },
      cartography: { title: "RSF cartographie", close: "Fermer" },
      playbackMessages: { example_title: "Repère chronologique", example_body: "Ajoutez vos repères dans reglages.js puis traduisez-les ici." }
    },
    en: {
      occupationLegend: { title: "Context layer", datePrefix: "Situation as of", type01: "Context area 1", type02: "Context area 2", type03: "Context area 3", type04: "Context area 4", source: "Source: to be completed" },
      loader: { subtitle: "Lebanon, Palestine, Israel: monitoring abuses committed against journalists", subtext: "Loading map...", error: "Unable to load the map. Try again.", retry: "Try again" },
      tutorial: {
        step1: { title: "Welcome", subtitle: "Tutorial", body: "This map presents cases documented by RSF in Lebanon, Palestine and Israel.", body2: "Areas, perpetrators, categories and periods can be explored from the map controls.", nextLabel: "Show me" },
        step2: { title: "Map filters", subtitle: "Areas, locations, authors and categories", body: "The main filters can be found in the map legend on the bottom left.", body2: "The 'ongoing' category filters the map to show the journalists who are currently detained in the area. Detentions can range from imprisonment to house arrest in rare cases.", nextLabel: "Next" },
        step3: { title: "Navigation menu", subtitle: "Panels and modes", body: "The menu button — the three bars on the left — are where you can find the list of cases, the choropleth map, statistics, perpetrators of the crimes and the timeline.", body2: "You can enable or disable the choropleth map — which shows the different regions colored by the amount of abuses committed in that area — from the menu.", nextLabel: "Next" },
        step4: { title: "List of cases", subtitle: "From the list", body: "The list displays documented cases and their descriptions, as well as the information gathered by RSF.", body2: "Click a case to centre the map on its location.", nextLabel: "Next" },
        step5: { title: "Playback and timeline", subtitle: "Explore a period", body: "The playback button — the arrow at the bottom of the map’s legend — plays the cases in chronological order.", body2: "The date buttons in the map legend and the timeline button in the menu allow you to choose the time period, either by selecting the date or by moving the cursors on the timeline.", nextLabel: "Next" },
        step6: { title: "Statistics", subtitle: "Areas, locations and perpetrators", body: "The statistics panel displays the distribution of cases by areas, locations and the perpetrators of the crimes.", body2: "Click the name of the place or the name of the journalist in the sidebar to zoom in on the area and/or filter the map.", nextLabel: "Finish" },
        skipLabel: "Skip"
      },
      ui: {
        selectOblast: "Click an area, location or perpetrator below",
        eventPanelTitle: "Case list",
        closeButton: "Close",
        clearFilters: "Clear filters",
        legendSection: "Legend",
        notesSection: "Notes",
        eventFooterNote: "<b>Note:</b> this map lists cases documented by RSF through its monitoring work. Listed authors reflect the information available at publication date.",
        floatingTitle: "Lebanon, Palestine, Israel: monitoring abuses committed against journalists",
        floatingSubtitle: "Cases documented by RSF.",
        floatingSubtitleSummary: "From {startYear} to {endYear}, {total} cases have been documented: {imprisonments} detentions and {killings} killings.",
        floatingSubtitleSummaryNoPeriod: "In the current dataset, {total} cases have been documented: {imprisonments} detentions and {killings} killings.",
        panelWhenOblast: "Statistics will appear here as soon as an area, location or perpetrator is selected.",
        chartNoEvents: "This area has no cases in the available categories.",
        chartNoEventsCategory: "No cases for this category.",
        chartSearchOblast: "Select an area, location or perpetrator to display statistics.",
        oblastTotalLabel: "Total cases:",
        oblastCitiesLabel: "Locations involved:",
        tutoButton: "Tutorial",
        tutorialLangButton: "Voir en français",
        menuLanguage: "Language",
        menuEvents: "List of cases",
        menuRegions: "Choropleth map",
        menuStats: "Statistics",
        menuAuthors: "Perpetrators",
        menuTimeline: "Timeline",
        menuOpen: "Open menu",
        navigationProche: { evenement: "Go to the nearest event", groupe: "Go to the nearest group ({count} events)" },
        rsfCartography: "RSF data maps",
        bottomChartTitle: "Evolution by type of violence",
        oblastsBtn: "Areas",
        villesBtn: "Locations",
        authorsBtn: "Perpetrators",
        titleFiltersLabel: "Map filters",
        dateFiltersLabel: "Date filters",
        supplementFiltersLabel: "Additional filters",
        titleFilters: { allAreas: "All areas", allLocations: "All locations", allAuthors: "All perpetrators", calendarStart: "Start", calendarEnd: "End", selectAreaFirst: "Select an area first", areaAria: "Area", locationAria: "Location", authorAria: "Perpetrator" },
        eventCardLabels: { type: "Type", area: "Area", location: "Location", media: "Media", author: "Perpetrator", status: "Status", torture: "Torture allegations", readMore: "↪ Read more", undated: "Undated" },
        chartFilterLabels: { author: "Perpetrator: ", year: "Year: ", country: "Country: ", area: "Area: ", location: "Location: ", noFilterSelected: "No filter selected", noData: "No data", filterAction: "Filter" },
        timelinePanPrevious: "Move timeline left",
        timelinePanNext: "Move timeline right",
        timelineZoomOut: "Zoom out timeline",
        timelineZoomInPrefix: "Zoom timeline x",
        timelineZoomYear: "Zoom into this year",
        caseSingular: "1 case",
        casePlural: "{count} cases",
        footerCredits: `<b>Charts and map:</b> <i>Reporters sans Frontières (RSF)</i><br><b>Data source:</b> <i>RSF, Lebanon / Palestine / Israel monitoring.</i><br><b>Geometries:</b> <i>geoBoundaries, simplified data.</i>`,
        flaticonCredits: `<ul class="credits-list"><li>Icons from the RSF Data kit / Christina Atik.</li></ul>`
      },
      cartography: { title: "RSF data maps", close: "Close" },
      playbackMessages: { example_title: "Timeline cue", example_body: "Add cues in reglages.js, then translate them here." }
    }
  }
};

export function validerReglages(reglages = REGLAGES) {
  const erreurs = [];
  if (!reglages?.fichiers?.donnees?.fr) erreurs.push("fichiers.donnees.fr est requis");
  if (!reglages?.fichiers?.geojson?.regions) erreurs.push("fichiers.geojson.regions est requis");
  if (!Array.isArray(reglages?.categories) || !reglages.categories.length) erreurs.push("categories doit contenir au moins une categorie");
  if (!reglages?.textes?.[reglages?.projet?.langueParDefaut]) erreurs.push("La langue par defaut doit exister dans textes");

  const cles = new Set();
  for (const categorie of reglages.categories || []) {
    if (!categorie?.cle) erreurs.push("Chaque categorie doit avoir une cle");
    if (cles.has(categorie?.cle)) erreurs.push(`Categorie dupliquee : ${categorie.cle}`);
    cles.add(categorie?.cle);
  }
  if (!(reglages.categories || []).some(categorie => categorie.enabled !== false && categorie.cle === reglages.categorieParDefaut)) {
    erreurs.push("categorieParDefaut doit correspondre a une categorie active");
  }

  for (const [nom, chemin] of Object.entries(reglages?.fichiers?.modules || {})) {
    if (!chemin) erreurs.push(`Chemin de module manquant : ${nom}`);
  }

  if (erreurs.length) throw new Error(`[reglages.js] ${erreurs.join(" ; ")}`);
  return true;
}
