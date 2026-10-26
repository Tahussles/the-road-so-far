import type { GameModule } from './types';
import { STUBS } from './stubs';

export const GAMES: Record<GameModule['id'], GameModule> = {
  stack: STUBS.stack,
  rebuild: STUBS.rebuild,
  priya: STUBS.priya,
  bots: STUBS.bots,
};
