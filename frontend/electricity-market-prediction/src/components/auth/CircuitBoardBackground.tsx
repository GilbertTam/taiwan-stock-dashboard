'use client';

import { Box } from '@mui/material';

/**
 * Full-page circuit board background: PCB-style traces (L-shapes, branches, pads)
 * with varied flowing current: different speeds, dash lengths, and directions.
 * Respects prefers-reduced-motion.
 */
export function CircuitBoardBackground() {
  return (
    <Box
      component="svg"
      viewBox="0 0 1920 1080"
      preserveAspectRatio="xMidYMid slice"
      sx={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        opacity: 'var(--circuit-bg-opacity)',
      }}
    >
      <defs>
        <style>{`
          @keyframes circuitFlow {
            0% { stroke-dashoffset: 0; }
            100% { stroke-dashoffset: -100; }
          }
          @keyframes circuitFlowRev {
            0% { stroke-dashoffset: -100; }
            100% { stroke-dashoffset: 0; }
          }
          .trace-bg { stroke: var(--card-border); stroke-width: 1.2; fill: none; }
          .trace-flow { fill: none; stroke-width: 2; stroke-linecap: round; }
          .trace-flow--fast { stroke-dasharray: 10 100; animation: circuitFlow 1.8s linear infinite; }
          .trace-flow--mid { stroke-dasharray: 18 100; animation: circuitFlow 2.8s linear infinite; }
          .trace-flow--slow { stroke-dasharray: 25 100; animation: circuitFlow 4s linear infinite; }
          .trace-flow--rev { stroke-dasharray: 12 100; animation: circuitFlowRev 2.2s linear infinite; }
          .trace-flow--primary { stroke: var(--primary); }
          .trace-flow--secondary { stroke: var(--secondary); }
          .trace-flow--accent { stroke: var(--accent); }
          .trace-flow--d1 { animation-delay: 0.2s; }
          .trace-flow--d2 { animation-delay: 0.6s; }
          .trace-flow--d3 { animation-delay: 1s; }
          .trace-flow--d4 { animation-delay: 1.4s; }
          .pad { fill: var(--card-border); stroke: var(--card-border); stroke-width: 0.5; }
          .pad-active { fill: var(--primary); }
          .pad-alt { fill: var(--secondary); }
          @media (prefers-reduced-motion: reduce) {
            .trace-flow { animation: none !important; stroke-dasharray: none; stroke: var(--card-border); }
          }
        `}</style>
      </defs>

      {/* ========== PCB-style traces: L-shapes, branches, not full grid ========== */}

      {/* Top zone: horizontal bus with downward branches */}
      <path className="trace-bg" d="M0 120 L600 120 L600 200 L1200 200 L1200 120 L1920 120" pathLength={100} />
      <path className="trace-flow trace-flow--mid trace-flow--primary" d="M0 120 L600 120 L600 200" pathLength={100} />
      <path className="trace-flow trace-flow--fast trace-flow--secondary trace-flow--d2" d="M1200 200 L1200 120 L1920 120" pathLength={100} />

      <path className="trace-bg" d="M200 200 L500 200 L500 320 L900 320" pathLength={100} />
      <path className="trace-flow trace-flow--slow trace-flow--primary trace-flow--d1" d="M200 200 L500 200 L500 320" pathLength={100} />
      <path className="trace-flow trace-flow--rev trace-flow--secondary trace-flow--d3" d="M500 320 L900 320" pathLength={100} />

      <path className="trace-bg" d="M1000 120 L1000 280 L1400 280 L1400 400" pathLength={100} />
      <path className="trace-flow trace-flow--fast trace-flow--accent trace-flow--d2" d="M1000 120 L1000 280" pathLength={100} />
      <path className="trace-flow trace-flow--mid trace-flow--secondary trace-flow--d4" d="M1400 280 L1400 400" pathLength={100} />

      {/* Middle zone: varied L and T shapes */}
      <path className="trace-bg" d="M80 450 L400 450 L400 540 L800 540" pathLength={100} />
      <path className="trace-flow trace-flow--mid trace-flow--primary trace-flow--d1" d="M80 450 L400 450 L400 540" pathLength={100} />
      <path className="trace-flow trace-flow--slow trace-flow--secondary" d="M400 540 L800 540" pathLength={100} />

      <path className="trace-bg" d="M1100 400 L1100 620 L1600 620 L1600 520" pathLength={100} />
      <path className="trace-flow trace-flow--rev trace-flow--primary trace-flow--d3" d="M1100 400 L1100 620 L1600 620" pathLength={100} />
      <path className="trace-flow trace-flow--fast trace-flow--secondary trace-flow--d2" d="M1600 620 L1600 520" pathLength={100} />

      <path className="trace-bg" d="M320 540 L320 720 L720 720 L720 640" pathLength={100} />
      <path className="trace-flow trace-flow--slow trace-flow--secondary trace-flow--d4" d="M320 540 L320 720 L720 720" pathLength={100} />

      <path className="trace-bg" d="M1500 200 L1500 380 L1800 380" pathLength={100} />
      <path className="trace-flow trace-flow--fast trace-flow--primary" d="M1500 200 L1500 380 L1800 380" pathLength={100} />

      {/* Bottom zone: bus + branches */}
      <path className="trace-bg" d="M0 920 L480 920 L480 820 L960 820 L960 920 L1920 920" pathLength={100} />
      <path className="trace-flow trace-flow--mid trace-flow--secondary trace-flow--d1" d="M0 920 L480 920 L480 820" pathLength={100} />
      <path className="trace-flow trace-flow--rev trace-flow--primary trace-flow--d3" d="M960 820 L960 920 L1920 920" pathLength={100} />

      <path className="trace-bg" d="M120 820 L120 980 L600 980" pathLength={100} />
      <path className="trace-flow trace-flow--slow trace-flow--primary trace-flow--d2" d="M120 820 L120 980 L600 980" pathLength={100} />

      <path className="trace-bg" d="M1400 720 L1400 900 L1800 900" pathLength={100} />
      <path className="trace-flow trace-flow--fast trace-flow--accent trace-flow--d4" d="M1400 720 L1400 900 L1800 900" pathLength={100} />

      {/* Vertical segments (like vias between layers) */}
      <path className="trace-bg" d="M600 120 L600 200" pathLength={100} />
      <path className="trace-bg" d="M1000 280 L1000 400" pathLength={100} />
      <path className="trace-bg" d="M400 450 L400 540" pathLength={100} />
      <path className="trace-flow trace-flow--mid trace-flow--secondary trace-flow--d2" d="M600 120 L600 200" pathLength={100} />

      {/* Pads at junctions (PCB solder points) */}
      <circle className="pad pad-active" cx={600} cy={120} r={3} />
      <circle className="pad pad-alt" cx={600} cy={200} r={3} />
      <circle className="pad" cx={1200} cy={200} r={3} />
      <circle className="pad pad-active" cx={500} cy={320} r={3} />
      <circle className="pad" cx={1000} cy={280} r={3} />
      <circle className="pad pad-alt" cx={1400} cy={400} r={3} />
      <circle className="pad" cx={400} cy={540} r={3} />
      <circle className="pad pad-active" cx={1600} cy={620} r={3} />
      <circle className="pad pad-alt" cx={720} cy={720} r={3} />
      <circle className="pad" cx={480} cy={920} r={3} />
      <circle className="pad pad-active" cx={960} cy={820} r={3} />
      <circle className="pad" cx={120} cy={820} r={3} />
      <circle className="pad pad-alt" cx={1400} cy={900} r={3} />
    </Box>
  );
}
