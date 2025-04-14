import { clerkMiddleware } from "@clerk/nextjs/server";
import createMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';
import { NextRequest } from 'next/server';

const intlMiddleware = createMiddleware(routing);

export default clerkMiddleware((auth, req) => {
  const { pathname } = req.nextUrl;
  
  // Skip internationalization for API routes
  if (pathname.startsWith('/api') || pathname.startsWith('/trpc') || pathname.startsWith('/models')) {
    return null;
  }
  
  return intlMiddleware(req as NextRequest);
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc|models)(.*)',
    // Match all pathnames except for
    // - … if they start with `/api`, `/trpc`, `/_next` or `/_vercel`
    // - … the ones containing a dot (e.g. `favicon.ico`)
    '/((?!api|trpc|models|_next|_vercel|.*\\..*).*)'
  ],
};