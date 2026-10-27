# Games notes

- All four games are `inputKind: 'score'`: the phone calls `send(currentScore)` whenever it changes, the shell forwards the latest value every 750 ms, and the Screen reads `scores` (playerId -> latest score).
- Every game runs on its own clock from mount (intro, play, end podium) and calls `onWin` once at the end. Phones only need `payload.phase`; late joiners pick it up from the 3 s heartbeat.
- stack: Scroll Race. Score = metres scrolled x streak (x1 to x5, resets after 1 s still). Mentors give 2x for 5 s halfway.
- rebuild: Rebuild the Picture. 6 house pieces, 100 pts each for closeness (snap within 7%), speed bonus on Done if all are placed. Walls auto place halfway.
- priya: Pack Priya's Schedule. Step lengths and rules live in `CONFIG` at the top of priya.tsx. Score = months (lower is better, 0 = plan not valid yet).
- bots: Be the Boss. Score = jobs sent to the right helper. Cards fall faster over time; a wrong helper costs 1.2 s.
- Test several phones in one browser with `/play?room=CODE&as=1`, `&as=2`, ...
