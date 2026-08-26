import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloudflare deployments provide this runtime module. Keep it external in
  // Vercel's webpack build so Redis-backed routes can compile and run there.
  webpack(config){
    config.externals.push("cloudflare:workers");
    return config;
  },
};

export default nextConfig;
