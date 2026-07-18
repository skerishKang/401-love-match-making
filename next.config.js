const { setupDevPlatform } = require('@cloudflare/next-on-pages/next-dev');

// During `next dev` on Cloudflare Pages we need the CF platform bindings wired up.
if (process.env.NODE_ENV === 'development') {
  try {
    setupDevPlatform();
  } catch {
    /* not running on CF dev platform — ignore */
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

module.exports = nextConfig;
