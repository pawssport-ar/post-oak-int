'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { type ReactNode, useState } from 'react';
import { Tooltip } from 'radix-ui';
import { Toaster } from '@/components/ui/toaster';
import { ApiError } from '@/lib/api/client';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: (count, error) =>
              !(error instanceof ApiError && error.status < 500) && count < 2,
          },
        },
      }),
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        <NuqsAdapter>
          <Tooltip.Provider delayDuration={250}>
            {children}
            <Toaster />
          </Tooltip.Provider>
        </NuqsAdapter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
