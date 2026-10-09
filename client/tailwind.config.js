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
          bg: '#121316',
          surface: '#18191E',
          card: '#1F2026',
          bubble: '#252630',
          border: '#2A2C36',
          hover: '#272832',
          muted: '#9496A6',
        },
        shady: {
          50: '#f5f6ff',
          100: '#eceeff',
          200: '#d9deff',
          300: '#b8c1ff',
          400: '#949eff',
          500: '#8B95F6',
          600: '#6d75ea',
          700: '#545cd4',
          800: '#434ab0',
          900: '#383e8c',
          lime: '#E2F952',
        },
      },
    },
  },
  plugins: [],
};
