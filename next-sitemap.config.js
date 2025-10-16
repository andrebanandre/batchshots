/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.SITE_URL || 'https://www.batchshots.com',
  generateRobotsTxt: true,
  changefreq: 'weekly',
  priority: 0.7,
  sitemapSize: 5000,
  output: 'export', // Next.js static export mode

  // Multi-language support - alternateRefs for all locales
  alternateRefs: [
    {
      href: (config) => `${config.siteUrl}/en{path}`,
      hreflang: 'en',
    },
    {
      href: (config) => `${config.siteUrl}/de{path}`,
      hreflang: 'de',
    },
    {
      href: (config) => `${config.siteUrl}/nl{path}`,
      hreflang: 'nl',
    },
    {
      href: (config) => `${config.siteUrl}/fr{path}`,
      hreflang: 'fr',
    },
    {
      href: (config) => `${config.siteUrl}/pl{path}`,
      hreflang: 'pl',
    },
    {
      href: (config) => `${config.siteUrl}/cs{path}`,
      hreflang: 'cs',
    },
    {
      href: (config) => `${config.siteUrl}/ru{path}`,
      hreflang: 'ru',
    },
    {
      href: (config) => `${config.siteUrl}/uk{path}`,
      hreflang: 'uk',
    },
  ],

  // Transform function to handle multi-language URLs
  transform: async (config, path) => {
    // Skip certain paths that shouldn't be in sitemap
    const excludePatterns = [
      '/api/',
      '/_next/',
      '/404',
      '/500'
    ];

    if (excludePatterns.some(pattern => path.startsWith(pattern))) {
      return null;
    }

    // Define all supported locales
    const locales = ['en', 'de', 'nl', 'fr', 'pl', 'cs', 'ru', 'uk'];

    // Check if this path has a locale prefix
    const pathParts = path.split('/').filter(Boolean);
    const firstPart = pathParts[0];

    if (locales.includes(firstPart)) {
      // This is a localized path (e.g., /en/backgrounds, /de/backgrounds)
      // Extract the base path without locale
      const basePath = '/' + pathParts.slice(1).join('/');

      // Include all language variants in the sitemap, each with alternateRefs
      return {
        loc: path,
        changefreq: config.changefreq,
        priority: config.priority,
        lastmod: new Date().toISOString(),
        alternateRefs: config.alternateRefs?.map(ref => ({
          href: ref.href(config).replace('{path}', basePath),
          hreflang: ref.hreflang,
        })),
      };
    }

    // For paths without locale prefix (static assets)
    if (path === '/') {
      return {
        loc: '/',
        changefreq: config.changefreq,
        priority: 1.0,
        lastmod: new Date().toISOString(),
        alternateRefs: config.alternateRefs?.map(ref => ({
          href: ref.href(config).replace('{path}', ''),
          hreflang: ref.hreflang,
        })),
      };
    }

    // For static assets, don't add alternateRefs
    return {
      loc: path,
      changefreq: config.changefreq,
      priority: config.priority,
      lastmod: new Date().toISOString(),
    };
  },

  // Exclude certain paths
  exclude: [
    '/api/*',
    '/_next/*',
    '/404',
    '/500',
    '/server-sitemap*'
  ],

  // Robots.txt options
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
      },
    ],
  },
};
