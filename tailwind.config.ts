import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0B1120",
        paper: "#F7F7F5",
        line: "#E4E4DF",
        moss: {
          50: "#F0F4F1",
          100: "#DCE7DE",
          400: "#5B8266",
          500: "#3D6B49",
          600: "#2E5238",
        },
        clay: {
          400: "#C97B4A",
          500: "#B4643A",
        },
        rust: {
          500: "#B5473C",
        },
        gold: {
          400: "#C9A24B",
        },
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
        mono: ["var(--font-mono)"],
      },
    },
  },
  plugins: [],
};
export default config;
