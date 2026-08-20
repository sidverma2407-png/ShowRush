/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "on-tertiary-container": "#007b83",
        "on-secondary-fixed": "#3a0033",
        "primary-fixed-dim": "#c5cf00",
        "on-secondary-fixed-variant": "#840076",
        "on-tertiary-fixed-variant": "#004f54",
        "on-primary-container": "#6e7400",
        "on-tertiary": "#ffffff",
        "surface-tint": "#5d6300",
        "on-secondary-container": "#fffbff",
        "primary-container": "#f2ff00",
        "secondary-fixed": "#ffd7f0",
        "surface-container-lowest": "#ffffff",
        "on-error-container": "#93000a",
        "outline": "#78795f",
        "surface-variant": "#e2e2e2",
        "on-error": "#ffffff",
        "on-surface-variant": "#474832",
        "inverse-primary": "#c5cf00",
        "on-primary-fixed": "#1b1d00",
        "surface-dim": "#dadada",
        "on-secondary": "#ffffff",
        "secondary-fixed-dim": "#fface8",
        "surface-container-highest": "#e2e2e2",
        "secondary-container": "#d300bd",
        "on-background": "#1b1b1b",
        "background": "#f9f9f9",
        "error-container": "#ffdad6",
        "inverse-surface": "#303030",
        "surface-container-low": "#f3f3f3",
        "on-primary": "#ffffff",
        "surface": "#f9f9f9",
        "outline-variant": "#c8c8ab",
        "surface-bright": "#f9f9f9",
        "error": "#ba1a1a",
        "primary": "#5d6300",
        "on-tertiary-fixed": "#002022",
        "surface-container-high": "#e8e8e8",
        "secondary": "#a90097",
        "primary-fixed": "#e1ed00",
        "surface-container": "#eeeeee",
        "tertiary-fixed": "#7df4ff",
        "on-surface": "#1b1b1b",
        "on-primary-fixed-variant": "#464a00",
        "tertiary-container": "#d4fbff",
        "inverse-on-surface": "#f1f1f1",
        "tertiary": "#006970",
        "tertiary-fixed-dim": "#00dbe9"
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "full": "9999px"
      },
      spacing: {
        "margin-mobile": "16px",
        "grid-unit": "4px",
        "border-width": "4px",
        "gutter": "24px",
        "shadow-offset": "6px",
        "margin-desktop": "40px"
      },
      borderWidth: {
        "border-width": "4px"
      },
      fontFamily: {
        "headline-lg": ["Space Grotesk", "sans-serif"],
        "headline-lg-mobile": ["Space Grotesk", "sans-serif"],
        "display-xl": ["Space Grotesk", "sans-serif"],
        "body-md": ["Archivo Narrow", "sans-serif"],
        "data-label": ["JetBrains Mono", "monospace"]
      },
      fontSize: {
        "headline-lg": ["48px", { "lineHeight": "48px", "letterSpacing": "-0.02em", "fontWeight": "700" }],
        "headline-lg-mobile": ["32px", { "lineHeight": "32px", "letterSpacing": "-0.02em", "fontWeight": "700" }],
        "display-xl": ["96px", { "lineHeight": "90px", "letterSpacing": "-0.04em", "fontWeight": "700" }],
        "body-md": ["18px", { "lineHeight": "24px", "fontWeight": "500" }],
        "data-label": ["14px", { "lineHeight": "18px", "fontWeight": "600" }]
      }
    },
  },
  plugins: [],
}
