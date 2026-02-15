'use client';

import { Box } from '@mui/material';

/**
 * Card frame as PCB: traces on all four edges, flow on multiple sides with different speeds,
 * corner pads + mid-edge test points. Optional stub for a "pin" feel.
 */
export function CircuitCardTraces() {
  return (
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0,
        borderRadius: 'inherit',
      }}
    >
      <Box
        component="svg"
        viewBox="0 0 380 400"
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
            @keyframes circuitTraceFlow {
              0% { stroke-dashoffset: 0; }
              100% { stroke-dashoffset: -100; }
            }
            @keyframes circuitTraceFlowRev {
              0% { stroke-dashoffset: -100; }
              100% { stroke-dashoffset: 0; }
            }
            .trace-border { stroke: var(--card-border); stroke-width: 1; fill: none; }
            .trace-flow { fill: none; stroke-width: 1.5; stroke-linecap: round; }
            .trace-flow--top { stroke-dasharray: 12 100; animation: circuitTraceFlow 2.2s linear infinite; stroke: var(--primary); }
            .trace-flow--right { stroke-dasharray: 10 100; animation: circuitTraceFlowRev 2.8s linear infinite 0.4s; stroke: var(--secondary); }
            .trace-flow--bottom { stroke-dasharray: 14 100; animation: circuitTraceFlow 3s linear infinite 0.2s; stroke: var(--primary); opacity: 0.85; }
            .trace-flow--left { stroke-dasharray: 8 100; animation: circuitTraceFlowRev 2.4s linear infinite 0.6s; stroke: var(--secondary); }
            .node { fill: var(--card-border); stroke: var(--card-border); stroke-width: 0.5; }
            .node-lit { fill: var(--primary); }
            .node-alt { fill: var(--secondary); }
            @media (prefers-reduced-motion: reduce) {
              .trace-flow--top, .trace-flow--right, .trace-flow--bottom, .trace-flow--left { animation: none; stroke-dasharray: none; stroke: var(--card-border); }
            }
          `}</style>
        </defs>
        {/* Full border (one path so corners connect) */}
        <path
          className="trace-border"
          d="M 10 10 L 370 10 L 370 390 L 10 390 Z"
          pathLength={100}
        />
        {/* Flow on each edge (four separate segments so direction/speed can differ) */}
        <path className="trace-flow trace-flow--top" d="M 10 10 L 370 10" pathLength={100} />
        <path className="trace-flow trace-flow--right" d="M 370 10 L 370 390" pathLength={100} />
        <path className="trace-flow trace-flow--bottom" d="M 370 390 L 10 390" pathLength={100} />
        <path className="trace-flow trace-flow--left" d="M 10 390 L 10 10" pathLength={100} />
        {/* Corner pads */}
        <circle className="node node-lit" cx={10} cy={10} r={3.5} />
        <circle className="node node-alt" cx={370} cy={10} r={3.5} />
        <circle className="node node-lit" cx={370} cy={390} r={3.5} />
        <circle className="node node-alt" cx={10} cy={390} r={3.5} />
        {/* Mid-edge test points (PCB style) */}
        <circle className="node" cx={190} cy={10} r={2} />
        <circle className="node node-lit" cx={370} cy={200} r={2} />
        <circle className="node" cx={190} cy={390} r={2} />
        <circle className="node node-alt" cx={10} cy={200} r={2} />
        {/* Short stub (pin / via) from top edge */}
        <path className="trace-border" d="M 300 10 L 300 28" pathLength={100} />
        <path className="trace-flow trace-flow--top" d="M 300 10 L 300 28" pathLength={100} style={{ animationDelay: '0.8s' }} />
        <circle className="node node-lit" cx={300} cy={28} r={2} />
      </Box>
    </Box>
  );
}
