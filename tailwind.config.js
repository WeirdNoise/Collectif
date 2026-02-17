/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./services/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Open Sans"', 'sans-serif'],
        display: ['"Montserrat"', 'sans-serif'],
        original: ['"Yeseva One"', 'serif'],
      },
      colors: {
        'domessin-primary': '#1d5b53',
        'domessin-secondary': '#eebc48',
        'domessin-light': '#f0fdfa',
      }
    },
  },
  plugins: [],
}