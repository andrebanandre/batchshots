/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        white: '#ffffff',
        black: '#000000',
        primary: '#4f46e5', // Indigo
        accent: '#ff6b6b',  // Coral red
        secondary: '#e5e5e5', // Light gray
      },
      boxShadow: {
        'brutalist': '6px 6px 0 0 #000000',
        'brutalist-accent': '6px 6px 0 0 #ff6b6b80, 10px 10px 0 0 #4f46e5',
        'brutalist-accent-hover': '8px 8px 0 0 #ff6b6bb3, 14px 14px 0 0 #4f46e5',
      },
      borderWidth: {
        '3': '3px',
      },
      keyframes: {
        'fade-in-up': {
          '0%': {
            opacity: '0',
            transform: 'translateY(10px)'
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)'
          },
        }
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.3s ease-out'
      }
    },
  },
  safelist: [
    'shadow-brutalist',
    'shadow-brutalist-accent',
    'shadow-brutalist-accent-hover',
    'text-[10px]',
    'animate-fade-in-up'
  ],
  plugins: [],
}; 