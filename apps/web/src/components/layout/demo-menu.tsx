'use client';

import { ROLE_LABELS } from '@post-oak/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, FileCode2, RotateCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Monogram } from '@/components/ui/monogram';
import { toast, toastError } from '@/components/ui/toaster';
import { useSwitchPersona } from '@/features/session/use-switch-persona';
import { api } from '@/lib/api/client';
import { useSession } from '@/lib/api/queries';
import { cn } from '@/lib/cn';

/** Lets a reviewer step into any role and see the permissions change, end to end. */
export function DemoMenu() {
  const client = useQueryClient();
  const router = useRouter();
  const { data: session } = useSession();
  const switchPersona = useSwitchPersona();

  const reset = useMutation({
    mutationFn: () => api('/session/reset', { method: 'POST' }),
    onSuccess: () => {
      void client.invalidateQueries();
      router.push('/');
      toast({ title: 'Sandbox restored', description: 'All sample data is back to its start.' });
    },
    onError: toastError,
  });

  return (
    <div className="p-1.5">
      <p className="px-2 pt-1.5 pb-1 text-[11px] font-bold tracking-[0.08em] text-ink-3 uppercase">
        View as
      </p>
      <ul>
        {session?.personas.map((persona) => {
          const active = persona.id === session.user.id;
          return (
            <li key={persona.id}>
              <button
                type="button"
                onClick={() => !active && switchPersona.mutate(persona.id)}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-surface-2',
                  active && 'bg-surface-2',
                )}
              >
                <Monogram name={persona.name} initials={persona.initials} size="sm" round />
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block truncate text-[13px] font-bold text-ink">
                    {persona.name}
                  </span>
                  <span className="block truncate text-[11.5px] text-ink-3">
                    {ROLE_LABELS[persona.role]}
                  </span>
                </span>
                {active && <Check className="size-4 text-positive" />}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="my-1.5 h-px bg-line" />
      <button
        type="button"
        onClick={() => reset.mutate()}
        className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-[13px] font-semibold text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
      >
        <RotateCcw className="size-4" />
        Reset sample data
      </button>
      <a
        href="/docs"
        target="_blank"
        rel="noreferrer"
        className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-[13px] font-semibold text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
      >
        <FileCode2 className="size-4" />
        API reference
      </a>
      <p className="px-2 pt-1.5 pb-1.5 text-[11.5px] leading-snug text-ink-3">
        Case study prepared for The Post Oak Group by Nicolas Lahoz. All data is fictional and no
        real money moves.
      </p>
    </div>
  );
}
