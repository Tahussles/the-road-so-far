import type { GameModule } from './types';
import { stack } from './stack';
import { rebuild } from './rebuild';
import { priya } from './priya';
import { bots } from './bots';

export const GAMES: Record<GameModule['id'], GameModule> = { stack, rebuild, priya, bots };
