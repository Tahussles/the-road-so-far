// Local test harness at /dev. Fakes the shell: fake players, simulate loop, vote/tap aggregation.
import { useCallback, useEffect, useRef, useState } from 'react';
import { GAMES } from './index';
import type { GameModule, Player } from './types';

const EMOJI = ['🦊', '🐸', '🐼', '🐙', '🦄', '🐝', '🐢', '🦉', '🐧', '🐯'];
const NAMES = ['Ava', 'Ben', 'Cleo', 'Dev', 'Eli', 'Fatima', 'Gus', 'Hana', 'Ivan', 'Jules', 'Kai', 'Lena', 'Milo', 'Noor', 'Omar', 'Pia', 'Quinn', 'Ravi', 'Sana', 'Theo'];
const FAKE: Player[] = NAMES.map((name, i) => ({ id: `p${i}`, name, emoji: EMOJI[i % EMOJI.length] }));
const ME: Player = { id: 'me', name: 'Me', emoji: '😎' };
const ACCENT: Record<GameModule['id'], string> = {
  stack: 'var(--stop-goon)', rebuild: 'var(--stop-hack)', priya: 'var(--stop-af)', bots: 'var(--stop-grok)',
};

export default function Harness() {
  const [id, setId] = useState<GameModule['id']>('stack');
  const [run, setRun] = useState(0);
  const [sim, setSim] = useState(true);
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [taps, setTaps] = useState<Record<string, number>>({});
  const [payload, setPayload] = useState<unknown>(null);
  const [win, setWin] = useState<{ line: string; stats?: Record<string, number> } | null>(null);
  const payloadRef = useRef<unknown>(null);
  payloadRef.current = payload;
  const game = GAMES[id];

  useEffect(() => {
    setVotes({}); setTaps({}); setPayload(null); setWin(null);
    if (!sim) return;
    let tick = 0;
    const iv = setInterval(() => {
      const inputs = game.simulate(FAKE, payloadRef.current, tick++);
      if (!inputs.length) return;
      if (game.inputKind === 'vote') setVotes((v) => { const n = { ...v }; inputs.forEach((x) => (n[x.playerId] = x.value)); return n; });
      else setTaps((t) => { const n = { ...t }; inputs.forEach((x) => (n[x.playerId] = (n[x.playerId] ?? 0) + x.value)); return n; });
    }, 300);
    return () => clearInterval(iv);
  }, [id, run, sim]);

  const send = useCallback((value: number) => {
    if (game.inputKind === 'vote') setVotes((v) => ({ ...v, me: value }));
    else setTaps((t) => ({ ...t, me: (t.me ?? 0) + value }));
  }, [game]);
  const resetVotes = useCallback(() => setVotes({}), []);
  const onWin = useCallback((s: { line: string; stats?: Record<string, number> }) => setWin(s), []);

  return (
    <div className="min-h-full p-4 flex flex-col gap-4" style={{ background: 'var(--sky-bottom)' }}>
      <div className="flex gap-2 flex-wrap items-center">
        {(Object.keys(GAMES) as GameModule['id'][]).map((g) => (
          <button key={g} className={g === id ? 'btn-sunset px-4 py-2' : 'btn-paper px-4 py-2'} onClick={() => { setId(g); setRun((r) => r + 1); }}>{g}</button>
        ))}
        <button className="btn-paper px-4 py-2" onClick={() => setRun((r) => r + 1)}>Restart</button>
        <label className="font-bold flex items-center gap-2 ml-2">
          <input type="checkbox" checked={sim} onChange={(e) => setSim(e.target.checked)} /> Sim {FAKE.length} players
        </label>
        {win && (
          <span className="paper sticker rounded-lg px-3 py-1 font-bold">
            onWin: {win.line} {win.stats && <span className="text-muted">{JSON.stringify(win.stats)}</span>}
          </span>
        )}
      </div>
      <div className="flex gap-4 items-start">
        <div className="flex-1 aspect-video relative overflow-hidden rounded-lg" style={{ background: 'var(--wood)', containerType: 'inline-size' }}>
          <div className="absolute inset-0 flex items-center justify-center p-[3cqw] pt-[6cqw]">
            <game.Screen key={`${id}-${run}`} players={FAKE} votes={votes} taps={taps} setPayload={setPayload}
              resetVotes={resetVotes} onWin={onWin} accent={ACCENT[id]} />
          </div>
        </div>
        <div className="w-[360px] h-[700px] shrink-0 rounded-[40px] border-8 border-ink-brown overflow-hidden flex flex-col" style={{ background: 'var(--paper)' }}>
          <div className="h-16 shrink-0" style={{ background: 'linear-gradient(var(--sky-top), var(--sky-bottom))' }} />
          <div className="flex-1 p-4 flex items-center justify-center overflow-auto">
            <game.Controller key={`${id}-${run}`} me={ME} payload={payload} send={send} />
          </div>
        </div>
      </div>
      <pre className="text-xs text-muted overflow-auto">payload: {JSON.stringify(payload)}</pre>
    </div>
  );
}
