/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          primary: 'var(--bg-primary)',
          card: 'var(--bg-card)',
          input: 'var(--bg-input)',
        },
        content: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          muted: 'var(--accent-muted)',
          text: 'var(--accent-text)',
        },
        semantic: {
          success: 'var(--success)',
          'success-muted': 'var(--success-muted)',
          danger: 'var(--danger)',
          'danger-muted': 'var(--danger-muted)',
          warning: 'var(--warning)',
          'warning-muted': 'var(--warning-muted)',
          gold: 'var(--gold)',
        },
        border: {
          DEFAULT: 'var(--border)',
          subtle: 'var(--border-subtle)',
        },
      },
    },
  },
  plugins: [],
};
