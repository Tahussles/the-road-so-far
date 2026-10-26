import type { FC } from 'react';

export type Player = { id: string; name: string; emoji: string };

export type ScreenProps = {
  players: Player[];
  votes: Record<string, number>;   // playerId -> option index, current round only
  taps: Record<string, number>;    // playerId -> total taps this game
  scores: Record<string, number>;  // playerId -> latest score this game (inputKind 'score')
  setPayload: (payload: unknown) => void; // broadcast to phones (round, options, glow, assigned task...)
  resetVotes: () => void;          // call when a new vote round starts
  onWin: (summary: { line: string; stats?: Record<string, number> }) => void;
  accent: string;                  // css color for this stop
};

export type ControllerProps = {
  me: Player;
  payload: unknown;                // whatever the Screen last passed to setPayload
  send: (value: number) => void;   // vote: option index. tap: send(1) per tap. score: send(current score) as often as you like; the shell sends the latest every 750 ms
};

export type SimInput = { playerId: string; value: number };

export type GameModule = {
  id: 'stack' | 'rebuild' | 'priya' | 'bots';
  inputKind: 'vote' | 'tap' | 'score';
  Screen: FC<ScreenProps>;
  Controller: FC<ControllerProps>;
  // called every 300 ms in Sim Mode with fake players; return fake inputs (score games return each player's current score)
  simulate: (players: Player[], payload: unknown, tick: number) => SimInput[];
};
