/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        main: "#006E5E",
        main50: "rgba(156, 174, 83, 0.76)",
        supporting: "#9CAE53",
        accent: "#D4834E",
        font: "#383B3D",
        black: "#000000",
      },
    },
  },
  plugins: [],
};
