import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#14532d",
          950: "#052e16",
        },
        // MapTrip map design tokens (teal identity from the desktop map design)
        mt: {
          teal: "#0E7C86",
          "teal-dark": "#0A5F67",
          "teal-soft": "#E3F3F3",
          ink: "#14202B",
          "ink-2": "#3D4A53",
          muted: "#5B6670",
          line: "#E2E6E4",
          "line-strong": "#C9CFCB",
          chip: "#F1F3F1",
          bg: "#F5F6F3",
          land: "#EEF0EA",
        },
        surface: {
          DEFAULT: "#ffffff",
          muted: "#f8faf9",
          subtle: "#f1f5f3",
        },
      },
      fontFamily: {
        sans: [
          "Plus Jakarta Sans",
          "Inter",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.25rem",
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.04)",
        "card-hover":
          "0 4px 6px -1px rgb(0 0 0 / 0.06), 0 2px 4px -2px rgb(0 0 0 / 0.04)",
        float:
          "0 8px 24px -4px rgb(0 0 0 / 0.08), 0 4px 8px -4px rgb(0 0 0 / 0.04)",
      },
    },
  },
  plugins: [],
};

export default config;
