# Fore!

A flick-to-swing golf game that runs in your browser. Flick to swing, nail the timing and watch the ball fly.

**Play:** https://viibezcoding.github.io/fore/

> Status: early development (Phase 2 complete: ball flight, wind, surfaces and boosters). See [GAME_DESIGN.md](GAME_DESIGN.md) for the full plan.

## How to play

Press and hold anywhere: a ring starts shrinking toward the ball. Flick up and let go as the ring meets the ball.

- **Flick speed** sets power.
- **Flick direction** aims left or right.
- **Bending the flick** curves the ball the same way (draw, fade, hook, slice).
- **Letting go as the ring lines up** gives a **Perfect** strike. Early pulls the ball left and low; late pushes it right and high.

Every ball gets a new wind, shown by the arrow in the top right (up means it's blowing downrange) and by the flag. Where the ball lands matters: it runs out on the fairway and green, stops quickly in the rough, plugs in bunkers and is lost in the water.

The goal is distance, and boosters get you there. Fly through a gold **boost ring** for a burst of speed, or land on a pink **bounce pad** to spring back into the air. Each one works once per ball, and a good shot can chain several. The layout changes with every new ball, including after a reset.

Press **R** or the **Reset** button to bring the ball back to the tee mid-shot.

The small line at the bottom shows the raw swing numbers, for tuning.

## Run it on your computer

You need [Node.js](https://nodejs.org/) (the LTS version).

```sh
npm install      # first time only
npm run dev      # starts the game at http://localhost:5173/fore/
```

Edit any file in `src/` and the browser updates on its own.

Two URL options help with tuning: `?wind=off` for calm air, and `?seed=123` to replay the same series of winds and booster layouts.

### Test on your phone
`npm run dev` also prints a **Network** address (like `http://192.168.1.20:5173/fore/`). Open it on a phone connected to the same Wi-Fi.

## Other commands

| Command | What it does |
|---|---|
| `npm run build` | Checks types and builds the finished game into `dist/` |
| `npm run preview` | Plays the built version from `dist/` |
| `npm run typecheck` | Checks the code for type errors only |
| `npm test` | Runs the unit tests (ball flight, flick reading, swing timing) |

## Publishing

Every push to `main` builds the game and publishes it to GitHub Pages automatically (see `.github/workflows/deploy.yml`). Check the **Actions** tab on GitHub to watch it run.

## Project layout
```
index.html        the page that loads the game
src/main.ts       starts the game: swing input, game loop, camera
src/core/         flick reading and swing tuning (power, timing, curve)
src/physics/      ball flight, bounce and roll
src/scene/        the range, chase camera and ball trail
src/ui/           HUD and the sweet-spot ring overlay
src/style.css     page and HUD styles
public/           files copied as-is into the build (models, sounds, images)
GAME_DESIGN.md    the design doc and roadmap
```

## License

Code is MIT licensed (see [LICENSE](LICENSE)). Any third-party assets will be listed here with their licenses.
