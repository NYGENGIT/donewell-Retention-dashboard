/** @type {import('next').NextConfig} */

// For GitHub Pages "project sites" the app is served from
// https://<user>.github.io/<repo>, so every asset needs the /<repo> prefix.
// The CI workflow sets NEXT_PUBLIC_BASE_PATH to "/<repo>" automatically.
// For local dev or a user/org root site, leave it empty.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const nextConfig = {
  // Emit a fully static site into ./out (no Node server needed on GitHub Pages).
  output: 'export',

  // Serve assets and routes under the repo subpath when deployed to Pages.
  basePath: basePath,
  assetPrefix: basePath ? `${basePath}/` : '',

  // GitHub Pages serves /path/ as /path/index.html — trailing slashes keep links working.
  trailingSlash: true,

  // The Next.js image optimizer needs a server; static export can't use it.
  images: {
    unoptimized: true,
  },

  // Expose the base path to the client so fetch('/data/...') can be prefixed.
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },

  reactStrictMode: true,
};

module.exports = nextConfig;
