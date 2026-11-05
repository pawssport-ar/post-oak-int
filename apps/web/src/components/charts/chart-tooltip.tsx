import type { ReactNode } from 'react';

interface ChartTooltipProps {
  /** Pixel position of the mark inside the chart. */
  x: number;
  y: number;
  /** Chart width, used to flip the tooltip away from the right edge. */
  bounds: number;
  title: string;
  children: ReactNode;
}

export function ChartTooltip({ x, y, bounds, title, children }: ChartTooltipProps) {
  const flip = x > bounds - 190;
  return (
    <div
      role="status"
      className="pointer-events-none absolute z-10 min-w-40 rounded-lg border border-line bg-surface px-3 py-2 shadow-pop"
      style={{
        left: x,
        top: y,
        transform: `translate(${flip ? 'calc(-100% - 12px)' : '12px'}, -50%)`,
      }}
    >
      <p className="mb-1 text-[11.5px] font-semibold text-ink-3">{title}</p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

export function TooltipRow({
  color,
  label,
  value,
}: {
  color?: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 text-[12.5px]">
      {color && <span className="h-0.5 w-3 rounded-full" style={{ background: color }} />}
      <span className="numeric font-bold text-ink">{value}</span>
      <span className="ml-auto pl-3 text-ink-3">{label}</span>
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string; line?: boolean }[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5 text-[12px] text-ink-2">
          <span
            className={item.line ? 'h-0.5 w-3.5 rounded-full' : 'size-2.5 rounded-[3px]'}
            style={{ background: item.color }}
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}
