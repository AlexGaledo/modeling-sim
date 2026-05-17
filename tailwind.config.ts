import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        starbucks: {
          green: "#00704A",
          dark: "#1e3932",
          cream: "#f1ece4",
        },
      },
    },
  },
  plugins: [],
};

export default config;
