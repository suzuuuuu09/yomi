import Button from "@/components/liftkit/button";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "books.google.com",
        port: "",
        pathname: "/books/content?id=**",
      },
    ],
  },
};

export default nextConfig;
