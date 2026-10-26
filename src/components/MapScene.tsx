import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import gsap from 'gsap';
import { STOPS } from '../story';

// Scene is one SVG in a 1600x900 world. Map sheet sits on the table, the road winds through 4 pins to a flag.
const START = { x: 300, y: 770 };
const PINS = [
  { x: 470, y: 560 },
  { x: 740, y: 755 },
  { x: 1010, y: 545 },
  { x: 1220, y: 760 },
];
const FLAG = { x: 1370, y: 560 };
const POINTS = [START, ...PINS, FLAG];
const SEGMENTS = POINTS.slice(1).map((p, i) => {
  const a = POINTS[i];
  const mx = (a.x + p.x) / 2;
  const bend = i % 2 === 0 ? -90 : 90;
  return `M${a.x},${a.y} C${mx - 40},${a.y + bend} ${mx + 40},${p.y - bend} ${p.x},${p.y}`;
});
const FULL = SEGMENTS.map((s, i) => (i === 0 ? s : s.replace(/^M[^C]+/, ''))).join(' ');

export type MapHandle = { driveTo: (stop: number, done?: () => void) => void; jumpTo: (pos: number) => void };

type Props = { cleared: number[]; busPos: number; dim?: boolean; zoomOut?: boolean };

const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export const MapScene = forwardRef<MapHandle, Props>(function MapScene({ cleared, busPos, dim, zoomOut }, ref) {
  const busRef = useRef<SVGGElement>(null);
  const bodyRef = useRef<SVGGElement>(null);
  const dustRef = useRef<SVGGElement>(null);
  const segRefs = useRef<(SVGPathElement | null)[]>([]);
  const at = useRef(busPos);
  const tween = useRef<gsap.core.Tween | null>(null);

  const place = (x: number, y: number, flip: boolean) => {
    const b = busRef.current;
    if (b) b.setAttribute('transform', `translate(${x},${y}) scale(${flip ? -1 : 1},1)`);
  };

  const jumpTo = (pos: number) => {
    tween.current?.kill();
    at.current = pos;
    const p = POINTS[pos] ?? START;
    place(p.x, p.y, false);
  };

  const puff = (x: number, y: number) => {
    const g = dustRef.current;
    if (!g || reduced) return;
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('cx', String(x));
    c.setAttribute('cy', String(y + 26));
    c.setAttribute('r', '9');
    c.setAttribute('fill', '#f1dcbf');
    g.appendChild(c);
    gsap.to(c, { attr: { r: 22, cy: y + 10 }, opacity: 0, duration: 0.9, ease: 'power1.out', onComplete: () => c.remove() });
  };

  const driveTo = (stop: number, done?: () => void) => {
    // stop is the POINTS index to arrive at (1..5). Drive every segment between.
    tween.current?.kill();
    const from = at.current;
    if (stop <= from) { jumpTo(stop); done?.(); return; }
    const segs = segRefs.current.slice(from, stop).filter(Boolean) as SVGPathElement[];
    const lens = segs.map((s) => s.getTotalLength());
    const total = lens.reduce((a, b) => a + b, 0);
    const prog = { d: 0 };
    let last = 0;
    let lastX = POINTS[from].x;
    tween.current = gsap.to(prog, {
      d: total,
      duration: reduced ? 0.01 : Math.min(4.2, 1.6 + total / 420),
      ease: 'power2.inOut',
      onUpdate: () => {
        let d = prog.d;
        let i = 0;
        while (i < segs.length - 1 && d > lens[i]) { d -= lens[i]; i++; }
        const pt = segs[i].getPointAtLength(Math.min(d, lens[i]));
        const flip = pt.x < lastX - 0.2;
        lastX = pt.x;
        place(pt.x, pt.y, flip);
        if (prog.d - last > 38) { last = prog.d; puff(pt.x - (flip ? -40 : 40), pt.y); }
      },
      onComplete: () => { at.current = stop; done?.(); },
    });
  };

  useImperativeHandle(ref, () => ({ driveTo, jumpTo }));

  useEffect(() => { jumpTo(busPos); }, []);

  useEffect(() => {
    if (reduced || !bodyRef.current) return;
    const t = gsap.to(bodyRef.current, { y: -6, duration: 0.32, yoyo: true, repeat: -1, ease: 'sine.inOut' });
    return () => { t.kill(); };
  }, []);

  return (
    <svg
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 w-full h-full transition-[filter,transform] duration-700"
      style={{
        filter: dim ? 'blur(3px) saturate(.9) brightness(.92)' : 'none',
        transform: zoomOut ? 'scale(.9)' : 'scale(1)',
        transformOrigin: '50% 60%',
      }}
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--sky-top)" />
          <stop offset="1" stopColor="var(--sky-bottom)" />
        </linearGradient>
        <pattern id="planks" width="1600" height="90" patternUnits="userSpaceOnUse">
          <rect width="1600" height="90" fill="var(--wood)" />
          <rect y="86" width="1600" height="4" fill="var(--wood-deep)" opacity=".55" />
          <path d="M0 25 Q400 18 800 28 T1600 22" stroke="var(--wood-dark)" strokeWidth="2" fill="none" opacity=".35" />
          <path d="M0 58 Q300 66 700 55 T1600 62" stroke="var(--wood-dark)" strokeWidth="1.5" fill="none" opacity=".3" />
          <path d="M120 40 Q600 34 1100 44" stroke="var(--wood-shine)" strokeWidth="2" fill="none" opacity=".25" />
          <rect x="530" y="0" width="3" height="86" fill="var(--wood-deep)" opacity=".35" />
          <rect x="1210" y="0" width="3" height="86" fill="var(--wood-deep)" opacity=".35" />
        </pattern>
        <filter id="paperShadow" x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow dx="0" dy="14" stdDeviation="12" floodColor="#2f1604" floodOpacity=".35" />
        </filter>
        <filter id="stickerShadow" x="-30%" y="-30%" width="160%" height="170%">
          <feDropShadow dx="0" dy="6" stdDeviation="0" floodColor="#2f1604" floodOpacity=".18" />
          <feDropShadow dx="0" dy="10" stdDeviation="8" floodColor="#2f1604" floodOpacity=".25" />
        </filter>
      </defs>

      {/* sky */}
      <rect width="1600" height="400" fill="url(#sky)" />
      <g className="rsf-clouds-slow" fill="#fff" opacity=".9">
        <Cloud x={180} y={90} s={1.1} />
        <Cloud x={820} y={60} s={0.8} />
        <Cloud x={1380} y={120} s={1} />
      </g>
      <g className="rsf-clouds-fast" fill="#fff" opacity=".75">
        <Cloud x={520} y={170} s={0.6} />
        <Cloud x={1120} y={200} s={0.55} />
      </g>
      {/* mountains, layered */}
      <path d="M0 330 L160 210 L280 290 L430 170 L600 300 L760 200 L930 310 L1100 190 L1260 290 L1420 200 L1600 300 L1600 400 L0 400 Z" fill="var(--teal)" opacity=".55" />
      <path d="M0 360 L120 280 L260 350 L380 260 L540 360 L700 270 L860 370 L1020 260 L1180 360 L1340 270 L1480 350 L1600 290 L1600 400 L0 400 Z" fill="var(--teal-deep)" />
      <path d="M380 260 L410 282 L395 284 L360 276 Z M1020 260 L1050 282 L1030 286 L1000 278 Z M700 270 L728 290 L690 288 Z" fill="#fff" opacity=".8" />

      {/* table */}
      <rect y="360" width="1600" height="540" fill="url(#planks)" />
      <rect y="360" width="1600" height="10" fill="var(--wood-deep)" opacity=".5" />

      {/* map sheet */}
      <g transform="rotate(-1.6 800 640)" filter="url(#paperShadow)">
        <path
          d="M150 330 L230 322 L260 334 L340 318 L420 330 L520 316 L600 328 L700 314 L790 330 L880 316 L980 330 L1060 318 L1150 332 L1240 316 L1330 330 L1420 320 L1462 336 L1470 420 L1458 500 L1472 590 L1460 680 L1474 770 L1462 850 L1470 884 L1380 892 L1300 880 L1200 894 L1100 882 L1000 896 L900 882 L800 894 L700 880 L600 894 L500 882 L400 896 L300 882 L210 892 L140 884 L146 800 L134 710 L148 620 L136 530 L150 440 L138 370 Z"
          fill="var(--paper)"
          stroke="var(--paper-edge)"
          strokeWidth="6"
        />
        <path d="M200 380 Q500 360 800 400 T1420 380" stroke="var(--paper-edge)" strokeWidth="3" fill="none" opacity=".6" />
        <path d="M180 840 Q520 820 820 850 T1440 830" stroke="var(--paper-edge)" strokeWidth="3" fill="none" opacity=".6" />
        <text x="190" y="390" fontFamily="Fredoka" fontWeight="700" fontSize="30" fill="var(--muted)" opacity=".75">THE ROAD SO FAR</text>
        {/* compass */}
        <g transform="translate(1360 420)" opacity=".7">
          <circle r="34" fill="none" stroke="var(--muted)" strokeWidth="3" />
          <path d="M0 -30 L8 0 L0 30 L-8 0 Z" fill="var(--red-deep)" />
          <text y="-40" textAnchor="middle" fontFamily="Fredoka" fontWeight="700" fontSize="18" fill="var(--muted)">N</text>
        </g>
      </g>

      {/* flower clusters at map corners */}
      <Flowers x={150} y={360} />
      <Flowers x={1450} y={880} flip />
      <Flowers x={170} y={880} />

      {/* road */}
      <path d={FULL} fill="none" stroke="var(--paper-edge)" strokeWidth="26" strokeLinecap="round" opacity=".7" />
      <path d={FULL} fill="none" stroke="var(--red-deep)" strokeWidth="9" strokeLinecap="round" strokeDasharray="22 18" />
      {SEGMENTS.map((d, i) => (
        <path key={i} ref={(el) => (segRefs.current[i] = el)} d={d} fill="none" stroke="none" />
      ))}

      {/* start depot */}
      <g transform={`translate(${START.x} ${START.y})`}>
        <circle r="16" fill="var(--red-deep)" stroke="#fff" strokeWidth="5" />
      </g>

      {/* pins */}
      {PINS.map((p, i) => (
        <g key={i} transform={`translate(${p.x} ${p.y - 70})`}>
          <g className="rsf-pin" style={{ animationDelay: `${i * 0.12}s` }} filter="url(#stickerShadow)">
            <rect x="-50" y="-50" width="100" height="100" rx="26" fill="#fff" transform={`rotate(${[-4, 3, -3, 4][i]})`} />
            <rect x="-42" y="-42" width="84" height="84" rx="20" fill={`var(--stop-${STOPS[i].key})`} transform={`rotate(${[-4, 3, -3, 4][i]})`} />
            <PinIcon i={i} />
          </g>
          <g transform="translate(0 76)">
            <rect x="-100" y="-20" width="200" height="38" rx="10" fill="#fff" filter="url(#stickerShadow)" />
            <text textAnchor="middle" y="8" fontFamily="Fredoka" fontWeight="700" fontSize="24" fill="var(--ink-brown)">{STOPS[i].name}</text>
          </g>
          {cleared.includes(i) && (
            <g transform="translate(46 -44)" className="rsf-check">
              <circle r="24" fill="var(--leaf)" stroke="#fff" strokeWidth="5" />
              <path d="M-10 0 L-3 8 L11 -8" stroke="#fff" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          )}
        </g>
      ))}

      {/* finale flag */}
      <g transform={`translate(${FLAG.x} ${FLAG.y})`} filter="url(#stickerShadow)">
        <rect x="-4" y="-110" width="8" height="112" rx="3" fill="#fff" />
        <rect x="-2" y="-106" width="4" height="106" fill="var(--wood-deep)" />
        <path d="M4 -108 L84 -88 L4 -66 Z" fill="var(--red)" stroke="#fff" strokeWidth="5" strokeLinejoin="round" />
      </g>

      <g ref={dustRef} />

      {/* bus */}
      <g ref={busRef}>
        <g ref={bodyRef}>
          <g transform="translate(-62 -78)" filter="url(#stickerShadow)">
            <rect x="-6" y="-6" width="136" height="88" rx="24" fill="#fff" />
            <rect x="0" y="0" width="124" height="64" rx="18" fill="#ffc83d" />
            <rect x="0" y="40" width="124" height="10" fill="var(--red)" />
            <rect x="12" y="10" width="22" height="20" rx="5" fill="#bfefff" />
            <rect x="40" y="10" width="22" height="20" rx="5" fill="#bfefff" />
            <rect x="68" y="10" width="22" height="20" rx="5" fill="#bfefff" />
            <path d="M96 10 h16 a6 6 0 0 1 6 6 v18 h-22 Z" fill="#bfefff" />
            <circle cx="118" cy="50" r="4" fill="#fff6c2" />
            <rect x="-4" y="54" width="8" height="8" rx="2" fill="var(--red-deep)" />
            <circle cx="28" cy="66" r="14" fill="var(--ink-brown)" stroke="#fff" strokeWidth="5" />
            <circle cx="96" cy="66" r="14" fill="var(--ink-brown)" stroke="#fff" strokeWidth="5" />
            <circle cx="28" cy="66" r="4" fill="#d8d8d8" />
            <circle cx="96" cy="66" r="4" fill="#d8d8d8" />
          </g>
        </g>
      </g>
    </svg>
  );
});

function Cloud({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="0" cy="0" rx="70" ry="26" />
      <circle cx="-30" cy="-14" r="28" />
      <circle cx="18" cy="-24" r="36" />
      <circle cx="52" cy="-6" r="24" />
    </g>
  );
}

function Flowers({ x, y, flip }: { x: number; y: number; flip?: boolean }) {
  const f = (cx: number, cy: number, r: number) => (
    <g transform={`translate(${cx} ${cy})`}>
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} rx={r * 0.55} ry={r} transform={`rotate(${a}) translate(0 ${-r})`} fill="#fff" />
      ))}
      <circle r={r * 0.6} fill="#ffc83d" />
    </g>
  );
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -1 : 1} 1)`}>
      <ellipse cx="-20" cy="10" rx="40" ry="14" transform="rotate(-30)" fill="var(--leaf)" />
      <ellipse cx="30" cy="20" rx="36" ry="12" transform="rotate(20)" fill="var(--lime)" />
      <ellipse cx="10" cy="-30" rx="30" ry="11" transform="rotate(70)" fill="var(--leaf)" />
      {f(0, 0, 16)}
      {f(36, -20, 11)}
      {f(-30, -26, 9)}
    </g>
  );
}

function PinIcon({ i }: { i: number }) {
  if (i === 0)
    return (
      <g>
        <rect x="-18" y="-30" width="36" height="60" rx="7" fill="#fff" />
        <rect x="-13" y="-22" width="22" height="42" rx="3" fill="var(--paper-warm)" />
        <rect x="11" y="-22" width="4" height="42" rx="2" fill="var(--paper-edge)" />
        <rect x="11" y="-12" width="4" height="14" rx="2" fill="var(--red-deep)" />
        <rect x="-9" y="-16" width="16" height="4" rx="2" fill="var(--muted)" />
        <rect x="-9" y="-8" width="12" height="4" rx="2" fill="var(--muted)" />
        <rect x="-9" y="0" width="16" height="4" rx="2" fill="var(--muted)" />
      </g>
    );
  if (i === 1)
    return (
      <g stroke="#fff" strokeWidth="5" fill="#fff">
        <line x1="-18" y1="-14" x2="16" y2="-18" />
        <line x1="-18" y1="-14" x2="0" y2="18" />
        <line x1="16" y1="-18" x2="0" y2="18" />
        <circle cx="-18" cy="-14" r="9" />
        <circle cx="16" cy="-18" r="9" />
        <circle cx="0" cy="18" r="10" />
      </g>
    );
  if (i === 2)
    return (
      <path
        transform="scale(1.2)"
        fill="#fff"
        d="M0 -26 L5 -15 L12 -18 L9 -4 L18 -10 L16 -3 L24 0 L14 8 L16 14 L4 12 L2 24 L-2 24 L-4 12 L-16 14 L-14 8 L-24 0 L-16 -3 L-18 -10 L-9 -4 L-12 -18 L-5 -15 Z"
      />
    );
  return (
    <g fill="#fff">
      <rect x="-20" y="-16" width="40" height="32" rx="9" />
      <rect x="-2" y="-28" width="4" height="10" />
      <circle cx="0" cy="-30" r="5" />
      <circle cx="-8" cy="-2" r="5" fill="var(--stop-grok)" />
      <circle cx="8" cy="-2" r="5" fill="var(--stop-grok)" />
      <rect x="-8" y="7" width="16" height="4" rx="2" fill="var(--stop-grok)" />
      <rect x="-14" y="18" width="28" height="12" rx="4" />
    </g>
  );
}
