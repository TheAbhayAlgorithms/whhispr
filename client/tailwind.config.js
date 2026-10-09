/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#0066ff',
          700: '#0052cc',
          800: '#003d99',
          900: '#002966',
          950: '#001433',
        },
        dark: {
          bg: '#000000',
          surface: '#0d0d12',
          card: '#12121a',
          bubble: '#181822',
          border: '#20202c',
          hover: '#191924',
          muted: '#8e8e99',
        },
      },
    },
  },
  plugins: [],
};
