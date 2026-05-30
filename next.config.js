/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
        pathname: '/t/p/**',
      },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'prisma', 'web-push'],
    // web-push pakai dynamic require pattern (setVapidDetails lazy) yang
    // Next.js trace bisa miss — force include full dep graph ke standalone.
    outputFileTracingIncludes: {
      '/api/**/*': ['./node_modules/web-push/**/*'],
    },
  },
};

module.exports = nextConfig;
