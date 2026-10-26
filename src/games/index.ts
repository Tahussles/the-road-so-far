import type { GameModule } from './types';
import { STUBS } from './stubs';
import { stack } from './stack';

export const GAMES: Record<GameModule['id'], GameModule> = {
  stack,
  rebuild: STUBS.rebuild,
  priya: STUBS.priya,
  bots: STUBS.bots,
};
