import type { InvoiceLine } from '@post-oak/contracts';
import { ColumnMark } from '@/components/brand/logo';
import { Amount } from '@/components/ui/amount';
import { cn } from '@/lib/cn';
import { longDate, money } from '@/lib/format';

interface InvoicePaperProps {
  number: string;
  company: string;
  customer: string;
  customerEmail: string;
  issuedOn: string;
  dueOn: string;
  lines: InvoiceLine[];
  subtotal: number;
  tax: number;
  total: number;
  memo?: string | null;
  className?: string;
}

/** The document the customer receives, shown exactly as they would see it. */
export function InvoicePaper({
  number,
  company,
  customer,
  customerEmail,
  issuedOn,
  dueOn,
  lines,
  subtotal,
  tax,
  total,
  memo,
  className,
}: InvoicePaperProps) {
  return (
    <article
      className={cn(
        'rounded-lg border border-line-strong bg-white p-6 text-[13px] text-[#231f20] shadow-card',
        className,
      )}
    >
      <header className="flex items-start justify-between gap-4 border-b border-[#193e2c]/20 pb-4">
        <div>
          <p className="font-display text-[20px] leading-tight">{company}</p>
          <p className="mt-0.5 text-[12px] text-[#5a5853]">Houston, Texas</p>
        </div>
        <div className="text-right">
          <p className="font-display text-[24px] leading-none tracking-[0.04em] text-[#193e2c]">
            INVOICE
          </p>
          <p className="numeric mt-1 text-[12px] text-[#5a5853]">{number}</p>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4 py-4">
        <div>
          <p className="text-[10.5px] font-bold tracking-[0.1em] text-[#8b8982] uppercase">
            Bill to
          </p>
          <p className="mt-1 font-semibold">{customer || 'Customer name'}</p>
          <p className="text-[12px] text-[#5a5853]">{customerEmail}</p>
        </div>
        <div className="text-right">
          <p className="text-[10.5px] font-bold tracking-[0.1em] text-[#8b8982] uppercase">
            Issued
          </p>
          <p className="mt-1">{issuedOn ? longDate(issuedOn) : '—'}</p>
          <p className="mt-2 text-[10.5px] font-bold tracking-[0.1em] text-[#8b8982] uppercase">
            Due
          </p>
          <p className="mt-1">{dueOn ? longDate(dueOn) : '—'}</p>
        </div>
      </div>

      <table className="w-full border-y border-[#193e2c]/20">
        <thead>
          <tr className="text-left text-[10.5px] tracking-[0.08em] text-[#8b8982] uppercase">
            <th className="py-2 font-bold">Description</th>
            <th className="w-12 py-2 text-right font-bold">Qty</th>
            <th className="w-24 py-2 text-right font-bold">Rate</th>
            <th className="w-28 py-2 text-right font-bold">Amount</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, index) => (
            <tr key={index} className="border-t border-[#193e2c]/10 align-top">
              <td className="py-2 pr-2">{line.description || 'Line description'}</td>
              <td className="numeric py-2 text-right">{line.quantity}</td>
              <td className="numeric py-2 text-right">{money(line.unitPrice)}</td>
              <td className="numeric py-2 text-right font-semibold">
                {money(Math.round(line.quantity * line.unitPrice))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <dl className="mt-3 ml-auto w-56 space-y-1">
        <div className="flex justify-between text-[#5a5853]">
          <dt>Subtotal</dt>
          <dd className="numeric">{money(subtotal)}</dd>
        </div>
        {tax > 0 && (
          <div className="flex justify-between text-[#5a5853]">
            <dt>Tax</dt>
            <dd className="numeric">{money(tax)}</dd>
          </div>
        )}
        <div className="flex items-baseline justify-between border-t border-[#193e2c]/30 pt-1.5">
          <dt className="font-bold">Total due</dt>
          <dd className="font-display text-[20px]">
            <Amount cents={total} />
          </dd>
        </div>
      </dl>

      {memo && <p className="mt-3 text-[12.5px] text-[#5a5853]">{memo}</p>}

      <footer className="mt-5 flex items-center gap-2 border-t border-[#193e2c]/20 pt-3 text-[11.5px] text-[#5a5853]">
        <ColumnMark className="h-4 w-auto text-[#193e2c]" />
        Pay by ACH or wire through Post Oak Business Banking.
      </footer>
    </article>
  );
}
