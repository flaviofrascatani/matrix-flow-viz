import React, { useState, useMemo, useEffect, useRef } from 'react';
import { simulate, matStats } from './engine.js';

/* ─── Colors ─── */
function valColor(v, mx) {
  const t = Math.max(-1, Math.min(1, v / (mx || 1)));
  if (t >= 0) return `rgb(${Math.round(12+t*235)},${Math.round(10+t*110)},${Math.round(6+t*12)})`;
  const a = -t;
  return `rgb(${Math.round(6+a*15)},${Math.round(14+a*90)},${Math.round(12+a*235)})`;
}

const PC = {
  input: '#888', qkv: '#5a9fd0', scores: '#d08a4a', softmax: '#d0c04a',
  context: '#7a6ad0', concat: '#8a8a8a', 'post-attn': '#5cb870',
  'ffn-up': '#d4a840', gelu: '#e87830', 'ffn-down': '#a070b0', output: '#d4a840',
  residual: '#3daa5b',
};

/* ─── Mini Matrix ─── */
function MiniMatrix({ data, rows, cols, size = 44 }) {
  const mx = Math.max(0.01, ...data.map(Math.abs));
  const maxC = Math.min(cols, 20);
  const maxR = Math.min(rows, 12);
  const cW = size / maxC, cH = size / maxR;
  return (
    <svg width={size} height={size * (maxR / maxC)} style={{ display: 'block', borderRadius: 2 }}>
      {Array.from({ length: maxR }).map((_, i) =>
        Array.from({ length: maxC }).map((_, j) => (
          <rect key={`${i}-${j}`} x={j * cW} y={i * cH}
            width={cW - 0.3} height={cH - 0.3}
            fill={valColor(data[i * cols + j], mx)} />
        ))
      )}
    </svg>
  );
}

/* ─── Full Matrix Inspector ─── */
function Inspector({ step }) {
  if (!step) return null;
  const { label, desc, data, rows, cols, phase } = step;
  const stats = matStats(data);
  const mx = Math.max(0.01, ...data.map(Math.abs));
  const maxVis = 900;
  const skipR = rows * cols > maxVis ? Math.ceil(rows / Math.floor(Math.sqrt(maxVis * rows / cols))) : 1;
  const skipC = rows * cols > maxVis ? Math.ceil(cols / Math.floor(Math.sqrt(maxVis * cols / rows))) : 1;
  const visData = [];
  for (let i = 0; i < rows; i += skipR) {
    const row = [];
    for (let j = 0; j < cols; j += skipC) row.push(data[i * cols + j]);
    visData.push(row);
  }
  const nR = visData.length, nC = visData[0]?.length || 0;
  const cellW = Math.min(Math.max(5, Math.floor(520 / nC)), 30);
  const cellH = Math.min(Math.max(5, Math.floor(280 / nR)), 30);
  const showNum = cellW >= 24 && cellH >= 18;
  const color = PC[phase] || '#888';

  return (
    <div style={{ borderTop: '1px solid var(--border)', padding: '20px 28px', background: 'var(--surface)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
        <h2 style={{ fontFamily: 'var(--disp)', fontSize: 22, fontWeight: 800, color: 'var(--acc)' }}>{label}</h2>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 8 }}>{desc}</div>
      <div style={{
        display: 'inline-flex', gap: 10, alignItems: 'center',
        padding: '6px 14px', borderRadius: 4, marginBottom: 12,
        background: 'rgba(180,150,80,0.05)', border: '1px solid var(--border)',
      }}>
        <span style={{ fontSize: 22, fontFamily: 'var(--disp)', fontWeight: 800, color: 'var(--acc)' }}>
          {rows}×{cols}
        </span>
        <span style={{ fontSize: 10, color: 'var(--dim)' }}>= {(rows * cols).toLocaleString()} values</span>
      </div>
      <div style={{ marginBottom: 10 }}>
        <svg width={nC * cellW} height={nR * cellH} style={{ display: 'block', borderRadius: 3 }}>
          {visData.map((row, ri) => row.map((v, ci) => (
            <g key={`${ri}-${ci}`}>
              <rect x={ci * cellW} y={ri * cellH}
                width={cellW - (cellW > 6 ? 1 : 0.3)} height={cellH - (cellH > 6 ? 1 : 0.3)}
                fill={valColor(v, mx)} rx={cellW > 12 ? 1 : 0} />
              {showNum && (
                <text x={ci * cellW + cellW / 2} y={ri * cellH + cellH / 2 + 3.5}
                  textAnchor="middle" fontSize={Math.min(7, cellW - 5)}
                  fill="rgba(255,255,255,0.72)" fontFamily="var(--mono)">
                  {Math.abs(v) >= 10 ? v.toFixed(0) : v.toFixed(2)}
                </text>
              )}
            </g>
          )))}
        </svg>
        {(skipR > 1 || skipC > 1) && (
          <div style={{ fontSize: 9, color: 'var(--dim)', marginTop: 2 }}>
            Sampled {nR}×{nC} of {rows}×{cols}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 11 }}>
        {[['min', stats.min, 'var(--acc3)'], ['max', stats.max, 'var(--acc2)'],
          ['mean', stats.mean, 'var(--green)'], ['std', stats.std, '#b07a60']].map(([k, v, c]) => (
          <span key={k}>
            <span style={{ color: 'var(--dim)', fontSize: 9 }}>{k} </span>
            <span style={{ color: c, fontWeight: 600 }}>{v.toFixed(4)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─── Graph Node ─── */
function GNode({ step, x, y, selected, highlighted, onClick }) {
  const { label, rows, cols, data, phase } = step;
  const color = PC[phase] || '#888';
  const w = 108, h = 76;
  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }}>
      {selected && (
        <rect x={x - 3} y={y - 3} width={w + 6} height={h + 6} rx={8}
          fill="none" stroke={color} strokeWidth={2.5} opacity={0.6}>
          <animate attributeName="opacity" values="0.3;0.7;0.3" dur="2s" repeatCount="indefinite" />
        </rect>
      )}
      <rect x={x} y={y} width={w} height={h} rx={6}
        fill={selected ? 'rgba(30,25,15,0.95)' : 'rgba(14,11,6,0.92)'}
        stroke={highlighted ? color : 'rgba(180,150,80,0.08)'}
        strokeWidth={selected ? 2 : highlighted ? 1.5 : 0.8} />
      <rect x={x} y={y} width={w} height={3} rx={1} fill={color} opacity={0.8} />
      <text x={x + w / 2} y={y + 15} textAnchor="middle"
        fontSize={8.5} fill={color} fontFamily="var(--mono)" fontWeight="600">{label}</text>
      <text x={x + w / 2} y={y + 30} textAnchor="middle"
        fontSize={14} fill="var(--acc)" fontFamily="var(--disp)" fontWeight="700">
        {rows}×{cols}
      </text>
      <text x={x + w / 2} y={y + 41} textAnchor="middle"
        fontSize={7.5} fill="var(--dim)" fontFamily="var(--mono)">
        {(rows * cols).toLocaleString()} vals
      </text>
      <foreignObject x={x + (w - 44) / 2} y={y + 47} width={44} height={24}>
        <MiniMatrix data={data} rows={rows} cols={cols} size={44} />
      </foreignObject>
    </g>
  );
}

/* ─── Edge with arrowhead ─── */
function Edge({ x1, y1, x2, y2, color = 'rgba(180,150,80,0.2)', hl = false, dashed = false, label = null }) {
  const c = hl ? color : color;
  const op = hl ? 0.85 : 0.4;
  const sw = hl ? 2.2 : 1.2;
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);

  // Arrowhead at end
  const aLen = 7, aW = 3;
  const nx = dx / len, ny = dy / len;
  const ax = x2 - nx * aLen, ay = y2 - ny * aLen;
  const px = -ny, py = nx;

  let path;
  if (Math.abs(dy) > 10 && Math.abs(dx) > 10) {
    // Curved
    const mx = x1 + dx * 0.5, my = y1;
    const mx2 = x1 + dx * 0.5, my2 = y2;
    path = `M${x1},${y1} C${mx},${my} ${mx2},${my2} ${x2},${y2}`;
  } else {
    path = `M${x1},${y1} L${x2},${y2}`;
  }

  return (
    <g opacity={op}>
      <path d={path} fill="none" stroke={c} strokeWidth={sw}
        strokeDasharray={dashed ? '6 4' : 'none'} />
      <polygon
        points={`${x2},${y2} ${ax + px * aW},${ay + py * aW} ${ax - px * aW},${ay - py * aW}`}
        fill={c} />
      {label && (
        <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 5}
          textAnchor="middle" fontSize={7} fill={c} fontFamily="var(--mono)" fontWeight="600">
          {label}
        </text>
      )}
    </g>
  );
}

/* ─── Build Graph ─── */
function buildGraph(steps, nHeads, nLayers) {
  const W = 108, H = 76, gx = 30, gy = 14;
  const headH = H * 3 + gy * 2; // Q,K,V stacked per head
  const colW = W + gx;

  const nodes = [];
  const edges = [];
  let si = 0;

  const totalHH = nHeads * (headH + gy * 2);
  const centerY = totalHH / 2 - H / 2 + 30;

  // ─ Input ─
  const inp = steps[si++];
  nodes.push({ s: inp, x: 20, y: centerY, id: inp.id });
  let prevOut = inp.id;
  let cx = 20 + colW + 20;

  for (let L = 0; L < nLayers; L++) {
    const lx = cx;

    // ── Q, K, V per head ──
    const qkv = []; // [h][0=Q,1=K,2=V]
    for (let h = 0; h < nHeads; h++) {
      const hy = 30 + h * (headH + gy * 2);
      const hNodes = [];
      for (let q = 0; q < 3; q++) {
        const s = steps[si++];
        const ny = hy + q * (H + gy);
        nodes.push({ s, x: lx, y: ny, id: s.id });
        hNodes.push({ id: s.id, x: lx, y: ny });
        edges.push({ from: prevOut, to: s.id, color: PC.qkv, label: q === 0 ? '×Wq' : q === 1 ? '×Wk' : '×Wv' });
      }
      qkv.push(hNodes);
    }

    // ── Scores per head (Q·Kᵀ/√d) ──
    const scX = lx + colW;
    const attnVNodes = [];

    for (let h = 0; h < nHeads; h++) {
      const hcy = qkv[h][1].y; // center on K

      const sc = steps[si++]; // scores
      nodes.push({ s: sc, x: scX, y: hcy, id: sc.id });
      edges.push({ from: qkv[h][0].id, to: sc.id, color: PC.scores, label: 'Q' });
      edges.push({ from: qkv[h][1].id, to: sc.id, color: PC.scores, label: 'Kᵀ' });

      const sm = steps[si++]; // softmax
      const smX = scX + colW;
      nodes.push({ s: sm, x: smX, y: hcy, id: sm.id });
      edges.push({ from: sc.id, to: sm.id, color: PC.softmax });

      const av = steps[si++]; // attn·V
      const avX = smX + colW;
      nodes.push({ s: av, x: avX, y: hcy, id: av.id });
      edges.push({ from: sm.id, to: av.id, color: PC.context, label: 'Attn' });
      edges.push({ from: qkv[h][2].id, to: av.id, color: PC.context, label: 'V' });

      attnVNodes.push({ id: av.id, x: avX, y: hcy });
    }

    // ── Concat ──
    const ccX = scX + colW * 3;
    const cc = steps[si++];
    nodes.push({ s: cc, x: ccX, y: centerY, id: cc.id });
    attnVNodes.forEach(n => edges.push({ from: n.id, to: cc.id, color: '#8a8a8a' }));

    // ── Post-MHA (+Res+LN) ──
    const pmX = ccX + colW;
    const pm = steps[si++];
    nodes.push({ s: pm, x: pmX, y: centerY, id: pm.id });
    edges.push({ from: cc.id, to: pm.id, color: PC['post-attn'], label: '×Wo' });
    // Residual skip connection (dashed green)
    edges.push({ from: prevOut, to: pm.id, color: PC.residual, dashed: true, label: '+Residual' });

    // ── FFN Up ──
    const fuX = pmX + colW;
    const fu = steps[si++];
    nodes.push({ s: fu, x: fuX, y: centerY, id: fu.id });
    edges.push({ from: pm.id, to: fu.id, color: PC['ffn-up'], label: '×W1+b' });

    // ── GELU ──
    const geX = fuX + colW;
    const ge = steps[si++];
    nodes.push({ s: ge, x: geX, y: centerY, id: ge.id });
    edges.push({ from: fu.id, to: ge.id, color: PC.gelu, label: 'GELU' });

    // ── FFN Down (+Res+LN) ──
    const fdX = geX + colW;
    const fd = steps[si++];
    nodes.push({ s: fd, x: fdX, y: centerY, id: fd.id });
    edges.push({ from: ge.id, to: fd.id, color: PC['ffn-down'], label: '×W2' });
    // FFN residual skip (dashed green)
    edges.push({ from: pm.id, to: fd.id, color: PC.residual, dashed: true, label: '+Residual' });

    prevOut = fd.id;
    cx = fdX + colW + 40;
  }

  // ─ Output ─
  if (si < steps.length) {
    const out = steps[si];
    nodes.push({ s: out, x: cx, y: centerY, id: out.id });
    edges.push({ from: prevOut, to: out.id, color: PC.output });
  }

  const maxX = Math.max(...nodes.map(n => n.x + W));
  const maxY = Math.max(...nodes.map(n => n.y + H));
  return { nodes, edges, width: maxX + 40, height: maxY + 40 };
}

/* ─── Slider ─── */
function Sl({ label, value, onChange, min, max, step = 1 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <label style={{ fontSize: 9, color: 'var(--dim)', letterSpacing: '0.06em', minWidth: 42 }}>{label}</label>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseInt(e.target.value))} style={{ width: 70 }} />
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--acc)', minWidth: 22 }}>{value}</span>
    </div>
  );
}

/* ═══════════════ APP ═══════════════ */
export default function App() {
  const [seq, setSeq] = useState(6);
  const [dModel, setDModel] = useState(8);
  const [nHeads, setNHeads] = useState(2);
  const [ffMult, setFFMult] = useState(4);
  const [nLayers, setNLayers] = useState(2);
  const [seed, setSeed] = useState(42);
  const [selId, setSelId] = useState(null);
  const [playing, setPlaying] = useState(false);
  const playRef = useRef(null);
  const svgRef = useRef(null);
  const playIdx = useRef(0);

  const eH = useMemo(() => {
    let h = nHeads; while (h > 1 && dModel % h !== 0) h--; return h;
  }, [nHeads, dModel]);

  const steps = useMemo(() => {
    try { return simulate({ seq, dModel, nHeads: eH, ffMult, nLayers, seed }); }
    catch (e) { console.error(e); return []; }
  }, [seq, dModel, eH, ffMult, nLayers, seed]);

  const graph = useMemo(() => {
    if (!steps.length) return { nodes: [], edges: [], width: 100, height: 100 };
    return buildGraph(steps, eH, nLayers);
  }, [steps, eH, nLayers]);

  const selStep = useMemo(() => {
    if (!selId) return steps[0] || null;
    const n = graph.nodes.find(n => n.id === selId);
    return n ? n.s : steps[0];
  }, [selId, graph, steps]);

  const nodeMap = useMemo(() => {
    const m = {}; graph.nodes.forEach(n => { m[n.id] = n; }); return m;
  }, [graph.nodes]);

  // Reset on config change
  useEffect(() => { setSelId(null); setPlaying(false); playIdx.current = 0; }, [seq, dModel, eH, ffMult, nLayers, seed]);

  // Playback
  useEffect(() => {
    if (!playing) { clearInterval(playRef.current); return; }
    playIdx.current = 0;
    playRef.current = setInterval(() => {
      if (playIdx.current >= graph.nodes.length) { setPlaying(false); return; }
      setSelId(graph.nodes[playIdx.current].id);
      playIdx.current++;
    }, 450);
    return () => clearInterval(playRef.current);
  }, [playing, graph.nodes]);

  // Scroll to selected
  useEffect(() => {
    if (selId && svgRef.current) {
      const n = nodeMap[selId];
      if (n) {
        const c = svgRef.current.parentElement;
        c.scrollTo({ left: Math.max(0, n.x - c.clientWidth / 3), behavior: 'smooth' });
      }
    }
  }, [selId, nodeMap]);

  // Keyboard
  useEffect(() => {
    const h = (e) => {
      if (e.key === 'ArrowRight') {
        const i = graph.nodes.findIndex(n => n.id === selId);
        const next = Math.min(graph.nodes.length - 1, (i < 0 ? -1 : i) + 1);
        setSelId(graph.nodes[next]?.id);
      } else if (e.key === 'ArrowLeft') {
        const i = graph.nodes.findIndex(n => n.id === selId);
        setSelId(graph.nodes[Math.max(0, i - 1)]?.id);
      } else if (e.key === ' ') {
        e.preventDefault();
        setPlaying(p => !p);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [selId, graph.nodes]);

  const dH = Math.floor(dModel / eH);
  const dFF = dModel * ffMult;
  const curIdx = graph.nodes.findIndex(n => n.id === selId);

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* ═══ HEADER ═══ */}
      <header style={{
        padding: '16px 24px 12px',
        borderBottom: '1px solid var(--border)',
        background: 'linear-gradient(180deg, rgba(20,16,8,1), var(--bg))',
      }}>
        <h1 style={{ fontFamily: 'var(--disp)', fontSize: 26, fontWeight: 800, color: 'var(--acc)', lineHeight: 1 }}>
          Matrix Flow Graph
        </h1>
        <p style={{ fontSize: 10, color: 'var(--text2)', marginTop: 5, lineHeight: 1.6, maxWidth: 680 }}>
          Q, K, V branch <span style={{ color: PC.qkv, fontWeight: 600 }}>in parallel</span> from
          X — Q and K converge in the dot-product, then attention weights multiply V.
          <span style={{ color: PC.residual }}> Dashed green</span> = residual skip connections.
          Click any node to inspect its matrix.
        </p>
      </header>

      {/* ═══ CONTROLS ═══ */}
      <div style={{
        padding: '8px 24px', borderBottom: '1px solid var(--border)', background: 'var(--surface)',
        display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center',
      }}>
        <Sl label="Seq" value={seq} onChange={setSeq} min={2} max={12} />
        <Sl label="d_model" value={dModel} onChange={setDModel} min={4} max={48} step={4} />
        <Sl label="Heads" value={nHeads} onChange={setNHeads} min={1} max={12} />
        <Sl label="FFx" value={ffMult} onChange={setFFMult} min={2} max={4} />
        <Sl label="Layers" value={nLayers} onChange={setNLayers} min={1} max={12} />

        <button onClick={() => { if (playing) setPlaying(false); else { playIdx.current = 0; setPlaying(true); } }}
          style={{
            padding: '5px 14px', borderRadius: 3, fontSize: 11, cursor: 'pointer',
            background: playing ? 'var(--acc)' : 'transparent', border: '1px solid var(--acc)',
            color: playing ? 'var(--bg)' : 'var(--acc)', fontFamily: 'var(--mono)', fontWeight: 600,
          }}>
          {playing ? '⏸' : '▶'}
        </button>
        <button onClick={() => { const i = Math.max(0, curIdx - 1); setSelId(graph.nodes[i]?.id); }}
          style={{ padding: '4px 10px', borderRadius: 3, fontSize: 10, cursor: 'pointer', background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text2)', fontFamily: 'var(--mono)' }}>←</button>
        <button onClick={() => { const i = Math.min(graph.nodes.length - 1, (curIdx < 0 ? -1 : curIdx) + 1); setSelId(graph.nodes[i]?.id); }}
          style={{ padding: '4px 10px', borderRadius: 3, fontSize: 10, cursor: 'pointer', background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text2)', fontFamily: 'var(--mono)' }}>→</button>

        <span style={{ fontSize: 10, color: 'var(--dim)' }}>
          {curIdx >= 0 ? curIdx + 1 : 1}/{graph.nodes.length}
        </span>

        {eH !== nHeads && (
          <span style={{ fontSize: 9, color: 'var(--acc2)', padding: '2px 8px', background: 'rgba(232,120,48,0.1)', borderRadius: 3 }}>
            Heads→{eH}
          </span>
        )}

        <span style={{ fontSize: 9, color: 'var(--dim)', marginLeft: 'auto' }}>
          d_h={dH} · d_ff={dFF} · {steps.length} ops · ← → Space
        </span>
      </div>

      {/* ═══ GRAPH ═══ */}
      <div style={{
        overflowX: 'auto', overflowY: 'auto',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg)',
        maxHeight: '58vh',
      }}>
        <svg ref={svgRef} width={graph.width} height={graph.height} style={{ display: 'block', minWidth: '100%' }}>
          {/* Grid */}
          <defs>
            <pattern id="gr" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M50 0L0 0 0 50" fill="none" stroke="rgba(180,150,80,0.025)" strokeWidth="0.5" />
            </pattern>
            <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
              <polygon points="0 0, 6 2, 0 4" fill="rgba(180,150,80,0.3)" />
            </marker>
          </defs>
          <rect width="100%" height="100%" fill="url(#gr)" />

          {/* Layer backgrounds */}
          {Array.from({ length: nLayers }).map((_, L) => {
            const ln = graph.nodes.filter(n => n.s.layer === L);
            if (!ln.length) return null;
            const x1 = Math.min(...ln.map(n => n.x)) - 12;
            const x2 = Math.max(...ln.map(n => n.x + 108)) + 12;
            const y1 = Math.min(...ln.map(n => n.y)) - 22;
            const y2 = Math.max(...ln.map(n => n.y + 76)) + 12;
            return (
              <g key={`lb${L}`}>
                <rect x={x1} y={y1} width={x2 - x1} height={y2 - y1}
                  fill="rgba(180,150,80,0.012)" stroke="rgba(180,150,80,0.06)"
                  strokeWidth={1} rx={10} strokeDasharray="5 5" />
                <text x={x1 + 10} y={y1 + 14} fontSize={11} fill="rgba(180,150,80,0.18)"
                  fontFamily="var(--mono)" fontWeight="600">Layer {L + 1}</text>
              </g>
            );
          })}

          {/* Head grouping labels */}
          {Array.from({ length: nLayers }).map((_, L) =>
            Array.from({ length: eH }).map((_, h) => {
              const headNodes = graph.nodes.filter(n => n.s.layer === L && n.s.head === h);
              if (!headNodes.length) return null;
              const x1 = Math.min(...headNodes.map(n => n.x)) - 6;
              const y1 = Math.min(...headNodes.map(n => n.y)) - 12;
              const x2 = Math.max(...headNodes.map(n => n.x + 108)) + 6;
              const y2 = Math.max(...headNodes.map(n => n.y + 76)) + 6;
              return (
                <g key={`hd${L}_${h}`}>
                  <rect x={x1} y={y1} width={x2 - x1} height={y2 - y1}
                    fill="none" stroke="rgba(90,159,208,0.08)" strokeWidth={0.8} rx={6}
                    strokeDasharray="3 3" />
                  <text x={x1 + 4} y={y1 + 9} fontSize={8} fill="rgba(90,159,208,0.2)"
                    fontFamily="var(--mono)">Head {h + 1}</text>
                </g>
              );
            })
          )}

          {/* Edges */}
          {graph.edges.map((e, i) => {
            const fn = nodeMap[e.from], tn = nodeMap[e.to];
            if (!fn || !tn) return null;
            const isHl = selId && (e.from === selId || e.to === selId);
            return (
              <Edge key={i}
                x1={fn.x + 108} y1={fn.y + 38}
                x2={tn.x} y2={tn.y + 38}
                color={e.color || 'rgba(180,150,80,0.2)'}
                hl={isHl}
                dashed={e.dashed || false}
                label={e.label || null}
              />
            );
          })}

          {/* Nodes */}
          {graph.nodes.map(n => (
            <GNode key={n.id} step={n.s} x={n.x} y={n.y}
              selected={selId === n.id}
              highlighted={graph.edges.some(e => (e.from === selId && e.to === n.id) || (e.to === selId && e.from === n.id))}
              onClick={() => setSelId(n.id)} />
          ))}
        </svg>
      </div>

      {/* ═══ INSPECTOR ═══ */}
      <Inspector step={selStep} />

      {/* ═══ FOOTER ═══ */}
      <footer style={{
        padding: '10px 24px', borderTop: '1px solid var(--border)',
        fontSize: 9, color: 'var(--dim2)', textAlign: 'center',
      }}>
        Real matrix multiplications · seq={seq} · d_model={dModel} · {eH} heads (d_h={dH}) · d_ff={dFF} · {nLayers} layers · {steps.length} ops
      </footer>
    </div>
  );
}
