'use client';

import { ROLE_LABELS, type Session } from '@post-oak/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast, toastError } from '@/components/ui/toaster';
import { api } from '@/lib/api/client';

/** Steps into another team member, so reviewers can walk both sides of an approval. */
export function useSwitchPersona(options: { redirectTo?: string } = {}) {
  const client = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (userId: string) =>
      api<Session>('/session/persona', { method: 'POST', body: { userId } }),
    onSuccess: (next) => {
      client.setQueryData(['session'], next);
      void client.invalidateQueries();
      const fallback = next.permissions.includes('accounts:view') ? '/' : '/cards';
      router.push(options.redirectTo ?? fallback);
      toast({
        title: `Now acting as ${next.user.name}`,
        description: `${ROLE_LABELS[next.user.role]}. Menus, data and API access follow this role.`,
        tone: 'positive',
      });
    },
    onError: toastError,
  });
}
