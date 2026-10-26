// Stop 4: Grok Bot Hackathon. Every phone is a bot; taps finish the real tasks on a kanban.
import { useEffect, useState } from 'react';
import type { ControllerProps, GameModule, ScreenProps } from './types';
import { buzz, sumTaps, useBroadcast, useWinOnce } from './ui';

const TASKS = ['Map', 'Bus animation', 'Realtime', 'Pick the Stack', 'Rebuild game', 'Priya game', 'Bot game', 'Polish', 'Script', 'Deploy'];

type Payload = { doing: string | null; done: number; total: number; pct: number };

function Screen({ players, taps, setPayload, onWin, accent }: ScreenProps) {
  const target = Math.max(250, players.length * 30);
  const per = target / TASKS.length;
  const total = sumTaps(taps);
  const progress = Math.min(TASKS.length, total / per);
  const done = Math.floor(progress);
  const frac = progress - done;
  const doing = done < TASKS.length ? done : null;
  const win = useWinOnce(onWin);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (done >= TASKS.length && !finished) {
      setFinished(true);
      win({ line: 'You just built this app.', stats: { taps: total, bots: Object.keys(taps).length } });
    }
  }, [done]);

  useBroadcast(setPayload, { doing: doing === null ? null : TASKS[doing], done, total: TASKS.length, pct: Math.round(frac * 100) } satisfies Payload);

  const todo = TASKS.slice(done + 1);
  const doneList = TASKS.slice(0, done);
  const card = (t: string, extra?: React.ReactNode, style?: React.CSSProperties, cls = '') => (
    <div key={t} className={cls} style={{
      background: 'var(--white)', borderRadius: 'var(--radius)', padding: '.6cqw 1cqw', fontWeight: 700, fontSize: '1.6cqw',
      boxShadow: '0 .35cqw 0 rgba(47,22,4,.15)', ...style,
    }}>{t}{extra}</div>
  );
  const column = (title: string, bg: string, tilt: number, children: React.ReactNode) => (
    <div style={{
      flex: 1, background: bg, borderRadius: 'var(--radius)', padding: '1.2cqw', display: 'flex', flexDirection: 'column', gap: '.7cqw',
      transform: `rotate(${tilt}deg)`, border: '.3cqw solid var(--white)', boxShadow: '0 .6cqw 0 rgba(47,22,4,.15)', minHeight: 0, overflow: 'hidden',
    }}>
      <div className="font-display" style={{ fontSize: '2.2cqw', color: 'var(--ink)' }}>{title}</div>
      {children}
    </div>
  );

  return (
    <div className="g-wrap">
      <div className="g-panel">
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '2cqw' }}>
          <h2 className="g-title" style={{ color: accent }}>{finished ? 'Shipped!' : 'Ship it, bots. WORK!'}</h2>
          <div className="g-sub">{players.length} bots · {done}/{TASKS.length} done</div>
        </div>
        <div style={{ flex: 1, display: 'flex', gap: '1.6cqw', minHeight: 0 }}>
          {column('To do', 'var(--paper-warm)', -1, todo.map((t) => card(t)))}
          {column('Doing', 'var(--paper)', 0.5, doing !== null && card(TASKS[doing], (
            <div className="g-track" style={{ height: '1.4cqw', marginTop: '.6cqw' }}>
              <div style={{ height: '100%', width: `${frac * 100}%`, background: accent, transition: 'width .3s' }} />
            </div>
          ), { fontSize: '2.2cqw', border: `.3cqw solid ${accent}` }))}
          {column('Done', 'var(--paper-edge)', 1, doneList.slice().reverse().map((t) => card(`✓ ${t}`, null, { background: accent, color: 'var(--white)' }, 'g-pop')))}
        </div>
      </div>
    </div>
  );
}

function Controller({ me, payload, send }: ControllerProps) {
  const p = payload as Payload | null;
  return (
    <div className="g-phone">
      <h3>You are Bot {me.emoji} {me.name}</h3>
      {p?.doing ? (
        <p className="g-note" style={{ fontSize: 18 }}>Working on: <b style={{ color: 'var(--ink)' }}>{p.doing}</b> ({p.done}/{p.total})</p>
      ) : (
        <p className="g-note" style={{ fontSize: 18 }}>{p ? 'All tasks done ✓' : 'Look up at the screen'}</p>
      )}
      <button
        className="btn-sunset g-tapbtn"
        disabled={!!p && !p.doing}
        onPointerDown={(e) => { e.preventDefault(); buzz(); send(1); }}
      >WORK</button>
    </div>
  );
}

export const bots: GameModule = {
  id: 'bots',
  inputKind: 'tap',
  Screen,
  Controller,
  simulate: (players, payload) => {
    const p = payload as Payload | null;
    if (p && !p.doing) return [];
    return players.filter(() => Math.random() < 0.6).map((pl) => ({ playerId: pl.id, value: 1 + Math.floor(Math.random() * 2) }));
  },
};
