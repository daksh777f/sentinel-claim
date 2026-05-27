/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0b0f19',
        card: '#111827',
        primary: '#00e5c7',
        secondary: '#ffb347',
        danger: '#ff6b6b',
        textMain: '#e2e8f0',
        textHeading: '#ffffff',
      },
      fontFamily: {
        heading: ['Outfit', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'glow': '0 0 20px rgba(0,229,199,0.15)',
      }
    },
  },
  plugins: [],
}
