/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  /**
   * Export the application as fully static assets so Cloudflare Pages can
   * locate the generated `out` directory after `next build` finishes.
   */
  output: 'export',
};

export default nextConfig;
