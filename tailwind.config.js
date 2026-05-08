/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        brand: {
          50: '#f7f3e8',
          100: '#ede3c2',
          200: '#e2d49a',
          300: '#d7c46f',
          400: '#e2b340',
          500: '#c99a2e',
          600: '#a87b22',
          700: '#875d1a',
          800: '#664312',
          900: '#452c0c',
        },
        navy: {
          50: '#e8eaf0',
          100: '#c5c9d9',
          200: '#9ea5c0',
          300: '#7781a7',
          400: '#596491',
          500: '#3b487b',
          600: '#354173',
          700: '#2d3868',
          800: '#262f5e',
          900: '#1a1a2e',
          950: '#111122',
        },
        risk: {
          high: '#ef4444',
          medium: '#f59e0b',
          low: '#22c55e',
        },
      },
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        body: ['DM Sans', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
