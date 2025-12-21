import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,

  // Server external packages
  serverExternalPackages: ['@huggingface/inference'],

  // Enable experimental features
  experimental: {
    // Enable optimizeCss for better CSS optimization (disabled due to build issues)
    // optimizeCss: true,
  },

  // Image optimization configuration
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Webpack configuration for custom handling
  webpack: (config, { isServer }) => {
    // Handle SVG files
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });

    // Optimize bundles
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    return config;
  },

  // Environment variables that should be available on the client
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value:
              'camera=(), microphone=(), geolocation=(), browsing-topics=()',
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0',
          },
        ],
      },
    ];
  },

  // Rewrites for better routing
  async rewrites() {
    return [
      {
        source: '/game/:gameId',
        destination: '/?game=:gameId',
      },
    ];
  },

  // Compress responses
  compress: true,

  // Generate ETags for caching
  generateEtags: true,

  // Power build output to standalone for deployment
  output: process.env.BUILD_STANDALONE ? 'standalone' : undefined,

  // TypeScript configuration
  typescript: {
    // Enable type checking during build
    ignoreBuildErrors: false,
  },

  // ESLint configuration
  eslint: {
    // Run ESLint during build
    ignoreDuringBuilds: false,
  },

  // Performance optimizations
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // PWA and caching configuration
  async generateBuildId() {
    // Generate build ID based on timestamp for cache busting
    return `build-${Date.now()}`;
  },

  // Development configuration
  ...(process.env.NODE_ENV === 'development' && {
    // Enable source maps in development
    productionBrowserSourceMaps: false,
  }),

  // Production optimizations
  ...(process.env.NODE_ENV === 'production' && {
    // Disable source maps in production for security
    productionBrowserSourceMaps: false,
  }),
};

export default nextConfig;
