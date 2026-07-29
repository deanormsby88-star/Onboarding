import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // The app lives inside the Onboarding repo next to other Heya apps; trace
  // from this directory so the standalone bundle has server.js at its root.
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
