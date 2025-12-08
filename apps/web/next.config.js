/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  optimizeFonts: false, // Disable Google Fonts optimization during build
}

module.exports = nextConfig
