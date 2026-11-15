# MISSION VOID

A React + Vite lunar outpost simulation.

## Run on Windows

1. Extract this ZIP.
2. Open the extracted `mv_work` folder in VS Code.
3. Open Terminal → New Terminal.
4. Run:

   ```powershell
   npm install
   npm run dev
   ```

5. Open the local URL printed by Vite (normally http://localhost:5173/).

## What was corrected

The original archive contained only the React application source file. This archive includes the Vite project files needed to run it, plus a global CSS reset that removes the default Vite `#root` max-width, centered margin, and padding. That default styling was constraining the game interface to a narrow column.


## Hero intro and game launch

The animated MISSION VOID hero intro is now the default homepage (`index.html`). After running `npm run dev`, open `http://localhost:5173/` to see it. The **START MISSION** button opens the lunar outpost simulation at `/outpost.html`.

The original React/Vite game entry page is preserved as `outpost.html`. The intro is also included separately as `mission-void-hero-intro.html`.


## How to play (made for ages 7-12)

The astronaut only moves when **you** move him. Nothing runs by itself any more.

- **Walk:** `W A S D` or the arrow keys, or drag the round on-screen **joystick** (works with a finger or a mouse). Hold `Shift` to run.
- **Look around:** drag the screen. Scroll or pinch to zoom. Walking is relative to the camera, so "up" always walks away from you.
- **Missions:** the 30 missions (6 chapters x 5) are done by walking to the **glowing ring** that marks each objective. A floating **yellow arrow** above the astronaut points the way. Stand inside the ring until it turns **green** and the progress bar fills.
- **Rover:** stand next to the rover and press `E` (or tap the big button) to hop in. Steer it with the same keys / joystick. Press `E` again to hop out. Objectives that say "drive" need the rover, and the others are done on foot.
- Buildings and rocks are solid, and the edge of the Moon stops you from wandering off.
- **My Missions** (button on the right, or the card at the bottom-left of the 3D view) shows the current mission, the next mission and the completed ones. It can pause the game; closing it never restarts anything.
- Progress (chapter, mission, objective, completed list, unpaid rewards) is saved in browser local storage. Coins and science points are paid once per mission when it completes.
- A "How to play" screen appears when the game opens. Tapping **Let's go!** starts the game and lets ORION speak (browsers need one click first).

## ORION voice companion

ORION is a friendly robot buddy who talks the player through every mission (browser speech synthesis, so an
available system voice is needed). He reads each objective out loud, cheers when an objective is finished, nudges the
player with a hint if they wander for a while, and congratulates them when a mission is complete.

- **Voice: ON / OFF** mutes or unmutes ORION.
- **🎙 voice style** cycles **Friendly** (default, warm and slightly slower for kids), **Robot** and **Squeaky**, and plays a sample. The choice is remembered.

## Files added or changed

- `src/missions.js` - the campaign data.
- `src/missionRunner.js` - the game engine: player movement, collisions, the rover, mission flow and saving.
- `src/outpostScene.js` - draws the astronaut (with a proper walking gait), rover, glowing ring and the yellow guide arrow; one chase camera that follows the player.
- `src/App.jsx` - joystick, keyboard controls, rover button, "How to play" screen, ORION voice and the My Missions window.


## ORION progression update

- The lunar regolith now uses a warmer, more natural grey-tan surface palette.
- A new save starts with one habitat module; additional structures are hidden until their matching upgrade is purchased.
- Building an upgrade updates the 3D scene immediately (greenhouse, recycler tanks, solar array, battery module, shield, rover bay, and research lab).
- The starting construction wallet and upgrade costs are paced around rover material runs and mission rewards.
- The Build screen explains Coins, Materials, Science Points, Power, Oxygen, Water and Food.
- Low oxygen, water and food levels now trigger a visible alert; the alert can pause the simulation so the player can choose a response.
- After each mission, the player chooses when to begin the next one. The player can pause, build, explore, or take a break first. That choice is saved.
- HUD controls have been repositioned to reduce overlap between the mission chip, joystick, rover control and ORION.

Run as before from this folder with `npm install` and `npm run dev`.


## Latest interface and lunar-environment update

- ORION is positioned at the bottom-middle of the 3D outpost viewport.
- The Sim Lab button/panel and Grid ON/OFF control have been removed from the gameplay dashboard.
- Every mission in all six chapters has its own side-quest briefing, objectives, icon and reward values (30 distinct side quests total).
- The 3D lunar scene now receives a chapter-and-mission-specific seed. Terrain noise, crater placement, scattered environment objects, surface tint and atmospheric fog therefore regenerate when the active mission changes.
- To see a different landscape, advance to another mission or chapter. Returning to the same mission reproduces that mission's landscape consistently.


## Walk inside the habitat (new)

- Walk up to the habitat door (the lit entrance on the Moon-facing side of the big round hub). A cyan **Enter the habitat (E)** button appears. Press `E` or tap it.
- Inside is **Habitat Core**, a cut-away room you can orbit with drag / scroll. Walk with the same keys or joystick. The green **AIRLOCK** door on the near wall is the exit (**Go outside** button / `E` when you stand near it).
- Every system is in the room, each with a live screen and a status light (green / yellow / red):
  - **Power:** Solar Controller, Battery Bank (racks fill as you buy Battery Banks), Power Distribution (made vs used, and ON/OFF switches for each machine).
  - **Life support:** Oxygen Generator, Water Recycler, Thermal Control, Food Garden (greenhouse), Research Bay, Radiation Shield monitor, Crew Quarters and the Command Console with all five resource bars.
  - Machines you have not bought yet show an **EMPTY BAY** with hazard tape; building the upgrade fills the bay.
- Stand next to a machine to get an info card with the live numbers and a one-line science tip, and ORION explains it out loud.
- Missions pause while you are inside and carry on when you step back out.

New file: `src/interior.js` (room layout, machine positions, live readouts). Changed: `missionRunner.js` (indoor walking and enter/exit), `outpostScene.js` (the room, machines and screens), `App.jsx` (ORION position, buttons, info card).


## Bug-fix pass

- **New Simulation / game-over restart left the game frozen.** `resetCampaign()` pauses the runner, but only the in-game Restart button showed the "Let's go!" screen again. The menu's New Simulation and the game-over Restart now show it too, and clear any open crisis, mission and countdown state.
- **Crisis pop-up could never be closed.** If neither option of an event was affordable (for example the oxygen leak with no coins and no materials) both buttons were disabled and there was no countdown. A "Not enough resources to respond" button now ends the event.
- **Base progress was lost on reload.** Mission progress was saved, but coins, materials, buildings and resources were not, so a reload wiped what the missions had paid for. The base is now saved to local storage too (and cleared by every restart).
- **3D scene leaked on every mission change.** Canvas pointer/wheel listeners were never removed and textures were never disposed when the scene was rebuilt. Both are now cleaned up, and the two-finger pinch handler no longer reads a missing pointer.
- **`npm run build` / `preview` had no game page.** Only `index.html` was built, so START MISSION led to a 404. `vite.config.js` now builds both `index.html` and `outpost.html`.
- **Dependencies:** `@tailwindcss/vite` / `tailwindcss` raised to `^4.2.2` (first release that supports Vite 8) and the Vite range loosened to `^8.0.0`.
- README now names the correct folder (`mv_work`).


## NASA lunar dataset source catalog (added without gameplay changes)

The folder `public/data/` now contains `nasa-lunar-datasets.json`, a machine-readable catalog of official NASA/PDS lunar datasets relevant to Mission Void:

- **LOLA GDR** — lunar elevation/topography products for terrain and rover-route research.
- **Diviner GDR** — gridded thermal/brightness-temperature products for lunar temperature context.
- **LEND RDR** — neutron measurements used to study lunar hydrogen distribution and possible water resources.
- **CRaTER calibrated data** — radiation/energetic-particle measurements.
- **LROC imagery** — lunar surface and crater imagery.

Official archive entry points:
- NASA/PDS LRO mission archive: https://pds-geosciences.wustl.edu/missions/lro/
- LOLA archive and product browser: https://imbrium.mit.edu/
- Diviner archive: https://www.diviner.ucla.edu/data
- NASA PDS LRO data release records: https://pds.nasa.gov/datasearch/subscription-service/SS-20260915.shtml

**Important scope note:** This addition is deliberately non-invasive. No gameplay code, mission logic, simulation values, 3D scene, controls, UI, or save data has been changed. The JSON is a source catalog, not a copy of the raw scientific measurements; the NASA archive products are linked rather than bundled. Therefore the current game does not yet consume NASA measurements at runtime. Do not describe the current gameplay as NASA-data-driven until a specific downloaded product has been processed and connected to the relevant simulation feature.

For a competition submission, cite the exact NASA/PDS product actually used, its product ID/version, and the date accessed. NASA archive metadata confirms that LOLA GDR products include gridded lunar elevation models, while Diviner GDR products include gridded thermal/brightness-temperature products.
