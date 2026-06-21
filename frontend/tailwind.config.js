/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#1a6ef5",
          dark: "#1558c0",
          light: "#e8f0fe",
        },
        success: {
          DEFAULT: "#36a420",
          dark: "#2d8a1a",
        },
        vnchain: {
          blue: "#1a6ef5",
          gold: "#f5a623",
          bg: "#f0f2f5",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
