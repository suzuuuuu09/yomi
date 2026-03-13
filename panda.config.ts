import { defineConfig } from "@pandacss/dev";

export default defineConfig({
  // Whether to use css reset
  preflight: true,

  // Where to look for your css declarations
  include: [
    "./src/components/**/*.{ts,tsx,js,jsx}",
    "./src/app/**/*.{ts,tsx,js,jsx}",
  ],

  // Files to exclude
  exclude: [],

  // Useful for theme customization
  theme: {
    extend: {
      keyframes: {
        twinkle: {
          "0%, 100%": {
            opacity: "var(--star-opacity)",
            filter: "drop-shadow(0 0 var(--star-glow) #ffffff80)",
          },
          "50%": {
            opacity: "calc(var(--star-opacity) * 0.3)",
            filter: "drop-shadow(0 0 calc(var(--star-glow) * 0.5) #ffffff33)",
          },
        },
      },
    },
  },

  // The output directory for your css system
  outdir: "styled-system",

  jsxFramework: "react",
});
