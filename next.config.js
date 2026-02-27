/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Enable instrumentation.ts (proactive agent scheduler startup)
  experimental: {
    instrumentationHook: true,
  },
};

module.exports = nextConfig;
