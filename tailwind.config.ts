import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        base: {
          900: "#0f172a",
          800: "#1e293b"
        },
        panel: "#292524",
        accent: "#14b8a6",
        warn: "#fbbf24",
        success: "#10b981",
        critical: "#f43f5e"
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "ui-monospace", "SFMono-Regular", "monospace"]
      },
      boxShadow: {
        panel: "0 10px 30px -12px rgba(0,0,0,0.45)"
      }
    },
  },
  plugins: [],
};

export default config;
