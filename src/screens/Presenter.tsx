import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { MapScene, type MapHandle } from '../components/MapScene';
import { GAMES } from '../games';
import { HAS_SUPABASE, useHostRoom, type Phase, type RoomState } from '../realtime';
import { STOPS, accentVar } from '../story';

type Step = { t: Phase; k?: number };
const STEPS: Step[] = [{ t: 'title' }];
STOPS.forEach((_, k) => STEPS.push({ t: 'travel', k }, { t: 'story', k }, { t: 'game', k }, { t: 'win', k }));
STEPS.push({ t: 'finale' });

type Summary = { line: string; stats?: Record<string, number> };

export default function Presenter() {
  const [pi, setPi] = useState(0);
  const [run, setRun] = useState(0);
  // payload is tagged with the game instance that set it, so a new game starts from null
  // without a reset effect that would race the Screen's first setPayload
  const [payloadBox, setPayloadBox] = useState<{ key: string; json: string; value: unknown }>({ key: '', json: 'null', value: null });
  const gameKey = `${pi}-${run}`;
  const gameKeyRef = useRef(gameKey);
  gameKeyRef.current = gameKey;
  const payload = payloadBox.key === gameKey ? payloadBox.value : null;
  const setPayload = useCallback((p: unknown) => {
    const json = JSON.stringify(p) ?? 'null';
    setPayloadBox((cur) => (cur.key === gameKeyRef.current && cur.json === json ? cur : { key: gameKeyRef.current, json, value: p }));
  }, []);
  const [summaries, setSummaries] = useState<Record<number, Summary>>({});
  const [bigQr, setBigQr] = useState(false);
  const step = STEPS[pi];
  const k = step.k ?? (step.t === 'finale' ? 3 : 0);
  const stop = STOPS[k];

  const state: RoomState = useMemo(
    () => ({ stopIndex: step.k ?? -1, phase: step.t, gameId: step.t === 'game' ? stop.gameId : null, payload: step.t === 'game' ? payload : null, run }),
    [pi, payload, run],
  );
  const room = useHostRoom(state);
  const joinUrl = `${location.origin}/play?room=${room.code}`;

  const mapRef = useRef<MapHandle>(null);
  const cleared = useMemo(() => {
    const out: number[] = [];
    STOPS.forEach((_, i) => {
      const winIdx = STEPS.findIndex((s) => s.t === 'win' && s.k === i);
      if (pi >= winIdx) out.push(i);
    });
    return out;
  }, [pi]);

  const go = useCallback((dir: number) => setPi((p) => Math.max(0, Math.min(STEPS.length - 1, p + dir))), []);

  // bus position + travel
  const prevPi = useRef(0);
  useEffect(() => {
    const dir = pi - prevPi.current;
    prevPi.current = pi;
    const m = mapRef.current;
    if (!m) return;
    if (step.t === 'travel' && dir > 0) {
      const myPi = pi;
      m.driveTo(step.k! + 1, () => setTimeout(() => setPi((p) => (p === myPi ? p + 1 : p)), 350));
    } else if (step.t === 'finale') {
      if (dir > 0) m.driveTo(5); else m.jumpTo(5);
    } else if (step.t === 'title') {
      m.jumpTo(0);
    } else if (dir <= 0 || step.t !== 'travel') {
      const pos = step.t === 'travel' ? step.k! : step.k! + 1;
      if (dir < 0) m.jumpTo(pos);
    }
  }, [pi]);

  // fresh game state on enter
  useEffect(() => {
    if (step.t === 'game') room.resetGame();
  }, [pi, run]);

  const onWin = useCallback((s: Summary) => {
    const myPi = pi;
    setSummaries((cur) => (cur[k] ? cur : { ...cur, [k]: s }));
    const delay = GAMES[stop.gameId].inputKind === 'vote' ? 3200 : 1600;
    setTimeout(() => setPi((p) => (p === myPi ? p + 1 : p)), delay);
  }, [pi, k]);

  // keys
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); go(1); }
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 's' || e.key === 'S') room.toggleSim();
      else if (e.key === 'r' || e.key === 'R') { setSummaries((c) => { const n = { ...c }; delete n[k]; return n; }); setRun((r) => r + 1); }
      else if (e.key === 'q' || e.key === 'Q') setBigQr((b) => !b);
      else if (e.key === 'f' || e.key === 'F') {
        if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, room.toggleSim, k]);

  const Game = GAMES[stop.gameId];
  const dim = step.t !== 'travel';

  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'var(--wood-deep)' }}>
      <div className="rsf-stage relative overflow-hidden" style={{ ['--accent' as any]: accentVar(k) }}>
        <MapScene ref={mapRef} cleared={cleared} busPos={0} dim={dim && step.t !== 'finale'} zoomOut={step.t === 'finale'} />

        {step.t === 'title' && <Title code={room.code} url={joinUrl} players={room.players} />}
        {step.t === 'story' && <Story k={k} />}
        {step.t === 'game' && (
          <div className="absolute inset-0 flex items-center justify-center p-[3cqw] pt-[6cqw]" style={{ containerType: 'inline-size' }}>
            <div className="absolute top-[1.6cqw] left-[2cqw] rsf-tag font-display text-[1.6cqw]" style={{ color: accentVar(k) }}>
              {stop.name} / {stop.gameTitle}
            </div>
            <Game.Screen
              key={`${k}-${run}`}
              players={room.players}
              votes={room.votes}
              taps={room.taps}
              setPayload={setPayload}
              resetVotes={room.resetVotes}
              onWin={onWin}
              accent={accentVar(k)}
            />
          </div>
        )}
        {step.t === 'win' && <Win k={k} summary={summaries[k]} next={k < 3 ? STOPS[k + 1].name : 'the finale'} />}
        {step.t === 'finale' && <Finale passengers={room.count} totals={room.totals} />}

        <Hud code={room.code} url={joinUrl} count={room.count} sim={room.sim} hidden={step.t === 'title'} />
        <div className="absolute bottom-[0.8cqw] left-[1cqw] text-[1.1cqw] font-bold text-white/70">
          {pi + 1}/{STEPS.length} {step.t}{step.k !== undefined ? ` / ${stop.name}` : ''}
          {!HAS_SUPABASE && ' / local mode'}
        </div>
        {bigQr && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-50" onClick={() => setBigQr(false)}>
            <div className="paper sticker rounded-lg p-[2cqw] flex flex-col items-center gap-[1cqw]">
              <QRCodeSVG value={joinUrl} size={512} style={{ width: '32cqw', height: '32cqw' }} fgColor="#2f1604" bgColor="transparent" />
              <div className="font-display text-[3cqw] text-ink-brown">Room {room.code}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Hud({ code, url, count, sim, hidden }: { code: string; url: string; count: number; sim: boolean; hidden: boolean }) {
  if (hidden) return null;
  return (
    <div className="absolute top-[1.2cqw] right-[1.2cqw] paper sticker rounded-lg p-[0.6cqw] flex items-center gap-[0.8cqw] rotate-[2deg] z-40" style={{ borderWidth: '0.35cqw' }}>
      <QRCodeSVG value={url} size={160} style={{ width: '6cqw', height: '6cqw' }} fgColor="#2f1604" bgColor="transparent" />
      <div className="pr-[0.4cqw]">
        <div className="font-display text-[1.5cqw] leading-none text-ink-brown">{code}</div>
        <div className="text-[1.2cqw] font-bold text-muted mt-[0.3cqw]">{count} on the bus</div>
        {sim && <div className="text-[1cqw] font-bold text-red-text mt-[0.2cqw]">SIM MODE</div>}
      </div>
    </div>
  );
}

function Title({ code, url, players }: { code: string; url: string; players: { id: string; emoji: string; name: string }[] }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="paper sticker rounded-lg rotate-[-1.5deg] px-[3.5cqw] py-[2.6cqw] flex items-center gap-[3cqw] rsf-pop" style={{ borderWidth: '0.5cqw' }}>
        <Tape className="-top-[1.2cqw] left-[6cqw] rotate-[-6deg]" />
        <Tape className="-top-[1.2cqw] right-[6cqw] rotate-[5deg]" />
        <div className="max-w-[40cqw]">
          <div className="font-bold uppercase tracking-[0.2em] text-[1.25cqw] text-muted">A ride through 4 hackathons</div>
          <h1 className="sunset-text text-[7.2cqw] leading-[0.95] mt-[0.6cqw]">The Road<br />So Far</h1>
          <p className="text-[1.6cqw] font-bold text-ink mt-[1cqw]">Taha Hussain &amp; Ebrahim Zuberi</p>
          <p className="text-[1.4cqw] text-muted mt-[1.4cqw]">Scan to hop on the bus. You play a minigame at every stop.</p>
          <div className="flex flex-wrap gap-[0.4cqw] mt-[1.2cqw] min-h-[3cqw] max-w-[40cqw]">
            {players.map((p) => (
              <span key={p.id} title={p.name} className="rsf-pop inline-flex items-center justify-center bg-white rounded-full shadow-sticker text-[1.9cqw] w-[3cqw] h-[3cqw]">
                {p.emoji}
              </span>
            ))}
          </div>
          <p className="text-[1.25cqw] font-bold text-ink-brown mt-[0.6cqw]">{players.length} on the bus</p>
        </div>
        <div className="flex flex-col items-center">
          <div className="bg-white p-[0.8cqw] rounded-lg shadow-sticker rotate-[2deg]">
            <QRCodeSVG value={url} size={512} style={{ width: '22cqw', height: '22cqw' }} fgColor="#2f1604" bgColor="#ffffff" />
          </div>
          <div className="font-display text-[2.4cqw] text-ink-brown mt-[1cqw]">Room {code}</div>
          <div className="text-[1.6cqw] text-ink-brown font-bold">{url.replace(/^https?:\/\//, '')}</div>
        </div>
      </div>
    </div>
  );
}

function Tape({ className = '' }: { className?: string }) {
  return <div className={`absolute w-[7cqw] h-[2cqw] bg-paper-warm/80 border border-paper-edge ${className}`} style={{ boxShadow: '0 2px 4px rgba(0,0,0,.08)' }} />;
}

function Story({ k }: { k: number }) {
  const s = STOPS[k];
  const accent = accentVar(k);
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      {s.video && (
        <video className="absolute inset-0 w-full h-full object-cover opacity-60" src={s.video} autoPlay muted loop playsInline />
      )}
      <div className="relative flex items-center gap-[2.5cqw] px-[5cqw]">
        <div className="relative paper sticker rounded-lg rotate-[-1deg] p-[2.6cqw] w-[48cqw] rsf-pop" style={{ borderWidth: '0.5cqw' }}>
          <Tape className="-top-[1.1cqw] left-[3cqw] rotate-[-8deg]" />
          <Tape className="-top-[1.1cqw] right-[3cqw] rotate-[6deg]" />
          <div className="font-bold uppercase tracking-[0.18em] text-[1.05cqw] text-muted">Stop {k + 1} / {s.where}</div>
          <h2 className="text-[4.2cqw] leading-none mt-[0.4cqw]" style={{ color: accent }}>{s.name}</h2>
          <div className="font-display text-[2.2cqw] text-ink-brown mt-[0.4cqw]">{s.project}</div>
          <p className="text-[1.45cqw] text-ink mt-[0.8cqw] leading-snug">{s.about}</p>
          <div className="grid grid-cols-2 gap-[1.2cqw] mt-[1.4cqw]">
            <div className="rounded-lg p-[1cqw] bg-white/70 border-l-[0.4cqw]" style={{ borderColor: 'var(--red)' }}>
              <div className="font-display text-[1.3cqw] text-red-text">The struggle</div>
              <p className="text-[1.4cqw] leading-snug mt-[0.3cqw]">{s.struggle}</p>
            </div>
            <div className="rounded-lg p-[1cqw] bg-white/70 border-l-[0.4cqw]" style={{ borderColor: 'var(--leaf)' }}>
              <div className="font-display text-[1.3cqw] text-leaf">Got us through</div>
              <p className="text-[1.4cqw] leading-snug mt-[0.3cqw]">{s.through}</p>
            </div>
          </div>
          <div className="mt-[1.2cqw] text-[1.25cqw] font-bold text-muted">Next: phones out. {s.gameTitle}.</div>
        </div>
        <div className="relative w-[30cqw] h-[34cqw]">
          {s.photos.length === 0 ? (
            <Polaroid i={0} n={1}><Placeholder k={k} /></Polaroid>
          ) : (
            s.photos.slice(0, 4).map((src, i) => (
              <Polaroid key={src} i={i} n={Math.min(4, s.photos.length)}>
                <img src={src} alt="" className="w-full h-full object-cover" />
              </Polaroid>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

const POLA = [
  { x: 0, y: 0, r: -5 },
  { x: 11, y: 9, r: 4 },
  { x: 2, y: 17, r: 3 },
  { x: 13, y: 1, r: -3 },
];
function Polaroid({ i, n, children }: { i: number; n: number; children: React.ReactNode }) {
  const p = n === 1 ? { x: 2, y: 4, r: 3 } : POLA[i];
  const w = n === 1 ? 26 : n === 2 ? 20 : 16;
  return (
    <div
      className="absolute bg-white p-[0.7cqw] pb-[2.4cqw] shadow-sticker rsf-pop"
      style={{ left: `${p.x}cqw`, top: `${p.y}cqw`, width: `${w}cqw`, transform: `rotate(${p.r}deg)`, animationDelay: `${0.15 + i * 0.12}s` }}
    >
      <div className="aspect-[4/3] overflow-hidden bg-paper-edge">{children}</div>
      <Tape className="-top-[0.8cqw] left-1/2 -translate-x-1/2 !w-[5cqw] !h-[1.4cqw]" />
    </div>
  );
}

function Placeholder({ k }: { k: number }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-[0.6cqw]" style={{ background: 'var(--paper-warm)' }}>
      <svg viewBox="0 0 100 80" className="w-[55%]">
        <rect x="34" y="6" width="32" height="56" rx="6" fill={accentVar(k)} />
        <rect x="39" y="13" width="18" height="38" rx="2" fill="#fff" />
        <rect x="59" y="13" width="3" height="38" rx="1" fill="#f1dcbf" />
        <rect x="59" y="20" width="3" height="12" rx="1" fill="#7f1a1a" />
        <path d="M10 70 Q50 58 90 70" stroke="#698019" strokeWidth="4" fill="none" />
      </svg>
      <div className="font-display text-[1.3cqw] text-muted">no photos, just vibes</div>
    </div>
  );
}

function Win({ k, summary, next }: { k: number; summary?: Summary; next: string }) {
  const s = STOPS[k];
  const line = summary?.line?.trim() || s.win;
  const raw = { ...(summary?.stats ?? {}) };
  // "4 correct" + "4 of" reads better as one "4/4 correct" chip
  const merged: [string, string | number][] = [];
  if ('correct' in raw && ('of' in raw || 'rounds' in raw)) {
    merged.push(['correct', `${raw.correct}/${raw.of ?? raw.rounds}`]);
    delete raw.correct; delete raw.of; delete raw.rounds;
  }
  const stats = [...merged, ...Object.entries(raw)];
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="relative paper sticker rounded-lg rotate-[1deg] px-[4cqw] py-[3cqw] text-center max-w-[60cqw] rsf-pop" style={{ borderWidth: '0.5cqw' }}>
        <Tape className="-top-[1.1cqw] left-1/2 -translate-x-1/2 rotate-[-3deg]" />
        <div className="inline-flex items-center gap-[0.6cqw] font-bold uppercase tracking-[0.18em] text-[1.25cqw]" style={{ color: accentVar(k) }}>
          <span className="inline-flex items-center justify-center w-[2.2cqw] h-[2.2cqw] rounded-full text-white text-[1.3cqw]" style={{ background: 'var(--leaf)' }}>✓</span>
          {s.name} complete
        </div>
        <h2 className="text-[5cqw] leading-none mt-[1cqw]" style={{ color: accentVar(k) }}>{line}</h2>
        {line !== s.win && <div className="font-display text-[2.2cqw] text-ink-brown mt-[0.6cqw]">{s.win}</div>}
        <p className="text-[1.8cqw] text-ink mt-[1cqw]">{s.winSub}</p>
        {stats.length > 0 && (
          <div className="flex justify-center gap-[1cqw] mt-[1.4cqw]">
            {stats.map(([key, v]) => (
              <div key={key} className="bg-white rounded-lg shadow-sticker px-[1.2cqw] py-[0.6cqw]">
                <div className="font-display text-[2.2cqw] leading-none" style={{ color: accentVar(k) }}>{v}</div>
                <div className="text-[1.1cqw] font-bold text-muted uppercase tracking-wider">{key.replace(/([A-Z])/g, ' $1')}</div>
              </div>
            ))}
          </div>
        )}
        <p className="text-[1.25cqw] text-muted font-bold mt-[1.6cqw]">Press Next to drive to {next}</p>
      </div>
    </div>
  );
}

function Finale({ passengers, totals }: { passengers: number; totals: { taps: number; votes: number } }) {
  const beats = STOPS.map((s, i) => ({ word: s.beat, color: accentVar(i) }));
  return (
    <div className="absolute inset-0 flex items-end justify-center pb-[4cqw]">
      <div className="relative paper sticker rounded-lg px-[4cqw] py-[2.4cqw] text-center rsf-pop" style={{ borderWidth: '0.5cqw' }}>
        <Tape className="-top-[1.1cqw] left-[4cqw] rotate-[-6deg]" />
        <Tape className="-top-[1.1cqw] right-[4cqw] rotate-[5deg]" />
        <div className="font-bold uppercase tracking-[0.2em] text-[1.25cqw] text-muted">The road so far</div>
        <div className="flex items-center justify-center gap-[1.2cqw] mt-[0.8cqw]">
          {beats.map((b, i) => (
            <span key={b.word} className="flex items-center gap-[1.2cqw]">
              <span className="font-display text-[3.6cqw] rsf-fadeup" style={{ color: b.color, animationDelay: `${0.3 + i * 0.7}s` }}>{b.word}</span>
              {i < beats.length - 1 && <span className="text-[2.4cqw] text-muted rsf-fadeup" style={{ animationDelay: `${0.65 + i * 0.7}s` }}>→</span>}
            </span>
          ))}
        </div>
        <h2 className="sunset-text text-[4.4cqw] leading-none mt-[1.2cqw] rsf-fadeup" style={{ animationDelay: '3.2s' }}>Thanks for riding with us.</h2>
        <div className="flex justify-center gap-[1.2cqw] mt-[1.4cqw] rsf-fadeup" style={{ animationDelay: '3.8s' }}>
          {[['passengers', passengers], ['taps', totals.taps], ['votes', totals.votes]].map(([label, v]) => (
            <div key={label} className="bg-white rounded-lg shadow-sticker px-[1.6cqw] py-[0.7cqw] min-w-[10cqw]">
              <div className="font-display text-[2.8cqw] leading-none text-ink-brown">{Number(v).toLocaleString()}</div>
              <div className="text-[1.2cqw] font-bold text-muted uppercase tracking-wider">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
