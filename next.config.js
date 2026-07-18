/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Keep native/server-only modules out of the server bundle. node:sqlite
    // is built-in but listing it avoids any bundling surprises.
    serverComponentsExternalPackages: ["node:sqlite"],
  },
};

module.exports = nextConfig;
