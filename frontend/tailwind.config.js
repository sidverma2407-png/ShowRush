/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'seatzy-black': '#000000',
        'seatzy-white': '#FFFFFF',
        'seatzy-acid-yellow': '#F2FF00',
        'seatzy-magenta': '#FF00E5',
        'seatzy-cyan': '#00F0FF',
        'seatzy-gray-grid': '#E5E5E5',
      },
      fontFamily: {
        sans: ['Space Grotesk', 'Archivo Black', 'ui-sans-serif', 'system-ui'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'neo': '4px 4px 0px 0px rgba(0,0,0,1)',
        'neo-lg': '8px 8px 0px 0px rgba(0,0,0,1)',
      }
    },
  },
  plugins: [],
}
