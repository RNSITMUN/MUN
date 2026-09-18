/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./*.html",
    "./components/**/*.{ts,tsx,js,jsx}",
    "./src/**/*.{ts,tsx,js,jsx,css}"
  ],
  theme: {
    extend: {
      colors: {
        accent: "#d4af37"
      }
    }
  },
  plugins: []
};
