import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { simulate, matStats } from './engine.js';

/* ─── Colors ─── */
function valColor(v, mx) {
  const t = Math.max(-1, Math.min(1, v / (mx || 1)));
  if (t >= 0) return `rgb(${Math.round(12+t*235)},${Math.round(10+t*110)},${Math.round(6+t*12)})`;
  const a = -t;
  return `rgb(${Math.round(6+a*15)},${Math.round(14+a*90)},${Math.round(12+a*235)})`;
}

const PHASE_COLOR = {
  input: '#888', qkv: '#5a9fd0', scores: '#d08a4a', softmax: '#d0c04a',
  context: '#7a6ad0', concat: '#8a8a8a', 'post-attn': '#5cb870',
  'ffn-up': '#d4a840', gelu: '#e87830', 'ffn-down': '#a070b0', output: '#d4a840',
};

/* ─── Mini Matrix for nodes ─── */
function MiniMatrix({ data, rows, cols, size = 48 }) {
  const mx = Math.max(0.01, ...data.map(Math.abs));
  const cW = size / cols, cH = size / rows;
  return (
    <svg width={size} height={size} style={{ display: 'block', borderRadius: 2 }}>
      {Array.from({ length: rows }).map((_, i) =>
        Array.from({ length: Math.min(cols, 24) }).map((_, j) => (
          <rect key={`${i}-${j}`} x={j * (size / Math.min(cols, 24))} y={i * cH}
            width={size / Math.min(cols, 24) - 0.3} height={cH - 0.3}
            fill={valColor(data[i * cols + j], mx)} />
        ))
      )}
    </svg>
  );
}

/* ─── Full Matrix Inspector ─── */
function MatrixInspector({ step }) {
  if (!step) return null;
  const { label, desc, data, rows, cols, phase } = step;
  const stats = matStats(data);
  const mx = Math.max(0.01, ...data.map(Math.abs));
  const maxCells = 800;
  const skipR = rows * cols > maxCells ? Math.ceil(rows / Math.floor(Math.sqrt(maxCells * rows / cols))) : 1;
  const skipC = rows * cols > maxCells ? Math.ceil(cols / Math.floor(Math.sqrt(maxCells * cols / rows))) : 1;
  const visRows = [], visData = [];
  for (let i = 0; i < rows; i += skipR) {
    visRows.push(i);
    const row = [];
    for (let j = 0; j < cols; j += skipC) row.push(data[i * cols + j]);
    visData.push(row);
  }
  const visCols = [];
  for (let j = 0; j < cols; j += skipC) visCols.push(j);
  const cellW = Math.min(Math.max(5, Math.floor(480 / visCols.length)), 28);
  const cellH = Math.min(Math.max(5, Math.floor(260 / visRows.length)), 28);
  const showNum = cellW >= 24 && cellH >= 18;
  const color = PHASE_COLOR[phase] || '#888';

  return (
    <div style={{ borderTop: '1px solid var(--border)', padding: '20px 28px', background: 'var(--surface)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
        <h2 style={{ fontFamily: 'var(--disp)', fontSize: 22, fontWeight: 800, color: 'var(--acc)' }}>
          {label}
        </h2>
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
        <svg width={visCols.length * cellW} height={visRows.length * cellH} style={{ display: 'block', borderRadius: 3 }}>
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
            Sampled {visRows.length}×{visCols.length} of {rows}×{cols}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 11 }}>
        {[
          ['min', stats.min, 'var(--acc3)'],
          ['max', stats.max, 'var(--acc2)'],
          ['mean', stats.mean, 'var(--green)'],
          ['std', stats.std, '#b07a60'],
        ].map(([k, v, c]) => (
          <span key={k}>
            <span style={{ color: 'var(--dim)', fontSize: 9 }}>{k} </span>
            <span style={{ color: c, fontWeight: 600 }}>{v.toFixed(4)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─── GRAPH NODE ─── */
function GraphNode({ step, x, y, selected, onClick, highlighted }) {
  const { label, rows, cols, data, phase } = step;
  const color = PHASE_COLOR[phase] || '#888';
  const w = 110, h = 80;
  const isSelected = selected;

  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }}>
      {/* Glow */}
      {isSelected && (
        <rect x={x - 3} y={y - 3} width={w + 6} height={h + 6} rx={8}
          fill="none" stroke={color} strokeWidth={2} opacity={0.5} />
      )}
      {/* Box */}
      <rect x={x} y={y} width={w} height={h} rx={6}
        fill={isSelected ? 'rgba(30,25,15,0.95)' : 'rgba(18,14,8,0.9)'}
        stroke={highlighted ? color : 'var(--border)'}
        strokeWidth={isSelected ? 2 : 1} />
      {/* Phase color bar */}
      <rect x={x} y={y} width={w} height={3} rx={1} fill={color} opacity={0.7} />
      {/* Label */}
      <text x={x + w / 2} y={y + 16} textAnchor="middle"
        fontSize={9} fill={color} fontFamily="var(--mono)" fontWeight="600">
        {label}
      </text>
      {/* Dimensions */}
      <text x={x + w / 2} y={y + 30} textAnchor="middle"
        fontSize={13} fill="var(--acc)" fontFamily="var(--disp)" fontWeight="700">
        {rows}×{cols}
      </text>
      {/* Value count */}
      <text x={x + w / 2} y={y + 42} textAnchor="middle"
        fontSize={8} fill="var(--dim)" fontFamily="var(--mono)">
        {(rows * cols).toLocaleString()} vals
      </text>
      {/* Mini matrix */}
      <foreignObject x={x + (w - 48) / 2} y={y + 48} width={48} height={26}>
        <MiniMatrix data={data} rows={rows} cols={cols} size={48} />
      </foreignObject>
    </g>
  );
}

/* ─── Connection Line with arrow ─── */
function Connector({ x1, y1, x2, y2, color = 'rgba(180,150,80,0.25)', highlighted = false }) {
  const c = highlighted ? color.replace('0.25', '0.7') : color;
  const sw = highlighted ? 2 : 1;
  // Calculate path — use curves for non-straight lines
  const dx = x2 - x1, dy = y2 - y1;
  const mx = x1 + dx * 0.5, my = y1 + dy * 0.5;

  if (Math.abs(dx) < 5) {
    // Vertical line
    return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={c} strokeWidth={sw} />;
  }

  // Curved path
  const cx1 = x1 + dx * 0.3, cy1 = y1;
  const cx2 = x2 - dx * 0.3, cy2 = y2;
  return (
    <path d={`M${x1},${y1} C${cx1},${cy1} ${cx2},${cy2} ${x2},${y2}`}
      fill="none" stroke={c} strokeWidth={sw} />
  );
}

/* ─── Build graph layout from steps ─── */
function buildGraph(steps, nHeads, nLayers) {
  const nodeW = 110, nodeH = 80;
  const gapX = 24, gapY = 18;
  const headGap = 10;

  // We group steps into layers, and within each layer into heads
  const nodes = [];
  const edges = [];

  // Column positions for the pipeline within one layer:
  // Q,K,V (stacked per head) → Scores → Softmax → Attn·V → Concat → Post-MHA → FFN↑ → GELU → FFN↓
  const colW = nodeW + gapX;
  const headH = nodeH * 3 + headGap * 2; // Q,K,V stacked

  // Input node
  const inputX = 20;
  const totalHeadHeight = nHeads * (headH + gapY);
  const inputY = totalHeadHeight / 2 - nodeH / 2 + 40;

  let stepIdx = 0;
  const inputStep = steps[stepIdx++];
  const inputNode = { step: inputStep, x: inputX, y: inputY, id: inputStep.id };
  nodes.push(inputNode);

  let prevLayerOutputId = inputStep.id;
  let currentX = inputX + colW;

  for (let L = 0; L < nLayers; L++) {
    const layerStartX = currentX;
    const layerLabel = `Layer ${L + 1}`;

    // QKV columns - per head
    const qkvNodes = []; // [head][0=Q,1=K,2=V]

    for (let h = 0; h < nHeads; h++) {
      const headY = 40 + h * (headH + gapY);
      const headNodes = [];

      for (let qkv = 0; qkv < 3; qkv++) {
        const s = steps[stepIdx++];
        const ny = headY + qkv * (nodeH + headGap);
        const node = { step: s, x: layerStartX, y: ny, id: s.id };
        nodes.push(node);
        headNodes.push(node);
        // Edge from prev layer output or input
        edges.push({ from: prevLayerOutputId, to: s.id, color: PHASE_COLOR.qkv });
      }
      qkvNodes.push(headNodes);
    }

    // Scores, Softmax, Attn·V — per head
    const scoresX = layerStartX + colW;
    const softmaxX = scoresX + colW;
    const attnVX = softmaxX + colW;

    const attnVNodes = [];

    for (let h = 0; h < nHeads; h++) {
      const headCenterY = 40 + h * (headH + gapY) + headH / 2 - nodeH / 2;

      // Scores
      const scoresStep = steps[stepIdx++];
      const scoresNode = { step: scoresStep, x: scoresX, y: headCenterY, id: scoresStep.id };
      nodes.push(scoresNode);
      // Q→Scores, K→Scores
      edges.push({ from: qkvNodes[h][0].id, to: scoresStep.id, color: PHASE_COLOR.scores });
      edges.push({ from: qkvNodes[h][1].id, to: scoresStep.id, color: PHASE_COLOR.scores });

      // Softmax
      const softmaxStep = steps[stepIdx++];
      const softmaxNode = { step: softmaxStep, x: softmaxX, y: headCenterY, id: softmaxStep.id };
      nodes.push(softmaxNode);
      edges.push({ from: scoresStep.id, to: softmaxStep.id, color: PHASE_COLOR.softmax });

      // Attn·V
      const attnVStep = steps[stepIdx++];
      const attnVNode = { step: attnVStep, x: attnVX, y: headCenterY, id: attnVStep.id };
      nodes.push(attnVNode);
      edges.push({ from: softmaxStep.id, to: attnVStep.id, color: PHASE_COLOR.context });
      edges.push({ from: qkvNodes[h][2].id, to: attnVStep.id, color: PHASE_COLOR.context });

      attnVNodes.push(attnVNode);
    }

    // Concat
    const concatX = attnVX + colW;
    const concatStep = steps[stepIdx++];
    const concatY = totalHeadHeight / 2 - nodeH / 2 + 40;
    const concatNode = { step: concatStep, x: concatX, y: concatY, id: concatStep.id };
    nodes.push(concatNode);
    attnVNodes.forEach(n => edges.push({ from: n.id, to: concatStep.id, color: '#8a8a8a' }));

    // Post-MHA
    const postMHAX = concatX + colW;
    const postMHAStep = steps[stepIdx++];
    const postMHANode = { step: postMHAStep, x: postMHAX, y: concatY, id: postMHAStep.id };
    nodes.push(postMHANode);
    edges.push({ from: concatStep.id, to: postMHAStep.id, color: PHASE_COLOR['post-attn'] });
    // Residual from input
    edges.push({ from: prevLayerOutputId, to: postMHAStep.id, color: 'rgba(92,184,112,0.35)' });

    // FFN Up
    const ffnUpX = postMHAX + colW;
    const ffnUpStep = steps[stepIdx++];
    const ffnUpNode = { step: ffnUpStep, x: ffnUpX, y: concatY, id: ffnUpStep.id };
    nodes.push(ffnUpNode);
    edges.push({ from: postMHAStep.id, to: ffnUpStep.id, color: PHASE_COLOR['ffn-up'] });

    // GELU
    const geluX = ffnUpX + colW;
    const geluStep = steps[stepIdx++];
    const geluNode = { step: geluStep, x: geluX, y: concatY, id: geluStep.id };
    nodes.push(geluNode);
    edges.push({ from: ffnUpStep.id, to: geluStep.id, color: PHASE_COLOR.gelu });

    // FFN Down
    const ffnDownX = geluX + colW;
    const ffnDownStep = steps[stepIdx++];
    const ffnDownNode = { step: ffnDownStep, x: ffnDownX, y: concatY, id: ffnDownStep.id };
    nodes.push(ffnDownNode);
    edges.push({ from: geluStep.id, to: ffnDownStep.id, color: PHASE_COLOR['ffn-down'] });

    prevLayerOutputId = ffnDownStep.id;
    currentX = ffnDownX + colW + 30; // gap between layers
  }

  // Output node
  if (stepIdx < steps.length) {
    const outputStep = steps[stepIdx];
    const outputY = totalHeadHeight / 2 - nodeH / 2 + 40;
    const outputNode = { step: outputStep, x: currentX, y: outputY, id: outputStep.id };
    nodes.push(outputNode);
    edges.push({ from: prevLayerOutputId, to: outputStep.id, color: PHASE_COLOR.output });
  }

  // Calculate total bounds
  const maxX = Math.max(...nodes.map(n => n.x + nodeW));
  const maxY = Math.max(...nodes.map(n => n.y + nodeH));

  return { nodes, edges, width: maxX + 40, height: maxY + 40 };
}

/* ─── Config Slider ─── */
function Slider({ label, value, onChange, min, max, step = 1 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <label style={{ fontSize: 9, color: 'var(--dim)', letterSpacing: '0.06em', minWidth: 50 }}>{label}</label>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseInt(e.target.value))} style={{ width: 80 }} />
      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--acc)', minWidth: 24 }}>{value}</span>
    </div>
  );
}

/* ═══════════════ MAIN APP ═══════════════ */
export default function App() {
  const [seq, setSeq] = useState(6);
  const [dModel, setDModel] = useState(8);
  const [nHeads, setNHeads] = useState(2);
  const [ffMult, setFFMult] = useState(4);
  const [nLayers, setNLayers] = useState(2);
  const [seed, setSeed] = useState(42);
  const [selectedId, setSelectedId] = useState(null);
  const [playStep, setPlayStep] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const playRef = useRef(null);
  const svgRef = useRef(null);

  const effectiveHeads = useMemo(() => {
    let h = nHeads;
    while (h > 1 && dModel % h !== 0) h--;
    return h;
  }, [nHeads, dModel]);

  const steps = useMemo(() => {
    try { return simulate({ seq, dModel, nHeads: effectiveHeads, ffMult, nLayers, seed }); }
    catch (e) { console.error(e); return []; }
  }, [seq, dModel, effectiveHeads, ffMult, nLayers, seed]);

  const graph = useMemo(() => {
    if (steps.length === 0) return { nodes: [], edges: [], width: 100, height: 100 };
    return buildGraph(steps, effectiveHeads, nLayers);
  }, [steps, effectiveHeads, nLayers]);

  const selectedStep = useMemo(() => {
    if (!selectedId) return steps[0] || null;
    const node = graph.nodes.find(n => n.id === selectedId);
    return node ? node.step : steps[0];
  }, [selectedId, graph, steps]);

  // Playback
  useEffect(() => {
    if (!playing) { clearInterval(playRef.current); return; }
    let idx = playStep < 0 ? 0 : playStep;
    playRef.current = setInterval(() => {
      if (idx >= graph.nodes.length) { setPlaying(false); return; }
      setSelectedId(graph.nodes[idx].id);
      setPlayStep(idx);
      idx++;
    }, 400);
    return () => clearInterval(playRef.current);
  }, [playing, graph.nodes]);

  useEffect(() => {
    setSelectedId(null);
    setPlayStep(-1);
    setPlaying(false);
  }, [seq, dModel, effectiveHeads, ffMult, nLayers, seed]);

  // Scroll selected node into view
  useEffect(() => {
    if (selectedId && svgRef.current) {
      const node = graph.nodes.find(n => n.id === selectedId);
      if (node) {
        const container = svgRef.current.parentElement;
        const scrollX = node.x - container.clientWidth / 2 + 55;
        container.scrollTo({ left: Math.max(0, scrollX), behavior: 'smooth' });
      }
    }
  }, [selectedId, graph.nodes]);

  // Build node lookup for edges
  const nodeMap = useMemo(() => {
    const m = {};
    graph.nodes.forEach(n => { m[n.id] = n; });
    return m;
  }, [graph.nodes]);

  const dH = Math.floor(dModel / effectiveHeads);
  const dFF = dModel * ffMult;

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* ═══ HEADER ═══ */}
      <header style={{
        padding: '18px 28px 14px',
        borderBottom: '1px solid var(--border)',
        background: 'linear-gradient(180deg, rgba(20,16,8,1), var(--bg))',
      }}>
        <h1 style={{ fontFamily: 'var(--disp)', fontSize: 28, fontWeight: 800, color: 'var(--acc)', lineHeight: 1 }}>
          Matrix Flow Graph
        </h1>
        <p style={{ fontSize: 11, color: 'var(--text2)', marginTop: 6, lineHeight: 1.6, maxWidth: 700 }}>
          Q, K, V branch <span style={{ color: PHASE_COLOR.qkv, fontWeight: 600 }}>in parallel</span> from
          X — Q and K converge in the dot-product, then attention weights multiply V. Click any node to inspect its matrix.
        </p>
      </header>

      {/* ═══ CONTROLS ═══ */}
      <div style={{
        padding: '10px 28px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
        display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'center',
      }}>
        <Slider label="Seq" value={seq} onChange={setSeq} min={2} max={12} />
        <Slider label="d_model" value={dModel} onChange={setDModel} min={4} max={48} step={4} />
        <Slider label="Heads" value={nHeads} onChange={setNHeads} min={1} max={12} />
        <Slider label="FFx" value={ffMult} onChange={setFFMult} min={2} max={4} />
        <Slider label="Layers" value={nLayers} onChange={setNLayers} min={1} max={12} />

        {/* Play button */}
        <button onClick={() => { if (playing) setPlaying(false); else { setPlayStep(-1); setPlaying(true); } }}
          style={{
            padding: '6px 16px', borderRadius: 3, fontSize: 11, cursor: 'pointer',
            background: playing ? 'var(--acc)' : 'transparent',
            border: '1px solid var(--acc)',
            color: playing ? 'var(--bg)' : 'var(--acc)',
            fontFamily: 'var(--mono)', fontWeight: 600,
          }}>
          {playing ? '⏸' : '▶'}
        </button>

        {/* Prev / Next */}
        <button onClick={() => {
          const idx = graph.nodes.findIndex(n => n.id === selectedId);
          const prev = Math.max(0, (idx < 0 ? 0 : idx) - 1);
          setSelectedId(graph.nodes[prev]?.id);
        }} style={{
          padding: '5px 10px', borderRadius: 3, fontSize: 10, cursor: 'pointer',
          background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text2)',
          fontFamily: 'var(--mono)',
        }}>←</button>
        <button onClick={() => {
          const idx = graph.nodes.findIndex(n => n.id === selectedId);
          const next = Math.min(graph.nodes.length - 1, (idx < 0 ? -1 : idx) + 1);
          setSelectedId(graph.nodes[next]?.id);
        }} style={{
          padding: '5px 10px', borderRadius: 3, fontSize: 10, cursor: 'pointer',
          background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text2)',
          fontFamily: 'var(--mono)',
        }}>→</button>

        <span style={{ fontSize: 10, color: 'var(--dim)' }}>
          {graph.nodes.length > 0 ? `${(graph.nodes.findIndex(n => n.id === selectedId) + 1) || 1}/${graph.nodes.length}` : ''}
        </span>

        {effectiveHeads !== nHeads && (
          <span style={{ fontSize: 9, color: 'var(--acc2)', padding: '3px 8px', background: 'rgba(232,120,48,0.1)', borderRadius: 3 }}>
            Heads → {effectiveHeads} (divides {dModel})
          </span>
        )}

        <span style={{ fontSize: 9, color: 'var(--dim)', marginLeft: 'auto' }}>
          d_head={dH} · d_ff={dFF} · {steps.length} ops
        </span>
      </div>

      {/* ═══ GRAPH ═══ */}
      <div style={{
        overflowX: 'auto', overflowY: 'auto',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg)',
        maxHeight: '55vh',
        position: 'relative',
      }}>
        <svg ref={svgRef} width={graph.width} height={graph.height}
          style={{ display: 'block', minWidth: '100%' }}>
          {/* Background grid */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(180,150,80,0.03)" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Layer background labels */}
          {Array.from({ length: nLayers }).map((_, L) => {
            const layerNodes = graph.nodes.filter(n => n.step.layer === L);
            if (layerNodes.length === 0) return null;
            const minX = Math.min(...layerNodes.map(n => n.x)) - 10;
            const maxX = Math.max(...layerNodes.map(n => n.x + 110)) + 10;
            const minY = Math.min(...layerNodes.map(n => n.y)) - 24;
            const maxY = Math.max(...layerNodes.map(n => n.y + 80)) + 10;
            return (
              <g key={`layer-bg-${L}`}>
                <rect x={minX} y={minY} width={maxX - minX} height={maxY - minY}
                  fill="rgba(180,150,80,0.015)" stroke="rgba(180,150,80,0.06)"
                  strokeWidth={1} rx={8} strokeDasharray="4 4" />
                <text x={minX + 8} y={minY + 14} fontSize={10} fill="rgba(180,150,80,0.2)"
                  fontFamily="var(--mono)" fontWeight="600">
                  Layer {L + 1}
                </text>
              </g>
            );
          })}

          {/* Edges */}
          {graph.edges.map((e, i) => {
            const from = nodeMap[e.from];
            const to = nodeMap[e.to];
            if (!from || !to) return null;
            const x1 = from.x + 110;
            const y1 = from.y + 40;
            const x2 = to.x;
            const y2 = to.y + 40;
            const isHighlighted = selectedId && (e.from === selectedId || e.to === selectedId);
            return (
              <Connector key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                color={e.color || 'rgba(180,150,80,0.25)'}
                highlighted={isHighlighted} />
            );
          })}

          {/* Nodes */}
          {graph.nodes.map((n) => (
            <GraphNode key={n.id} step={n.step} x={n.x} y={n.y}
              selected={selectedId === n.id}
              highlighted={graph.edges.some(e => (e.from === selectedId && e.to === n.id) || (e.to === selectedId && e.from === n.id))}
              onClick={() => setSelectedId(n.id)} />
          ))}
        </svg>
      </div>

      {/* ═══ MATRIX INSPECTOR ═══ */}
      <MatrixInspector step={selectedStep} />

      {/* ═══ FOOTER ═══ */}
      <footer style={{
        padding: '10px 28px', borderTop: '1px solid var(--border)',
        fontSize: 9, color: 'var(--dim2)', textAlign: 'center',
      }}>
        Real matrix multiplications · seq={seq} · d_model={dModel} · {effectiveHeads} heads (d_head={dH}) · d_ff={dFF} · {nLayers} layers · {steps.length} ops
      </footer>
    </div>
  );
}
