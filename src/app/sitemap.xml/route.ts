import { routing } from '@/i18n/routing';
import { getPathname } from '@/i18n/navigation';
import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

// Define your site URL
const host = 'https://www.batchshots.com';

// Directories to exclude from sitemap
const excludeFromSitemap = [
  'api',
  'components',
  'contexts',
  'hooks',
  'lib',
  'types',
  'utils',
  '[...not_found]'
];

// Automatically detect routes from [locale] directory
function getRoutes() {
  const localeDir = path.join(process.cwd(), 'src/app/[locale]');
  const mainRoute = '/'; // Include the main route

  try {
    // Get directories in [locale] folder
    const items = fs.readdirSync(localeDir, { withFileTypes: true });
    
    // Filter directories and convert to routes
    const routes = items
      .filter(item => {
        // Only include directories that aren't in the exclude list
        return item.isDirectory() && !excludeFromSitemap.includes(item.name);
      })
      .map(dir => `/${dir.name}`);
    
    // Add the main route
    return [mainRoute, ...routes];
  } catch (error) {
    console.error('Error reading routes directory:', error);
    // Fallback to basic routes if there's an error
    return [mainRoute, '/pricing', '/terms', '/privacy'];
  }
}

// Generate XML sitemap string
function generateSitemapXml() {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" ';
  xml += 'xmlns:xhtml="http://www.w3.org/1999/xhtml">\n';

  const routes = getRoutes();

  routes.forEach((route) => {
    routing.locales.forEach((locale) => {
      const localeUrl = `${host}${getPathname({ locale, href: route })}`;
      
      // Add URL entry
      xml += '  <url>\n';
      xml += `    <loc>${localeUrl}</loc>\n`;
      xml += '    <lastmod>' + new Date().toISOString() + '</lastmod>\n';
      xml += '    <changefreq>weekly</changefreq>\n';
      xml += '    <priority>' + (route === '/' ? '1.0' : '0.8') + '</priority>\n';
      
      // Add hreflang annotations for all locales
      routing.locales.forEach((hrefLocale) => {
        const hrefUrl = `${host}${getPathname({ locale: hrefLocale, href: route })}`;
        xml += `    <xhtml:link\n`;
        xml += `               rel="alternate"\n`;
        xml += `               hreflang="${hrefLocale}"\n`;
        xml += `               href="${hrefUrl}"/>\n`;
      });
      
      // Add x-default hreflang
      xml += `    <xhtml:link\n`;
      xml += `               rel="alternate"\n`;
      xml += `               hreflang="x-default"\n`;
      xml += `               href="${host}${getPathname({ locale: routing.defaultLocale, href: route })}"/>\n`;
      
      xml += '  </url>\n';
    });
  });

  xml += '</urlset>';
  return xml;
}

export async function GET() {
  return new NextResponse(generateSitemapXml(), {
    headers: {
      'Content-Type': 'application/xml'
    }
  });
} 