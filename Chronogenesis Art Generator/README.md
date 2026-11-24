# CHRONOGENESIS — Cinematic Architecture V4 (startup fix)

**Category 3: Computationally Generated Art — experimental procedural architectural sculpture generator.**

This version changes the *construction system*, not just the UI. The buildings are not imported models or images. They are assembled from programmatic shapes and deterministic spatial rules. The result will still look like realtime 3D art rather than a photorealistic concept painting; the visual match to inspiration images needs evaluation in your browser.

## Start (Windows + VS Code)

1. Extract **Chronogenesis V4 Cinematic.zip**. Keep all seven files together in the same folder.
2. VS Code > **File > Open Folder** > select `Chronogenesis V4 Cinematic`.
3. Open Terminal and run `python -m http.server 8003`.
4. In Edge or Chrome, open **http://localhost:8003** in a NEW tab. Do not double-click `index.html` directly.
5. If another service uses 8003, choose another port, e.g. `8004`, and use `http://localhost:8004`.
6. Internet access is necessary to load the **Three.js 0.180.0** CDN modules and Google Fonts.

The web server prints requests when the page loads. Leave the terminal running. Stop the server with `Ctrl+C`.

## Files

- `index.html` — interface layout, buttons, panels.
- `styles.css` — interface styles and cinematic presentation mode.
- `main.js` — renderer, cameras, mood lighting, seeded generation controls, interactive gravity, evolution, rewind, PNG and JSON export.
- `architecture.mjs` — **NEW** procedural architecture shape grammar, windows, tracery, cathedral nave, roof ribs, buttresses, bridges, orbital structures, background nebula.
- `core.mjs` — seeded genome, four architectural layout forms, mutation/selection, graph validation and numeric metrics (unchanged generator logic from V3).
- `core.test.mjs` — algorithm reproducibility and validity tests.

## Controls

- Generate a new world (seed is editable).
- Evolve + Morph 12 variations — compares 12 mutations and transitions between architectural forms.
- Six gravity directions — artistic directional deformation, **not** realistic physics.
- Rewind State — returns to a saved design state; subsequent actions create a new branch. **Not** true backward integration of physical forces.
- Drag to orbit, wheel to zoom, `F` cinematic view (hide sidebars), `G` cycle gravity, `E` evolve, `R` rewind, `N` regenerate.
- Export PNG art or JSON of the source genome.

## Vibe coding: Your artistic controls

Open `architecture.mjs` and try editing the `CONFIG` at its top:

```js
export const CONFIG = {
  monumentScale: 1.23,
  facadeBays: 5,
  ornamentLevel: 2,
  archCurvature: 0.82,
  spireStretch: 1.16,
  bronzeLineWeight: 0.075,
};
```

- Change `facadeBays` to `7` for more window bays and buttresses (will slow rendering somewhat).
- Change `spireStretch` to `1.6` for more dramatically vertical tower finials.
- Change `ornamentLevel` to `1` to simplify details, then compare screenshots.
- For coloring and lights, modify `PALETTES`, `renderer.toneMappingExposure`, and `keyLight` in `main.js`.

**Suggested experiment:** Save the same seed twice with different `facadeBays` and compare the artwork. Then evolve to a new architectural form and observe whether the same grammar produces a recognizably different composition.

## Performance and reproducibility

Complex architectural forms create more geometry than V3. If the page stutters, try `ornamentLevel: 1`, lower `facadeBays` to `3`, or reduce the rendering pixel ratio in `main.js` from `1.65` to `1.25`. During morphs the old and new sculptures coexist for about four seconds.

The architecture inherits the generator's seeded genome; procedural shape placement is deterministic for given seed and settings. The interface's design score measures geometry heuristics rather than human artistic quality. Currently the score is NOT recalibrated to count the new ornamentation, and the tower count in the inspector means *tower genes*, not necessarily literal visible towers.

## Testing and limitations

- `node core.test.mjs` runs seed/reproducibility/graph tests for 150 seeds.
- V4 geometry has been sanity-tested using stubbed Three.js classes, across the four architecture forms and multiple seeds.
- The visual look and browser performance still require testing on your real computer: CDN dependencies cannot be loaded in the development environment here.
- The inspirational high-detail images were **concept references**; the prototype uses realtime procedural meshes and should not be represented as reproducing those images exactly.

## Academic conduct

Your course specifies that ChatGPT/LLMs cannot be used in drafting, editing, or referencing the report. Write the report independently and ask your instructor to clarify any restrictions on AI-assisted implementation. Understand, test, and make substantial design changes to the code that you present. Documenting your own decisions and experiments matters more than simply demonstrating polished output.

## Startup fix

This package fixes a V4 regression where scene state variables and materialsFor() were missing from `main.js`, causing a `ReferenceError` on initialization. If a renderer error persists, the page now displays the JavaScript error message; open Edge Developer Tools (F12) → Console to view the stack trace.
