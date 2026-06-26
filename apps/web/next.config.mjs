/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@niki/shared-types"],
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
