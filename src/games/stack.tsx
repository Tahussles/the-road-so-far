// Stop 1: GoonHacks / Scrollify. Pick the stack, mentors help from round 2.
import { useEffect, useState } from 'react';
import type { GameModule, ScreenProps } from './types';
import { Timer, VoteController, VoteStrips, plurality, tally, useBroadcast, useLatest, useWinOnce, type VotePayload } from './ui';

const ROUNDS = [
  { q: 'What do we build?', options: ['Chrome extension', 'A PowerPoint', 'Excel macro', 'A fax machine'], correct: 0 },
  { q: 'What is the app built in?', options: ['Scratch', 'SwiftUI', 'Microsoft Paint', 'Notepad'], correct: 1 },
  { q: 'Where does the data live?', options: ['Sticky notes', 'localStorage forever', 'Supabase', 'Ask ChatGPT'], correct: 2 },
];
const VOTE_MS = 8000, LAND_MS = 2200, MENTOR_MS = 3000, FINAL_MS = 2400;

type Phase = 'vote' | 'land' | 'mentors' | 'final';
type Block = { label: string; ok: boolean };

function Screen({ votes, setPayload, resetVotes, onWin, accent }: ScreenProps) {
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>('vote');
  const [start, setStart] = useState(() => Date.now());
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [winner, setWinner] = useState<number | null>(null);
  const votesRef = useLatest(votes);
  const win = useWinOnce(onWin);
  const R = ROUNDS[round];
  const mentors = round >= 1 || phase === 'mentors';
  const glow = round >= 1 && phase === 'vote' ? R.correct : null;

  useEffect(() => { resetVotes(); }, []);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    if (phase === 'vote') {
      t = setTimeout(() => {
        const counts = tally(votesRef.current, R.options.length);
        const anyVotes = counts.some((c) => c > 0);
        const w = anyVotes ? plurality(counts, R.correct) : round === 0 ? 1 : R.correct;
        setWinner(w);
        setBlocks((b) => [...b, { label: R.options[w], ok: w === R.correct }]);
        setPhase('land');
      }, VOTE_MS);
    } else if (phase === 'land') {
      t = setTimeout(() => {
        if (round === 0) setPhase('mentors');
        else if (round === ROUNDS.length - 1) setPhase('final');
        else next();
      }, LAND_MS);
    } else if (phase === 'mentors') {
      t = setTimeout(next, MENTOR_MS);
    } else if (phase === 'final') {
      t = setTimeout(() => {
        win({
          line: 'Scrollify shipped.',
          stats: { correct: blocks.filter((b) => b.ok).length, rounds: ROUNDS.length },
        });
      }, FINAL_MS);
    }
    return () => clearTimeout(t);
    function next() {
      resetVotes();
      setWinner(null);
      setRound((r) => r + 1);
      setStart(Date.now());
      setPhase('vote');
    }
  }, [phase, round]);

  const payload: VotePayload = {
    phase: phase === 'vote' ? 'vote' : 'wait',
    round, question: R.q, options: R.options, glow,
    note: phase === 'mentors' ? 'Mentors incoming! Watch for the glow' : phase === 'final' ? 'Scrollify shipped ✓' : 'Look up at the screen',
  };
  useBroadcast(setPayload, payload);

  const counts = tally(votes, R.options.length);

  return (
    <div className="g-wrap">
      <div className="g-panel" style={{ flexDirection: 'row', gap: '2.4cqw' }}>
        <div style={{ flex: 1.4, display: 'flex', flexDirection: 'column', gap: '1.2cqw' }}>
          <div className="g-sub">Round {round + 1} of {ROUNDS.length}{round === 0 ? ' · no hints, you are on your own' : ' · mentors are helping'}</div>
          <h2 className="g-title" style={{ color: accent }}>{R.q}</h2>
          {phase === 'vote' ? <Timer key={round} start={start} ms={VOTE_MS} accent={accent} /> : <div className="g-timer" />}
          <VoteStrips options={R.options} counts={counts} accent={accent} glow={glow} winner={phase === 'vote' ? null : winner} />
          {phase === 'mentors' && (
            <div className="g-walk" style={{ display: 'flex', alignItems: 'center', gap: '1.4cqw', marginTop: 'auto' }}>
              <span style={{ fontSize: '5cqw' }}>🧑‍🏫🧑‍💻</span>
              <div className="paper sticker" style={{ borderRadius: 'var(--radius)', padding: '1cqw 1.4cqw', fontSize: '2cqw', fontWeight: 700 }}>
                Two friends who had done hackathons before walk in. "Let us help."
              </div>
            </div>
          )}
          {mentors && phase !== 'mentors' && (
            <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '1cqw', fontSize: '1.7cqw', fontWeight: 700, color: 'var(--muted)' }}>
              <span style={{ fontSize: '3cqw' }}>🧑‍🏫🧑‍💻</span> Mentors point at the glowing answer
            </div>
          )}
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--paper-warm)', borderRadius: 'var(--radius)', padding: '1.4cqw', border: '.25cqw dashed var(--paper-edge)' }}>
          <div className="g-sub" style={{ textAlign: 'center' }}>Our stack</div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column-reverse', gap: '.8cqw', justifyContent: 'flex-start' }}>
            {blocks.map((b, i) => (
              <div key={i} className={`g-drop`} style={{ animationDelay: '0s' }}>
                <div className={`g-block ${b.ok ? '' : 'joke'}`} style={{ background: accent, transform: `rotate(${[-2, 1.5, -1][i] ?? 0}deg)` }}>
                  {b.ok ? '' : '🤡 '}{b.label}
                </div>
              </div>
            ))}
            {phase === 'final' && (
              <div className="g-drop">
                <div className="g-block" style={{ background: 'var(--leaf)', fontSize: '2.8cqw', fontFamily: 'Fredoka, system-ui, sans-serif' }}>Scrollify ✓</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export const stack: GameModule = {
  id: 'stack',
  inputKind: 'vote',
  Screen,
  Controller: VoteController,
  simulate: (players, payload) => {
    const p = payload as VotePayload | null;
    if (!p || p.phase !== 'vote') return [];
    return players.filter(() => Math.random() < 0.18).map((pl) => ({
      playerId: pl.id,
      value: p.glow !== null && Math.random() < 0.75 ? p.glow : Math.floor(Math.random() * p.options.length),
    }));
  },
};
