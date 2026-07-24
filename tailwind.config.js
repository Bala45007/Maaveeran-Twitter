/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#0b1020',
        gold: '#e8c15a'
      },
      fontFamily: {
        display: ['Trebuchet MS', 'ui-sans-serif', 'system-ui']
      }
    }
  },
  plugins: []
};
