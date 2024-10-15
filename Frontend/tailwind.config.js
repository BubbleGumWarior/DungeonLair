/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}", // Ensure Tailwind scans your component files
  ],
  theme: {
    extend: {
      colors: {
        goldLight: '#FFEA70',
        goldDark: '#C49B00',
      },
      backgroundImage: {
        'metallic-gold': 'linear-gradient(90deg, #FFEA70, #FFD700, #C49B00)',
      },
    },
  },
  plugins: [],
}
