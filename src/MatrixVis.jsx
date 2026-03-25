import React, { useMemo } from 'react';

function valColor(v, mx) {
  const t = Math.max(-1, Math.min(1, v / (mx || 1)));
  if (t >= 0) {
    return `rgb(${Math.round(12+t*235)},${Math.round(10+t*110)},${Math.round(6+t*12)})`;
  } else {
    const a = -t;
    return `rgb(${Math.round(6+a*15)},${Math.round(14+a*90)},${Math.round(12+a*235)})`;
  }
}

export default function MatrixVis({ data, rows, cols, maxCells = 800, height = 280 }) {
  const { visData, visRows, visCols, mx, skipR, skipC } = useMemo(() => {
    const total = rows * cols;
    const skipR = total > maxCells ? Math.ceil(rows / Math.floor(Math.sqrt(maxCells * rows / cols))) : 1;
    const skipC = total > maxCells ? Math.ceil(cols / Math.floor(Math.sqrt(maxCells * cols / rows))) : 1;

    const visRows = [];
    const visData = [];
    for (let i = 0; i < rows; i += skipR) {
      visRows.push(i);
      const row = [];
      for (let j = 0; j < cols; j += skipC) row.push(data[i * cols + j]);
      visData.push(row);
    }
    const visCols = [];
    for (let j = 0; j < cols; j += skipC) visCols.push(j);

    const mx = Math.max(0.01, ...data.map(Math.abs));
    return { visData, visRows, visCols, mx, skipR, skipC };
  }, [data, rows, cols, maxCells]);

  const cellW = Math.min(Math.max(4, Math.floor(520 / visCols.length)), 30);
  const cellH = Math.min(Math.max(4, Math.floor(height / visRows.length)), 30);
  const showNum = cellW >= 24 && cellH >= 18;

  const svgW = visCols.length * cellW;
  const svgH = visRows.length * cellH;

  return (
    <div>
      <svg width={svgW} height={svgH} style={{ display: 'block', borderRadius: 4 }}>
        {visData.map((row, ri) => row.map((v, ci) => (
          <g key={`${ri}-${ci}`}>
            <rect
              x={ci * cellW} y={ri * cellH}
              width={cellW - (cellW > 6 ? 1 : 0.3)}
              height={cellH - (cellH > 6 ? 1 : 0.3)}
              fill={valColor(v, mx)} rx={cellW > 12 ? 1.5 : 0.5}
            />
            {showNum && (
              <text
                x={ci * cellW + cellW / 2} y={ri * cellH + cellH / 2 + 3.5}
                textAnchor="middle" fontSize={Math.min(7.5, cellW - 5)}
                fill="rgba(255,255,255,0.72)" fontFamily="var(--mono)"
              >
                {Math.abs(v) >= 10 ? v.toFixed(0) : v.toFixed(2)}
              </text>
            )}
          </g>
        )))}
      </svg>
      {(skipR > 1 || skipC > 1) && (
        <div style={{ fontSize: 9, color: 'var(--dim)', marginTop: 3 }}>
          Sampled {visRows.length}×{visCols.length} of {rows}×{cols}
        </div>
      )}
    </div>
  );
}
