/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static HTML export — required for GitHub Pages (no Node server available).
  output: 'export',
  // Emits /sessions/index.html instead of /sessions.html so Pages resolves clean URLs.
  trailingSlash: true,
  // next/image optimisation needs a server; on Pages we ship the original files.
  images: { unoptimized: true },
  // Custom domain serves from the root, so no basePath. If you ever move to
  // username.github.io/repo, set NEXT_PUBLIC_BASE_PATH=/repo and rebuild.
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  assetPrefix: process.env.NEXT_PUBLIC_BASE_PATH || '',
}
export default nextConfig
