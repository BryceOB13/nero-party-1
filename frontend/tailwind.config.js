/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      // Custom neon accent colors
      colors: {
        neon: {
          purple: {
            50: '#faf5ff',
            100: '#f3e8ff',
            200: '#e9d5ff',
            300: '#d8b4fe',
            400: '#c084fc',
            500: '#a855f7',
            600: '#9333ea',
            700: '#7e22ce',
            800: '#6b21a8',
            900: '#581c87',
            950: '#3b0764',
          },
          cyan: {
            50: '#ecfeff',
            100: '#cffafe',
            200: '#a5f3fc',
            300: '#67e8f9',
            400: '#22d3ee',
            500: '#06b6d4',
            600: '#0891b2',
            700: '#0e7490',
            800: '#155e75',
            900: '#164e63',
            950: '#083344',
          },
          pink: {
            50: '#fdf2f8',
            100: '#fce7f3',
            200: '#fbcfe8',
            300: '#f9a8d4',
            400: '#f472b6',
            500: '#ec4899',
            600: '#db2777',
            700: '#be185d',
            800: '#9d174d',
            900: '#831843',
            950: '#500724',
          },
        },
      },
      // Custom background gradients
      backgroundImage: {
        // Main gradient backgrounds
        'gradient-dark': 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)',
        'gradient-purple-cyan': 'linear-gradient(135deg, #a855f7 0%, #06b6d4 100%)',
        'gradient-purple-pink': 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
        'gradient-cyan-pink': 'linear-gradient(135deg, #06b6d4 0%, #ec4899 100%)',
        'gradient-neon': 'linear-gradient(135deg, #a855f7 0%, #06b6d4 50%, #ec4899 100%)',
        // Radial gradients for orbs
        'radial-purple': 'radial-gradient(circle at 30% 30%, #a855f7, transparent 70%)',
        'radial-cyan': 'radial-gradient(circle at 30% 30%, #06b6d4, transparent 70%)',
        'radial-pink': 'radial-gradient(circle at 30% 30%, #ec4899, transparent 70%)',
        // Glass overlay gradients
        'glass-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
        'glass-border': 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.1) 100%)',
      },
      // Animation keyframes
      keyframes: {
        // Floating animation for orbs
        float: {
          '0%, 100%': { transform: 'translateY(0) translateX(0)' },
          '25%': { transform: 'translateY(-20px) translateX(10px)' },
          '50%': { transform: 'translateY(-10px) translateX(-10px)' },
          '75%': { transform: 'translateY(-30px) translateX(5px)' },
        },
        // Gentle floating for background elements
        'float-gentle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        // Pulsing glow effect
        'pulse-glow': {
          '0%, 100%': { 
            opacity: '0.5',
            boxShadow: '0 0 20px rgba(168, 85, 247, 0.3)',
          },
          '50%': { 
            opacity: '0.8',
            boxShadow: '0 0 40px rgba(168, 85, 247, 0.6)',
          },
        },
        // Neon pulse for text/borders
        'neon-pulse': {
          '0%, 100%': {
            textShadow: '0 0 5px #a855f7, 0 0 10px #a855f7, 0 0 20px #a855f7',
          },
          '50%': {
            textShadow: '0 0 10px #a855f7, 0 0 20px #a855f7, 0 0 40px #a855f7, 0 0 80px #a855f7',
          },
        },
        // Shimmer effect for loading states
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        // Scale pulse for emphasis
        'scale-pulse': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
        },
        // Fade in up animation
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        // Fade in down animation
        'fade-in-down': {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        // Spin slow for decorative elements
        'spin-slow': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        // Bounce subtle
        'bounce-subtle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
      },
      // Animation utilities
      animation: {
        'float': 'float 20s ease-in-out infinite',
        'float-gentle': 'float-gentle 6s ease-in-out infinite',
        'float-slow': 'float 30s ease-in-out infinite',
        'float-fast': 'float 15s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 3s ease-in-out infinite',
        'neon-pulse': 'neon-pulse 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'scale-pulse': 'scale-pulse 2s ease-in-out infinite',
        'fade-in-up': 'fade-in-up 0.5s ease-out forwards',
        'fade-in-down': 'fade-in-down 0.5s ease-out forwards',
        'spin-slow': 'spin-slow 20s linear infinite',
        'bounce-subtle': 'bounce-subtle 2s ease-in-out infinite',
      },
      // Box shadow utilities for glass effects
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glass-sm': '0 4px 16px 0 rgba(0, 0, 0, 0.25)',
        'glass-lg': '0 12px 48px 0 rgba(0, 0, 0, 0.45)',
        'neon-purple': '0 0 20px rgba(168, 85, 247, 0.5)',
        'neon-cyan': '0 0 20px rgba(6, 182, 212, 0.5)',
        'neon-pink': '0 0 20px rgba(236, 72, 153, 0.5)',
        'neon-purple-lg': '0 0 40px rgba(168, 85, 247, 0.6)',
        'neon-cyan-lg': '0 0 40px rgba(6, 182, 212, 0.6)',
        'neon-pink-lg': '0 0 40px rgba(236, 72, 153, 0.6)',
      },
      // Backdrop blur utilities
      backdropBlur: {
        xs: '2px',
      },
      // Font family (optional - can be customized)
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      // Border radius for glass cards
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      // Transition timing functions
      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
};
