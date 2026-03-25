import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { simulate, matStats } from './engine.js';
import MatrixVis from './MatrixVis.jsx';
import { DimDiagramClean } from './DimDiagram.jsx';
import SizeChart, { phaseColors, phaseIcons } from './SizeChart.jsx';
import StatsBar from './StatsBar.jsx';

function ConfigSlider({ label, value, onChange, min, max, step = 1 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <label style={{ fontSize: 9, color: 'var(--dim)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {label}
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(parseInt(e.target.value))}
          style={{ width: 90 }} />
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--acc)', minWidth: 28 }}>
          {value}
        </span>
      </div>
    </div>
  );
}

export default function App() {
  const [seq, setSeq] = useState(6);
  const [dModel, setDModel] = useState(12);
  const [nHeads, setNHeads] = useState(3);
  const [ffMult, setFFMult] = useState(4);
  const [nLayers, setNLayers] = useState(2);
  const [seed, setSeed] = useState(42);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(500);
  const playRef = useRef(null);
  const timelineRef = useRef(null);

  // Ensure nHeads divides dModel
  const effectiveHeads = useMemo(() => {
    let h = nHeads;
    while (h > 1 && dModel % h !== 0) h--;
    return h;
  }, [nHeads, dModel]);

  const steps = useMemo(() => {
    try {
      return simulate({ seq, dModel, nHeads: effectiveHeads, ffMult, nLayers, seed });
    } catch (e) {
      console.error(e);
      return [];
    }
  }, [seq, dModel, effectiveHeads, ffMult, nLayers, seed]);

  const cur = steps[step] || steps[0];
  const prev = step > 0 ? steps[step - 1] : null;
  const stats = useMemo(() => cur ? matStats(cur.data) : null, [cur]);
  const prevStats = useMemo(() => prev ? matStats(prev.data) : null, [prev]);

  // Reset step on config change
  useEffect(() => { setStep(0); setPlaying(false); }, [seq, dModel, effectiveHeads, ffMult, nLayers, seed]);

  // Playback
  useEffect(() => {
    if (!playing) { clearInterval(playRef.current); return; }
    playRef.current = setInterval(() => {
      setStep(s => {
        if (s >= steps.length - 1) { setPlaying(false); return steps.length - 1; }
        return s + 1;
      });
    }, speed);
    return () => clearInterval(playRef.current);
  }, [playing, speed, steps.length]);

  // Scroll timeline
  useEffect(() => {
    if (timelineRef.current) {
      const el = timelineRef.current.children[step];
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [step]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'ArrowRight') setStep(s => Math.min(steps.length - 1, s + 1));
    if (e.key === 'ArrowLeft') setStep(s => Math.max(0, s - 1));
    if (e.key === ' ') { e.preventDefault(); setPlaying(p => !p); }
  }, [steps.length]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!cur || steps.length === 0) return <div style={{ padding: 40, color: 'var(--text)' }}>Loading…</div>;

  const dH = Math.floor(dModel / effectiveHeads);
  const dFF = dModel * ffMult;
  const phaseColor = phaseColors[cur.phase] || '#888';
  const phaseIcon = phaseIcons[cur.phase] || '·';
  const totalCells = cur.rows * cur.cols;
  const prevCells = prev ? prev.rows * prev.cols : totalCells;

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* ═══ HEADER ═══ */}
      <header style={{
        padding: '24px 28px 18px',
        borderBottom: '1px solid var(--border)',
        background: 'linear-gradient(180deg, rgba(20,16,8,1) 0%, var(--bg) 100%)',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap' }}>
          <h1 style={{
            fontFamily: 'var(--disp)', fontSize: 32, fontWeight: 800,
            color: 'var(--acc)', letterSpacing: '-0.02em', lineHeight: 1,
          }}>
            Matrix Flow
          </h1>
          <span style={{
            fontSize: 10, color: 'var(--dim)', letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}>
            Transformer Dimensions Visualizer
          </span>
        </div>
        <p style={{ fontSize: 11, color: 'var(--text2)', marginTop: 8, maxWidth: 720, lineHeight: 1.6 }}>
          Real matrix multiplications through a full transformer pipeline.
          Watch dimensions expand & contract: Input → Q,K,V projections → Attention scores → FFN expansion → Output.
          Up to 12 layers × 12 heads.
        </p>
      </header>

      {/* ═══ CONFIG ═══ */}
      <div style={{
        padding: '14px 28px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
        display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'end',
      }}>
        <ConfigSlider label="Seq length" value={seq} onChange={setSeq} min={2} max={12} />
        <ConfigSlider label="d_model" value={dModel} onChange={setDModel} min={4} max={48} step={4} />
        <ConfigSlider label="Heads" value={nHeads} onChange={setNHeads} min={1} max={12} />
        <ConfigSlider label="FF mult" value={ffMult} onChange={setFFMult} min={2} max={4} />
        <ConfigSlider label="Layers" value={nLayers} onChange={setNLayers} min={1} max={12} />
        <ConfigSlider label="Seed" value={seed} onChange={setSeed} min={1} max={999} />

        <button onClick={() => setSeed(Math.floor(Math.random() * 999) + 1)}
          style={{
            padding: '7px 16px', borderRadius: 3, fontSize: 11, cursor: 'pointer',
            background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text2)',
            fontFamily: 'var(--mono)', transition: 'all 0.2s',
          }}>
          🎲 Random
        </button>

        {effectiveHeads !== nHeads && (
          <div style={{ fontSize: 9, color: 'var(--acc2)', padding: '4px 8px', background: 'rgba(232,120,48,0.1)', borderRadius: 3 }}>
            Heads adjusted to {effectiveHeads} (must divide d_model={dModel})
          </div>
        )}

        <div style={{
          fontSize: 9, color: 'var(--dim)', padding: '6px 10px',
          background: 'rgba(180,150,80,0.04)', borderRadius: 3,
          border: '1px solid var(--border)',
          lineHeight: 1.6,
        }}>
          d_head = {dH} · d_ff = {dFF} · {steps.length} operations total
        </div>
      </div>

      {/* ═══ PLAYBACK ═══ */}
      <div style={{
        padding: '10px 28px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
      }}>
        <button onClick={() => { if (playing) { setPlaying(false); } else { if (step >= steps.length - 1) setStep(0); setPlaying(true); } }}
          style={{
            padding: '7px 18px', borderRadius: 3, fontSize: 11, cursor: 'pointer',
            background: playing ? 'var(--acc)' : 'transparent',
            border: '1px solid var(--acc)',
            color: playing ? 'var(--bg)' : 'var(--acc)',
            fontFamily: 'var(--mono)', fontWeight: 600, transition: 'all 0.2s',
          }}>
          {playing ? '⏸ PAUSE' : '▶ PLAY'}
        </button>
        <button onClick={() => setStep(s => Math.max(0, s - 1))}
          style={{
            padding: '7px 14px', borderRadius: 3, fontSize: 10, cursor: 'pointer',
            background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text2)',
            fontFamily: 'var(--mono)',
          }}>← PREV</button>
        <button onClick={() => setStep(s => Math.min(steps.length - 1, s + 1))}
          style={{
            padding: '7px 14px', borderRadius: 3, fontSize: 10, cursor: 'pointer',
            background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text2)',
            fontFamily: 'var(--mono)',
          }}>NEXT →</button>
        <span style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 500 }}>
          Step {step + 1} / {steps.length}
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 9, color: 'var(--dim)' }}>Speed</span>
          <input type="range" min={100} max={1500} step={50} value={speed}
            onChange={e => setSpeed(parseInt(e.target.value))} style={{ width: 90 }} />
          <span style={{ fontSize: 9, color: 'var(--text2)' }}>{speed}ms</span>
        </div>
        <span style={{ fontSize: 9, color: 'var(--dim)' }}>← → Space</span>
      </div>

      {/* ═══ PROGRESS BAR ═══ */}
      <div style={{ padding: '8px 28px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ position: 'relative', height: 6, background: 'var(--surface2)', borderRadius: 3 }}>
          <div style={{
            position: 'absolute', left: 0, top: 0, height: '100%', borderRadius: 3,
            width: `${((step + 1) / steps.length) * 100}%`,
            background: `linear-gradient(90deg, var(--acc3), var(--acc), var(--acc2))`,
            transition: 'width 0.25s ease',
          }} />
          {/* Layer markers */}
          {steps.filter(s => s.phase === 'post-attn' || s.phase === 'ffn-down').map((s, i) => {
            const idx = steps.indexOf(s);
            return (
              <div key={idx} style={{
                position: 'absolute', top: -3, height: 12, width: 2, borderRadius: 1,
                left: `${((idx + 0.5) / steps.length) * 100}%`,
                background: s.phase === 'ffn-down' ? 'var(--acc2)' : 'var(--green)',
                opacity: 0.5,
              }} />
            );
          })}
        </div>
      </div>

      {/* ═══ TIMELINE ═══ */}
      <div style={{
        padding: '6px 28px', borderBottom: '1px solid var(--border)',
        overflowX: 'auto', background: 'var(--surface)',
      }}>
        <div ref={timelineRef} style={{ display: 'flex', gap: 3, minWidth: 'max-content', padding: '2px 0' }}>
          {steps.map((s, i) => {
            const color = phaseColors[s.phase] || '#888';
            const active = i === step;
            return (
              <div key={i} onClick={() => setStep(i)}
                style={{
                  padding: '5px 8px', borderRadius: 3, cursor: 'pointer',
                  background: active ? color : 'rgba(180,150,80,0.03)',
                  border: active ? `1.5px solid ${color}` : '1.5px solid transparent',
                  transition: 'all 0.15s', minWidth: 48, textAlign: 'center',
                  opacity: active ? 1 : 0.7,
                }}>
                <div style={{
                  fontSize: 8, fontWeight: active ? 700 : 400,
                  color: active ? (s.phase === 'input' || s.phase === 'output' ? '#fff' : '#0c0a07') : color,
                  whiteSpace: 'nowrap',
                }}>
                  {s.label}
                </div>
                <div style={{
                  fontSize: 9, fontWeight: 600, marginTop: 1,
                  color: active ? (s.phase === 'input' || s.phase === 'output' ? '#ddd' : '#0c0a07') : 'var(--dim)',
                }}>
                  {s.rows}×{s.cols}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══ MAIN CONTENT ═══ */}
      <div style={{ display: 'flex', minHeight: 500 }}>
        {/* ── Left: Matrix visualization ── */}
        <div style={{ flex: '1 1 600px', padding: '20px 28px', minWidth: 0 }}>
          <div key={step} style={{ animation: 'fadeIn 0.2s ease' }}>
            {/* Step header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <span style={{ fontSize: 28, color: phaseColor, lineHeight: 1 }}>{phaseIcon}</span>
              <div>
                <h2 style={{
                  fontFamily: 'var(--disp)', fontSize: 24, fontWeight: 800,
                  color: 'var(--acc)', lineHeight: 1.1,
                }}>
                  {cur.label}
                </h2>
                <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 3 }}>
                  {cur.desc}
                </div>
              </div>
            </div>

            {/* Dimension diagram */}
            <DimDiagramClean dimChange={cur.dimChange} />

            {/* Size badge */}
            <div style={{
              display: 'inline-flex', gap: 10, alignItems: 'center',
              padding: '8px 16px', borderRadius: 4, marginBottom: 14,
              background: 'rgba(180,150,80,0.05)', border: '1px solid var(--border)',
            }}>
              <span style={{
                fontSize: 26, fontFamily: 'var(--disp)', fontWeight: 800, color: 'var(--acc)',
              }}>
                {cur.rows} × {cur.cols}
              </span>
              <span style={{ fontSize: 10, color: 'var(--dim)' }}>
                = {totalCells.toLocaleString()} values
              </span>
              {prev && totalCells !== prevCells && (
                <span style={{
                  fontSize: 10, padding: '3px 8px', borderRadius: 3,
                  background: totalCells > prevCells ? 'rgba(92,184,112,0.1)' : 'rgba(208,96,80,0.1)',
                  color: totalCells > prevCells ? 'var(--green)' : 'var(--red)',
                  border: `1px solid ${totalCells > prevCells ? 'rgba(92,184,112,0.25)' : 'rgba(208,96,80,0.25)'}`,
                  fontWeight: 600,
                }}>
                  {totalCells > prevCells ? '↑' : '↓'}{' '}
                  {(totalCells / prevCells).toFixed(2)}×
                  {' '}({totalCells > prevCells ? '+' : ''}{totalCells - prevCells})
                </span>
              )}
            </div>

            {/* The matrix */}
            <div style={{ marginBottom: 14 }}>
              <MatrixVis data={cur.data} rows={cur.rows} cols={cur.cols} />
            </div>

            {/* Stats */}
            <StatsBar stats={stats} prevStats={prevStats} />

            {/* Explanatory note */}
            <div style={{
              marginTop: 16, padding: '10px 14px', borderRadius: 4,
              background: 'var(--surface)', border: '1px solid var(--border)',
              fontSize: 10, color: 'var(--text2)', lineHeight: 1.7,
            }}>
              {cur.phase === 'input' && (
                <>The starting matrix. Each row is one token's embedding ({dModel} dimensions). This gets multiplied by weight matrices to produce Q, K, V for each attention head.</>
              )}
              {cur.phase === 'qkv' && (
                <>Projection from {dModel}-dim space down to {dH}-dim per head.
                  The matrix shrinks from {dModel} to {dH} columns — each head works in a smaller subspace.
                  With {effectiveHeads} heads × {dH} dims = {dModel} total, covering the full space.</>
              )}
              {cur.phase === 'scores' && (
                <>Q·Kᵀ gives us an n×n matrix where each cell [i,j] = how much token i should attend to token j.
                  Divided by √{dH} = {Math.sqrt(dH).toFixed(2)} to prevent gradients from vanishing in softmax.</>
              )}
              {cur.phase === 'softmax' && (
                <>Softmax normalizes each row to sum to 1.0 — now it's a probability distribution.
                  Every row shows where that token "looks". Values range [0, 1].</>
              )}
              {cur.phase === 'context' && (
                <>Attention weights × V: weighted combination of value vectors.
                  Back to n×{dH} — each token now contains information from the tokens it attended to.</>
              )}
              {cur.phase === 'concat' && (
                <>All {effectiveHeads} head outputs concatenated side-by-side.
                  {effectiveHeads} × {dH} = {effectiveHeads * dH} columns.
                  Each head captured different relationship patterns.</>
              )}
              {cur.phase === 'post-attn' && (
                <>Output projection maps concatenated heads back to d_model={dModel}.
                  Residual connection (add original input) + LayerNorm (mean=0, std=1 per row).
                  The skip connection prevents information loss through deep networks.</>
              )}
              {cur.phase === 'ffn-up' && (
                <>Feed-forward up-projection: {dModel} → {dFF} ({ffMult}× expansion).
                  The matrix gets WIDER — this is where the transformer stores learned "knowledge" patterns.
                  {totalCells.toLocaleString()} values, up from {prevCells.toLocaleString()}.</>
              )}
              {cur.phase === 'gelu' && (
                <>GELU activation: smooth nonlinearity that zeros out negative values (mostly).
                  Same dimensions, but the value distribution changes dramatically.
                  Negative values get heavily suppressed, creating sparsity.</>
              )}
              {cur.phase === 'ffn-down' && (
                <>Down-projection compresses back: {dFF} → {dModel}.
                  + Residual + LayerNorm. The matrix returns to its original width.
                  This is the output of one full transformer layer — ready for the next.</>
              )}
              {cur.phase === 'output' && (
                <>Final output after {nLayers} layers. Same shape as input ({seq}×{dModel}),
                  but the values have been transformed through {steps.length - 2} matrix operations.
                  Each token now encodes contextual information from the entire sequence.</>
              )}
            </div>
          </div>
        </div>

        {/* ── Right: Size chart ── */}
        <div style={{
          flex: '0 0 340px', padding: '20px 16px',
          borderLeft: '1px solid var(--border)',
          background: 'var(--surface)',
        }}>
          <SizeChart steps={steps} currentStep={step} onSelect={setStep} />
        </div>
      </div>

      {/* ═══ FOOTER ═══ */}
      <footer style={{
        padding: '14px 28px',
        borderTop: '1px solid var(--border)',
        fontSize: 10, color: 'var(--dim2)', textAlign: 'center',
      }}>
        Matrix Flow — Real matrix multiplications · seq={seq} · d_model={dModel} · {effectiveHeads} heads (d_head={dH}) · d_ff={dFF} · {nLayers} layers · {steps.length} steps
      </footer>
    </div>
  );
}
