# Visual theme: "scrapbook adventure map" (THIS FILE WINS OVER docs/mvp.html FOR LOOK)

`docs/mvp.html` is the reference for FLOW and game behaviour only. Its dark look is replaced by this theme.

Inspiration: the Hack the North 2026 site. A bright illustrated world: cyan sky with teal mountains, a warm wooden table, and a parchment treasure map lying on it with a dashed red trail connecting chunky "sticker" objects. We copy the palette, type feel and treatment. We do NOT copy their logo, illustrations or any of their image assets; all art is our own (SVG/CSS).

## Tokens (`src/theme.css`, used by shell AND games)
```css
:root {
  /* sky + mountains */
  --sky-top: #6fd6ec;  --sky-bottom: #d6f6fb;
  --teal: #007899;     --teal-deep: #006566;  --teal-ink: #002833;
  /* wood table */
  --wood: #bd580f;     --wood-dark: #8e420b;  --wood-deep: #5f2c07;  --wood-shine: #ed6e12;
  /* parchment map */
  --paper: #fdf7ea;    --paper-warm: #fdf7ce; --paper-edge: #f1dcbf;
  /* ink + text */
  --ink: #232b08;      --ink-brown: #2f1604;  --muted: #6b5a45;
  /* brand reds + greens */
  --red-deep: #7f1a1a; --red: #d42b2b;        --red-text: #aa2222;
  --leaf: #698019;     --lime: #b9d35a;
  --sunset: linear-gradient(90deg, #7f1a1a 0%, #d42b2b 60%, #ed6e12 100%);
  --white: #ffffff;
  /* per-stop accents */
  --stop-goon: #ed6e12;  --stop-hack: #d42b2b;  --stop-af: #007899;  --stop-grok: #698019;
  /* shape */
  --radius: 8px; --radius-lg: 18px;
  --sticker-border: 6px solid #fff;
  --sticker-shadow: 0 10px 0 rgba(47,22,4,.18), 0 18px 30px rgba(47,22,4,.25);
}
```

## Type
- Headings: **Fredoka** 700 (Google Fonts), tight letter-spacing (-0.01em). Big titles use the sunset gradient as text: `background: var(--sunset); -webkit-background-clip: text; color: transparent;`
- Body/UI: **Satoshi** 500/700 from Fontshare (`<link href="https://api.fontshare.com/v2/css?f[]=satoshi@500,700&display=swap" rel="stylesheet">`), fallback `system-ui, sans-serif`.
- Section headings and body text in `--ink` (dark olive), never pure black.

## Treatments
- **Buttons:** sunset gradient fill, white bold text, `border-radius: 8px`, chunky 3D bottom edge `box-shadow: inset 0 -5px 0 rgba(0,0,0,.3)`; on press, translate down 3px and shrink the inset. Secondary buttons: paper fill, `--wood-deep` text, same inset edge.
- **Stickers:** every object, photo and card that "sits on the map" gets a thick white border (6px), slight rotation (-4deg to 4deg), and the sticker shadow. Photos look like polaroids taped on.
- **Map scene (projector):** top 40% sky gradient with layered flat teal mountain silhouettes and soft white clouds (CSS/SVG, slow parallax drift). Bottom 60% wooden table (horizontal planks in wood tones with subtle grain lines). A parchment map sheet lies on the table with irregular torn edges, slightly rotated. Road = thick dashed trail in `--red-deep` (stroke-dasharray), pins are sticker icons: GoonHacks a phone with a scroll bar, Hackville a node graph, AF Hacks a maple leaf, Grok Bot a little robot. A red flag sticker marks the finale. Little flower and leaf clusters (white petals, green leaves) at map corners.
- **The bus:** a chunky cartoon bus sticker (white outline), bright yellow `#ffc83d` body with `--red` stripe, bobs as it drives the dashed trail and leaves small dust puffs.
- **Story cards:** a paper sheet (`--paper`) pinned over the map with tape strips, polaroid photos to the right, heading in Fredoka with the stop accent.
- **Game screens:** paper panel over a blurred map; vote bars as paper strips filling with the stop accent; tap meters as a wooden track filling with the accent; kanban columns as three paper notes.
- **Phone (`/play`):** sky gradient top band, paper body, giant sunset-gradient buttons with the chunky edge. Tap button is a big round sticker.
- **HUD:** small paper tag with white border holding the QR and "N on the bus".
- Motion: gentle and bouncy (back-out easing), clouds drift, stickers pop in with a small overshoot. Respect `prefers-reduced-motion`.
- Projector readability: text sits on paper or with a soft paper backing, never directly on the busy sky or wood.
