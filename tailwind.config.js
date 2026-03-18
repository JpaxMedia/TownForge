/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        minecraft: ['monospace', 'Courier New', 'Courier'],
      },
      colors: {
        'minecraft-green': '#2d5a27',
        'minecraft-brown': '#8B4513',
        'minecraft-stone': '#808080',
        'minecraft-dirt': '#8B6914',
        'minecraft-sky': '#87CEEB',
        'minecraft-dark': '#1a1a1a',
        'minecraft-panel': 'rgba(0,0,0,0.75)',
      },
      boxShadow: {
        'minecraft': '3px 3px 0px rgba(0,0,0,0.8)',
        'minecraft-inset': 'inset 2px 2px 0px rgba(0,0,0,0.5)',
      },
      borderWidth: {
        '3': '3px',
      }
    },
  },
  plugins: [],
}
