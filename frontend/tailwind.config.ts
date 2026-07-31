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
        ink: '#111827',
        muted: '#6b7280',
        paper: '#fbfaf7',
        line: '#e7e3dc',
        brand: '#111827',
        accent: '#f59e0b',
      },
      boxShadow: {
        soft: '0 16px 40px rgba(17, 24, 39, 0.08)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
};

export default config;
