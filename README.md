# Skeleton Kingdom: Rise of the Shadow

A 2D side-scrolling action platformer built with **React 19 + Vite + Phaser 3 + Arcade Physics**, deployable to **Vercel** for free.

Every visual and every sound in this build is **generated procedurally in code** (Phaser Graphics for art, Web Audio oscillators/noise for SFX and music) — there are no external image or audio files, so there are zero licensing costs and nothing to break if a CDN goes down.

---

## What's in this build

**Fully implemented and playable, start to finish:**
- Player controller: walk, run, sprint, jump (with coyote time + jump buffering so it's forgiving), double jump, wall slide, dash, roll, 3-hit sword combo, shield block, damage/knockback/i-frames, procedural limb animation with shading (no sprite sheets needed)
- Attack input is deliberately easy: **any letter key, or a click/tap**, attacks with the sword when you're close to an enemy
- 5-heart life system (not a numeric health bar) — run out of hearts and the game asks "Play New Game?"
- Camera system: smooth follow, deadzone, look-ahead, sprint zoom-out, boss arena lock, hit shake, intro pan
- Full enemy roster: Skeleton Soldier (melee), Archer (ranged, slow arrows), Wizard (fireball/iceball + teleport), Bomber (thrown bombs), Engineer (triggers a hidden trap), Flying Bat (drone/bomb-drop), plus three bosses — Skeleton Captain (Level 1 mini-boss), Skeleton Giant (Level 2 mini-boss, ground-smash), and Skeleton King (Level 3 final boss, 3 phases with a one-time reinforcement summon)
- **All three levels are real, playable, complete levels**, not stubs:
  - Level 1 — Enchanted Forest (easy)
  - Level 2 — Crystal Snow Mountain (moderate) — reskinned via tinting, moderate enemy density
  - Level 3 — Dark Crystal Castle (hard) — reskinned via tinting, lava hazards, two moving platforms, full enemy roster, King final boss
  - Beating a level unlocks the next one (saved to localStorage); the main menu has a **Select Level** screen showing locked/unlocked levels
- **"Speak the Magic Word" gate**: before each level's final gate, a speech-bubble UI asks you to say "Abra Ka Dabra" out loud. Uses the browser's built-in Web Speech API with fuzzy matching, and always has a "Say it! (or press Enter)" button fallback for browsers/devices without a working microphone — the game is never blocked
- HUD: hearts, energy bar, coin/gem counters, level progress bar, boss health bar, pause menu, mute toggle, on-screen touch controls for mobile, an always-visible "How to Play" hint panel
- Save system: localStorage checkpoints, coins/gems/hearts, level-unlock progression, "Continue" resumes exactly where you left off (in whichever level you were in)
- Procedurally synthesized audio: every SFX + generative ambient/boss music, no audio files
- Full-viewport responsive canvas (no black bars/letterboxing) on desktop, tablet, and mobile

**Not included (reasonable next steps, not started):**
- Gamepad support, skill tree UI, costumes/pets, minimap
- Crouch/climb, push/pull mechanics from the original wishlist
- A dedicated settings screen for volume sliders (mute toggle exists; granular volume doesn't)

This is a complete, deployable 3-level game — not a demo of one level anymore.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | React 19 + Vite |
| Game engine | Phaser 3 (Arcade Physics) |
| Styling | Tailwind CSS |
| Audio | Web Audio API (synthesized), Howler-style gain routing |
| Icons | lucide-react |
| Save data | localStorage |
| Deployment | Vercel (static build) |

Everything is free and open-source. No paid services, no API keys, no asset packs.

---

## Folder structure

```
src/
  game/
    scenes/      BootScene, MenuScene, Level1Scene, Level2Scene, Level3Scene
    systems/      CameraSystem, CombatSystem, ParticleSystem, InputSystem
    managers/      AudioManager, SaveManager
    entities/      Player, enemies/ (BaseEnemy, Soldier, Archer, Wizard, Bomber,
                   Engineer, FlyingBat, Captain, Giant, King)
    utils/        textureGenerator.js (all procedural art)
    config.js      Phaser game config / scene registry
    EventBus.js      Bridges Phaser <-> React
  components/    GameContainer.jsx, HUD.jsx, SpeechGate.jsx (magic-word gate UI)
  context/      GameContext.jsx
  App.jsx, main.jsx, index.css
```

---

## Controls

| Action | Keyboard |
|---|---|
| Move | Arrow Keys / A-D |
| Jump / Double Jump | Space (generous coyote time + jump buffering) |
| Sprint | Hold Shift |
| Dash | Ctrl |
| Roll | L |
| Attack (3-hit combo) | **Any letter key**, or click/tap |
| Shield | Hold K |
| Pause | Esc |

On touch devices, on-screen controls appear automatically.

---

## Run it locally

Requires Node.js 18+.

```bash
npm install
npm run dev
```

Open the printed local URL (typically `http://localhost:5173`).

## Build for production

```bash
npm run build
npm run preview   # optional local check of the production build
```

Output goes to `dist/`.

---

## Deploy to Vercel (free)

**Option A — Vercel CLI**
```bash
npm i -g vercel
vercel
```
Follow the prompts (framework auto-detected as Vite via `vercel.json`).

**Option B — Git + Vercel dashboard**
1. Push this project to a GitHub repo.
2. Go to vercel.com → **New Project** → import the repo.
3. Framework preset: Vite. Build command: `npm run build`. Output directory: `dist`.
4. Deploy — you'll get a free `*.vercel.app` URL.

No environment variables or paid add-ons are required.

---

## Notes on the "no hallucination" constraint

Every dependency listed in `package.json` is a real, actively maintained package on npm (Phaser, React, Vite, Howler, lucide-react, Tailwind). Nothing in the code references an asset file, font, or API that doesn't exist — all art and audio are generated at runtime from code you can read in `textureGenerator.js` and `AudioManager.js`.
