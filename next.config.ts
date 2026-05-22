import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['@mastra/core', '@mastra/libsql'],
};

export default nextConfig;
