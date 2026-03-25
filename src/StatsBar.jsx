import React from 'react';

export default function StatsBar({ stats, prevStats }) {
  const items = [
    { k: 'min', v: stats.min, p: prevStats?.min, color: 'var(--acc3)' },
    { k: 'max', v: stats.max, p: prevStats?.max, color: 'var(--acc2)' },
    { k: 'mean', v: stats.mean, p: prevStats?.mean, color: 'var(--green)' },
    { k: 'std', v: stats.std, p: prevStats?.std, color: '#b07a60' },
    { k: '‖·‖₂', v: stats.norm, p: prevStats?.norm, color: '#a070b0' },
  ];

  return (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', padding: '8px 0' }}>
      {items.map(({ k, v, p, color }) => {
        const delta = p != null ? v - p : null;
        return (
          <div key={k} style={{ fontSize: 11 }}>
            <span style={{ color: 'var(--dim)', fontSize: 9, marginRight: 4 }}>{k}</span>
            <span style={{ color, fontWeight: 600 }}>{v.toFixed(3)}</span>
            {delta != null && (
              <span style={{
                fontSize: 9, marginLeft: 4,
                color: delta >= 0 ? 'var(--green)' : 'var(--red)',
              }}>
                {delta >= 0 ? '↑' : '↓'}{Math.abs(delta).toFixed(3)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
