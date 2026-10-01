import type { Config } from "tailwindcss";

const v = (name: string) => `hsl(var(--${name}) / <alpha-value>)`;

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: v("background"), foreground: v("foreground"),
        muted: v("muted"), "muted-foreground": v("muted-foreground"),
        border: v("border"), primary: v("primary"), "primary-foreground": v("primary-foreground"),
        sidebar: v("sidebar"),
      },
      fontFamily: { sans: ["var(--font-sans)", "system-ui", "sans-serif"] },
    },
  },
} satisfies Config;
