/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#185FA5', dark: '#144e8a', light: '#EBF2FA' },
        success: { DEFAULT: '#1D9E75', light: '#EBF7F2' },
        warning: { DEFAULT: '#BA7517', light: '#FDF5E6' },
        danger:  { DEFAULT: '#C0392B', light: '#FBECEC' },
      },
    },
  },
  plugins: [],
}
