# Hyperion Racing Team – Website

Official website of Hyperion Racing Team, Pillai University (Navi Mumbai).

## Structure
- `index.html`, `about.html`, `car.html`, `gallery.html`, `events.html`, `sponsors.html`, `crowdfunding.html`, `contact.html` – the pages
- `public/css/style.css` – styles
- `public/js/main.js` – menu, animations and page scripts
- `public/images/` – gallery photos and sponsor logos
- `public/car/` – car photos
- `views/` – logos (Pillai University, Hyperion)

## Hosting
Static site on Cloudflare Pages – no build step.
- Build command: *(leave empty)*
- Build output directory: `/`

Every push to `main` updates the live site automatically.

## Local preview
Open `index.html` in a browser, or run `python -m http.server 8080` in this folder and open http://localhost:8080.
