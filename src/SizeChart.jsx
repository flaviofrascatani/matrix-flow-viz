import React from 'react';

const phaseColors = {
  'input': '#888',
  'qkv': '#5a9fd0',
  'scores': '#d08a4a',
  'softmax': '#d0c04a',
  'context': '#7a6ad0',
  'concat': '#8a8a8a',
  'post-attn': '#5cb870',
  'ffn-up': '#d4a840',
  'gelu': '#e87830',
  'ffn-down': '#a070b0',
  'output': '#d4a840',
};

const phaseIcons = {
  'input': '▣',
  'qkv': '◉',
  'scores': '◈',
  'softmax': '◎',
  'context': '◇',
  'concat': '⊞',
  'post-attn': '◆',
  'ffn-up': '△',
  'gelu': '⬡',
  'ffn-down': '▽',
  'output': '★',
};

export { phaseColors, phaseIcons };

export default function SizeChart({ steps, currentStep, onSelect }) {
  const maxCells = Math.max(...steps.map(s => s.rows * s.cols));
  const barWidth = 200;
  const rowH = 20;
  const leftPad = 90;
  const svgW = leftPad + barWidth + 80;
  const svgH = steps.length * rowH + 10;

  return (
    <div style={{ overflowY: 'auto', maxHeight: '70vh' }}>
      <div style={{ fontSize: 12, fontFamily: 'var(--disp)', fontWeight: 700, color: 'var(--acc)', marginBottom: 8 }}>
        Pipeline Size Map
      </div>
      <svg width={svgW} height={svgH} style={{ display: 'block' }}>
        {steps.map((s, i) => {
          const cells = s.rows * s.cols;
          const w = (cells / maxCells) * barWidth;
          const color = phaseColors[s.phase] || '#888';
          const active = i === currentStep;
          const y = i * rowH;

          return (
            <g key={i} onClick={() => onSelect(i)} style={{ cursor: 'pointer' }}>
              <rect x={0} y={y} width={svgW} height={rowH - 1}
                fill={active ? 'rgba(212,168,64,0.08)' : 'transparent'} rx={2} />
              {/* Label */}
              <text x={leftPad - 4} y={y + rowH / 2 + 1} textAnchor="end"
                fontSize={8} fill={active ? 'var(--acc)' : 'var(--dim)'}
                fontFamily="var(--mono)" fontWeight={active ? 600 : 400}>
                {s.label.length > 14 ? s.label.slice(0,13)+'…' : s.label}
              </text>
              {/* Bar */}
              <rect x={leftPad} y={y + 3} width={Math.max(2, w)} height={rowH - 7}
                fill={color} opacity={active ? 0.75 : 0.2} rx={2} />
              {/* Size label */}
              <text x={leftPad + Math.max(2, w) + 4} y={y + rowH / 2 + 1}
                fontSize={7.5} fill={active ? 'var(--text)' : 'var(--dim)'}
                fontFamily="var(--mono)">
                {s.rows}×{s.cols}
              </text>
            </g>
          );
        })}
      </svg>
      {/* Legend */}
      <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>
        {Object.entries(phaseColors).map(([k, color]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 10, color }}>{phaseIcons[k] || '·'}</span>
            <span style={{ fontSize: 8, color: 'var(--dim)' }}>{k}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
