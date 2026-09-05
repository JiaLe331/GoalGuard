import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ngrok assigns a new subdomain for each free tunnel. This development-only
  // allowlist lets the tunnel load Next.js dev assets without hard-coding one URL.
  allowedDevOrigins: ["127.0.0.1", "*.ngrok-free.dev"],
  poweredByHeader: false,
  serverExternalPackages: ["@thetanuts-finance/thetanuts-client"],
};

export default nextConfig;
