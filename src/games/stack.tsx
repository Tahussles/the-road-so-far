// Stop 1: GoonHacks / Scrollify. Scroll Race: scroll an endless feed, build a streak, mentors give a boost.
import { useEffect, useRef, useState } from 'react';
import type { ControllerProps, GameModule, ScreenProps } from './types';
import { Banner, Countdown, Leaderboard, buzz, nameOf, ranked, useBroadcast, useElapsed, useWinOnce } from './ui';

const READY_MS = 3000;
const GO_MS = 40000;
const BOOST_AT = 18000; // after go starts
const BOOST_MS = 5000;
const END_MS = 4000; // podium before onWin
const PX_PER_M = 30;
const STREAK_STEP_MS = 2500; // +1 multiplier per 2.5 s of non stop scrolling
const MAX_MULT = 5;

type Phase = 'ready' | 'go' | 'boost' | 'done';
type Payload = { phase: Phase };

function phaseAt(ms: number): Phase {
  if (ms < READY_MS) return 'ready';
  const g = ms - READY_MS;
  if (g >= GO_MS) return 'done';
  if (g >= BOOST_AT && g < BOOST_AT + BOOST_MS) return 'boost';
  return 'go';
}

function Screen({ players, scores, setPayload, onWin, accent }: ScreenProps) {
  const ms = useElapsed();
  const phase = phaseAt(ms);
  const win = useWinOnce(onWin);
  const rows = ranked(scores);
  const total = rows.reduce((a, [, v]) => a + v, 0);
  const lead = rows[0]?.[1] ?? 1;

  useBroadcast(setPayload, { phase } satisfies Payload);

  useEffect(() => {
    if (ms >= READY_MS + GO_MS + END_MS) win({ line: 'Scrollify shipped.', stats: { metresScrolled: total, best: rows[0]?.[1] ?? 0 } });
  }, [ms >= READY_MS + GO_MS + END_MS]);

  if (phase === 'ready') {
    return (
      <div className="g-wrap">
        <div className="g-panel" style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <div className="g-big" style={{ fontSize: '3cqw', color: 'var(--muted)' }}>Scrollify made you scroll MORE</div>
          <h2 className="g-title" style={{ color: accent, fontSize: '7cqw' }}>Scroll Race!</h2>
          <div className="g-big" style={{ fontSize: '3.4cqw' }}>Scroll on your phone. Don't stop!</div>
          <div className="g-big" style={{ fontSize: '9cqw', color: accent }}>{Math.max(1, Math.ceil((READY_MS - ms) / 1000))}</div>
        </div>
      </div>
    );
  }

  const left = READY_MS + GO_MS - ms;
  return (
    <div className="g-wrap">
      <div className="g-panel">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2cqw' }}>
          <div>
            <h2 className="g-title" style={{ color: accent }}>{phase === 'done' ? 'Time! Scrollify shipped.' : 'Scroll Race'}</h2>
            <div className="g-sub" style={{ fontSize: '2.2cqw' }}>Keep scrolling to grow your streak. Stop and it resets.</div>
          </div>
          {phase !== 'done' && <Countdown ms={left} accent={accent} />}
        </div>
        <div style={{ flex: 1, display: 'flex', gap: '2.4cqw', minHeight: 0 }}>
          <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Leaderboard
              players={players}
              rows={rows}
              accent={accent}
              label={(v) => `${v.toLocaleString()} m`}
              fill={(v) => v / lead}
              title={phase === 'done' ? 'Final podium' : 'Top 3 scrollers'}
            />
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.6cqw', justifyContent: 'center', alignItems: 'stretch' }}>
            {phase === 'boost' && <Banner accent="var(--leaf)">Mentors walked in! 2x speed for {Math.max(1, Math.ceil((READY_MS + BOOST_AT + BOOST_MS - ms) / 1000))}s</Banner>}
            {phase === 'go' && ms - READY_MS < BOOST_AT && <div className="g-sub" style={{ textAlign: 'center' }}>Mentors arrive halfway...</div>}
            <div className="paper sticker" style={{ borderRadius: 'var(--radius-lg)', padding: '1.6cqw', textAlign: 'center', transform: 'rotate(1.5deg)' }}>
              <div className="g-sub">The whole room scrolled</div>
              <div className="g-big" style={{ fontSize: '5cqw', color: accent }}>{total.toLocaleString()} m</div>
            </div>
            {phase === 'done' && rows[0] && (
              <div className="g-big g-pop" style={{ fontSize: '2.6cqw', textAlign: 'center' }}>👑 {nameOf(players, rows[0][0])} wins!</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const FEED = [
  ['🐱', 'Cat plays piano'], ['🍕', 'Pizza at 3 am'], ['🚌', 'Bus goes vroom'], ['🐶', 'Dog sees snow'],
  ['🌮', 'Taco Tuesday'], ['🦆', 'Duck parade'], ['🎸', 'Guitar solo'], ['🌈', 'Double rainbow'],
  ['🍩', 'Donut review'], ['🐸', 'Frog jumps far'], ['⚽', 'Wild goal'], ['🧁', 'Tiny cupcake'],
  ['🐼', 'Panda rolls'], ['🍿', 'Movie night'], ['🛹', 'Skate trick'], ['🦄', 'Unicorn sighting'],
];
const CARD_BG = ['var(--stop-goon)', 'var(--teal)', 'var(--leaf)', 'var(--red)', 'var(--wood-shine)', 'var(--teal-deep)'];

function Controller({ payload, send }: ControllerProps) {
  const p = payload as Payload | null;
  const phase = p?.phase ?? 'ready';
  const live = phase === 'go' || phase === 'boost';
  const [cards, setCards] = useState(40);
  const [dist, setDist] = useState(0);
  const [mult, setMult] = useState(1);
  const ref = useRef<HTMLDivElement>(null);
  const s = useRef({ lastY: 0, lastMove: 0, streakStart: 0, dist: 0, mult: 1 });
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  // streak resets after 1 s without scrolling
  useEffect(() => {
    const iv = setInterval(() => {
      if (s.current.mult > 1 && Date.now() - s.current.lastMove > 1000) { s.current.mult = 1; setMult(1); }
    }, 200);
    return () => clearInterval(iv);
  }, []);

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    const y = el.scrollTop;
    const dy = y - s.current.lastY;
    s.current.lastY = y;
    if (el.scrollTop + el.clientHeight > el.scrollHeight - 1600) setCards((c) => c + 30);
    const ph = phaseRef.current;
    if (dy <= 0 || (ph !== 'go' && ph !== 'boost')) return;
    const now = Date.now();
    if (now - s.current.lastMove > 1000) s.current.streakStart = now;
    s.current.lastMove = now;
    const m = Math.min(MAX_MULT, 1 + Math.floor((now - s.current.streakStart) / STREAK_STEP_MS));
    if (m !== s.current.mult) { s.current.mult = m; setMult(m); buzz(); }
    s.current.dist += (dy / PX_PER_M) * m * (ph === 'boost' ? 2 : 1);
    const d = Math.round(s.current.dist);
    setDist(d);
    send(d);
  };

  const head = phase === 'ready' ? 'Get ready to scroll!'
    : phase === 'boost' ? 'Mentors walked in! 2x speed!'
    : phase === 'done' ? "Time's up! Look up."
    : 'Scroll! Don’t stop!';

  return (
    <div className="g-phone" style={{ gap: 10 }}>
      <h3 style={{ fontSize: 26, color: phase === 'boost' ? 'var(--leaf)' : undefined }}>{head}</h3>
      <div style={{ display: 'flex', gap: 10 }}>
        <div className="g-stat" style={{ flex: 1 }}><b>{dist.toLocaleString()} m</b><span>scrolled</span></div>
        <div className="g-stat" style={{ flex: 1, background: mult > 1 ? 'var(--stop-goon)' : undefined, color: mult > 1 ? 'var(--white)' : undefined }}>
          <b>x{mult}{mult > 2 ? ' 🔥' : ''}</b><span>streak</span>
        </div>
      </div>
      <div
        ref={ref}
        onScroll={onScroll}
        className="g-feed"
        style={{ opacity: live ? 1 : 0.5, pointerEvents: phase === 'done' ? 'none' : undefined }}
      >
        {Array.from({ length: cards }, (_, i) => {
          const [emoji, text] = FEED[i % FEED.length];
          return (
            <div key={i} className="g-card" style={{ background: CARD_BG[(i * 7) % CARD_BG.length] }}>
              <span style={{ fontSize: 64 }}>{emoji}</span>
              <span>{text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// sim: each fake player scrolls at their own pace, with streaks and the occasional pause
const simDist = new Map<string, number>();
const simStreak = new Map<string, number>();

export const stack: GameModule = {
  id: 'stack',
  inputKind: 'score',
  Screen,
  Controller,
  simulate: (players, payload) => {
    const p = payload as Payload | null;
    if (!p || p.phase === 'ready') { simDist.clear(); simStreak.clear(); return []; }
    if (p.phase === 'done') return [];
    return players.map((pl, i) => {
      const paused = Math.random() < 0.08;
      const streak = paused ? 0 : (simStreak.get(pl.id) ?? 0) + 1;
      simStreak.set(pl.id, streak);
      const mult = Math.min(MAX_MULT, 1 + Math.floor(streak / 8));
      const step = paused ? 0 : (4 + (i % 7)) * mult * (p.phase === 'boost' ? 2 : 1) * (0.6 + Math.random() * 0.8);
      const d = (simDist.get(pl.id) ?? 0) + step;
      simDist.set(pl.id, d);
      return { playerId: pl.id, value: Math.round(d) };
    });
  },
};
