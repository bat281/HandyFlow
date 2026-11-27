import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@react-pdf/renderer", "sharp"],
  poweredByHeader: false,
};

export default nextConfig;
