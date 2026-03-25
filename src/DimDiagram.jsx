import React from 'react';

export default function DimDiagram({ dimChange }) {
  return <DimDiagramClean dimChange={dimChange} />;
}

export function DimDiagramClean({ dimChange }) {
  if (!dimChange) return null;
  const { from, to, weight } = dimChange;
  const maxDim = Math.max(...from, ...to, ...(weight || []));
  const s = (d) => Math.max(14, (d / maxDim) * 72);

  const fromW = s(from[1]), fromH = s(from[0]);
  const toW = s(to[1]), toH = s(to[0]);
  const wW = weight ? s(weight[1]) : 0;
  const wH = weight ? s(weight[0]) : 0;

  const cy = 38;
  const parts = [];
  let x = 8;

  parts.push(
    <g key="from">
      <rect x={x} y={cy - fromH / 2} width={fromW} height={fromH}
        fill="rgba(60,140,220,0.15)" stroke="rgba(60,140,220,0.45)" strokeWidth={1.2} rx={2} />
      <text x={x + fromW / 2} y={cy + 1} textAnchor="middle" dominantBaseline="middle"
        fontSize={9} fill="#6a9fd0" fontFamily="var(--mono)" fontWeight="600">
        {from[0]}×{from[1]}
      </text>
    </g>
  );
  x += fromW;

  if (weight) {
    x += 6;
    parts.push(
      <text key="times" x={x + 3} y={cy + 1} fontSize={14} fill="var(--dim)"
        fontFamily="var(--mono)" dominantBaseline="middle">×</text>
    );
    x += 16;
    parts.push(
      <g key="weight">
        <rect x={x} y={cy - wH / 2} width={wW} height={wH}
          fill="rgba(212,168,64,0.12)" stroke="rgba(212,168,64,0.35)" strokeWidth={1.2} rx={2} />
        <text x={x + wW / 2} y={cy + 1} textAnchor="middle" dominantBaseline="middle"
          fontSize={9} fill="var(--acc)" fontFamily="var(--mono)" fontWeight="600">
          {weight[0]}×{weight[1]}
        </text>
      </g>
    );
    x += wW;
  }

  x += 8;
  parts.push(
    <text key="eq" x={x + 2} y={cy + 1} fontSize={14} fill="var(--dim)"
      fontFamily="var(--mono)" dominantBaseline="middle">=</text>
  );
  x += 18;

  parts.push(
    <g key="to">
      <rect x={x} y={cy - toH / 2} width={toW} height={toH}
        fill="rgba(92,184,112,0.12)" stroke="rgba(92,184,112,0.4)" strokeWidth={1.2} rx={2} />
      <text x={x + toW / 2} y={cy + 1} textAnchor="middle" dominantBaseline="middle"
        fontSize={9} fill="var(--green)" fontFamily="var(--mono)" fontWeight="600">
        {to[0]}×{to[1]}
      </text>
    </g>
  );
  x += toW + 12;

  return (
    <svg width={x} height={76} style={{ display: 'block', marginBottom: 6 }}>
      {parts}
    </svg>
  );
}
