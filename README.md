# Matrix Flow — Transformer Dimensions Visualizer

Interactive visualization of how matrix dimensions change through every operation in a Transformer model.

![Matrix Flow](https://img.shields.io/badge/Transformer-Visualizer-d4a840)

## What it shows

Real matrix multiplications through a full transformer pipeline:

- **Input** → `seq × d_model` initial embeddings
- **Q, K, V projections** → `seq × d_head` (dimension reduction per head)
- **Attention scores** → `seq × seq` (Q·Kᵀ/√d)
- **Softmax** → `seq × seq` (probability distributions)
- **Context** → `seq × d_head` (Attn · V)
- **Concat** → `seq × d_model` (all heads combined)
- **FFN up-projection** → `seq × d_ff` (4× expansion)
- **GELU activation** → `seq × d_ff` (non-linearity)
- **FFN down-projection** → `seq × d_model` (compression back)

Configurable up to **12 layers × 12 heads**.

## Getting Started

```bash
npm install
npm run dev
```

## Deploy to Vercel

1. Push to GitHub
2. Import in [vercel.com/new](https://vercel.com/new)
3. Deploy — zero config needed

Or via CLI:

```bash
npm i -g vercel
vercel
```

## Controls

- **← → arrow keys** to step through operations
- **Space** to play/pause animation
- **Sliders** to adjust seq length, d_model, heads, FF multiplier, layers
- Click any step in the timeline or size chart to jump to it

## Tech Stack

- React 18 + Vite
- Pure JavaScript matrix math (no ML libraries)
- Seeded PRNG for reproducible results
- SVG-based matrix visualization

## License

MIT
