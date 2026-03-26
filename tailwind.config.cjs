/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './index.html',
    './App.tsx',
    './app/**/*.{ts,tsx}',
    './pages/**/*.{ts,tsx}',
    './services/**/*.{ts,tsx}',
    './ui/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['IBM Plex Sans', 'sans-serif'],
        display: ['Manrope', 'IBM Plex Sans', 'sans-serif'],
      },
      colors: {
        tecer: {
          primary: '#005CB9',
          secondary: '#0C74D4',
          bgLight: '#EEF4FB',
          grayMed: '#647B93',
          grayDark: '#16324F',
          darkBg: '#071728',
          darkCard: '#102238',
        },
      },
    },
  },
  plugins: [],
};
