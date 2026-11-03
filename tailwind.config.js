/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#F5F7FA',
        card: '#FFFFFF',
        sidebar: '#FFFFFF',
        topbar: '#FFFFFF',
        border: '#E2E8F0',
        energy: {
          green: '#16A34A',
          greenLight: '#DCFCE7',
          greenMuted: '#15803D',
        },
        iot: {
          blue: '#2563EB',
          blueLight: '#DBEAFE',
        },
        solar: {
          amber: '#F59E0B',
          amberLight: '#FEF3C7',
        },
        alert: {
          warning: '#D97706',
          critical: '#DC2626',
          criticalLight: '#FEE2E2',
        },
        text: {
          primary: '#0F172A',
          secondary: '#475569',
          muted: '#94A3B8',
        }
      }
    },
  },
  plugins: [],
}

