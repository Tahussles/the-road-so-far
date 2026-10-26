// Stop 3: AF Hacks / Portage. Pack Priya's Schedule: slide her steps on a timeline, fewest months wins.
import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import type { ControllerProps, GameModule, ScreenProps } from './types';
import { Countdown, Leaderboard, buzz, nameOf, ranked, useBroadcast, useElapsed, useWinOnce } from './ui';

// Placeholder numbers. Tweak the plan here.
const CONFIG = {
  months: 16, // timeline length
  savesLine: 'Planning the right order saves about 8 months. Priya is on her way.',
  steps: [
    { id: 'creds', label: 'Get credentials assessed', months: 6, after: [] as string[], need: 'her credentials assessed', emoji: '📄' },
    { id: 'police', label: 'Police check', months: 2, after: [], need: 'her police check', emoji: '🛡️' },
    { id: 'apply', label: 'Apply to the nursing college', months: 3, after: ['creds'], need: 'to apply to the college', emoji: '📝' },
    { id: 'exam', label: 'Write the nursing exam', months: 2, after: ['apply'], need: 'her exam', emoji: '✏️' },
    { id: 'register', label: 'Register as a nurse', months: 1, after: ['creds', 'police', 'apply', 'exam'], need: 'to register', emoji: '🩺' },
  ],
};
const STEPS = CONFIG.steps;
const byId = Object.fromEntries(STEPS.map((s) => [s.id, s]));

const INTRO_MS = 4500;
const PLAN_MS = 35000;
const END_MS = 7000;

type Phase = 'intro' | 'plan' | 'done';
type Payload = { phase: Phase };
type Starts = Record<string, number | null>;

// earliest start for every step: the best possible plan
const BEST: Record<string, number> = (() => {
  const out: Record<string, number> = {};
  const visit = (id: string): number => {
    if (id in out) return out[id];
    const s = byId[id];
    out[id] = Math.max(0, ...s.after.map((d) => visit(d) + byId[d].months));
    return out[id];
  };
  STEPS.forEach((s) => visit(s.id));
  return out;
})();
const BEST_MONTHS = Math.max(...STEPS.map((s) => BEST[s.id] + s.months));

// first rule a step breaks, as a plain message
function problem(starts: Starts, id: string): string | null {
  const st = starts[id];
  if (st === null) return null;
  for (const d of byId[id].after) {
    const ds = starts[d];
    if (ds !== null && st < ds + byId[d].months) return `She needs ${byId[d].need} first.`;
  }
  return null;
}

function finish(starts: Starts): number {
  if (STEPS.some((s) => starts[s.id] === null || problem(starts, s.id))) return 0;
  return Math.max(...STEPS.map((s) => (starts[s.id] as number) + s.months));
}

function Gantt({ starts, unit, rowH, accent, font }: { starts: Record<string, number>; unit: string; rowH: string; accent: string; font: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.6cqw' }}>
      {STEPS.map((s) => (
        <div key={s.id} style={{ position: 'relative', height: rowH, background: 'var(--paper-edge)', borderRadius: 'var(--radius)' }}>
          <div className="g-pop" style={{
            position: 'absolute', top: 0, bottom: 0, left: `calc(${starts[s.id]} * ${unit})`, width: `calc(${s.months} * ${unit})`,
            background: accent, borderRadius: 'var(--radius)', border: '.25cqw solid var(--white)', boxSizing: 'border-box',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: font,
          }}>{s.emoji}</div>
          <div style={{
            position: 'absolute', top: 0, bottom: 0, left: `calc(${starts[s.id] + s.months} * ${unit} + .8cqw)`,
            display: 'flex', alignItems: 'center', fontWeight: 700, fontSize: font, color: 'var(--ink)', whiteSpace: 'nowrap',
          }}>{s.label} <span style={{ color: 'var(--muted)', marginLeft: '.5cqw' }}>{s.months} mo</span></div>
        </div>
      ))}
    </div>
  );
}

function Screen({ players, scores, setPayload, onWin, accent }: ScreenProps) {
  const ms = useElapsed();
  const phase: Phase = ms < INTRO_MS ? 'intro' : ms < INTRO_MS + PLAN_MS ? 'plan' : 'done';
  const win = useWinOnce(onWin);
  const rows = ranked(scores, true);

  useBroadcast(setPayload, { phase } satisfies Payload);

  const over = ms >= INTRO_MS + PLAN_MS + END_MS;
  useEffect(() => {
    if (over) win({ line: 'Priya is on her way.', stats: { plans: rows.length, fastestMonths: rows[0]?.[1] ?? 0 } });
  }, [over]);

  if (phase === 'intro') {
    return (
      <div className="g-wrap">
        <div className="g-panel" style={{ justifyContent: 'center', gap: '2cqw', padding: '4cqw' }}>
          <h2 className="g-title" style={{ color: accent, fontSize: '5.6cqw' }}>Pack Priya&rsquo;s Schedule</h2>
          <div className="g-big" style={{ fontSize: '3cqw' }}>👩‍⚕️ Priya is an ICU nurse from India. She wants to be a nurse in Ontario.</div>
          <div style={{ fontSize: '2.4cqw', fontWeight: 700, color: 'var(--muted)' }}>
            Slide her steps on your phone. Some can happen at the same time. Fewest months wins!
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
            <h2 className="g-title" style={{ color: accent }}>{phase === 'done' ? 'The fastest plan' : 'Pack Priya’s Schedule'}</h2>
            <div className="g-sub" style={{ fontSize: '2.2cqw' }}>
              {phase === 'done' ? CONFIG.savesLine : 'Fewest months until Priya is a nurse wins.'}
            </div>
          </div>
          {phase === 'plan' && <Countdown ms={INTRO_MS + PLAN_MS - ms} accent={accent} />}
        </div>
        {phase === 'plan' ? (
          <div style={{ flex: 1, display: 'flex', gap: '2.4cqw', minHeight: 0, alignItems: 'center' }}>
            <div style={{ flex: 1.4 }}>
              <Leaderboard players={players} rows={rows} accent={accent} label={(v) => `${v} months`} fill={(v) => BEST_MONTHS / v} title="Fastest plans" />
            </div>
            <div className="paper sticker" style={{ flex: 1, borderRadius: 'var(--radius-lg)', padding: '1.6cqw', textAlign: 'center', transform: 'rotate(1.5deg)' }}>
              <div className="g-sub">Plans ready</div>
              <div className="g-big" style={{ fontSize: '6cqw', color: accent }}>{rows.length}</div>
              <div className="g-sub">of {players.length} riders</div>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', gap: '2.4cqw', minHeight: 0, alignItems: 'center' }}>
            <div style={{ flex: 2 }}>
              <Gantt starts={BEST} unit="2.1cqw" rowH="4.2cqw" accent={accent} font="1.9cqw" />
              <div className="g-big" style={{ fontSize: '2.4cqw', marginTop: '1cqw' }}>Registered in {BEST_MONTHS} months</div>
            </div>
            <div style={{ flex: 1 }}>
              {rows[0] && <div className="g-big g-pop" style={{ fontSize: '2.4cqw' }}>👑 {nameOf(players, rows[0][0])}: {rows[0][1]} months</div>}
              <div className="g-sub" style={{ marginTop: '1cqw' }}>{rows.filter(([, v]) => v === BEST_MONTHS).length} found the best plan</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const emptyStarts = (): Starts => Object.fromEntries(STEPS.map((s) => [s.id, null]));

function Controller({ payload, send }: ControllerProps) {
  const p = payload as Payload | null;
  const phase = p?.phase ?? 'intro';
  const [starts, setStarts] = useState<Starts>(emptyStarts);
  const [shake, setShake] = useState<Record<string, number>>({});
  const [W, setW] = useState(320);
  const drag = useRef<{ id: string; x0: number; s0: number } | null>(null);
  const startsRef = useRef(starts);
  startsRef.current = starts;
  const locked = phase !== 'plan';
  const unit = W / CONFIG.months;
  const months = finish(starts);
  const issue = STEPS.map((s) => problem(starts, s.id)).find(Boolean);

  useEffect(() => {
    const fit = () => setW(Math.min(window.innerWidth - 32, 440));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  useEffect(() => { if (phase === 'plan') send(months); }, [months, phase]);

  const down = (id: string) => (e: RPointerEvent) => {
    if (locked) return;
    e.preventDefault();
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    drag.current = { id, x0: e.clientX, s0: starts[id] ?? 0 };
    if (starts[id] === null) setStarts((c) => ({ ...c, [id]: 0 }));
    buzz();
  };
  const move = (e: RPointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const max = CONFIG.months - byId[d.id].months;
    const st = Math.max(0, Math.min(max, Math.round(d.s0 + (e.clientX - d.x0) / unit)));
    setStarts((c) => (c[d.id] === st ? c : { ...c, [d.id]: st }));
  };
  const up = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (problem(startsRef.current, d.id)) {
      setShake((sh) => ({ ...sh, [d.id]: (sh[d.id] ?? 0) + 1 }));
      try { navigator.vibrate?.([30, 40, 30]); } catch { /* not supported */ }
    }
  };

  const head = phase === 'intro' ? 'Help Priya become a nurse!'
    : phase === 'done' ? (months ? `Your plan: ${months} months. Look up!` : 'Time! Look up at the screen.')
    : 'Slide each step. Fewest months wins!';

  return (
    <div className="g-phone" style={{ gap: 10, alignItems: 'center' }}>
      <h3 style={{ fontSize: 22, minHeight: 54, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{head}</h3>
      <div className="g-stat" style={{ width: W, boxSizing: 'border-box', background: months ? 'var(--stop-af)' : undefined, color: months ? 'var(--white)' : undefined }}>
        <b>{months ? `${months} months` : '...'}</b>
        <span>{months ? 'until Priya is a nurse' : 'place every step'}</span>
      </div>
      <div style={{ width: W, position: 'relative' }}>
        <div style={{ display: 'flex', height: 18, fontSize: 11, fontWeight: 700, color: 'var(--muted)' }}>
          {Array.from({ length: CONFIG.months }, (_, m) => (
            <div key={m} style={{ width: unit, textAlign: 'left', borderLeft: m % 2 === 0 ? '1px solid var(--paper-edge)' : undefined, paddingLeft: 2 }}>{m % 2 === 0 ? m : ''}</div>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {STEPS.map((s) => {
            const st = starts[s.id];
            const bad = !!problem(starts, s.id);
            return (
              <div
                key={s.id}
                onPointerDown={down(s.id)}
                onPointerMove={move}
                onPointerUp={up}
                onPointerCancel={up}
                style={{ position: 'relative', height: 58, background: 'var(--paper-edge)', borderRadius: 10, touchAction: 'none', overflow: 'hidden' }}
              >
                <div style={{ position: 'absolute', left: 8, top: 4, right: 8, fontSize: 13, fontWeight: 700, color: 'var(--ink-brown)', pointerEvents: 'none', whiteSpace: 'nowrap' }}>
                  {s.emoji} {s.label} <span style={{ color: 'var(--muted)' }}>({s.months} mo)</span>
                </div>
                <div
                  key={shake[s.id] ?? 0}
                  className={bad ? 'g-shake' : undefined}
                  style={{
                    position: 'absolute', bottom: 5, height: 28, left: (st ?? 0) * unit, width: s.months * unit,
                    background: st === null ? 'transparent' : bad ? 'var(--red)' : 'var(--stop-af)',
                    border: st === null ? '3px dashed var(--muted)' : '3px solid #fff', borderRadius: 8, boxSizing: 'border-box',
                    transition: drag.current?.id === s.id ? 'none' : 'left .2s ease-out', pointerEvents: 'none',
                  }}
                />
                {st === null && <div style={{ position: 'absolute', left: s.months * unit + 8, bottom: 9, fontSize: 13, fontWeight: 700, color: 'var(--muted)', pointerEvents: 'none' }}>drag me →</div>}
              </div>
            );
          })}
        </div>
      </div>
      <p className="g-note" style={{ minHeight: 24, color: issue ? 'var(--red-text)' : undefined, fontSize: 18 }}>
        {issue ?? (months === BEST_MONTHS ? 'Wow, the fastest plan!' : months ? 'Can you make it faster?' : ' ')}
      </p>
    </div>
  );
}

// sim: fake planners find a valid plan after a while, some keep improving to the best
const simPlan = new Map<string, number>();

export const priya: GameModule = {
  id: 'priya',
  inputKind: 'score',
  Screen,
  Controller,
  simulate: (players, payload) => {
    const p = payload as Payload | null;
    if (!p || p.phase === 'intro') { simPlan.clear(); return []; }
    if (p.phase === 'done') return [];
    return players.filter(() => Math.random() < 0.12).map((pl, i) => {
      const cur = simPlan.get(pl.id) ?? 0;
      const floor = BEST_MONTHS + (i % 4 === 0 ? 0 : i % 3);
      const next = cur === 0 ? floor + 2 + (i % 3) : Math.max(floor, cur - 1);
      simPlan.set(pl.id, next);
      return { playerId: pl.id, value: next };
    });
  },
};
