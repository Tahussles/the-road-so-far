# Games notes

- All four games live here; `index.ts` no longer uses `stubs.tsx` (safe to delete).
- Screens re-send their payload every 1 s (`useBroadcast` in `ui.tsx`), so the shell clearing payload on game mount, or late joiners, are fine.
- Vote games end on their own timers (stack ~35 s, priya ~46 s). Tap games end only when the target is hit: stack none, rebuild max(150, 18 x players) with 2x after 50%, bots max(200, 20 x players).
- Tap counting in rebuild starts after the 1.8 s intro; taps during the intro do not count.
- onWin is called once per mount. Stats: stack {correct, rounds}, rebuild {taps, topTaps}, priya {correct, of}, bots {taps, bots}.
