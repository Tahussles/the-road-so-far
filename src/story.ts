import type { GameId } from './realtime';

export type Stop = {
  key: 'goon' | 'hack' | 'af' | 'grok';
  name: string;
  where: string;
  project: string;
  about: string;
  struggle: string;
  through: string;
  win: string;
  winSub: string;
  gameId: GameId;
  gameTitle: string;
  photos: string[];
  video?: string;
  beat: string;
};

export const STOPS: Stop[] = [
  {
    key: 'goon', name: 'GoonHacks', where: 'Waterloo', project: 'Scrollify',
    about: 'Chrome extension + SwiftUI app + Supabase. Tracked browsing, streaks, friend leaderboards. Built as a joke: an app to make you MORE unproductive.',
    struggle: 'First hackathon, first time vibe coding with Cursor. No tech stack, no idea, no plan.',
    through: 'Two friends who had done hackathons before guided us.',
    win: 'Scrollify shipped.', winSub: 'Alone we built a Frankenstack. With mentors, it snapped together.',
    gameId: 'stack', gameTitle: 'Scroll Race', photos: [], beat: 'Guided',
  },
  {
    key: 'hack', name: 'Hackville 2026', where: 'Sheridan College', project: 'Architex',
    about: 'Describe an idea, typed or by voice, get an architecture graph in React Flow, then AI + the GitHub API turn it into a real repo.',
    struggle: 'Same skill level as before, just Cursor. Then a tangled git branch wiped the entire latest frontend and we rebuilt it from scratch.',
    through: 'Alex Meng and Vishnu Sai (UofT) came up with the idea and carried the build.',
    win: 'Frontend rebuilt.', winSub: 'We watched cracked people work, then copied it.',
    gameId: 'rebuild', gameTitle: 'Rebuild the Picture',
    photos: ['/photos/hackville-vishnu.jpg', '/photos/hackville-laptop.jpg', '/photos/hackville-snacks.jpg', '/photos/hackville-sleeping-bags.jpg'],
    beat: 'Carried',
  },
  {
    key: 'af', name: 'AF Hacks', where: 'Waterloo, Sep 2026', project: 'Portage',
    about: 'A cited, deadline aware licensing roadmap for internationally educated nurses becoming RNs in Ontario. Voice interview in 9 languages, deterministic critical path engine. "Carry your career across."',
    struggle: 'Just the two of us, nobody to carry us.',
    through: 'We learned to ship a full stack app ourselves, deployed and tested.',
    win: 'Priya is on her way.', winSub: 'We stopped being carried and started shipping.',
    gameId: 'priya', gameTitle: "Pack Priya's Schedule",
    photos: ['/photos/afhacks-screen.jpg'], video: '/photos/afhacks-room.mp4', beat: 'Shipped',
  },
  {
    key: 'grok', name: 'Grok Bot Hackathon', where: 'Tonight', project: 'The Road So Far',
    about: 'This app. A bus, a map, and every phone in the room.',
    struggle: '90 minutes, two of us, and a team of AI bots.',
    through: 'From being guided, to being carried, to shipping, to leading a team.',
    win: 'You just built this app.', winSub: 'Every job tonight was a real task we did to ship this.',
    gameId: 'bots', gameTitle: 'Be the Boss',
    photos: ['/photos/team-selfie.jpg', '/photos/grokbot-credits.jpg'], beat: 'Leading',
  },
];

export const accentVar = (k: number) => `var(--stop-${STOPS[k].key})`;
