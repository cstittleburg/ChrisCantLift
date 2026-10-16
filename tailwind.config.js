/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // "Chalk & Iron" design tokens — use these names instead of raw hex codes
      colors: {
        floor:  '#121110', // page background
        bench:  '#1C1A18', // cards, panels
        plate:  '#262320', // inputs-on-card, logged-set rows, inactive bars
        seam:   '#33302C', // borders, dividers
        chalk:  '#F2EFE8', // primary text
        dust:   '#A39E95', // secondary text, labels
        ash:    '#8C877E', // tertiary text, inactive icons
        orange: { DEFAULT: '#FF6B2C', deep: '#2A1A12' }, // main action / Heavy
        brass:  { DEFAULT: '#E8C468', deep: '#2E2612', edge: '#5C4A1E' }, // More reps, PRs
        teal:   '#4FB3A9', // Short days, finish, success, synced
      },
      fontFamily: {
        display: ['"Barlow Condensed"', 'sans-serif'],
        sans:    ['Barlow', 'sans-serif'],
      },
      borderRadius: { card: '24px', tile: '16px', input: '14px' },
    },
  },
  plugins: [],
}
