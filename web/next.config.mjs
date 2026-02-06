import { createMDX } from 'fumadocs-mdx/next';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  experimental: {
    turbo: {
      resolveExtensions: [
        '.tsx',
        '.ts',
        '.jsx',
        '.js',
        '.json',
      ],
    },
  },
  transpilePackages: ['lucide-react'],
  async rewrites() {
    return [
      {
        source: '/docs/:path*.mdx',
        destination: '/llms.mdx/docs/:path*',
      },
    ];
  },
};

export default withMDX(config);
