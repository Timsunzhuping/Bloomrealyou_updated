import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@custom-merch/ui',
    '@custom-merch/shared',
    '@custom-merch/i18n',
    '@custom-merch/sdk',
  ],
  experimental: {
    typedRoutes: false,
  },
  webpack: (config) => {
    // Konva ships a Node-only entry that pulls in the optional `canvas`
    // peer dep when bundled for the server. We render the customizer with
    // `dynamic({ ssr: false })`, so flagging it as external silences the
    // build-time lookup without breaking client output.
    config.externals = [...(config.externals || []), { canvas: 'commonjs canvas' }];
    return config;
  },
};

export default withNextIntl(nextConfig);
