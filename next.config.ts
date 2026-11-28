import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Loaded with Node's own require at runtime, not bundled.
  serverExternalPackages: ["@react-pdf/renderer", "pdfkit", "sharp"],
  // pdfkit loads its standard fonts (Helvetica…) with a dynamic require that
  // Vercel's file tracing can't see, so ship those files with the PDF route.
  outputFileTracingIncludes: {
    "/api/interventions/[id]/pdf": [
      "./node_modules/pdfkit/js/standard-fonts/**/*",
      "./node_modules/pdfkit/js/data/**/*",
    ],
  },
  poweredByHeader: false,
};

export default nextConfig;
