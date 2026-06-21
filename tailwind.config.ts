import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Palette lifted from the analysis charts so the PNGs and the UI read as one system.
        navy: {
          DEFAULT: '#1a2f52',
          deep: '#12203c',
          ink: '#0e1830',
          line: '#21476b',
          soft: '#2c4a78',
        },
        gold: {
          DEFAULT: '#c89b3c',
          light: '#dbb455',
          deep: '#a87f28',
        },
        teal: {
          DEFAULT: '#2a9d8f',
          light: '#43b3a4',
          deep: '#1f7d72',
        },
        brick: {
          DEFAULT: '#c0533f',
          light: '#d36c57',
          deep: '#9e4030',
        },
        steel: {
          DEFAULT: '#5b8bbf',
          light: '#86abd2',
          deep: '#3f6c9e',
        },
        paper: '#f6f7f9',
        mist: '#eef1f5',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Georgia', 'serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(14, 24, 48, 0.04), 0 8px 24px rgba(14, 24, 48, 0.06)',
        lift: '0 2px 6px rgba(14, 24, 48, 0.08), 0 18px 40px rgba(14, 24, 48, 0.12)',
      },
      letterSpacing: {
        eyebrow: '0.22em',
      },
    },
  },
  plugins: [],
};

export default config;
