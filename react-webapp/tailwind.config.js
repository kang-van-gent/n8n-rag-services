/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Black and White theme colors
        primary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        accent: {
          50: '#ffffff',
          100: '#f8fafc',
          200: '#f1f5f9',
          300: '#e2e8f0',
          400: '#cbd5e1',
          500: '#94a3b8',
          600: '#64748b',
          700: '#475569',
          800: '#334155',
          900: '#1e293b',
          950: '#000000',
        },
      },
      backgroundImage: {
        'bw-gradient': 'linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)',
        'bw-dark-gradient': 'linear-gradient(135deg, #000000 0%, #1e293b 100%)',
        'bw-light-gradient': 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
        'bw-subtle-gradient': 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)',
        'bw-glass': 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
        'bw-dark-glass': 'linear-gradient(135deg, rgba(0, 0, 0, 0.1) 0%, rgba(0, 0, 0, 0.05) 100%)',
        'glow-orb': 'radial-gradient(circle at center, rgba(148, 163, 184, 0.3) 0%, transparent 70%)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'aurora': 'aurora 8s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(148, 163, 184, 0.4), 0 0 10px rgba(148, 163, 184, 0.4), 0 0 15px rgba(148, 163, 184, 0.4)' },
          '100%': { boxShadow: '0 0 10px rgba(148, 163, 184, 0.6), 0 0 20px rgba(148, 163, 184, 0.6), 0 0 30px rgba(148, 163, 184, 0.6)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        aurora: {
          '0%, 100%': { opacity: 1, transform: 'rotate(0deg) scale(1)' },
          '50%': { opacity: 0.8, transform: 'rotate(180deg) scale(1.1)' },
        },
      },
      boxShadow: {
        'bw': '0 0 20px rgba(148, 163, 184, 0.3)',
        'bw-soft': '0 0 15px rgba(148, 163, 184, 0.2)',
        'bw-strong': '0 0 30px rgba(148, 163, 184, 0.4)',
        'glow-sm': '0 0 10px rgba(148, 163, 184, 0.2)',
        'glow-md': '0 0 15px rgba(148, 163, 184, 0.3)',
        'glow-lg': '0 0 25px rgba(148, 163, 184, 0.4)',
        'inner-glow': 'inset 0 0 20px rgba(148, 163, 184, 0.1)',
        'dark-glow': '0 0 20px rgba(0, 0, 0, 0.3)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}

