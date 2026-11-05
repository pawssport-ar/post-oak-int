'use client';

import { ArrowRight } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Panel, PanelHeader } from '@/components/ui/panel';
import { RowsSkeleton } from '@/components/ui/skeleton';
import { TransactionRow } from '@/features/transactions/transaction-row';
import { useRecentTransactions } from '@/lib/api/queries';

export function RecentActivity() {
  const router = useRouter();
  const { data } = useRecentTransactions(8);

  return (
    <Panel className="overflow-hidden">
      <PanelHeader
        title="Recent activity"
        description="Updates live as the ledger moves"
        action={
          <Link
            href="/transactions"
            className="group flex items-center gap-1 text-[13px] font-semibold text-ink-2 transition-colors hover:text-ink"
          >
            All transactions
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        }
      />
      {data ? (
        <ul className="divide-y divide-line border-t border-line">
          <AnimatePresence initial={false}>
            {data.items.map((transaction) => (
              <motion.li
                key={transaction.id}
                layout="position"
                initial={{ opacity: 0, backgroundColor: 'var(--accent-soft)' }}
                animate={{ opacity: 1, backgroundColor: 'rgba(0,0,0,0)' }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.9 }}
              >
                <TransactionRow
                  transaction={transaction}
                  onOpen={(id) => router.push(`/transactions?id=${id}`)}
                />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      ) : (
        <RowsSkeleton rows={8} />
      )}
    </Panel>
  );
}
