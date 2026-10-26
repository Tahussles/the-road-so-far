// Stub harness. Ebrahim owns and replaces this file.
import { useEffect, useRef, useState } from 'react';
import { GAMES } from './index';
import type { GameModule, Player } from './types';

const EMOJI = ['🦊', '🐸', '🐼', '🐙', '🦄', '🐝', '🐢', '🦉', '🐧', '🐯'];
const FAKE: Player[] = Array.from({ length: 20 }, (_, i) => ({ id: `p${i}`, name: `Player ${i + 1}`, emoji: EMOJI[i % EMOJI.length] }));

export default function Harness() {
  const [id, setId] = useState<GameModule['id']>('stack');
  const [run, setRun] = useState(0);
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [taps, setTaps] = useState<Record<string, number>>({});
  const [payload, setPayload] = useState<unknown>(null);
  const [win, setWin] = useState<string | null>(null);
  const payloadRef = useRef<unknown>(null);
  payloadRef.current = payload;
  const game = GAMES[id];

  useEffect(() => {
    setVotes({}); setTaps({}); setPayload(null); setWin(null);
    let tick = 0;
    const iv = setInterval(() => {
      const inputs = game.simulate(FAKE, payloadRef.current, tick++);
      if (game.inputKind === 'vote') setVotes((v) => { const n = { ...v }; inputs.forEach((x) => (n[x.playerId] = x.value)); return n; });
      else setTaps((t) => { const n = { ...t }; inputs.forEach((x) => (n[x.playerId] = (n[x.playerId] ?? 0) + x.value)); return n; });
    }, 300);
    return () => clearInterval(iv);
  }, [id, run]);

  const send = (value: number) => {
    if (game.inputKind === 'vote') setVotes((v) => ({ ...v, me: value }));
    else setTaps((t) => ({ ...t, me: (t.me ?? 0) + value }));
  };

  return (
    <div className="min-h-full p-4 flex flex-col gap-4" style={{ background: 'var(--sky-bottom)' }}>
      <div className="flex gap-2">
        {(Object.keys(GAMES) as GameModule['id'][]).map((g) => (
          <button key={g} className={g === id ? 'btn-sunset px-4 py-2' : 'btn-paper px-4 py-2'} onClick={() => setId(g)}>{g}</button>
        ))}
        <button className="btn-paper px-4 py-2" onClick={() => setRun((r) => r + 1)}>Restart</button>
        {win && <span className="font-bold self-center">WIN: {win}</span>}
      </div>
      <div className="flex gap-4">
        <div className="flex-1 aspect-video flex items-center justify-center rounded-lg" style={{ background: 'var(--wood)' }}>
          <game.Screen key={`${id}-${run}`} players={FAKE} votes={votes} taps={taps} setPayload={setPayload}
            resetVotes={() => setVotes({})} onWin={(s) => setWin(s.line)} accent="var(--stop-goon)" />
        </div>
        <div className="w-[360px] h-[700px] rounded-[40px] border-8 border-ink-brown bg-paper p-4 flex items-center justify-center">
          <game.Controller me={{ id: 'me', name: 'Me', emoji: '😎' }} payload={payload} send={send} />
        </div>
      </div>
    </div>
  );
}
