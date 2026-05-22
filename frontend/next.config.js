/** @type {import('next').NextConfig} */
const nextConfig = {
    // This tells Next.js to forward /api/* requests to FastAPI during development.
    // WHY? So your frontend and backend can talk without CORS issues in production,
    // and you only deploy one URL. In dev, Next.js proxies to localhost:8000.
    async rewrites() {
        return [
            {
                source: "/api/:path*",
                destination: "http://localhost:8000/api/:path*",
            },
        ];
    },
};

module.exports = nextConfig;