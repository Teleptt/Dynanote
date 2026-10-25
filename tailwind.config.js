/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ...Object.fromEntries(['zinc','slate','gray','neutral','stone'].map(family => [family, Object.fromEntries([50,100,200,300,400,500,600,700,800,900,950].map(shade=>[shade, `rgb(var(--neutral-${shade}) / <alpha-value>)`]))])),
        ...Object.fromEntries(['purple','violet','indigo','blue','sky','cyan','teal','emerald','green','lime','yellow','amber','orange','red','rose','pink','fuchsia'].map(family=>[family,Object.fromEntries([50,100,200,300,400,500,600,700,800,900,950].map(shade=>[shade,`rgb(var(--${family}-${shade}) / <alpha-value>)`]))])),
        obsidian: Object.fromEntries(Object.entries({bg:'background',surface:'surface',sidebar:'sidebar',border:'border',hover:'hover',active:'active',accent:'accent',accentHover:'accentHover',textMuted:'muted',text:'text'}).map(([key,role])=>[key,`rgb(var(--theme-${role}) / <alpha-value>)`]))
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
