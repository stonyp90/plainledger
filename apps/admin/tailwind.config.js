/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Admin console - slate backgrounds matching main website
        admin: {
          50: '#f8fafc',   // slate-50
          100: '#f1f5f9',  // slate-100
          200: '#e2e8f0',  // slate-200
          300: '#cbd5e1',  // slate-300
          400: '#94a3b8',  // slate-400
          500: '#64748b',  // slate-500
          600: '#475569',  // slate-600
          700: '#334155',  // slate-700
          800: '#1e293b',  // slate-800
          900: '#0f172a',  // slate-900
          950: '#020617',  // slate-950
        },
        // Primary brand color - Emerald (matching PlainLedger branding)
        primary: {
          400: '#34d399',  // emerald-400
          500: '#10b981',  // emerald-500
          600: '#059669',  // emerald-600
          700: '#047857',  // emerald-700
        },
        // Accent color - Gold/Amber (prosperity/premium)
        accent: {
          400: '#fbbf24',  // amber-400
          500: '#f59e0b',  // amber-500
          600: '#d97706',  // amber-600
        },
      },
    },
  },
  plugins: [],
};
