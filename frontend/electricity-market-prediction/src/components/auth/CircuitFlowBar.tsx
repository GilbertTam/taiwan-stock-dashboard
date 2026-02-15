'use client';

import { Box } from '@mui/material';

/**
 * Card top "circuit bus": multiple parallel traces + short stubs, varied flow speed/direction.
 * Feels like a small PCB edge connector / data bus.
 */
export function CircuitFlowBar() {
  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 14,
        overflow: 'hidden',
        borderRadius: '6px 6px 0 0',
      }}
    >
      <Box
        component="svg"
        viewBox="0 0 380 14"
        preserveAspectRatio="none"
        sx={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
        }}
      >
        <defs>
          <style>{`
            @keyframes circuitFlowBar {
              0% { stroke-dashoffset: 0; }
              100% { stroke-dashoffset: -100; }
            }
            @keyframes circuitFlowBarRev {
              0% { stroke-dashoffset: -100; }
              100% { stroke-dashoffset: 0; }
            }
            .flowbar-bg { stroke: var(--card-border); stroke-width: 1.2; fill: none; }
            .flowbar-flow { fill: none; stroke-width: 1.5; stroke-linecap: round; }
            .flowbar-flow--1 { stroke-dasharray: 10 100; animation: circuitFlowBar 1.6s linear infinite; stroke: var(--primary); }
            .flowbar-flow--2 { stroke-dasharray: 14 100; animation: circuitFlowBarRev 2.2s linear infinite 0.3s; stroke: var(--secondary); }
            .flowbar-flow--3 { stroke-dasharray: 8 100; animation: circuitFlowBar 2s linear infinite 0.6s; stroke: var(--primary); opacity: 0.9; }
            .flowbar-pad { fill: var(--card-border); }
            .flowbar-pad-lit { fill: var(--primary); }
            @media (prefers-reduced-motion: reduce) {
              .flowbar-flow--1, .flowbar-flow--2, .flowbar-flow--3 { animation: none; stroke-dasharray: none; stroke: var(--card-border); }
            }
          `}</style>
        </defs>
        {/* Three parallel bus traces (like a small data bus) */}
        <path className="flowbar-bg" d="M0 3 L380 3" pathLength={100} />
        <path className="flowbar-bg" d="M0 7 L380 7" pathLength={100} />
        <path className="flowbar-bg" d="M0 11 L380 11" pathLength={100} />
        <path className="flowbar-flow flowbar-flow--1" d="M0 3 L380 3" pathLength={100} />
        <path className="flowbar-flow flowbar-flow--2" d="M0 7 L380 7" pathLength={100} />
        <path className="flowbar-flow flowbar-flow--3" d="M0 11 L380 11" pathLength={100} />
        {/* Pads along the bus (solder points) */}
        <circle className="flowbar-pad" cx={60} cy={7} r={2} />
        <circle className="flowbar-pad flowbar-pad-lit" cx={190} cy={7} r={2} />
        <circle className="flowbar-pad" cx={320} cy={7} r={2} />
        {/* Short stub (branch trace) */}
        <path className="flowbar-bg" d="M280 7 L280 0" pathLength={100} />
        <path className="flowbar-flow flowbar-flow--1" d="M280 7 L280 0" pathLength={100} style={{ animationDelay: '0.5s' }} />
      </Box>
    </Box>
  );
}
