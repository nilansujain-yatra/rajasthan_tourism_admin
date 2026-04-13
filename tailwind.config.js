/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        maroon: {
          DEFAULT: '#8B1A1A',
          dark:    '#6B1212',
          light:   '#A83030',
          hover:   '#B03535',
        },
        gold: {
          DEFAULT: '#C8922A',
          light:   '#E8B84B',
          pale:    '#FDF3E3',
          muted:   '#D4A853',
        },
        cream: {
          DEFAULT: '#FBF6EF',
          dark:    '#F0E8DA',
        },
        sand: {
          DEFAULT: '#E8D5B0',
          dark:    '#C9B48A',
        },
        teal: {
          DEFAULT: '#1A7A6E',
          light:   '#2A9A8C',
        },
        raj: {
          text:    '#1C1008',
          mid:     '#5A3A1A',
          muted:   '#9A7A5A',
        },
      },
      fontFamily: {
        serif:  ['Cormorant Garamond', 'Georgia', 'serif'],
        sans:   ['Outfit', 'sans-serif'],
      },
      borderRadius: {
        xl2: '1rem',
        xl3: '1.25rem',
      },
      boxShadow: {
        card:   '0 2px 12px rgba(139,26,26,0.08)',
        'card-hover': '0 8px 32px rgba(139,26,26,0.14)',
        topbar: '0 1px 0 #E8D5B0',
      },
      animation: {
        'pulse-dot': 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in':   'fadeIn 0.3s ease-out',
        'slide-in':  'slideIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
}
