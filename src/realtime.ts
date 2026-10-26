import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient, type RealtimeChannel } from '@supabase/supabase-js';
import { GAMES } from './games';
import type { GameModule, Player } from './games/types';

export type GameId = GameModule['id'];
export type Phase = 'title' | 'travel' | 'story' | 'game' | 'win' | 'finale';
export type RoomState = { stopIndex: number; phase: Phase; gameId: GameId | null; payload: unknown };
type Input = { id: string; gameId: GameId; kind: 'vote' | 'tap'; value: number };

const SB_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const HAS_SUPABASE = !!(SB_URL && KEY);
const supabase = HAS_SUPABASE ? createClient(SB_URL!, KEY!) : null;

// ---------- transport: Supabase broadcast + presence, or BroadcastChannel for local two-tab testing ----------
type Handler = (payload: any) => void;
type Transport = {
  send: (event: string, payload: unknown) => void;
  on: (event: string, cb: Handler) => void;
  track: (meta: Player) => void;
  onPresence: (cb: (players: Player[]) => void) => void;
  close: () => void;
};

function openTransport(code: string, key: string): Transport {
  const handlers: Record<string, Handler[]> = {};
  let presenceCb: ((p: Player[]) => void) | null = null;
  const emit = (event: string, payload: unknown) => (handlers[event] ?? []).forEach((h) => h(payload));

  if (supabase) {
    const ch: RealtimeChannel = supabase.channel(`room:${code}`, {
      config: { broadcast: { self: false }, presence: { key } },
    });
    let ready = false;
    const queue: [string, unknown][] = [];
    let tracked: Player | null = null;
    ch.on('broadcast', { event: '*' }, (m) => emit(m.event, m.payload));
    ch.on('presence', { event: 'sync' }, () => {
      const st = ch.presenceState<Player>();
      const players = Object.values(st).flat().filter((p: any) => p && p.id) as Player[];
      presenceCb?.(players);
    });
    ch.subscribe((status) => {
      if (status !== 'SUBSCRIBED') return;
      ready = true;
      queue.splice(0).forEach(([e, p]) => ch.send({ type: 'broadcast', event: e, payload: p }));
      if (tracked) ch.track(tracked);
    });
    return {
      send: (event, payload) => {
        if (!ready) { queue.push([event, payload]); return; }
        ch.send({ type: 'broadcast', event, payload });
      },
      on: (event, cb) => { (handlers[event] ??= []).push(cb); },
      track: (meta) => { tracked = meta; if (ready) ch.track(meta); },
      onPresence: (cb) => { presenceCb = cb; },
      close: () => { supabase.removeChannel(ch); },
    };
  }

  const bc = new BroadcastChannel(`room:${code}`);
  bc.onmessage = (e) => emit(e.data.event, e.data.payload);
  return {
    send: (event, payload) => bc.postMessage({ event, payload }),
    on: (event, cb) => { (handlers[event] ??= []).push(cb); },
    track: () => {},
    onPresence: () => {},
    close: () => bc.close(),
  };
}

// ---------- helpers ----------
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
export function newRoomCode() {
  return Array.from({ length: 4 }, () => LETTERS[Math.floor(Math.random() * LETTERS.length)]).join('');
}

function hostRoomCode() {
  const q = new URLSearchParams(location.search).get('room');
  if (q && /^[A-Z]{4}$/i.test(q)) return q.toUpperCase();
  try {
    const saved = localStorage.getItem('rsf-room');
    if (saved) return saved;
    const c = newRoomCode();
    localStorage.setItem('rsf-room', c);
    return c;
  } catch {
    return newRoomCode();
  }
}

const SIM_NAMES = ['Ava', 'Ben', 'Chloe', 'Dev', 'Eli', 'Fatima', 'Gus', 'Hana', 'Ivan', 'Jade', 'Kai', 'Leo', 'Maya', 'Nico', 'Omar', 'Pia', 'Quinn', 'Raj', 'Sara', 'Theo', 'Uma', 'Vik', 'Wren', 'Zoe'];
export const EMOJIS = ['🦊', '🐸', '🐼', '🐙', '🦄', '🐝', '🐢', '🦉', '🐧', '🐯', '🐨', '🦖', '🐳', '🦁', '🐵', '🐷', '🐰', '🦋', '🐞', '🦀', '🐬', '🦒', '🐮', '🐻'];

export type Totals = { taps: number; votes: number };

// ---------- presenter ----------
export function useHostRoom(state: RoomState) {
  const [code] = useState(hostRoomCode);
  const [players, setPlayers] = useState<Record<string, Player>>({});
  const [online, setOnline] = useState<Set<string>>(new Set());
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [taps, setTaps] = useState<Record<string, number>>({});
  const [sim, setSim] = useState(false);
  const [totals, setTotals] = useState<Totals>({ taps: 0, votes: 0 });
  const stateRef = useRef(state);
  stateRef.current = state;
  const tRef = useRef<Transport | null>(null);
  const playersRef = useRef(players);
  playersRef.current = players;

  const addPlayer = useCallback((p: Player) => {
    if (!p?.id) return;
    setPlayers((cur) => (cur[p.id] && cur[p.id].name === p.name && cur[p.id].emoji === p.emoji ? cur : { ...cur, [p.id]: p }));
  }, []);

  const applyInputs = useCallback((inputs: Input[]) => {
    const st = stateRef.current;
    const live = inputs.filter((i) => st.phase === 'game' && i.gameId === st.gameId);
    if (!live.length) return;
    const voteIn = live.filter((i) => i.kind === 'vote');
    const tapIn = live.filter((i) => i.kind === 'tap');
    if (voteIn.length) setVotes((v) => { const n = { ...v }; voteIn.forEach((i) => (n[i.id] = i.value)); return n; });
    if (tapIn.length) setTaps((t) => { const n = { ...t }; tapIn.forEach((i) => (n[i.id] = (n[i.id] ?? 0) + i.value)); return n; });
    setTotals((t) => ({ votes: t.votes + voteIn.length, taps: t.taps + tapIn.reduce((a, i) => a + i.value, 0) }));
  }, []);

  useEffect(() => {
    const t = openTransport(code, 'host');
    tRef.current = t;
    t.on('join', (p: Player) => addPlayer(p));
    t.on('input', (i: Input) => applyInputs([i]));
    t.on('inputs', (batch: Input[]) => applyInputs(batch));
    t.on('hello', () => t.send('state', stateRef.current));
    t.onPresence((list) => {
      list.forEach(addPlayer);
      setOnline(new Set(list.map((p) => p.id)));
    });
    const hb = setInterval(() => t.send('state', stateRef.current), 2000);
    return () => { clearInterval(hb); t.close(); tRef.current = null; };
  }, [code]);

  // broadcast on change
  useEffect(() => { tRef.current?.send('state', state); }, [state.stopIndex, state.phase, state.gameId, state.payload]);

  // sim: fake players trickle in, then simulate inputs during games
  useEffect(() => {
    if (!sim) return;
    let n = 0;
    const join = setInterval(() => {
      if (n >= SIM_NAMES.length) return clearInterval(join);
      addPlayer({ id: `sim-${n}`, name: SIM_NAMES[n], emoji: EMOJIS[n % EMOJIS.length] });
      n++;
    }, 160);
    let tick = 0;
    const loop = setInterval(() => {
      const st = stateRef.current;
      if (st.phase !== 'game' || !st.gameId) return;
      const g = GAMES[st.gameId];
      const simPlayers = Object.values(playersRef.current).filter((p) => p.id.startsWith('sim-'));
      const out = g.simulate(simPlayers, st.payload, tick++) ?? [];
      applyInputs(out.map((o) => ({ id: o.playerId, gameId: g.id, kind: g.inputKind, value: o.value })));
    }, 300);
    return () => { clearInterval(join); clearInterval(loop); };
  }, [sim]);

  const resetVotes = useCallback(() => setVotes({}), []);
  const resetGame = useCallback(() => { setVotes({}); setTaps({}); }, []);
  const list = Object.values(players);
  // count presence-online phones plus anyone who joined via broadcast (presence missing in local mode)
  const count = HAS_SUPABASE ? list.filter((p) => p.id.startsWith('sim-') || online.has(p.id)).length : list.length;

  return { code, players: list, count, votes, taps, resetVotes, resetGame, sim, toggleSim: () => setSim((s) => !s), totals };
}

// ---------- phone ----------
function phoneId() {
  try {
    let id = localStorage.getItem('rsf-id');
    if (!id) { id = Math.random().toString(36).slice(2, 10); localStorage.setItem('rsf-id', id); }
    return id;
  } catch {
    return Math.random().toString(36).slice(2, 10);
  }
}

export function usePlayerRoom(code: string) {
  const [id] = useState(phoneId);
  const [me, setMe] = useState<Player | null>(() => {
    try { const s = localStorage.getItem('rsf-me'); return s ? JSON.parse(s) : null; } catch { return null; }
  });
  const [state, setState] = useState<RoomState | null>(null);
  const tRef = useRef<Transport | null>(null);
  const meRef = useRef(me);
  meRef.current = me;
  const pending = useRef(0);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    if (!code) return;
    const t = openTransport(code, id);
    tRef.current = t;
    t.on('state', (s: RoomState) => setState(s));
    t.send('hello', { id });
    if (meRef.current) { t.track(meRef.current); t.send('join', meRef.current); }
    // re-announce so a reloaded presenter still sees us; flush batched taps
    const rejoin = setInterval(() => { if (meRef.current) t.send('join', meRef.current); }, 5000);
    const flush = setInterval(() => {
      const st = stateRef.current;
      if (!pending.current || !st?.gameId) return;
      t.send('input', { id, gameId: st.gameId, kind: 'tap', value: pending.current } satisfies Input);
      pending.current = 0;
    }, 300);
    return () => { clearInterval(rejoin); clearInterval(flush); t.close(); tRef.current = null; };
  }, [code, id]);

  const join = useCallback((name: string, emoji: string) => {
    const p = { id, name, emoji };
    setMe(p);
    try { localStorage.setItem('rsf-me', JSON.stringify(p)); } catch {}
    tRef.current?.track(p);
    tRef.current?.send('join', p);
  }, [id]);

  const send = useCallback((value: number) => {
    const st = stateRef.current;
    if (!st?.gameId || st.phase !== 'game') return;
    if (GAMES[st.gameId].inputKind === 'tap') { pending.current += value; return; }
    tRef.current?.send('input', { id, gameId: st.gameId, kind: 'vote', value } satisfies Input);
  }, [id]);

  return { id, me, join, state, send };
}
