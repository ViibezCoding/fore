# Fore!

A flick-to-swing golf game that runs in your browser. Flick to swing, nail the timing and watch the ball fly.

**Play:** https://viibezcoding.github.io/fore/

> Status: early development (Phase 0: project setup). See [GAME_DESIGN.md](GAME_DESIGN.md) for the full plan.

## Run it on your computer

You need [Node.js](https://nodejs.org/) (the LTS version).

```sh
npm install      # first time only
npm run dev      # starts the game at http://localhost:5173/fore/
```

Edit any file in `src/` and the browser updates on its own.

### Test on your phone
`npm run dev` also prints a **Network** address (like `http://192.168.1.20:5173/fore/`). Open it on a phone connected to the same Wi-Fi.

## Other commands

| Command | What it does |
|---|---|
| `npm run build` | Checks types and builds the finished game into `dist/` |
| `npm run preview` | Plays the built version from `dist/` |
| `npm run typecheck` | Checks the code for type errors only |

## Publishing

Every push to `main` builds the game and publishes it to GitHub Pages automatically (see `.github/workflows/deploy.yml`). Check the **Actions** tab on GitHub to watch it run.

## Project layout
```
index.html        the page that loads the game
src/main.ts       starts the game (currently a placeholder range scene)
src/style.css     page and HUD styles
public/           files copied as-is into the build (models, sounds, images)
GAME_DESIGN.md    the design doc and roadmap
```

## License

Code is MIT licensed (see [LICENSE](LICENSE)). Any third-party assets will be listed here with their licenses.
