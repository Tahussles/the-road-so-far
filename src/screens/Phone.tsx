import { useState } from 'react';
import { GAMES } from '../games';
import { EMOJIS, HAS_SUPABASE, usePlayerRoom } from '../realtime';
import { STOPS, accentVar } from '../story';

const buzz = (ms = 15) => { try { navigator.vibrate?.(ms); } catch {} };

export default function Phone() {
  const code = (new URLSearchParams(location.search).get('room') ?? '').toUpperCase();
  const { me, join, state, send } = usePlayerRoom(code);

  if (!code) return <Shell><Card><h2 className="text-3xl text-ink-brown">No room code</h2><p className="mt-2 text-lg">Scan the QR on the big screen to hop on.</p></Card></Shell>;
  if (!me) return <Join code={code} onJoin={join} />;

  const k = state && state.stopIndex >= 0 ? state.stopIndex : -1;
  const stop = k >= 0 ? STOPS[k] : null;
  const accent = k >= 0 ? accentVar(k) : 'var(--red)';

  let body: React.ReactNode;
  if (!state) {
    body = <Card><h2 className="text-3xl text-ink-brown">Finding the bus...</h2><p className="mt-2 text-lg text-muted">Room {code}. Hang tight.</p></Card>;
  } else if (state.phase === 'game' && state.gameId) {
    const G = GAMES[state.gameId];
    body = (
      <div className="w-full flex flex-col items-center gap-3">
        <div className="text-sm font-bold uppercase tracking-widest" style={{ color: accent }}>{stop?.name} / {stop?.gameTitle}</div>
        <div className="w-full flex justify-center"><G.Controller me={me} payload={state.payload} send={send} /></div>
      </div>
    );
  } else if (state.phase === 'win' || state.phase === 'finale') {
    body = <Cheer title={state.phase === 'win' ? 'Stop cleared!' : 'Thanks for riding'} sub={state.phase === 'win' ? 'The bus is about to leave.' : 'You helped tell our story.'} accent={accent} />;
  } else {
    const what = state.phase === 'title' ? 'The bus is boarding' : state.phase === 'travel' ? `Driving to ${stop?.name}` : `Now at ${stop?.name}`;
    const sub = state.phase === 'story' ? 'Eyes up. A game starts soon, keep your phone ready.' : 'Watch the big screen. Games start at every stop.';
    body = (
      <Card>
        <div className="text-6xl rsf-bounce">🚌</div>
        <h2 className="text-3xl text-ink-brown mt-3">{what}</h2>
        <p className="mt-2 text-lg text-muted">{sub}</p>
      </Card>
    );
  }

  return (
    <Shell>
      <div className="w-full flex items-center justify-between mb-4">
        <div className="paper rounded-lg px-3 py-1 font-bold text-ink-brown shadow-sticker">{me.emoji} {me.name}</div>
        <div className="paper rounded-lg px-3 py-1 font-bold text-muted shadow-sticker">Room {code}</div>
      </div>
      {body}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="rsf-phone flex flex-col" style={{ background: 'var(--paper)' }}>
      <div className="h-24 shrink-0 relative overflow-hidden" style={{ background: 'linear-gradient(var(--sky-top), var(--sky-bottom))' }}>
        <svg viewBox="0 0 400 96" preserveAspectRatio="none" className="absolute bottom-0 w-full h-16">
          <path d="M0 70 L60 30 L110 60 L170 20 L230 64 L290 28 L350 60 L400 36 L400 96 L0 96 Z" fill="var(--teal)" opacity=".6" />
          <path d="M0 84 L50 56 L120 86 L190 50 L260 88 L330 54 L400 80 L400 96 L0 96 Z" fill="var(--teal-deep)" />
        </svg>
        <div className="absolute left-4 top-3 font-display text-2xl sunset-text">The Road So Far</div>
      </div>
      <div className="flex-1 flex flex-col items-center px-4 py-5">{children}</div>
      {!HAS_SUPABASE && <div className="text-center text-xs text-muted pb-2">local mode (same browser only)</div>}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="w-full bg-white rounded-lg shadow-sticker p-6 text-center">{children}</div>;
}

function Join({ code, onJoin }: { code: string; onJoin: (name: string, emoji: string) => void }) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState(EMOJIS[Math.floor(Math.random() * EMOJIS.length)]);
  const ok = name.trim().length > 0;
  return (
    <Shell>
      <Card>
        <h2 className="text-3xl text-ink-brown">Hop on the bus</h2>
        <p className="text-muted mt-1">Room {code}</p>
        <input
          className="mt-4 w-full rounded-lg border-4 border-paper-edge px-4 py-4 text-2xl font-bold text-ink bg-paper outline-none focus:border-[var(--wood-shine)]"
          style={{ fontSize: 24 }}
          placeholder="Your name"
          maxLength={14}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && ok) onJoin(name.trim(), emoji); }}
        />
        <div className="grid grid-cols-6 gap-2 mt-4">
          {EMOJIS.slice(0, 18).map((e) => (
            <button
              key={e}
              className={`text-3xl rounded-lg py-2 ${e === emoji ? 'bg-paper-warm ring-4 ring-[var(--wood-shine)]' : 'bg-paper'}`}
              onClick={() => { buzz(8); setEmoji(e); }}
            >{e}</button>
          ))}
        </div>
        <button
          className="btn-sunset w-full mt-5 py-5 text-2xl disabled:opacity-50"
          disabled={!ok}
          onClick={() => { buzz(30); onJoin(name.trim(), emoji); }}
        >Get on the bus {emoji}</button>
      </Card>
    </Shell>
  );
}

function Cheer({ title, sub, accent }: { title: string; sub: string; accent: string }) {
  const [n, setN] = useState(0);
  return (
    <Card>
      <h2 className="text-4xl" style={{ color: accent }}>{title}</h2>
      <p className="mt-2 text-lg text-muted">{sub}</p>
      <button
        className="btn-sunset rounded-full w-48 h-48 mt-6 text-5xl sticker mx-auto"
        onPointerDown={() => { buzz(20); setN((x) => x + 1); }}
      >🎉</button>
      <div className="mt-3 font-bold text-ink-brown">{n > 0 ? `${n} cheers` : 'Tap to cheer'}</div>
    </Card>
  );
}
