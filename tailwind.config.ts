import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary:   { DEFAULT: 'var(--color-primary)', hover: 'var(--color-primary-hover)',
                     light: 'var(--color-primary-light)', bg: 'var(--color-primary-bg)',
                     border: 'var(--color-primary-border)' },
        secondary: { DEFAULT: 'var(--color-secondary)', hover: 'var(--color-secondary-hover)',
                     bg: 'var(--color-secondary-bg)', border: 'var(--color-secondary-border)' },
        accent:    { DEFAULT: 'var(--color-accent)', hover: 'var(--color-accent-hover)',
                     bg: 'var(--color-accent-bg)', border: 'var(--color-accent-border)' },
        surface:   { DEFAULT: 'var(--color-surface)', 2: 'var(--color-surface-2)',
                     3: 'var(--color-surface-3)' },
        border:    { DEFAULT: 'var(--color-border)', dark: 'var(--color-border-dark)' },
        verified:  { DEFAULT: 'var(--color-verified)', bg: 'var(--color-verified-bg)',
                     border: 'var(--color-verified-border)' },
        text: {
          primary:   'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          muted:     'var(--color-text-muted)',
          inverse:   'var(--color-text-inverse)',
        },
      },
      fontFamily: {
        display: ['DM Serif Display', 'serif'],
        body:    ['DM Sans', 'sans-serif'],
        sans:    ['DM Sans', 'sans-serif'],
      },
      boxShadow: {
        sm:   'var(--shadow-sm)',
        md:   'var(--shadow-md)',
        lg:   'var(--shadow-lg)',
        teal: 'var(--shadow-teal)',
        blue: 'var(--shadow-blue)',
      },
      borderRadius: {
        xl: '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
      fontSize: {
        '2xs': '11px / 1.4',
        'xs': '12px / 1.5',
        'sm': '14px / 1.6',
        'base': '16px / 1.7',
        'lg': '18px / 1.6',
        'xl': '22px / 1.4',
        '2xl': '28px / 1.3',
        '3xl': '36px / 1.2',
        '4xl': '48px / 1.1',
        '5xl': '60px / 1.05',
      },
    },
  },
  plugins: [],
};

export default config;
