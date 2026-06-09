import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      colors: {
        // tokens semânticos (mudam com o tema)
        canvas: "var(--canvas)",
        card: "var(--card)",
        "card-soft": "var(--card-soft)",
        "card-strong": "var(--card-strong)",
        content: "var(--content)",
        "content-muted": "var(--content-muted)",
        "content-subtle": "var(--content-subtle)",
        line: "var(--line)",
        "line-strong": "var(--line-strong)",
        // marca Sisprime (azul institucional — estável em ambos os temas)
        brand: {
          DEFAULT: "#0e5fac",
          dark: "#0a2e52",
          navy: "#082b4a",
          vibrant: "#1e88e5",
          cyan: "#00a0df",
          soft: "#dbeafe",
        },
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(8 43 74 / 0.05), 0 1px 3px 0 rgb(8 43 74 / 0.08)",
        "card-hover": "0 4px 12px -2px rgb(8 43 74 / 0.10), 0 2px 6px -1px rgb(8 43 74 / 0.07)",
      },
      ringColor: {
        line: "var(--line)",
      },
    },
  },
  plugins: [],
};

export default config;
