const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  trailingSlash: true,
  turbopack: {
    root: path.resolve(__dirname),
  },
}

module.exports = nextConfig
