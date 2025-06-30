/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
    './index.html'
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Texas-themed colors
        tx: {
          blue: {
            50: 'var(--tx-blue-50)',
            100: 'var(--tx-blue-100)',
            200: 'var(--tx-blue-200)',
            300: 'var(--tx-blue-300)',
            400: 'var(--tx-blue-400)',
            500: 'var(--tx-blue-500)',
            600: 'var(--tx-blue-600)',
            700: 'var(--tx-blue-700)',
            800: 'var(--tx-blue-800)',
            900: 'var(--tx-blue-900)',
            950: 'var(--tx-blue-950)',
          },
          orange: {
            50: 'var(--tx-orange-50)',
            100: 'var(--tx-orange-100)',
            200: 'var(--tx-orange-200)',
            300: 'var(--tx-orange-300)',
            400: 'var(--tx-orange-400)',
            500: 'var(--tx-orange-500)',
            600: 'var(--tx-orange-600)',
            700: 'var(--tx-orange-700)',
            800: 'var(--tx-orange-800)',
            900: 'var(--tx-orange-900)',
          },
          gray: {
            50: 'var(--tx-gray-50)',
            100: 'var(--tx-gray-100)',
            200: 'var(--tx-gray-200)',
            300: 'var(--tx-gray-300)',
            400: 'var(--tx-gray-400)',
            500: 'var(--tx-gray-500)',
            600: 'var(--tx-gray-600)',
            700: 'var(--tx-gray-700)',
            800: 'var(--tx-gray-800)',
            900: 'var(--tx-gray-900)',
            950: 'var(--tx-gray-950)',
          },
        },
        // Data layer colors
        headstart: {
          primary: 'var(--headstart-primary)',
          secondary: 'var(--headstart-secondary)',
          accent: 'var(--headstart-accent)',
        },
        district: {
          primary: 'var(--district-primary)',
          secondary: 'var(--district-secondary)',
          accent: 'var(--district-accent)',
        },
        // Map colors
        map: {
          background: 'var(--map-background)',
          water: 'var(--map-water)',
          land: 'var(--map-land)',
          border: 'var(--map-border)',
        },
      },
      fontFamily: {
        sans: ['var(--font-family-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-family-mono)', 'monospace'],
      },
      fontSize: {
        xs: 'var(--font-size-xs)',
        sm: 'var(--font-size-sm)',
        base: 'var(--font-size-base)',
        lg: 'var(--font-size-lg)',
        xl: 'var(--font-size-xl)',
        '2xl': 'var(--font-size-2xl)',
        '3xl': 'var(--font-size-3xl)',
        '4xl': 'var(--font-size-4xl)',
        '5xl': 'var(--font-size-5xl)',
      },
      fontWeight: {
        light: 'var(--font-weight-light)',
        normal: 'var(--font-weight-normal)',
        medium: 'var(--font-weight-medium)',
        semibold: 'var(--font-weight-semibold)',
        bold: 'var(--font-weight-bold)',
        extrabold: 'var(--font-weight-extrabold)',
      },
      lineHeight: {
        tight: 'var(--line-height-tight)',
        normal: 'var(--line-height-normal)',
        relaxed: 'var(--line-height-relaxed)',
      },
      spacing: {
        1: 'var(--space-1)',
        2: 'var(--space-2)',
        3: 'var(--space-3)',
        4: 'var(--space-4)',
        5: 'var(--space-5)',
        6: 'var(--space-6)',
        8: 'var(--space-8)',
        10: 'var(--space-10)',
        12: 'var(--space-12)',
        16: 'var(--space-16)',
        20: 'var(--space-20)',
        24: 'var(--space-24)',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
        '3xl': 'var(--radius-3xl)',
        full: 'var(--radius-full)',
      },
      transitionDuration: {
        fast: 'var(--transition-fast)',
        normal: 'var(--transition-normal)',
        slow: 'var(--transition-slow)',
      },
      zIndex: {
        'map-controls': 'var(--z-map-controls)',
        'info-window': 'var(--z-info-window)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-in-out",
        "slide-up": "slide-up 0.3s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
      },
      boxShadow: {
        'card': 'var(--card-shadow)',
        'card-lg': 'var(--card-shadow-lg)',
        'card-xl': 'var(--card-shadow-xl)',
      },
    },
  },
  plugins: [],
};