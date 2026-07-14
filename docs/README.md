# Portfolio Website

A single-file, self-contained portfolio site showcasing 17 Salesforce + React apps.
No build step, no dependencies — just `index.html` + `assets/`.

## Preview locally
Double-click `index.html` (opens in your browser). Everything works from `file://`.

## Before you publish — edit two things in `index.html`
Open `index.html` and scroll to the `<script>` near the bottom:

1. **Your links** — in the `PROFILE` object, replace:
   - `github`, `linkedin`, `upwork` with your real profile URLs
   - `email` is already set
2. **Per-project links** — in the `PROJECTS` array, for each project set:
   - `demo:` → the project's **YouTube (unlisted)** link
   - `repo:` → the project's **GitHub repo** URL
   - Leave `""` and the button greys out automatically.

## Deploy free — GitHub Pages
1. Create a repo, e.g. `portfolio` (or `your-username.github.io` for a root URL).
2. Push this folder's contents (`index.html` + `assets/`) to the repo root.
3. Repo → **Settings → Pages** → Source: `main` branch, `/root` → Save.
4. Live at `https://your-username.github.io/portfolio/` in ~1 min.

## Deploy free — Netlify (drag & drop)
1. Go to app.netlify.com → **Add new site → Deploy manually**.
2. Drag this whole `portfolio-site` folder onto the drop zone.
3. Live instantly on a `*.netlify.app` URL (rename it in Site settings).

## Custom domain (optional)
Both GitHub Pages and Netlify let you attach a custom domain
(e.g. `hareshprajapati.dev`) for free — buy the domain (~$10/yr) and follow
their DNS instructions. Put this one link in every profile bio.
