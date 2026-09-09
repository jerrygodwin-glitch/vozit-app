module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: { orange: '#FE3D07', blue: '#0a8fe8', deepBlue: '#0a3ff1', bone: '#f0e8d8' },
        tier: { starter: '#22C55E', silver: '#94A3B8', gold: '#EAB308', platinum: '#8B5CF6' },
      },
      fontFamily: { display: ['Fredoka One', 'sans-serif'], sans: ['Inter', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
}
