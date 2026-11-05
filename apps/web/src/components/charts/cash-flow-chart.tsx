'use client';

import type { CashFlowMonth } from '@post-oak/contracts';
import { scaleBand, scaleLinear } from 'd3-scale';
import { motion, useReducedMotion } from 'motion/react';
import { useMemo, useState } from 'react';
import { money, moneyCompact } from '@/lib/format';
import { ChartTooltip, TooltipRow } from './chart-tooltip';
import { useSize } from './use-size';

interface CashFlowChartProps {
  data: CashFlowMonth[];
  height?: number;
}

const MARGIN = { top: 12, right: 44, bottom: 24, left: 0 };
const IN = 'var(--chart-1)';
const OUT = 'var(--chart-2)';

/** Rounded at the data end, square at the baseline. */
function columnPath(x: number, y: number, width: number, height: number, up: boolean): string {
  const radius = Math.min(4, width / 2, height);
  if (height <= 0) return '';
  if (up) {
    return `M${x},${y + height}V${y + radius}Q${x},${y} ${x + radius},${y}H${x + width - radius}Q${x + width},${y} ${x + width},${y + radius}V${y + height}Z`;
  }
  return `M${x},${y}V${y + height - radius}Q${x},${y + height} ${x + radius},${y + height}H${x + width - radius}Q${x + width},${y + height} ${x + width},${y + height - radius}V${y}Z`;
}

/** Money in rises from the baseline and money out falls from it, on one shared scale. */
export function CashFlowChart({ data, height = 260 }: CashFlowChartProps) {
  const [ref, { width }] = useSize<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const reduced = useReducedMotion();

  const scales = useMemo(() => {
    if (width === 0) return null;
    const extent = Math.max(...data.flatMap((m) => [m.inflow, m.outflow]), 1);
    const x = scaleBand<number>()
      .domain(data.map((_, index) => index))
      .range([MARGIN.left, width - MARGIN.right])
      .paddingInner(0.3)
      .paddingOuter(0.1);
    const y = scaleLinear()
      .domain([-extent, extent])
      .nice(4)
      .range([height - MARGIN.bottom, MARGIN.top]);
    return { x, y };
  }, [data, width, height]);

  const active = hover === null ? null : data[hover];

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {scales && (
        <svg
          width={width}
          height={height}
          className="block"
          role="img"
          aria-label="Monthly cash flow"
        >
          {scales.y.ticks(4).map((tick) => (
            <g key={tick}>
              <line
                x1={0}
                x2={width - MARGIN.right + 6}
                y1={scales.y(tick)}
                y2={scales.y(tick)}
                stroke={tick === 0 ? 'var(--line-strong)' : 'var(--chart-grid)'}
              />
              <text
                x={width}
                y={scales.y(tick) + 4}
                textAnchor="end"
                className="numeric fill-ink-3 text-[11px]"
              >
                {moneyCompact(tick)}
              </text>
            </g>
          ))}

          {data.map((month, index) => {
            const band = scales.x(index) ?? 0;
            const barWidth = Math.min(24, scales.x.bandwidth());
            const left = band + (scales.x.bandwidth() - barWidth) / 2;
            const zero = scales.y(0);
            const inHeight = zero - scales.y(month.inflow);
            const outHeight = scales.y(-month.outflow) - zero;
            const dimmed = hover !== null && hover !== index;
            const delay = reduced ? 0 : index * 0.035;
            return (
              <g
                key={month.month}
                opacity={dimmed ? 0.45 : month.partial ? 0.65 : 1}
                style={{ transition: 'opacity 140ms' }}
              >
                <motion.path
                  d={columnPath(left, zero - inHeight - 1, barWidth, inHeight, true)}
                  fill={IN}
                  style={{ originY: 1 }}
                  initial={{ scaleY: reduced ? 1 : 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
                />
                <motion.path
                  d={columnPath(left, zero + 1, barWidth, outHeight, false)}
                  fill={OUT}
                  style={{ originY: 0 }}
                  initial={{ scaleY: reduced ? 1 : 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 0.6, delay: delay + 0.05, ease: [0.22, 1, 0.36, 1] }}
                />
                <text
                  x={band + scales.x.bandwidth() / 2}
                  y={height - 6}
                  textAnchor="middle"
                  className="fill-ink-3 text-[11px]"
                >
                  {width < 460 && index % 2 === 1 ? '' : month.label}
                </text>
                <rect
                  x={band - 4}
                  y={0}
                  width={scales.x.bandwidth() + 8}
                  height={height}
                  fill="transparent"
                  tabIndex={0}
                  aria-label={`${month.label}: in ${money(month.inflow)}, out ${money(month.outflow)}`}
                  className="outline-none"
                  onPointerEnter={() => setHover(index)}
                  onPointerLeave={() => setHover(null)}
                  onFocus={() => setHover(index)}
                  onBlur={() => setHover(null)}
                />
              </g>
            );
          })}
        </svg>
      )}
      {scales && active && hover !== null && (
        <ChartTooltip
          x={(scales.x(hover) ?? 0) + scales.x.bandwidth() / 2}
          y={height / 2}
          bounds={width}
          title={`${active.label}${active.partial ? ', month to date' : ''}`}
        >
          <TooltipRow color={IN} label="Money in" value={money(active.inflow)} />
          <TooltipRow color={OUT} label="Money out" value={money(active.outflow)} />
          <TooltipRow label="Net" value={money(active.net, { signed: true })} />
        </ChartTooltip>
      )}
    </div>
  );
}
