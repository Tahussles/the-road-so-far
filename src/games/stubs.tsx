// Temporary stub games so the shell runs end to end. Ebrahim replaces these.
import { useEffect, useRef } from 'react';
import type { GameModule, ScreenProps, ControllerProps } from './types';

const OPTIONS = ['Option A', 'Option B', 'Option C', 'Option D'];

function useWinAfter(ms: number, onWin: ScreenProps['onWin'], line: string, stats: () => Record<string, number>) {
  const statsRef = useRef(stats);
  statsRef.current = stats;
  useEffect(() => {
    const t = setTimeout(() => onWin({ line, stats: statsRef.current() }), ms);
    return () => clearTimeout(t);
  }, []);
}

function makeVote(id: 'stack' | 'priya', title: string): GameModule {
  const Screen = ({ votes, setPayload, resetVotes, onWin, accent }: ScreenProps) => {
    useEffect(() => {
      resetVotes();
      setPayload({ question: title, options: OPTIONS });
    }, []);
    const counts = OPTIONS.map((_, i) => Object.values(votes).filter((v) => v === i).length);
    const total = counts.reduce((a, b) => a + b, 0);
    useWinAfter(7000, onWin, `${title} (stub)`, () => ({ votes: total }));
    return (
      <div className="paper sticker rounded-lg p-8 w-full max-w-3xl" style={{ borderColor: '#fff' }}>
        <h2 className="text-4xl mb-6" style={{ color: accent }}>{title}</h2>
        {OPTIONS.map((o, i) => (
          <div key={o} className="mb-3">
            <div className="flex justify-between font-bold text-xl"><span>{o}</span><span>{counts[i]}</span></div>
            <div className="h-5 rounded bg-paper-edge overflow-hidden">
              <div className="h-full transition-all" style={{ width: `${total ? (counts[i] / total) * 100 : 0}%`, background: accent }} />
            </div>
          </div>
        ))}
        <p className="mt-4 text-muted">Stub game: {total} votes. Wins in a few seconds.</p>
      </div>
    );
  };
  const Controller = ({ payload, send }: ControllerProps) => {
    const p = payload as { options?: string[] } | null;
    const opts = p?.options ?? OPTIONS;
    return (
      <div className="flex flex-col gap-3 w-full">
        {opts.map((o, i) => (
          <button key={o} className="btn-sunset text-2xl py-6" onClick={() => { try { navigator.vibrate?.(15); } catch {} send(i); }}>{o}</button>
        ))}
      </div>
    );
  };
  return {
    id, inputKind: 'vote', Screen, Controller,
    simulate: (players) => players.filter(() => Math.random() < 0.2).map((p) => ({ playerId: p.id, value: Math.floor(Math.random() * 4) })),
  };
}

function makeTap(id: 'rebuild' | 'bots', title: string, word: string): GameModule {
  const Screen = ({ taps, players, onWin, accent }: ScreenProps) => {
    const total = Object.values(taps).reduce((a, b) => a + b, 0);
    const target = Math.max(150, players.length * 18);
    const done = useRef(false);
    useEffect(() => {
      if (!done.current && total >= target) { done.current = true; onWin({ line: `${title} (stub)`, stats: { taps: total } }); }
    }, [total, target]);
    useWinAfter(9000, (s) => { if (!done.current) { done.current = true; onWin(s); } }, `${title} (stub)`, () => ({ taps: total }));
    return (
      <div className="paper sticker rounded-lg p-8 w-full max-w-3xl">
        <h2 className="text-4xl mb-6" style={{ color: accent }}>{title}</h2>
        <div className="h-10 rounded-lg overflow-hidden" style={{ background: 'var(--wood-dark)' }}>
          <div className="h-full transition-all" style={{ width: `${Math.min(100, (total / target) * 100)}%`, background: accent }} />
        </div>
        <p className="mt-4 text-2xl font-bold">{total} / {target} taps</p>
        <p className="text-muted">Stub game. Wins at target or after a few seconds.</p>
      </div>
    );
  };
  const Controller = ({ send }: ControllerProps) => (
    <button
      className="btn-sunset rounded-full w-64 h-64 text-5xl sticker"
      onPointerDown={() => { try { navigator.vibrate?.(15); } catch {} send(1); }}
    >{word}</button>
  );
  return {
    id, inputKind: 'tap', Screen, Controller,
    simulate: (players) => players.filter(() => Math.random() < 0.7).map((p) => ({ playerId: p.id, value: 1 + Math.floor(Math.random() * 3) })),
  };
}

export const STUBS: Record<GameModule['id'], GameModule> = {
  stack: makeVote('stack', 'Pick the stack'),
  rebuild: makeTap('rebuild', 'Rebuild the frontend', 'TAP'),
  priya: makeVote('priya', "Priya's next step"),
  bots: makeTap('bots', 'Ship it, bots', 'WORK'),
};
