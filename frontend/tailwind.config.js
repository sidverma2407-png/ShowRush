/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'seatzy-black':      '#1C1C1C',   // soft charcoal, not pure black
        'seatzy-white':      '#F7F3EE',   // warm parchment
        'seatzy-acid-yellow':'#D4A843',   // honey amber  (was neon yellow)
        'seatzy-magenta':    '#B85C7A',   // dusty rose   (was neon magenta)
        'seatzy-cyan':       '#4FADA6',   // sage teal    (was neon cyan)
        'seatzy-gray-grid':  '#E8E3DC',   // warm light gray
      },
      fontFamily: {
        sans: ['Space Grotesk', 'Archivo Black', 'ui-sans-serif', 'system-ui'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'neo-sm': '2px 2px 0px 0px rgba(0,0,0,1)',
        'neo': '4px 4px 0px 0px rgba(0,0,0,1)',
        'neo-lg': '8px 8px 0px 0px rgba(0,0,0,1)',
        'neo-xl': '12px 12px 0px 0px rgba(0,0,0,1)',
      }
    },
  },
  plugins: [],
}
