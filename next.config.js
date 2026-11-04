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
  // Private site (family and friends): ask search engines not to index ANY response, including /api and
  // images, which the middleware matcher skips. Set here (not in middleware) so it covers everything.
  async headers() {
    return [{ source: '/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' }] }];
  },
  // Next 15: these two options moved out of `experimental`
  serverExternalPackages: ['@prisma/client', 'prisma', 'web-push'],
  // web-push uses a dynamic require pattern (setVapidDetails is lazy) that
  // Next.js tracing can miss — force include the full dep graph in standalone.
  outputFileTracingIncludes: {
    '/api/**/*': ['./node_modules/web-push/**/*'],
  },
};

module.exports = nextConfig;
