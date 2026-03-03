/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        depth: '#050505',
        surface: '#0A0A0A',
        panel: '#111111',
        elevated: '#141414',
        accent: '#C9A96E',
        'accent-red': '#eb3b3b',
        'accent-green': '#22c55e',
        'accent-blue': '#C9A96E',
        'border-subtle': '#1F1F1F',
        'border-medium': '#2A2A2A',
        'text-primary': '#F5F0EB',
        'text-secondary': '#8B8B8B',
        'text-muted': '#6B6B6B',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'monospace'],
        sans: ['Geist', 'system-ui', 'sans-serif'],
        display: ['"Playfair Display"', 'serif'],
      },
    },
  },
  plugins: [],
}
