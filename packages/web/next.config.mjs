import { createMDX } from 'fumadocs-mdx/next';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
  outputFileTracingRoot: path.resolve(__dirname, '../../'),
  // Temporarily disabled for Next.js 16 compatibility
  // turbopack: {
  //   root: path.resolve(__dirname, '../../'),
  //   rules: {
  //     '*.{jsx,tsx}': {
  //       loaders: [loaderPath],
  //     },
  //   },
  // },
};

const withMDX = createMDX();

export default withMDX(nextConfig);
