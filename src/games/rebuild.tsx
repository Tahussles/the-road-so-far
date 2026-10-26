// Stop 2: Hackville / Architex. Rebuild the Picture: memorize a house, it vanishes, drag the pieces back.
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent } from 'react';
import type { ControllerProps, GameModule, ScreenProps } from './types';
import { Banner, Countdown, Leaderboard, buzz, nameOf, ranked, useBroadcast, useElapsed, useWinOnce } from './ui';

const SHOW_MS = 3000;
const GONE_MS = 1800;
const BUILD_MS = 35000;
const HELP_AT = 17000; // after build starts
const END_MS = 4500;
const SNAP = 7; // board % distance that snaps a piece home
const TRAY_SCALE = 0.5;
const HELPED = 'walls'; // the piece Alex and Vishnu put back for everyone

type Piece = { id: string; label: string; x: number; y: number; w: number; h: number; tx: number };
// x, y = target center in board % (board is a square). tx = start x in the tray.
const PIECES: Piece[] = [
  { id: 'sun', label: 'Sun', x: 82, y: 16, w: 20, h: 20, tx: 77 },
  { id: 'chimney', label: 'Chimney', x: 67, y: 31, w: 9, h: 16, tx: 6 },
  { id: 'roof', label: 'Roof', x: 50, y: 38, w: 64, h: 26, tx: 24 },
  { id: 'walls', label: 'Walls', x: 50, y: 68, w: 54, h: 36, tx: 57 },
  { id: 'door', label: 'Door', x: 40, y: 76, w: 13, h: 20, tx: 87 },
  { id: 'window', label: 'Window', x: 62, y: 64, w: 14, h: 12, tx: 95 },
];
const TRAY_Y = 116;
const MAX_POINTS = PIECES.length * 100;

type Phase = 'show' | 'gone' | 'build' | 'done';
type Payload = { phase: Phase; helped: boolean; endsAt: number };

function Art({ id }: { id: string }) {
  switch (id) {
    case 'sun':
      return (
        <g>
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i * Math.PI) / 4;
            return <line key={i} x1={10 + Math.cos(a) * 7.2} y1={10 + Math.sin(a) * 7.2} x2={10 + Math.cos(a) * 9.4} y2={10 + Math.sin(a) * 9.4} stroke="#ffc83d" strokeWidth={1.6} strokeLinecap="round" />;
          })}
          <circle cx={10} cy={10} r={6} fill="#ffc83d" stroke="#fff" strokeWidth={0.8} />
        </g>
      );
    case 'chimney':
      return (
        <g>
          <rect x={0.5} y={0.5} width={8} height={15} rx={0.8} fill="var(--red-deep)" stroke="#fff" strokeWidth={0.8} />
          <line x1={0.5} y1={5} x2={8.5} y2={5} stroke="#fff" strokeWidth={0.4} opacity={0.6} />
          <line x1={0.5} y1={10} x2={8.5} y2={10} stroke="#fff" strokeWidth={0.4} opacity={0.6} />
        </g>
      );
    case 'roof':
      return <polygon points="2,25 32,1.2 62,25" fill="var(--red)" stroke="#fff" strokeWidth={1.4} strokeLinejoin="round" />;
    case 'walls':
      return <rect x={0.7} y={0.7} width={52.6} height={34.6} rx={1} fill="var(--paper-warm)" stroke="var(--wood)" strokeWidth={1.4} />;
    case 'door':
      return (
        <g>
          <rect x={0.5} y={0.5} width={12} height={19} rx={1.5} fill="var(--wood)" stroke="#fff" strokeWidth={0.8} />
          <circle cx={9.6} cy={11} r={1} fill="#ffc83d" />
        </g>
      );
    default:
      return (
        <g>
          <rect x={0.5} y={0.5} width={13} height={11} rx={1} fill="var(--teal)" stroke="#fff" strokeWidth={1} />
          <line x1={7} y1={0.5} x2={7} y2={11.5} stroke="#fff" strokeWidth={0.8} />
          <line x1={0.5} y1={6} x2={13.5} y2={6} stroke="#fff" strokeWidth={0.8} />
        </g>
      );
  }
}

// The finished picture, used on the big screen and as the phone preview.
function Picture({ only, style }: { only?: string[]; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 100 100" style={style}>
      <rect width={100} height={100} rx={4} fill="var(--sky-bottom)" />
      <rect y={86} width={100} height={14} fill="var(--lime)" />
      {PIECES.filter((p) => !only || only.includes(p.id)).map((p) => (
        <svg key={p.id} x={p.x - p.w / 2} y={p.y - p.h / 2} width={p.w} height={p.h} viewBox={`0 0 ${p.w} ${p.h}`} overflow="visible">
          <Art id={p.id} />
        </svg>
      ))}
    </svg>
  );
}

function pointsFor(p: Piece, x: number, y: number) {
  if (y > 100) return 0;
  const d = Math.hypot(x - p.x, y - p.y);
  return Math.round(Math.max(0, 1 - d / 35) * 100);
}

function phaseAt(ms: number): Phase {
  if (ms < SHOW_MS) return 'show';
  if (ms < SHOW_MS + GONE_MS) return 'gone';
  if (ms < SHOW_MS + GONE_MS + BUILD_MS) return 'build';
  return 'done';
}

function Screen({ players, scores, setPayload, onWin, accent }: ScreenProps) {
  const [t0] = useState(() => Date.now());
  const ms = useElapsed();
  const phase = phaseAt(ms);
  const buildMs = ms - SHOW_MS - GONE_MS;
  const helped = phase === 'done' || (phase === 'build' && buildMs >= HELP_AT);
  const win = useWinOnce(onWin);
  const rows = ranked(scores);

  useBroadcast(setPayload, { phase, helped, endsAt: t0 + SHOW_MS + GONE_MS + BUILD_MS } satisfies Payload);

  const over = ms >= SHOW_MS + GONE_MS + BUILD_MS + END_MS;
  useEffect(() => {
    if (over) win({ line: 'Frontend rebuilt.', stats: { builders: rows.length, bestScore: rows[0]?.[1] ?? 0 } });
  }, [over]);

  if (phase === 'show' || phase === 'gone') {
    const gone = phase === 'gone';
    return (
      <div className="g-wrap">
        <div className={`g-panel ${gone ? 'g-shake' : ''}`} style={{ flexDirection: 'row', alignItems: 'center', gap: '3cqw' }}>
          <div style={{ flex: 1 }}>
            <h2 className="g-title" style={{ color: gone ? 'var(--red)' : accent, fontSize: '5.4cqw' }}>
              {gone ? 'Uh oh, it’s all gone!' : 'Remember this picture!'}
            </h2>
            <div className="g-big" style={{ fontSize: '2.8cqw', marginTop: '1.4cqw' }}>
              {gone ? 'The night before, we lost all our work. Rebuild it from memory!' : 'Where does every piece go?'}
            </div>
            {!gone && <div className="g-big" style={{ fontSize: '8cqw', color: accent }}>{Math.max(1, Math.ceil((SHOW_MS - ms) / 1000))}</div>}
          </div>
          <div className="sticker" style={{ width: '34cqw', borderRadius: 'var(--radius-lg)', overflow: 'hidden', transform: 'rotate(2deg)', background: 'var(--sky-bottom)' }}>
            <Picture only={gone ? [] : undefined} style={{ display: 'block', width: '100%', transition: 'opacity .4s', opacity: gone ? 0.3 : 1 }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="g-wrap">
      <div className="g-panel">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2cqw' }}>
          <div>
            <h2 className="g-title" style={{ color: accent }}>{phase === 'done' ? 'Frontend rebuilt.' : 'Rebuild the Picture'}</h2>
            <div className="g-sub" style={{ fontSize: '2.2cqw' }}>
              {phase === 'done' ? 'Here is how it looked.' : 'Drag the pieces back where they were.'}
            </div>
          </div>
          {phase === 'build' && <Countdown ms={BUILD_MS - buildMs} accent={accent} />}
        </div>
        <div style={{ flex: 1, display: 'flex', gap: '2.4cqw', minHeight: 0, alignItems: 'center' }}>
          <div style={{ flex: 1.4 }}>
            <Leaderboard players={players} rows={rows} accent={accent} label={(v) => `${v} pts`} fill={(v) => v / (MAX_POINTS + 140)}
              title={phase === 'done' ? 'Best builders' : 'Top 3 builders'} />
            {phase === 'done' && rows[0] && (
              <div className="g-big g-pop" style={{ fontSize: '2.6cqw', marginTop: '1.4cqw' }}>👑 {nameOf(players, rows[0][0])} has the best memory!</div>
            )}
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.4cqw', alignItems: 'center' }}>
            {phase === 'build' && helped && <Banner accent="var(--leaf)">Alex and Vishnu joined! The walls are back.</Banner>}
            {phase === 'build' && !helped && <div className="g-sub">Help arrives halfway...</div>}
            <div className="sticker" style={{ width: phase === 'done' ? '26cqw' : '20cqw', borderRadius: 'var(--radius-lg)', overflow: 'hidden', transform: 'rotate(-2deg)', transition: 'width .5s' }}>
              <Picture only={phase === 'done' ? undefined : helped ? [HELPED] : []} style={{ display: 'block', width: '100%' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type Pos = Record<string, { x: number; y: number }>;
const startPos = (): Pos => Object.fromEntries(PIECES.map((p) => [p.id, { x: p.tx, y: TRAY_Y }]));

function Controller({ payload, send }: ControllerProps) {
  const p = payload as Payload | null;
  const phase = p?.phase ?? 'show';
  const [pos, setPos] = useState<Pos>(startPos);
  const [done, setDone] = useState(false);
  const [bonus, setBonus] = useState(0);
  const [W, setW] = useState(300);
  const area = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const locked = done || phase !== 'build';

  useEffect(() => {
    const fit = () => setW(Math.max(240, Math.min(window.innerWidth - 32, window.innerHeight - 400, 420)));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  // halfway help: the walls fly home for everyone
  useEffect(() => {
    if (p?.helped) setPos((cur) => ({ ...cur, [HELPED]: { x: 50, y: 68 } }));
  }, [p?.helped]);

  const points = PIECES.reduce((a, pc) => a + pointsFor(pc, pos[pc.id].x, pos[pc.id].y), 0);
  const onBoard = PIECES.filter((pc) => pos[pc.id].y <= 100).length;

  useEffect(() => { if (phase === 'build' || phase === 'done') send(points + bonus); }, [points, bonus, phase]);
  useEffect(() => { if (phase === 'done') setDone(true); }, [phase]);

  const toUnits = (e: RPointerEvent) => {
    const r = area.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / W) * 100, y: ((e.clientY - r.top) / W) * 100 };
  };
  const down = (id: string) => (e: RPointerEvent) => {
    if (locked || (id === HELPED && p?.helped)) return;
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const u = toUnits(e);
    drag.current = { id, dx: pos[id].x - u.x, dy: pos[id].y - u.y };
    buzz();
  };
  const move = (e: RPointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const u = toUnits(e);
    const x = Math.max(0, Math.min(100, u.x + d.dx));
    const y = Math.max(0, Math.min(132, u.y + d.dy));
    setPos((cur) => ({ ...cur, [d.id]: { x, y } }));
  };
  const up = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    const pc = PIECES.find((q) => q.id === d.id)!;
    setPos((cur) => {
      const c = cur[d.id];
      if (c.y <= 100 && Math.hypot(c.x - pc.x, c.y - pc.y) < SNAP) { buzz(); return { ...cur, [d.id]: { x: pc.x, y: pc.y } }; }
      return cur;
    });
  };
  const finish = () => {
    if (locked) return;
    const left = Math.max(0, Math.min(BUILD_MS, (p?.endsAt ?? Date.now()) - Date.now()));
    setBonus(onBoard === PIECES.length ? Math.round((left / 1000) * 4) : 0);
    setDone(true);
    buzz();
  };

  const head = phase === 'show' ? 'Remember this picture!'
    : phase === 'gone' ? 'Uh oh, it’s all gone!'
    : phase === 'done' || done ? `Locked in: ${points + bonus} pts`
    : p?.helped ? 'Alex & Vishnu fixed the walls!'
    : 'Drag the pieces back!';

  return (
    <div className="g-phone" style={{ gap: 10, alignItems: 'center' }}>
      <h3 style={{ fontSize: 24, minHeight: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', color: phase === 'gone' ? 'var(--red)' : p?.helped && !done ? 'var(--leaf)' : undefined }}>{head}</h3>
      <div
        ref={area}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        style={{ position: 'relative', width: W, height: W * 1.32, touchAction: 'none' }}
      >
        <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: W, borderRadius: 18, overflow: 'hidden', border: '5px solid #fff', boxShadow: 'var(--sticker-shadow)', boxSizing: 'border-box' }}>
          <Picture only={phase === 'show' ? undefined : []} style={{ width: '100%', height: '100%', display: 'block' }} />
        </div>
        <div style={{ position: 'absolute', left: 0, top: W * 1.03, width: W, height: W * 0.28, borderRadius: 14, background: 'var(--paper-edge)', opacity: 0.7 }} />
        {phase !== 'show' && phase !== 'gone' && PIECES.map((pc) => {
          const c = pos[pc.id];
          const s = c.y > 100 ? TRAY_SCALE : 1;
          const home = c.x === pc.x && c.y === pc.y;
          return (
            <div
              key={pc.id}
              onPointerDown={down(pc.id)}
              style={{
                position: 'absolute', left: ((c.x - (pc.w * s) / 2) / 100) * W, top: ((c.y - (pc.h * s) / 2) / 100) * W,
                width: (pc.w * s / 100) * W, height: (pc.h * s / 100) * W,
                zIndex: drag.current?.id === pc.id ? 10 : pc.id === 'walls' ? 1 : pc.id === 'door' || pc.id === 'window' ? 3 : 2,
                filter: home ? 'drop-shadow(0 0 4px var(--lime))' : 'drop-shadow(0 3px 2px rgba(47,22,4,.3))',
                transition: drag.current?.id === pc.id ? 'none' : 'left .35s cubic-bezier(.34,1.56,.64,1), top .35s cubic-bezier(.34,1.56,.64,1)',
                touchAction: 'none', cursor: locked ? 'default' : 'grab',
              }}
            >
              <svg viewBox={`0 0 ${pc.w} ${pc.h}`} width="100%" height="100%" overflow="visible"><Art id={pc.id} /></svg>
            </div>
          );
        })}
      </div>
      {phase === 'build' && !done && (
        <button className="btn-sunset" style={{ width: W, minHeight: 64, fontSize: 24 }} onClick={finish}>
          Done! {onBoard === PIECES.length ? '(speed bonus)' : `(${onBoard}/${PIECES.length} placed)`}
        </button>
      )}
      {(done || phase === 'done') && <p className="g-note" style={{ fontSize: 18 }}>{bonus > 0 ? `Includes a ${bonus} pt speed bonus. ` : ''}Look up at the screen!</p>}
    </div>
  );
}

// sim: fake builders slowly get better, some finish early for a bonus
const simScore = new Map<string, number>();

export const rebuild: GameModule = {
  id: 'rebuild',
  inputKind: 'score',
  Screen,
  Controller,
  simulate: (players, payload) => {
    const p = payload as Payload | null;
    if (!p || p.phase === 'show' || p.phase === 'gone') { simScore.clear(); return []; }
    if (p.phase === 'done') return [];
    return players.filter(() => Math.random() < 0.35).map((pl, i) => {
      const skill = 0.55 + ((i * 37) % 40) / 100;
      const cur = simScore.get(pl.id) ?? 0;
      const next = Math.min(Math.round(MAX_POINTS * skill), cur + 6 + Math.round(Math.random() * 16));
      simScore.set(pl.id, next);
      return { playerId: pl.id, value: next };
    });
  },
};
