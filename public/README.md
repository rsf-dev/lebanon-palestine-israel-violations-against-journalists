# Carte Liban / Palestine / Israël

Guide pas à pas commun aux cartes et procédure ADM02 : [GUIDE_ADMIN_CARTES.md](../GUIDE_ADMIN_CARTES.md). Les filtres Torture et Détention en cours ainsi que les descriptions localisées restent spécifiques à ce projet.

Carte de suivi RSF des cas documentés au Liban, en Palestine et en Israël. Elle suit l'architecture commune du template : `JS/reglages.js` décrit la carte, `JS/main.js` orchestre l'application et les modules de `JS/` construisent les vues.

## Structure globale

```text
LIBAN_PALESTINE_ISRAEL/
├── index.html                 # structure des panneaux et chargement de l'app
├── JS/reglages.js             # chemins, données, catégories, filtres et options
├── JS/main.js                 # orchestration commune
├── JS/{charts,events,maps,playback,tutorial,ui,utils}/
│                               # graphiques, cas, couche contextuelle et outils
├── evenements.json            # cas avec champs FR / EN
├── statut_regions.json        # styles de statut si activés
├── geojson/allregions.geojson # géométries des zones
├── icons/                     # icônes de catégories
├── assets/                    # images des cartes RSF liées
└── css/style.css              # styles
```

`index.html` contient les conteneurs et charge Leaflet, les feuilles de style et `JS/main.js`. Le point de configuration est `JS/reglages.js`; les modules communs restent dans leurs dossiers. Les noms techniques historiques `oblast`, `OblastFilters` et `country-panel` désignent respectivement les zones, leurs filtres et le panneau statistiques.

## Mettre à jour les cas

1. Modifiez `evenements.json`, en conservant un tableau JSON et les champs de chaque cas.
2. Renseignez la description dans `description_FR` et `description_EN`. Une valeur anglaise vide reste vide et ne sera pas remplacée par le texte français.
3. Vérifiez les zones, emplacements, dates ISO (`AAAA-MM-JJ`), coordonnées numériques et liens.
4. La valeur de `Geojson` doit correspondre à la propriété du GeoJSON utilisée par la carte, notamment `shapeName`.
5. Si les noms des colonnes changent, ajoutez leurs variantes dans `REGLAGES.champsDonnees` avant d'altérer la logique commune.

Exemple de structure de cas :

```json
{
  "date": "2026-05-18",
  "Statut": "Termine",
  "Type": "Emprisonnement",
  "Nom": "Nom du journaliste",
  "Media": "Nom du média",
  "Auteur": "Auteur de l'atteinte",
  "Ville": "Emplacement",
  "Region": "Zone",
  "lat": 31.8,
  "lng": 34.6,
  "Geojson": "Nom de la géométrie",
  "lien_CP": "https://example.org",
  "Allegations_torture": "Oui",
  "description_FR": "Description en français",
  "description_EN": "Description in English"
}
```

## Réglages administrateur

Les fonds OpenFreeMap clair et sombre et le fond Satellite se règlent dans `carte.fonds`, avec Liberty et Bright proposés en commentaires. `JS/maps/rendering.js` synchronise les contours avec le fond vectoriel et attend les tuiles avant de retirer le loader. Le zoom maximal et `carte.delaiChargementMaximum` sont configurables.

Adaptez les paramètres courants dans `JS/reglages.js` :

- `fichiers` : JSON, GeoJSON, CSS, logo, icônes et chemins des modules ;
- `champsDonnees` : noms de colonnes source reconnus ;
- `carte` : centre, zooms, attribution et fonds ;
- `categories` et `zones` : types de cas, couleurs, icônes, alias et libellés ;
- `filtresAdditionnels` : champs et valeurs des filtres supplémentaires ;
- `fonctionnalites` : modules affichés ou masqués ;
- `controles` : filtres du panneau titre, ordre du menu, vitesse de lecture et vues statistiques ;
- `lecture` et `choropleth` : période de lecture, couleurs, opacités et `epaisseurContour` du choroplèthe ;
- `stylesGeojson` : contours et remplissages hors choroplèthe (défaut, contour, sélection, statuts, niveaux administratifs, occupation) ;
- `occupation` : fichiers datés et types de la couche contextuelle ;
- `textes` : textes FR/EN, tutoriel, notes, crédits et libellés des graphiques.

Les styles GeoJSON partagent les paramètres `stroke`, `color`, `weight`, `opacity`, `fill`, `fillColor` et `fillOpacity`. Pour le contour général, `color: null` conserve les couleurs de `zones.couleursBase` ; `fillColor: null` reprend la couleur du contour. Les styles par statut restent dans `statutsRegions.styles` et les styles des modules optionnels complètent les valeurs par défaut de `stylesGeojson`.

Le choroplèthe utilise l'échelle logarithmique du Bilan, sans modification de contour au survol. Les filtres actualisent les couleurs et les compteurs en mémoire sans renvoyer les géométries à MapLibre. Les changements de fond clair, sombre ou Satellite conservent les styles. L'unique loader attend le rendu final des tuiles et des couches.

Le tutoriel reste accessible dans le menu. `fonctionnalites.tutoriel.demarrageAutomatique: false` désactive son ouverture à l'arrivée ; `true` la réactive à la première visite. `enabled: false` masque aussi le bouton du menu.

## Paramètres actuels

- Données : `evenements.json`, avec descriptions FR et EN.
- Géométries : `geojson/allregions.geojson`.
- Centre initial : `[32.1, 35.4]`, zoom `7`.
- Catégories : `Emprisonnement` et `Assassinat`.
- Zones : Bande de Gaza, Cisjordanie, Israël et Liban.
- Filtres additionnels : Torture et En cours.
- Statistiques : zones, emplacements et auteurs.
- Choroplèthe : disponible dans le menu, désactivé au démarrage (mode marqueurs).
- Couche d'occupation : désactivée.

Les options se règlent dans `REGLAGES.fonctionnalites`, par exemple :

```js
occupationLayer: { enabled: false },
choropleth: { enabled: true, actifParDefaut: false }
```

`fonctionnalites.choropleth.actifParDefaut` choisit le mode à l'arrivée et après une réinitialisation : `false` pour les marqueurs, `true` pour le choroplèthe. `enabled: true` conserve la commande dans le menu ; `enabled: false` désactive complètement cette fonctionnalité. Les panneaux restent blancs, quel que soit le fond de carte choisi.

Pour activer la couche d'occupation, passez son option à `true`, ajoutez les fichiers GeoJSON datés dans `REGLAGES.occupation.fichiers`, configurez les types et leurs textes `occupationLegend` en français et en anglais. Le fichier de géométrie des zones et le champ de liaison doivent continuer à correspondre.

## Ajouter ou modifier une catégorie

Dans `REGLAGES.categories`, chaque entrée définit une `cle` interne, un `slug`, le nom de l'icône, une couleur, `labels.fr`/`labels.en` et les variantes acceptées dans `valeursEntree`. Placez l'icône dans le dossier configuré puis vérifiez que les valeurs `Type` du JSON correspondent à une de ces variantes.

## Vérifier et publier

Servez le dossier par HTTP en local et vérifiez les descriptions FR/EN, filtres de zone et d'emplacement, statistiques, auteurs, choroplèthe, liste des cas, dates et lecture chronologique. Vérifiez également chaque GeoJSON après toute modification de ses noms de propriétés. Lorsqu'un fichier JS ou CSS change, mettez à jour son paramètre `v` dans `index.html`, puis déployez ensemble les données, géométries, icônes et assets référencés.
