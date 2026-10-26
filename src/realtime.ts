import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient, type RealtimeChannel } from '@supabase/supabase-js';
import { GAMES } from './games';
import type { GameModule, Player } from './games/types';

export type GameId = GameModule['id'];
export type Phase = 'title' | 'travel' | 'story' | 'game' | 'win' | 'finale';
// run bumps on every game (re)start so phones can unlock voting after R
export type RoomState = { stopIndex: number; phase: Phase; gameId: GameId | null; payload: unknown; run: number };
type Input = { id: string; gameId: GameId; kind: 'vote' | 'tap'; value: number };
export type LinkStatus = 'live' | 'reconnecting';

const SB_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const HAS_SUPABASE = !!(SB_URL && KEY);
const supabase = HAS_SUPABASE ? createClient(SB_URL!, KEY!, { realtime: { params: { eventsPerSecond: 20 } } }) : null;
console.info(`realtime: ${HAS_SUPABASE ? 'supabase' : 'local'}`);

const HEARTBEAT_MS = 3000;
const TAP_FLUSH_MS = 750;

// ---------- transport ----------
// Supabase: `room:CODE` carries presenter -> phones state and phone presence.
// `room:CODE:in` carries phone -> presenter join/input. Only the presenter subscribes to it;
// phones post to it over REST, so inputs never fan out to other phones.
type Handler = (payload: any) => void;
type Transport = {
  send: (event: string, payload: unknown) => void;
  on: (event: string, cb: Handler) => void;
  track: (meta: Player) => void;
  onPresence: (cb: (players: Player[]) => void) => void;
  onStatus: (cb: (s: LinkStatus) => void) => void;
  close: () => void;
};

type Sub = { channel: () => RealtimeChannel | null; close: () => void };

function subscribeWithRetry(
  topic: string,
  presenceKey: string | null,
  setup: (ch: RealtimeChannel) => void,
  onUp: (ch: RealtimeChannel) => void,
  onDown: () => void,
): Sub {
  let ch: RealtimeChannel | null = null;
  let closed = false;
  let backoff = 1000;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const connect = () => {
    if (closed) return;
    const c = supabase!.channel(topic, {
      config: { broadcast: { self: false }, ...(presenceKey ? { presence: { key: presenceKey } } : {}) },
    });
    ch = c;
    setup(c);
    c.subscribe((status, err) => {
      if (closed || c !== ch) return;
      if (status === 'SUBSCRIBED') { backoff = 1000; onUp(c); return; }
      console.warn(`realtime: ${topic} ${status}`, err?.message ?? '');
      onDown();
      ch = null;
      supabase!.removeChannel(c);
      clearTimeout(timer);
      timer = setTimeout(connect, backoff);
      backoff = Math.min(backoff * 2, 10000);
    });
  };
  connect();
  return {
    channel: () => ch,
    close: () => { closed = true; clearTimeout(timer); if (ch) supabase!.removeChannel(ch); ch = null; },
  };
}

function openTransport(code: string, role: 'host' | 'phone', id: string): Transport {
  const handlers: Record<string, Handler[]> = {};
  let presenceCb: ((p: Player[]) => void) | null = null;
  let statusCb: ((s: LinkStatus) => void) | null = null;
  const emit = (event: string, payload: unknown) => (handlers[event] ?? []).forEach((h) => h(payload));
  const base = {
    on: (event: string, cb: Handler) => { (handlers[event] ??= []).push(cb); },
    onPresence: (cb: (p: Player[]) => void) => { presenceCb = cb; },
    onStatus: (cb: (s: LinkStatus) => void) => { statusCb = cb; },
  };

  if (supabase) {
    let tracked: Player | null = null;
    const listen = (c: RealtimeChannel) => c.on('broadcast', { event: '*' }, (m) => emit(m.event, m.payload));
    const room = subscribeWithRetry(
      `room:${code}`,
      role === 'host' ? 'host' : id,
      (c) => {
        if (role === 'phone') listen(c);
        c.on('presence', { event: 'sync' }, () => {
          const players = Object.values(c.presenceState<Player>()).flat().filter((p: any) => p && p.id) as Player[];
          presenceCb?.(players);
        });
      },
      (c) => { if (tracked) c.track(tracked); statusCb?.('live'); emit('_up', null); },
      () => statusCb?.('reconnecting'),
    );
    const inbox = role === 'host' ? subscribeWithRetry(`room:${code}:in`, null, listen, () => {}, () => {}) : null;
    // phones never join the inbox; this unsubscribed handle is only used for REST sends
    const outbox = role === 'phone' ? supabase.channel(`room:${code}:in`) : null;

    return {
      ...base,
      send: (event, payload) => {
        if (role === 'host') {
          room.channel()?.send({ type: 'broadcast', event, payload });
        } else {
          outbox!.httpSend(event, payload as object).catch((e) => console.warn('realtime: send failed', e?.message ?? e));
        }
      },
      track: (meta) => { tracked = meta; room.channel()?.track(meta); },
      close: () => { room.close(); inbox?.close(); if (outbox) supabase.removeChannel(outbox); },
    };
  }

  const bc = new BroadcastChannel(`room:${code}`);
  bc.onmessage = (e) => emit(e.data.event, e.data.payload);
  setTimeout(() => { statusCb?.('live'); emit('_up', null); }, 0);
  return {
    ...base,
    send: (event, payload) => bc.postMessage({ event, payload }),
    track: () => {},
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
  const lastJson = useRef('');
  const lastSentAt = useRef(0);
  const pendingReply = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sendState = useCallback(() => {
    const t = tRef.current;
    if (!t) return;
    lastJson.current = JSON.stringify(stateRef.current);
    lastSentAt.current = Date.now();
    t.send('state', stateRef.current);
  }, []);

  // coalesce bursts of hellos (many phones loading at once) into at most one reply per second
  const replySoon = useCallback(() => {
    if (pendingReply.current) return;
    const wait = Math.max(0, 1000 - (Date.now() - lastSentAt.current));
    pendingReply.current = setTimeout(() => { pendingReply.current = null; sendState(); }, wait);
  }, [sendState]);

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
    const t = openTransport(code, 'host', 'host');
    tRef.current = t;
    t.on('join', (p: Player) => addPlayer(p));
    t.on('input', (i: Input) => applyInputs([i]));
    t.on('hello', replySoon);
    t.on('_up', replySoon);
    t.onPresence((list) => {
      list.forEach(addPlayer);
      setOnline(new Set(list.map((p) => p.id)));
    });
    const hb = setInterval(sendState, HEARTBEAT_MS);
    return () => { clearInterval(hb); if (pendingReply.current) clearTimeout(pendingReply.current); pendingReply.current = null; t.close(); tRef.current = null; };
  }, [code]);

  // only send on a real change; games re-send identical payloads every second
  useEffect(() => {
    if (JSON.stringify(state) !== lastJson.current) sendState();
  }, [state]);

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
  // with Supabase, count phones currently in presence (plus sim); locally there is no presence
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
  const [link, setLink] = useState<LinkStatus>('reconnecting');
  const [lastStateAt, setLastStateAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const tRef = useRef<Transport | null>(null);
  const meRef = useRef(me);
  meRef.current = me;
  const pending = useRef(0);
  const stateRef = useRef(state);
  stateRef.current = state;
  const votedKey = useRef('');

  useEffect(() => {
    if (!code) return;
    const t = openTransport(code, 'phone', id);
    tRef.current = t;
    t.on('state', (s: RoomState) => { setState(s); setLastStateAt(Date.now()); });
    t.onStatus(setLink);
    // on every (re)subscribe: announce ourselves and ask for the current state
    t.on('_up', () => {
      t.send('hello', { id });
      if (meRef.current) t.send('join', meRef.current);
    });
    if (meRef.current) t.track(meRef.current);
    // local mode has no presence, so keep re-announcing for a reloaded presenter
    const rejoin = HAS_SUPABASE ? undefined : setInterval(() => { if (meRef.current) t.send('join', meRef.current); }, 5000);
    const flush = setInterval(() => {
      const st = stateRef.current;
      if (pending.current <= 0 || !st?.gameId) return;
      t.send('input', { id, gameId: st.gameId, kind: 'tap', value: pending.current } satisfies Input);
      pending.current = 0;
    }, TAP_FLUSH_MS);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(rejoin); clearInterval(flush); clearInterval(tick); t.close(); tRef.current = null; };
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
    // one vote per round: repeat taps after voting are ignored
    const round = (st.payload as { round?: unknown } | null)?.round ?? '';
    const key = `${st.gameId}:${st.run}:${round}`;
    if (votedKey.current === key) return;
    votedKey.current = key;
    tRef.current?.send('input', { id, gameId: st.gameId, kind: 'vote', value } satisfies Input);
  }, [id]);

  // live = subscribed and heard a heartbeat recently
  const live = link === 'live' && now - lastStateAt < HEARTBEAT_MS * 2.5;
  return { id, me, join, state, send, live };
}
