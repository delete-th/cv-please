# cv-please

Thea Saguid's portfolio, set at a border-inspection desk. Watch the applicant walk up to the booth, open and stamp the passport, then explore the desk: case files, drawers, the whiteboard, the intercom and the printed entry record.

## Run it locally

You need Node.js 20 or newer.

```bash
npm install
```

```bash
npm run dev
```

Then open the address it prints (usually http://localhost:5173). The page reloads as you edit files in `src/`.

## Publish it

The site is hosted on GitHub Pages. Every push to `main` builds it and publishes it, using `.github/workflows/deploy.yml`. One-time setup in the repository: Settings, Pages, Source: **GitHub Actions**.

To check the production build locally:

```bash
npm run build
```

```bash
npm run preview
```

## Edit it

All content lives in `src/data.json`. The page is assembled from:

| File | What it holds |
|---|---|
| `src/data.json` | CV content: profile, projects, awards, skills, strengths, whiteboard steps, intercom questions and answers |
| `src/app/` | The page itself, one module per part (see below) |
| `src/main.js` | The website entry: loads the styles and scripts in order |
| `src/boot-data.js` | Puts `data.json` where the page reads it |
| `src/sprites.js` | Pixel art drawn as SVG rects, plus the embedded portrait |
| `src/art.js` | The sprites, as data URIs (generated from the PNGs). On the website each one becomes its own image file |
| `src/fx.js` | Sounds (files and ones made in the browser), the music and the split-flap board |
| `src/sounds.js` | The desk sound pack as small MP3s. Original sounds synthesized for this site, so there is no licence to credit |
| `src/demos.js` | In-browser case file demos (no network calls) |
| `src/styles.css` | Styles and colour tokens |
| `assets/` | The source PNGs for the sprites |

## The page's modules (`src/app/`)

| Module | What it holds |
|---|---|
| `core.js` | Shared helpers, the page state (`ui`) and the variables several parts change (`rt`) |
| `papers.js` | What each paper on the desk says: ID card, diploma, commendations, case files |
| `booth.js` | The booth across the top, the entry record and the fixed controls |
| `scene.js` | Laying out the desk: where the papers and furniture go |
| `handling.js` | Picking up, carrying and putting down papers |
| `drawers.js` | The Skills and Personal drawers |
| `things.js` | Thea's things: notes, the watch, the bottle, the sketchbook, the alarm clock |
| `stamps.js` | The rubber stamps and the stamp tray |
| `printer.js` | The printer and the entry record |
| `contact.js` | The contact screen (computer or phone) |
| `lamp.js` | The desk lamp |
| `walkin.js` | The walk-in at the booth window |
| `whiteboard.js` | The whiteboard and the marker that leads to it |
| `nav.js` | The pill nav and moving between rooms |
| `intercom.js` | The intercom: the visitor's questions and Thea's answers, and the tour |
| `listview.js` | The Simplify view and amend mode |
| `intro.js` | The passport intro and the first visit |
| `ambient.js` | Idle details and name tags |
| `actions.js` | What every button does, and pointer, keyboard, swipe, scroll and resize handling |
| `save.js` | Saving amended papers back to the Claude artifact |
| `start.js` | Starts the page: runs each part's start-up code in order |

## Builds

| Command | Output | Use |
|---|---|---|
| `npm run build` | `dist/` | The website: separate scripts, styles, images and sounds, so browsers can cache them |
| `npm run build:artifact` | `build/standalone.html`, `build/artifact.html`, `build/artifact-drawn.html` | Everything in one file (the modules bundled into one script): to open without a server, and the versions published as Claude artifacts |

"Amend papers" and saving only work inside the Claude artifact.
