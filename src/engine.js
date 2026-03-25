/* ─── Seeded PRNG (mulberry32) ─── */
export function rng(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ─── Matrix Multiply: A[rA×cA] · B[cA×cB] → C[rA×cB] ─── */
export function matMul(A, B, rA, cA, cB) {
  const C = new Float64Array(rA * cB);
  for (let i = 0; i < rA; i++)
    for (let k = 0; k < cA; k++) {
      const a = A[i * cA + k];
      for (let j = 0; j < cB; j++)
        C[i * cB + j] += a * B[k * cB + j];
    }
  return Array.from(C);
}

export function transpose(flat, r, c) {
  const out = new Array(r * c);
  for (let i = 0; i < r; i++)
    for (let j = 0; j < c; j++)
      out[j * r + i] = flat[i * c + j];
  return out;
}

export function addMat(A, B) {
  return A.map((v, i) => v + (B[i] || 0));
}

export function scaleMat(A, s) {
  return A.map(v => v * s);
}

export function softmaxRows(flat, rows, cols) {
  const out = [...flat];
  for (let i = 0; i < rows; i++) {
    let mx = -Infinity;
    for (let j = 0; j < cols; j++) mx = Math.max(mx, out[i * cols + j]);
    let sm = 0;
    for (let j = 0; j < cols; j++) {
      out[i * cols + j] = Math.exp(out[i * cols + j] - mx);
      sm += out[i * cols + j];
    }
    for (let j = 0; j < cols; j++) out[i * cols + j] /= sm;
  }
  return out;
}

export function layerNorm(flat, rows, cols) {
  const out = [...flat];
  for (let i = 0; i < rows; i++) {
    let m = 0;
    for (let j = 0; j < cols; j++) m += out[i * cols + j];
    m /= cols;
    let v = 0;
    for (let j = 0; j < cols; j++) v += (out[i * cols + j] - m) ** 2;
    v = Math.sqrt(v / cols + 1e-5);
    for (let j = 0; j < cols; j++) out[i * cols + j] = (out[i * cols + j] - m) / v;
  }
  return out;
}

export function gelu(x) {
  return 0.5 * x * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (x + 0.044715 * x ** 3)));
}

export function geluVec(arr) {
  return arr.map(gelu);
}

export function matStats(flat) {
  if (!flat || flat.length === 0) return { min: 0, max: 0, mean: 0, std: 0, norm: 0 };
  let mn = Infinity, mx = -Infinity, sum = 0, sq = 0;
  for (let i = 0; i < flat.length; i++) {
    const v = flat[i];
    if (v < mn) mn = v;
    if (v > mx) mx = v;
    sum += v;
    sq += v * v;
  }
  const mean = sum / flat.length;
  const std = Math.sqrt(sq / flat.length - mean * mean);
  const norm = Math.sqrt(sq);
  return { min: mn, max: mx, mean, std, norm };
}

/* ─── Full Transformer Pipeline ─── */
export function simulate({ seq, dModel, nHeads, ffMult, nLayers, seed }) {
  const n = seq;
  const dH = Math.floor(dModel / nHeads);
  const dFF = dModel * ffMult;
  const r = rng(seed);

  // Initial input: n × dModel
  const X0 = new Array(n * dModel).fill(0).map(() => (r() - 0.5) * 2);

  const steps = [];
  steps.push({
    id: 'input',
    label: 'Input X',
    desc: `Token + positional embeddings`,
    data: X0, rows: n, cols: dModel,
    phase: 'input', layer: -1, head: -1,
    dimChange: null,
  });

  let X = X0;

  for (let L = 0; L < nLayers; L++) {
    const Xin = X;

    // Accumulator for concatenated head outputs
    // Real transformer: concat all heads → n × dModel, then project
    const headOutputs = [];

    for (let h = 0; h < nHeads; h++) {
      const hr = rng(seed * 1000 + L * 137 + h * 31 + 7);

      const initW = (size) => new Array(size).fill(0).map(() => (hr() - 0.5) * (2 / Math.sqrt(dModel)));

      const Wq = initW(dModel * dH);
      const Wk = initW(dModel * dH);
      const Wv = initW(dModel * dH);

      // Q = X · Wq → n × dH
      const Q = matMul(X, Wq, n, dModel, dH);
      steps.push({
        id: `L${L}_H${h}_Q`,
        label: `L${L+1} H${h+1}: Q`,
        desc: `X[${n}×${dModel}] · Wq[${dModel}×${dH}]`,
        data: Q, rows: n, cols: dH,
        phase: 'qkv', layer: L, head: h,
        dimChange: { from: [n, dModel], to: [n, dH], weight: [dModel, dH] },
      });

      // K = X · Wk → n × dH
      const K = matMul(X, Wk, n, dModel, dH);
      steps.push({
        id: `L${L}_H${h}_K`,
        label: `L${L+1} H${h+1}: K`,
        desc: `X[${n}×${dModel}] · Wk[${dModel}×${dH}]`,
        data: K, rows: n, cols: dH,
        phase: 'qkv', layer: L, head: h,
        dimChange: { from: [n, dModel], to: [n, dH], weight: [dModel, dH] },
      });

      // V = X · Wv → n × dH
      const V = matMul(X, Wv, n, dModel, dH);
      steps.push({
        id: `L${L}_H${h}_V`,
        label: `L${L+1} H${h+1}: V`,
        desc: `X[${n}×${dModel}] · Wv[${dModel}×${dH}]`,
        data: V, rows: n, cols: dH,
        phase: 'qkv', layer: L, head: h,
        dimChange: { from: [n, dModel], to: [n, dH], weight: [dModel, dH] },
      });

      // Scores = Q · Kᵀ / √dH → n × n
      const Kt = transpose(K, n, dH);
      const raw = matMul(Q, Kt, n, dH, n);
      const scale = Math.sqrt(dH);
      const scores = raw.map(v => v / scale);
      steps.push({
        id: `L${L}_H${h}_scores`,
        label: `L${L+1} H${h+1}: Q·Kᵀ/√d`,
        desc: `Q[${n}×${dH}] · Kᵀ[${dH}×${n}] / √${dH}`,
        data: scores, rows: n, cols: n,
        phase: 'scores', layer: L, head: h,
        dimChange: { from: [n, dH], to: [n, n], weight: [dH, n] },
      });

      // Attention weights = softmax → n × n
      const attn = softmaxRows(scores, n, n);
      steps.push({
        id: `L${L}_H${h}_attn`,
        label: `L${L+1} H${h+1}: Softmax`,
        desc: `softmax(scores) → probabilities`,
        data: attn, rows: n, cols: n,
        phase: 'softmax', layer: L, head: h,
        dimChange: { from: [n, n], to: [n, n] },
      });

      // Context = Attn · V → n × dH
      const ctx = matMul(attn, V, n, n, dH);
      steps.push({
        id: `L${L}_H${h}_ctx`,
        label: `L${L+1} H${h+1}: Attn·V`,
        desc: `Attn[${n}×${n}] · V[${n}×${dH}]`,
        data: ctx, rows: n, cols: dH,
        phase: 'context', layer: L, head: h,
        dimChange: { from: [n, n], to: [n, dH], weight: [n, dH] },
      });

      headOutputs.push(ctx);
    }

    // Concat heads → n × (nHeads * dH) = n × dModel
    const concat = new Array(n * nHeads * dH).fill(0);
    for (let h = 0; h < nHeads; h++) {
      for (let i = 0; i < n; i++) {
        for (let d = 0; d < dH; d++) {
          concat[i * nHeads * dH + h * dH + d] = headOutputs[h][i * dH + d];
        }
      }
    }
    const concatCols = nHeads * dH;

    steps.push({
      id: `L${L}_concat`,
      label: `L${L+1}: Concat`,
      desc: `${nHeads} heads × [${n}×${dH}] → [${n}×${concatCols}]`,
      data: concat, rows: n, cols: concatCols,
      phase: 'concat', layer: L, head: -1,
      dimChange: { from: [n, dH], to: [n, concatCols] },
    });

    // Output projection Wo: concat → n × dModel
    const wor = rng(seed * 2000 + L * 73);
    const Wo = new Array(concatCols * dModel).fill(0).map(() => (wor() - 0.5) * (2 / Math.sqrt(concatCols)));
    const projected = matMul(concat, Wo, n, concatCols, dModel);

    // Residual + LayerNorm
    const residual = addMat(Xin, projected);
    const normed = layerNorm(residual, n, dModel);

    steps.push({
      id: `L${L}_postMHA`,
      label: `L${L+1}: Post-MHA`,
      desc: `Wo[${concatCols}×${dModel}] + Residual + LayerNorm`,
      data: normed, rows: n, cols: dModel,
      phase: 'post-attn', layer: L, head: -1,
      dimChange: { from: [n, concatCols], to: [n, dModel], weight: [concatCols, dModel] },
    });

    X = normed;

    // ─── FFN ───
    const fr = rng(seed * 500 + L * 251 + 13);
    const W1 = new Array(dModel * dFF).fill(0).map(() => (fr() - 0.5) * (2 / Math.sqrt(dModel)));
    const B1 = new Array(dFF).fill(0).map(() => (fr() - 0.5) * 0.1);
    const W2 = new Array(dFF * dModel).fill(0).map(() => (fr() - 0.5) * (2 / Math.sqrt(dFF)));

    // Up-project
    let hidden = matMul(X, W1, n, dModel, dFF);
    for (let i = 0; i < n; i++)
      for (let j = 0; j < dFF; j++)
        hidden[i * dFF + j] += B1[j];

    steps.push({
      id: `L${L}_ffnUp`,
      label: `L${L+1}: FFN ↑`,
      desc: `X[${n}×${dModel}] · W1[${dModel}×${dFF}] + bias`,
      data: hidden, rows: n, cols: dFF,
      phase: 'ffn-up', layer: L, head: -1,
      dimChange: { from: [n, dModel], to: [n, dFF], weight: [dModel, dFF] },
    });

    // GELU
    const activated = geluVec(hidden);
    steps.push({
      id: `L${L}_gelu`,
      label: `L${L+1}: GELU`,
      desc: `GELU non-linearity`,
      data: activated, rows: n, cols: dFF,
      phase: 'gelu', layer: L, head: -1,
      dimChange: { from: [n, dFF], to: [n, dFF] },
    });

    // Down-project + residual + LN
    const down = matMul(activated, W2, n, dFF, dModel);
    const res2 = addMat(X, down);
    const out = layerNorm(res2, n, dModel);

    steps.push({
      id: `L${L}_ffnDown`,
      label: `L${L+1}: FFN ↓`,
      desc: `H[${n}×${dFF}] · W2[${dFF}×${dModel}] + Res + LN`,
      data: out, rows: n, cols: dModel,
      phase: 'ffn-down', layer: L, head: -1,
      dimChange: { from: [n, dFF], to: [n, dModel], weight: [dFF, dModel] },
    });

    X = out;
  }

  // Final output
  steps.push({
    id: 'output',
    label: 'Output',
    desc: `Final representation`,
    data: X, rows: n, cols: dModel,
    phase: 'output', layer: -1, head: -1,
    dimChange: null,
  });

  return steps;
}
