/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        'cream': {
          50: '#fafaf9',
          100: '#f5f3ef',
          200: '#ebe9e3',
          300: '#ddd9d0',
          400: '#c9c3b8',
          500: '#b5ada0',
        },
        'chat-dark': '#1a1a1a',
        'chat-light': '#ffffff',
      },
    },
  },
  plugins: [],
}

