import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0a0d12',
        surface: '#111620',
        surface2: '#171d2b',
        border: '#1e2a3d',
        accent: '#00e5ff',
        accent2: '#ff6b35',
        success: '#00c896',
        warn: '#ffc300',
        danger: '#ff3d5a',
        purple: '#a78bfa',
        text: '#e8edf5',
        muted: '#5a6a85',
        card: '#141a26',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
