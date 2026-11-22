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
| `src/app.js` | The desk, rooms, walk-in, passport, papers, drawers, whiteboard, intercom, list view and amend mode |
| `src/main.js` | The website entry: loads the styles and scripts in order |
| `src/boot-data.js` | Puts `data.json` where the page reads it |
| `src/sprites.js` | Pixel art drawn as SVG rects, plus the embedded portrait |
| `src/art.js` | The sprites, as data URIs (generated from the PNGs). On the website each one becomes its own image file |
| `src/fx.js` | Sounds (files and ones made in the browser), the music and the split-flap board |
| `src/sounds.js` | The desk sound pack as small MP3s. Original sounds synthesized for this site, so there is no licence to credit |
| `src/demos.js` | In-browser case file demos (no network calls) |
| `src/styles.css` | Styles and colour tokens |
| `assets/` | The source PNGs for the sprites |

## Builds

| Command | Output | Use |
|---|---|---|
| `npm run build` | `dist/` | The website: separate scripts, styles, images and sounds, so browsers can cache them |
| `npm run build:artifact` | `build/standalone.html`, `build/artifact.html` | Everything in one file: to open without a server, and the version published as a Claude artifact |

"Amend papers" and saving only work inside the Claude artifact.
