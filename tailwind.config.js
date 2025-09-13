/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      colors: {
        'neutral-bg': '#f5f6fa',
        'neutral-card': '#ffffff',
        'text-primary': '#1d1d1f',
        'text-secondary': '#86868b',
        'accent-blue': '#007aff',
        'accent-purple': '#5856d6',
        'accent-green': '#34c759',
        'accent-gray': '#e5e5ea',
        // Add more as needed
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      lineHeight: {
        'relaxed': '1.75',
        'loose': '2',
      },
    },
  },
  plugins: [],
};
