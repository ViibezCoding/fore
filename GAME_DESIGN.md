# Fore! Game Design

A golf take on Flick Home Run!. You stand behind the golfer on a driving range that becomes more fantastical as you progress. Flick to swing, then watch the ball fly. Each shot is quick, and the payoff is watching how far it goes.

## Stack
TypeScript + Three.js, built with Vite, deployed to GitHub Pages by GitHub Actions. No physics engine: ball flight is our own code, so it's easy to tune.

## 1. The flick-to-swing mechanic

| Flick input | Effect on the shot |
|---|---|
| **Speed** of the flick | Power (clubhead speed) |
| **Direction** of the flick | Aim, left or right |
| **Curve** in the flick path | Spin: draw or fade (hook or slice if overdone) |
| **Release timing** | Contact quality. A sweet-spot ring shrinks around the ball; releasing when it lines up gives a **Perfect** strike. Early or late releases are mishits. |

Release timing replaces hitting a pitch in Flick Home Run!: it's the one skill that separates a good shot from a great one.

Measure flick speed in pixels per millisecond, scaled to screen size, so phones and desktops play the same.

### Ball flight model
- Each fixed physics step (120 Hz) applies gravity, drag (grows with speed squared), spin lift, sideways spin curve and wind.
- After landing, the ball bounces and rolls; the surface sets how much (fairway, rough, green, water, sand).
- The camera follows behind the ball, with a slow-motion replay for great shots.

## 2. Game modes

| Flick Home Run! | Fore! | Rules |
|---|---|---|
| Home Run mode | **Long Drive** | 10 balls. Drives past the Monster Line count; tracks best distance and count. |
| Target mode | **Target Range** | Floating greens and targets at different distances. More points closer to the pin. |
| Stages | **Challenge Tour** | Themed stages with goals ("3 balls inside 10 yards", "carry the lake", "hit the moving barge"). Later stages add wind, rain and obstacles. |
| (new) | **Closest to the Pin** | One hole, 5 balls, best distance counts. Daily challenge with a shared seed (post-1.0). |

## 3. Upgrades

### Currency: Tees
| Source | Tees |
|---|---|
| Distance | 1 per 10 yards of carry |
| Perfect strike | +5 |
| Monster Line / target hit | +10 to +25 |
| Challenge stage clear | 50–200 (first clear only) |
| Each star on a stage (max 3) | +25 |
| Daily challenge (post-1.0) | Fixed bonus, once per day |

Stage replays pay less, so players can't farm one easy stage.

### Golfer stats (permanent, ~10 levels each, cost ×1.5 per level)
| Stat | Effect |
|---|---|
| **Power** | Higher maximum clubhead speed |
| **Control** | Less random wobble in aim |
| **Timing** | Wider Perfect window on the sweet-spot ring |
| **Spin** | More curve from a curved flick |
| **Focus** (optional) | Slows the ring once per round |

### Equipment (bought once, chosen before a round)
Equipment uses **trade-offs, not a power ladder**, so older gear stays useful.
- **Clubs:** e.g. *Bomber Driver* (+Power, −Control), *Tour Driver* (balanced, expensive), *Wedge* (high, short, stops quickly).
- **Balls:** *Distance* (less drag), *Spin* (more curve), *Wind* (less wind effect).
- **Cosmetics:** trails, ball skins, outfits. No stat changes.

Final shot stats = stat levels + club modifiers + ball modifiers, each capped. Physics only reads the final numbers.

### Balance rules
- Upgrades widen what's possible but don't play for you. Bad flicks are still bad shots.
- Every Challenge stage is clearable with the stats you'd normally have at that point. Stars reward extra upgrades.
- A fully upgraded golfer drives about 30–40% farther than a new one, not 3×.
- Free respec at any time.
- Stages unlock with **stars**, not Tees.

### Data
`data/upgrades.json`, `data/clubs.json`, `data/balls.json`, `data/stages.json`. Save data lives in localStorage with a version number so updates don't wipe saves.

## 4. Visual and audio direction
- Low-poly, bright 3D. Kenney.nl CC0 models as placeholders.
- Great-shot feedback: hit-stop, screen shake, a crisp strike sound, crowd reactions, a "FORE!" callout on huge drives.
- Big readable HUD: distance, carry, roll, ball speed, wind. HTML/CSS over the canvas.

## 5. Code layout (target)
```
src/
  main.ts            boot, game loop
  core/              input (flick capture), timing, state machine
  physics/           ballFlight.ts, surfaces.ts, wind.ts
  scene/             range builder, camera rigs, golfer, effects
  modes/             longDrive.ts, targetRange.ts, challenge.ts
  data/              clubs.json, stages.json, upgrades.json, balls.json
  ui/                HUD, menus, shop
  audio/
public/assets/       models, textures, sounds
```
Seeded randomness for wind and stages. Vitest unit tests for ball-flight math.

## 6. Roadmap

| Phase | Goal | Done when… |
|---|---|---|
| **0. Setup** | Repo, Vite + TS + Three.js, Pages deploy | A 3D scene is live at the Pages URL |
| **1. Swing prototype** | Flick input → ball flight → landing, placeholder shapes | Swinging is fun with boxes and spheres. **Don't move on until it feels good.** |
| **2. Ball flight polish** | Spin, wind, bounce/roll, surfaces, camera follow, distance readout | Draws, fades and wind feel believable |
| **3. Long Drive** | 10-ball loop, Monster Line, results screen (with Tees earned), local high score | A full round plays start to finish |
| **4. Art and feel** | Low-poly range, golfer animation, sounds, Perfect effects, replays | Screenshots look shareable |
| **5. More modes** | Target Range, Closest to the Pin, menus | Three modes playable |
| **6. Challenge Tour + upgrades** | Stages from JSON, stars, Pro Shop, equipment, save data, price tuning | A complete game loop with goals to chase |
| **7. Mobile + performance** | Touch tuning, orientation, 60 fps on mid-range phones, settings | Plays well on a real phone |
| **8. v1.0** | README with GIFs, asset credits, bug fixes, landing page entry | v1.0 release tag |
| **Post-1.0** | Daily seeded challenge, more themed ranges, score cards, 2-player hot-seat | — |

## 7. Rules for the repo
- Copy Flick Home Run!'s *design*, never its art, sounds or name.
- Only commit assets we have rights to (our own, or CC0). Credit them in the README.
