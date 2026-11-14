import type { NextConfig } from "next";

import path from "node:path";

const nextConfig: NextConfig = {
  /* config options here */
  // Dev only: lets a phone on the same Wi-Fi load hot reload. Set DEV_LAN_IP in .env.local (see .env.example).
  allowedDevOrigins: process.env.DEV_LAN_IP ? [process.env.DEV_LAN_IP] : [],

  turbopack: {
    root: path.resolve(__dirname),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
