// Stop 3: AF Hacks / Portage. Plan Priya's path to RN, then reveal the critical path.
import { useEffect, useState } from 'react';
import type { GameModule, ScreenProps } from './types';
import { Timer, VoteController, VoteStrips, plurality, tally, useBroadcast, useLatest, useWinOnce, type VotePayload } from './ui';

const ROUNDS = [
  { options: ['Write the NCLEX', 'Get credentials assessed', 'Police check', 'Register as RN'], correct: 1 },
  { options: ['Apply to CNO', 'Register as RN', 'Police check'], correct: 0 },
  { options: ['Police check', 'Write the NCLEX', 'Register as RN'], correct: 1 },
  { options: ['Register as RN', 'Police check'], correct: 1 },
];
const Q = 'What should she do next?';
const VOTE_MS = 8000, LAND_MS = 1800, REVEAL_MS = 6500;

type Phase = 'vote' | 'land' | 'reveal';
type Pick = { label: string; ok: boolean };

function Screen({ votes, setPayload, resetVotes, onWin, accent }: ScreenProps) {
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>('vote');
  const [start, setStart] = useState(() => Date.now());
  const [picks, setPicks] = useState<Pick[]>([]);
  const [winner, setWinner] = useState<number | null>(null);
  const [grow, setGrow] = useState(false);
  const votesRef = useLatest(votes);
  const win = useWinOnce(onWin);
  const R = ROUNDS[round];
  const right = picks.filter((p) => p.ok).length;

  useEffect(() => { resetVotes(); }, []);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    if (phase === 'vote') {
      t = setTimeout(() => {
        const counts = tally(votesRef.current, R.options.length);
        const w = plurality(counts, R.correct);
        setWinner(w);
        setPicks((p) => [...p, { label: R.options[w], ok: w === R.correct }]);
        setPhase('land');
      }, VOTE_MS);
    } else if (phase === 'land') {
      t = setTimeout(() => {
        if (round === ROUNDS.length - 1) { setPhase('reveal'); return; }
        resetVotes();
        setWinner(null);
        setRound((r) => r + 1);
        setStart(Date.now());
        setPhase('vote');
      }, LAND_MS);
    } else if (phase === 'reveal') {
      const g = setTimeout(() => setGrow(true), 900);
      t = setTimeout(() => win({ line: 'Priya is on her way.', stats: { correct: right, of: ROUNDS.length } }), REVEAL_MS);
      return () => { clearTimeout(g); clearTimeout(t); };
    }
    return () => clearTimeout(t);
  }, [phase, round]);

  const payload: VotePayload = {
    phase: phase === 'vote' ? 'vote' : 'wait',
    round, question: `Step ${round + 1}: ${Q}`, options: R.options, glow: null,
    note: phase === 'reveal' ? `Crowd got ${right} of ${ROUNDS.length} right` : 'Look up at the screen',
  };
  useBroadcast(setPayload, payload);

  const timeline = (
    <div style={{ display: 'flex', gap: '1cqw', alignItems: 'stretch' }}>
      {ROUNDS.map((_, i) => {
        const p = picks[i];
        return (
          <div key={i} className={p ? 'g-pop' : ''} style={{
            flex: 1, borderRadius: 'var(--radius)', padding: '.8cqw 1cqw', fontWeight: 700, fontSize: '1.6cqw', textAlign: 'center',
            border: p ? '.3cqw solid var(--white)' : '.25cqw dashed var(--paper-edge)',
            background: p ? (p.ok ? accent : 'var(--red)') : 'transparent', color: p ? 'var(--white)' : 'var(--muted)',
            boxShadow: p ? '0 .4cqw 0 rgba(47,22,4,.2)' : 'none',
          }}>
            <div style={{ fontSize: '1.2cqw', opacity: .85 }}>Step {i + 1}</div>
            {p ? `${p.ok ? '✓' : '✗'} ${p.label}` : '?'}
          </div>
        );
      })}
    </div>
  );

  if (phase === 'reveal') {
    return (
      <div className="g-wrap">
        <div className="g-panel" style={{ justifyContent: 'center' }}>
          <h2 className="g-title" style={{ color: accent }}>Crowd got {right} of {ROUNDS.length} right</h2>
          {timeline}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2cqw', marginTop: '1cqw' }}>
            {[
              { label: 'One step at a time', date: 'Dec 2027', w: 100, bg: 'var(--muted)' },
              { label: 'The Portage plan', date: 'Apr 2027', w: 42, bg: accent },
            ].map((b) => (
              <div key={b.label}>
                <div style={{ fontSize: '1.8cqw', fontWeight: 700, marginBottom: '.4cqw' }}>{b.label}</div>
                <div className="g-track" style={{ height: '4cqw' }}>
                  <div style={{
                    height: '100%', width: grow ? `${b.w}%` : '0%', background: b.bg, transition: 'width 1.6s cubic-bezier(.34,1.2,.64,1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '1cqw', boxSizing: 'border-box',
                    color: 'var(--white)', fontWeight: 700, fontSize: '2cqw', whiteSpace: 'nowrap',
                  }}>{grow ? b.date : ''}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="g-sub" style={{ fontSize: '2cqw', color: 'var(--ink)' }}>
            Same nurse, same rules. Critical path scheduling saves about 8 months.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="g-wrap">
      <div className="g-panel">
        <div className="g-sub">Priya is an ICU nurse educated in India. She wants to be an RN in Ontario.</div>
        <h2 className="g-title" style={{ color: accent }}>Step {round + 1}: {Q}</h2>
        {phase === 'vote' ? <Timer key={round} start={start} ms={VOTE_MS} accent={accent} /> : <div className="g-timer" />}
        <VoteStrips options={R.options} counts={tally(votes, R.options.length)} accent={accent} winner={phase === 'vote' ? null : winner} />
        <div style={{ marginTop: 'auto' }}>{timeline}</div>
      </div>
    </div>
  );
}

export const priya: GameModule = {
  id: 'priya',
  inputKind: 'vote',
  Screen,
  Controller: VoteController,
  simulate: (players, payload) => {
    const p = payload as VotePayload | null;
    if (!p || p.phase !== 'vote') return [];
    const correct = ROUNDS[p.round]?.correct ?? 0;
    return players.filter(() => Math.random() < 0.18).map((pl) => ({
      playerId: pl.id,
      value: Math.random() < 0.45 ? correct : Math.floor(Math.random() * p.options.length),
    }));
  },
};
