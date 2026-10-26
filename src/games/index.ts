import type { GameModule } from './types';
import { STUBS } from './stubs';
import { stack } from './stack';
import { rebuild } from './rebuild';

export const GAMES: Record<GameModule['id'], GameModule> = {
  stack,
  rebuild,
  priya: STUBS.priya,
  bots: STUBS.bots,
};
