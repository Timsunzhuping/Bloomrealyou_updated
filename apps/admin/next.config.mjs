/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@custom-merch/ui',
    '@custom-merch/shared',
    '@custom-merch/i18n',
    '@custom-merch/sdk',
  ],
};

export default nextConfig;
