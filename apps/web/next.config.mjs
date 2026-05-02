/** @type {import('next').NextConfig} */
const nextConfig = {
  // Proxy /api/* to the NestJS backend — avoids CORS in dev and prod
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
