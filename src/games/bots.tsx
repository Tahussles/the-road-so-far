// Stop 4: Grok Bot Hackathon. Be the Boss: send each job card to the right AI helper.
import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import type { ControllerProps, GameModule, ScreenProps } from './types';
import { Leaderboard, buzz, nameOf, ranked, useBroadcast, useElapsed, useWinOnce } from './ui';

const INTRO_MS = 4000;
const PLAY_MS = 40000;
const END_MS = 5000;
const FAKE_MINUTES = 90; // the big screen clock squeezes the real 90 minutes into PLAY_MS
const BROKEN_MS = 1200;

const HELPERS = [
  { id: 'artist', name: 'Artist', icon: '🎨', color: 'var(--stop-goon)' },
  { id: 'builder', name: 'Builder', icon: '🔨', color: 'var(--teal)' },
  { id: 'tester', name: 'Tester', icon: '🔍', color: 'var(--leaf)' },
];
const JOBS = [
  { text: 'Paint the bus', emoji: '🚌', helper: 'artist' },
  { text: 'Draw the map', emoji: '🗺️', helper: 'artist' },
  { text: 'Pick the colors', emoji: '🖍️', helper: 'artist' },
  { text: 'Add the stops', emoji: '📍', helper: 'builder' },
  { text: 'Make the QR code work', emoji: '📱', helper: 'builder' },
  { text: 'Add music', emoji: '🎵', helper: 'builder' },
  { text: 'Check it works on phones', emoji: '📲', helper: 'tester' },
  { text: 'Find the typo', emoji: '🔤', helper: 'tester' },
  { text: 'Try it on a slow connection', emoji: '🐢', helper: 'tester' },
];

type Phase = 'intro' | 'play' | 'done';
type Payload = { phase: Phase };

function Screen({ players, scores, setPayload, onWin, accent }: ScreenProps) {
  const ms = useElapsed();
  const phase: Phase = ms < INTRO_MS ? 'intro' : ms < INTRO_MS + PLAY_MS ? 'play' : 'done';
  const win = useWinOnce(onWin);
  const rows = ranked(scores);
  const total = rows.reduce((a, [, v]) => a + v, 0);
  const target = Math.max(60, players.length * 10);

  useBroadcast(setPayload, { phase } satisfies Payload);

  const over = ms >= INTRO_MS + PLAY_MS + END_MS;
  useEffect(() => {
    if (over) win({ line: 'You just built this app.', stats: { jobsDone: total, bestBoss: rows[0]?.[1] ?? 0 } });
  }, [over]);

  if (phase === 'intro') {
    return (
      <div className="g-wrap">
        <div className="g-panel" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: '2cqw' }}>
          <h2 className="g-title" style={{ color: accent, fontSize: '6.4cqw' }}>Be the Boss!</h2>
          <div className="g-big" style={{ fontSize: '3cqw' }}>Tonight it was 2 of us leading a team of AI helpers.</div>
          <div style={{ display: 'flex', gap: '3cqw' }}>
            {HELPERS.map((h) => (
              <div key={h.id} className="sticker g-pop" style={{ background: h.color, color: 'var(--white)', borderRadius: 'var(--radius-lg)', padding: '1.4cqw 2.4cqw', fontSize: '2.6cqw', fontWeight: 700 }}>
                <div style={{ fontSize: '5cqw' }}>{h.icon}</div>{h.name}
              </div>
            ))}
          </div>
          <div style={{ fontSize: '2.4cqw', fontWeight: 700, color: 'var(--muted)' }}>Send each job on your phone to the right helper.</div>
        </div>
      </div>
    );
  }

  const playMs = Math.min(PLAY_MS, ms - INTRO_MS);
  const fakeLeft = FAKE_MINUTES * (1 - playMs / PLAY_MS);
  const mm = Math.floor(fakeLeft);
  const ss = Math.floor((fakeLeft - mm) * 60);
  const pct = Math.min(1, total / target);

  return (
    <div className="g-wrap">
      <div className="g-panel">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2cqw' }}>
          <div>
            <h2 className="g-title" style={{ color: accent }}>{phase === 'done' ? 'Shipped!' : 'Be the Boss'}</h2>
            <div className="g-sub" style={{ fontSize: '2.2cqw' }}>
              {phase === 'done' ? `The room finished ${total.toLocaleString()} jobs.` : 'Send each job to the right helper. Faster and faster!'}
            </div>
          </div>
          <div className="g-count" style={{ background: fakeLeft < 15 ? 'var(--red)' : accent, minWidth: '15cqw' }}>
            {mm}:{String(ss).padStart(2, '0')}<small> left</small>
          </div>
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '2cqw', marginBottom: '.6cqw' }}>
            <span>Room progress</span><span>{total.toLocaleString()} jobs done</span>
          </div>
          <div className="g-track" style={{ height: '4cqw' }}>
            <div className="g-track-fill" style={{ width: `${pct * 100}%`, backgroundColor: accent }} />
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', gap: '2.4cqw', minHeight: 0, alignItems: 'center' }}>
          <div style={{ flex: 1.4 }}>
            <Leaderboard players={players} rows={rows} accent={accent} label={(v) => `${v} jobs`} fill={(v) => v / (rows[0]?.[1] || 1)}
              title={phase === 'done' ? 'Best bosses' : 'Top 3 bosses'} />
          </div>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: '1.6cqw' }}>
            {phase === 'done' && rows[0]
              ? <div className="g-big g-pop" style={{ fontSize: '2.8cqw', textAlign: 'center' }}>👑 {nameOf(players, rows[0][0])} is the best boss!</div>
              : HELPERS.map((h, i) => (
                <div key={h.id} className="sticker" style={{ background: h.color, color: 'var(--white)', borderRadius: 'var(--radius-lg)', padding: '1cqw 1.4cqw', fontSize: '1.9cqw', fontWeight: 700, textAlign: 'center', transform: `rotate(${[-3, 2, -2][i]}deg)` }}>
                  <div style={{ fontSize: '4cqw' }}>{h.icon}</div>{h.name}
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

type Card = { job: number; status: 'falling' | 'broken' | 'happy' | 'missed' };

function nextJob(prev: number) {
  let j = Math.floor(Math.random() * JOBS.length);
  if (j === prev) j = (j + 1 + Math.floor(Math.random() * (JOBS.length - 1))) % JOBS.length;
  return j;
}

function Controller({ payload, send }: ControllerProps) {
  const p = payload as Payload | null;
  const phase = p?.phase ?? 'intro';
  const live = phase === 'play';
  const [card, setCard] = useState<Card>(() => ({ job: nextJob(-1), status: 'falling' }));
  const [y, setY] = useState(0); // 0 top .. 1 landed
  const yRef = useRef(y);
  yRef.current = y;
  const [drag, setDrag] = useState<{ dx: number; dy: number } | null>(null);
  const [done, setDone] = useState(0);
  const [flash, setFlash] = useState<string | null>(null);
  const t0 = useRef<number | null>(null);
  const area = useRef<HTMLDivElement>(null);
  const lanes = useRef<Record<string, HTMLButtonElement | null>>({});
  const grab = useRef<{ x: number; y: number } | null>(null);
  const cardRef = useRef(card);
  cardRef.current = card;
  const dragging = useRef(false);
  dragging.current = !!drag;

  useEffect(() => { if (live && t0.current === null) t0.current = Date.now(); }, [live]);
  useEffect(() => { if (live) send(done); }, [done, live]);

  // falling: cards fall faster the longer you play
  useEffect(() => {
    if (!live) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      const c = cardRef.current;
      if (c.status === 'falling' && !dragging.current) {
        const played = (Date.now() - (t0.current ?? Date.now())) / 1000;
        const fallMs = Math.max(1700, 5000 - played * 90);
        const n = Math.min(1, yRef.current + dt / fallMs);
        setY(n);
        if (n >= 1) {
          setCard({ ...c, status: 'missed' });
          setTimeout(() => { setCard({ job: nextJob(c.job), status: 'falling' }); setY(0); }, 600);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [live]);

  const route = (helper: string) => {
    const c = cardRef.current;
    if (!live || c.status !== 'falling') return;
    setDrag(null);
    if (JOBS[c.job].helper === helper) {
      buzz();
      setDone((d) => d + 1);
      setFlash(helper);
      setCard({ ...c, status: 'happy' });
      setTimeout(() => { setFlash(null); setCard({ job: nextJob(c.job), status: 'falling' }); setY(0); }, 280);
    } else {
      try { navigator.vibrate?.([40, 50, 40]); } catch { /* not supported */ }
      setCard({ ...c, status: 'broken' });
      setTimeout(() => { setCard({ job: c.job, status: 'falling' }); setY(0); }, BROKEN_MS);
    }
  };

  const down = (e: RPointerEvent) => {
    if (!live || card.status !== 'falling') return;
    e.preventDefault();
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    grab.current = { x: e.clientX, y: e.clientY };
    setDrag({ dx: 0, dy: 0 });
  };
  const move = (e: RPointerEvent) => {
    if (!grab.current) return;
    setDrag({ dx: e.clientX - grab.current.x, dy: e.clientY - grab.current.y });
  };
  const up = (e: RPointerEvent) => {
    if (!grab.current) return;
    grab.current = null;
    const hit = HELPERS.find((h) => {
      const r = lanes.current[h.id]?.getBoundingClientRect();
      return r && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top - 40 && e.clientY <= r.bottom;
    });
    if (hit) route(hit.id);
    else setDrag(null);
  };

  const job = JOBS[card.job];
  const head = phase === 'intro' ? 'You are the boss of 3 AI helpers!'
    : phase === 'done' ? `Shipped! You did ${done} jobs.`
    : card.status === 'broken' ? 'Oops! Wrong helper. It broke!'
    : card.status === 'missed' ? 'Too slow! Next job...'
    : 'Send the job to the right helper!';

  const areaH = 'max(230px, calc(100dvh - 470px))';
  return (
    <div className="g-phone" style={{ gap: 10 }}>
      <h3 style={{ fontSize: 22, minHeight: 54, display: 'flex', alignItems: 'center', justifyContent: 'center', color: card.status === 'broken' && live ? 'var(--red)' : undefined }}>{head}</h3>
      <div className="g-stat"><b>{done}</b><span>jobs done</span></div>
      <div ref={area} style={{ position: 'relative', height: areaH, borderRadius: 18, background: 'var(--paper-warm)', border: '4px dashed var(--paper-edge)', overflow: 'visible' }}>
        {live && (
          <div
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={() => { grab.current = null; setDrag(null); }}
            style={{
              position: 'absolute', left: '50%', top: `calc(${y} * (100% - 120px))`, width: '76%', height: 112,
              transform: `translate(calc(-50% + ${drag?.dx ?? 0}px), ${drag?.dy ?? 0}px) scale(${card.status === 'happy' ? 0.6 : 1})`,
              opacity: card.status === 'happy' || card.status === 'missed' ? 0.2 : 1,
              touchAction: 'none', zIndex: 5, transition: drag ? 'none' : 'opacity .2s, transform .2s', cursor: 'grab',
            }}
          >
            <div
              key={`${card.job}-${card.status === 'broken' ? 'b' : 'f'}`}
              className={card.status === 'broken' ? 'g-shake' : undefined}
              style={{
                width: '100%', height: '100%', boxSizing: 'border-box', borderRadius: 16, boxShadow: 'var(--sticker-shadow)', border: '5px solid #fff',
                background: card.status === 'broken' ? 'var(--red)' : 'var(--white)', color: card.status === 'broken' ? 'var(--white)' : 'var(--ink)',
                display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px', rotate: card.status === 'broken' ? '-6deg' : '0deg',
              }}
            >
              <span style={{ fontSize: 46 }}>{card.status === 'broken' ? '💥' : job.emoji}</span>
              <span style={{ fontFamily: 'Fredoka, system-ui, sans-serif', fontWeight: 700, fontSize: 21, lineHeight: 1.1 }}>{job.text}</span>
            </div>
          </div>
        )}
        {!live && <div className="g-note" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{phase === 'intro' ? 'Jobs start in a moment...' : 'Look up at the screen!'}</div>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {HELPERS.map((h) => (
          <button
            key={h.id}
            ref={(el) => (lanes.current[h.id] = el)}
            onClick={() => route(h.id)}
            className={flash === h.id ? 'g-pop' : undefined}
            style={{
              minHeight: 104, borderRadius: 16, border: '5px solid #fff', background: h.color, color: 'var(--white)',
              boxShadow: flash === h.id ? '0 0 0 5px var(--lime), var(--sticker-shadow)' : 'inset 0 -5px 0 rgba(0,0,0,.25)',
              fontFamily: 'Fredoka, system-ui, sans-serif', fontWeight: 700, fontSize: 18, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: 38 }}>{flash === h.id ? '😄' : h.icon}</span>{h.name}
          </button>
        ))}
      </div>
    </div>
  );
}

// sim: fake bosses finish jobs at their own pace, a bit faster as the game goes on
const simJobs = new Map<string, number>();

export const bots: GameModule = {
  id: 'bots',
  inputKind: 'score',
  Screen,
  Controller,
  simulate: (players, payload) => {
    const p = payload as Payload | null;
    if (!p || p.phase === 'intro') { simJobs.clear(); return []; }
    if (p.phase === 'done') return [];
    return players.filter((_, i) => Math.random() < 0.12 + (i % 5) * 0.03).map((pl) => {
      const n = (simJobs.get(pl.id) ?? 0) + 1;
      simJobs.set(pl.id, n);
      return { playerId: pl.id, value: n };
    });
  },
};
