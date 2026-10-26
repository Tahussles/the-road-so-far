# The Road So Far: shared spec and contract

Both developers build against this file. Do not change the contract section without telling the other person.
`docs/mvp.html` is the clickable reference for FLOW and game behaviour. `THEME.md` defines the LOOK and overrides the MVP's dark styling.

## Ownership
- **Taha (shell):** everything outside `src/games/`. Scaffold, realtime, presenter flow, title, map, bus, story cards, win, finale, phone shell, Sim Mode, deploy.
- **Ebrahim (games):** everything inside `src/games/`. Four games plus a local harness. Never edit files outside `src/games/` without asking Taha.
- Git: small commits, plain messages, authored by the human only. No Co-Authored-By, no AI attribution anywhere.

## Contract (`src/games/types.ts`, created by Taha in step 0)
```ts
import type { FC } from 'react';

export type Player = { id: string; name: string; emoji: string };

export type ScreenProps = {
  players: Player[];
  votes: Record<string, number>;   // playerId -> option index, current round only
  taps: Record<string, number>;    // playerId -> total taps this game
  setPayload: (payload: unknown) => void; // broadcast to phones (round, options, glow, assigned task...)
  resetVotes: () => void;          // call when a new vote round starts
  onWin: (summary: { line: string; stats?: Record<string, number> }) => void;
  accent: string;                  // css color for this stop
};

export type ControllerProps = {
  me: Player;
  payload: unknown;                // whatever the Screen last passed to setPayload
  send: (value: number) => void;   // vote: option index. tap: call send(1) per tap; the shell batches
};

export type SimInput = { playerId: string; value: number };

export type GameModule = {
  id: 'stack' | 'rebuild' | 'priya' | 'bots';
  inputKind: 'vote' | 'tap';
  Screen: FC<ScreenProps>;
  Controller: FC<ControllerProps>;
  // called every 300 ms in Sim Mode with fake players; return fake inputs
  simulate: (players: Player[], payload: unknown, tick: number) => SimInput[];
};
```
`src/games/index.ts` exports `GAMES: Record<GameModule['id'], GameModule>`. The shell renders `GAMES[id].Screen` on the projector and `GAMES[id].Controller` on phones. Games never import Supabase.

Realtime protocol (shell only): channel `room:<CODE>`. Presenter broadcasts `state {stopIndex, phase, gameId, payload}` on change plus a 2 s heartbeat. Phones send `join {id,name,emoji}` and `input {id, gameId, kind, value}`; tap inputs batched every 300 ms. Presence for player count.

Presenter keys: Right/Space next, Left back, S Sim Mode, R restart game, Q big QR, F fullscreen.

## Stops

### 1. GoonHacks (Waterloo) / Scrollify. Accent var(--stop-goon)
- Photos: none (illustrated placeholder)
- Scrollify: Chrome extension + SwiftUI app + Supabase. Tracked browsing, streaks, friend leaderboards. Built as a joke: an app to make you MORE unproductive.
- Struggle: first hackathon, first time vibe coding with Cursor. No tech stack, no idea, no plan.
- Got us through: two friends who had done hackathons before guided us.
- Win line: "Scrollify shipped." / "Alone we built a Frankenstack. With mentors, it snapped together."
- **Game `stack` (vote), 3 rounds, ~8 s each:**
  - "What do we build?" Chrome extension (correct) / A PowerPoint / Excel macro / A fax machine
  - "What is the app built in?" Scratch / SwiftUI (correct) / Microsoft Paint / Notepad
  - "Where does the data live?" Sticky notes / localStorage forever / Supabase (correct) / Ask ChatGPT
  - Round 1 has NO hint. Winning pick lands as a block in "Our stack" (joke picks are red, dashed and wobbling).
  - Before round 2 two mentor characters walk in; from then on the correct option glows on the projector AND on phones (send `glow` in payload). Sim crowd votes randomly in round 1, ~75% correct after mentors.
  - End: "Scrollify ✓" block lands on top, then `onWin`.

### 2. Hackville 2026 (Sheridan College) / Architex. Accent var(--stop-hack)
- Photos: hackville-vishnu.jpg, hackville-laptop.jpg, hackville-snacks.jpg, hackville-sleeping-bags.jpg
- Architex: describe an idea (typed or voice via ElevenLabs), get an architecture graph in React Flow, AI + GitHub API turn it into a real repo. Next.js, React Flow, GSAP, Tailwind, FastAPI, MongoDB Atlas, Gemini, GitHub OAuth.
- Team: Taha, Ebrahim, Alex Meng, Vishnu Sai (Alex and Vishnu from UofT).
- Struggle: same skill level as before, just Cursor. Then a tangled git branch wiped the entire latest frontend and it was rebuilt from scratch.
- Got us through: Alex and Vishnu came up with the idea and carried the build.
- Win line: "Frontend rebuilt." / "We watched cracked people work, then copied it."
- **Game `rebuild` (tap):** 1.5 s intro `$ git checkout main` / "Your local changes to the frontend have been lost." Architex nodes (Frontend, React Flow, FastAPI, MongoDB, GitHub, Gemini, OAuth) sit scattered and grey. Crowd mashes; a meter fills; nodes snap into place and connect one by one. At 50% "Alex & Vishnu joined: taps count double" and taps count 2x. Target scales with player count (about 18 taps per player, minimum 150). Top 3 tappers by name. Phone: one huge TAP button with haptic.

### 3. AF Hacks "Growing Canada" by Ascendance Foundry (Waterloo, Sep 2026) / Portage. Accent var(--stop-af)
- Photos: afhacks-screen.jpg, afhacks-room.mp4 (muted loop behind the story card)
- Portage: cited, deadline aware licensing roadmap for internationally educated nurses becoming RNs in Ontario. Voice interview in 9 languages, deterministic critical path engine, live at portage-navy.vercel.app. "Carry your career across."
- Struggle: just the two of us, nobody to carry us.
- Got us through: we learned to ship a full stack app ourselves, deployed and tested.
- Win line: "Priya is on her way." / "We stopped being carried and started shipping."
- **Game `priya` (vote), 4 rounds, ~8 s each, no hints:** Priya is an ICU nurse educated in India. "What should she do next?"
  - Step 1: Write the NCLEX / Get credentials assessed (correct) / Police check / Register as RN
  - Step 2: Apply to CNO (correct) / Register as RN / Police check
  - Step 3: Police check / Write the NCLEX (correct) / Register as RN
  - Step 4: Register as RN / Police check (correct)
  - Picks land on a timeline (correct = accent, wrong = red). Reveal: "Crowd got X of 4 right", then two bars animate: One step at a time, Dec 2027 (full bar) vs The Portage plan, Apr 2027 (~42% bar). "Same nurse, same rules. Critical path scheduling saves about 8 months."

### 4. Grok Bot Hackathon (tonight) / The Road So Far. Accent var(--stop-grok)
- Photos: team-selfie.jpg, grokbot-credits.jpg
- Struggle: 90 minutes, two of us, and a team of AI bots.
- Got us through: from being guided, to being carried, to shipping, to leading a team.
- Win line: "You just built this app." / "Every tap tonight was a bot finishing a real task we did to ship this."
- **Game `bots` (tap):** every phone is a bot teammate (show "You are Bot <emoji> <name>" and its current task). Kanban: To do / Doing / Done with tasks Map, Bus animation, Realtime, Pick the Stack, Rebuild game, Priya game, Bot game, Polish, Script, Deploy. Total taps fill tasks in order; each finished card slides to Done. Target about 20 taps per player, minimum 200. Phone button says WORK.

### Finale (shell)
Map zooms out, all 4 checkmarks. Beats animate in: Guided → Carried → Shipped → Leading. "Thanks for riding with us." Totals: passengers, taps, votes.
