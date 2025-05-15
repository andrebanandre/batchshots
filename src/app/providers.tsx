'use client'

import { NextIntlClientProvider } from 'next-intl'
import React, { useEffect, Suspense } from 'react'
import { usePathname, useSearchParams } from "next/navigation"
import { usePostHog } from 'posthog-js/react'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'

interface ProvidersProps {
  children: React.ReactNode;
  intlProps: Omit<React.ComponentProps<typeof NextIntlClientProvider>, 'children'>;
}

// This is the PostHogProvider defined below
function InternalPostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY as string, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com',
      person_profiles: 'identified_only', // or 'always' to create profiles for anonymous users as well
      capture_pageview: false // Disable automatic pageview capture, as we capture manually
    })
  }, [])

  return (
    <PHProvider client={posthog}>
      <SuspendedPostHogPageView />
      {children}
    </PHProvider>
  )
}

function PostHogPageView() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const posthogClient = usePostHog() // Renamed to avoid conflict with the imported posthog

  // Track pageviews
  useEffect(() => {
    if (pathname && posthogClient) {
      let url = window.origin + pathname
      if (searchParams.toString()) {
        url = url + "?" + searchParams.toString();
      }
      posthogClient.capture('$pageview', { '$current_url': url })
    }
  }, [pathname, searchParams, posthogClient])

  return null
}

function SuspendedPostHogPageView() {
  return (
    <Suspense fallback={null}>
      <PostHogPageView />
    </Suspense>
  )
}

export function Providers({ children, intlProps }: ProvidersProps) {
  return (
    <NextIntlClientProvider {...intlProps}>
      <InternalPostHogProvider>
        {children}
      </InternalPostHogProvider>
    </NextIntlClientProvider>
  )
} 