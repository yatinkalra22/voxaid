/** @type {import('next').NextConfig} */
const nextConfig = {
  // Proxy the audio endpoint to NestJS so <audio src> works without CORS.
  // Token-authenticated; no x-api-key needed. All other /api/* paths are
  // served by explicit route handlers under app/api/ so they can inject
  // the API key — keep the rewrite scoped here so it doesn't shadow them.
  async rewrites() {
    const apiUrl = process.env.API_URL || 'http://localhost:3001';
    return [
      {
        source: '/api/screenings/:id/audio',
        destination: `${apiUrl}/screenings/:id/audio`,
      },
    ];
  },
};

export default nextConfig;
