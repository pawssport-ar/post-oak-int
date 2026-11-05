'use client';

import type { Forecast, ForecastPoint } from '@post-oak/contracts';
import { scaleLinear } from 'd3-scale';
import { area, curveMonotoneX, line } from 'd3-shape';
import { format, parseISO } from 'date-fns';
import { type PointerEvent, useMemo, useState } from 'react';
import { money, moneyCompact } from '@/lib/format';
import { ChartTooltip, TooltipRow } from './chart-tooltip';
import { useSize } from './use-size';

const MARGIN = { top: 14, right: 48, bottom: 26, left: 0 };
const SERIES = 'var(--chart-1)';

/** Expected cash with a widening confidence band, against the treasury's floor. */
export function ForecastChart({ forecast, height = 300 }: { forecast: Forecast; height?: number }) {
  const [ref, { width }] = useSize<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const { points, floor } = forecast;

  const geometry = useMemo(() => {
    if (width === 0 || points.length < 2) return null;
    const min = Math.min(floor, ...points.map((p) => p.low));
    const max = Math.max(...points.map((p) => p.high));
    const x = scaleLinear()
      .domain([0, points.length - 1])
      .range([0, width - MARGIN.right]);
    const y = scaleLinear()
      .domain([min, max])
      .nice(5)
      .range([height - MARGIN.bottom, MARGIN.top]);
    const expected = line<ForecastPoint>()
      .x((_, index) => x(index))
      .y((point) => y(point.expected))
      .curve(curveMonotoneX);
    const band = area<ForecastPoint>()
      .x((_, index) => x(index))
      .y0((point) => y(point.low))
      .y1((point) => y(point.high))
      .curve(curveMonotoneX);
    return { x, y, expected: expected(points) ?? '', band: band(points) ?? '' };
  }, [points, floor, width, height]);

  const onPointerMove = (event: PointerEvent<SVGRectElement>) => {
    if (!geometry) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const index = Math.round(geometry.x.invert(event.clientX - bounds.left));
    setHover(Math.max(0, Math.min(points.length - 1, index)));
  };

  const active = hover === null ? null : points[hover];
  const labelCount = width < 480 ? 3 : 5;

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {geometry && (
        <svg width={width} height={height} className="block" role="img" aria-label="Cash forecast">
          {geometry.y.ticks(5).map((tick) => (
            <g key={tick}>
              <line
                x1={0}
                x2={width - MARGIN.right + 6}
                y1={geometry.y(tick)}
                y2={geometry.y(tick)}
                stroke="var(--chart-grid)"
              />
              <text
                x={width}
                y={geometry.y(tick) + 4}
                textAnchor="end"
                className="numeric fill-ink-3 text-[11px]"
              >
                {moneyCompact(tick)}
              </text>
            </g>
          ))}

          {Array.from({ length: labelCount }, (_, index) => {
            const pointIndex = Math.round((index * (points.length - 1)) / (labelCount - 1));
            const point = points[pointIndex];
            if (!point) return null;
            const anchor = index === 0 ? 'start' : index === labelCount - 1 ? 'end' : 'middle';
            return (
              <text
                key={pointIndex}
                x={geometry.x(pointIndex)}
                y={height - 6}
                textAnchor={anchor}
                className="fill-ink-3 text-[11px]"
              >
                {format(parseISO(point.date), 'MMM d')}
              </text>
            );
          })}

          <path d={geometry.band} fill={SERIES} fillOpacity={0.1} />
          <line
            x1={0}
            x2={width - MARGIN.right}
            y1={geometry.y(floor)}
            y2={geometry.y(floor)}
            stroke="var(--negative)"
            strokeOpacity={0.7}
          />
          <text x={4} y={geometry.y(floor) - 5} className="fill-ink-2 text-[11px] font-semibold">
            Treasury floor {moneyCompact(floor)}
          </text>
          <path
            d={geometry.expected}
            fill="none"
            stroke={SERIES}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {forecast.milestones
            .filter((milestone) => milestone.label !== 'Payroll')
            .map((milestone) => {
              const index = points.findIndex((p) => p.date === milestone.date);
              const point = points[index];
              if (!point) return null;
              return (
                <circle
                  key={`${milestone.date}-${milestone.label}`}
                  cx={geometry.x(index)}
                  cy={geometry.y(point.expected)}
                  r={4}
                  fill="var(--chart-2)"
                  stroke="var(--surface)"
                  strokeWidth={2}
                />
              );
            })}

          {active && hover !== null && (
            <g>
              <line
                x1={geometry.x(hover)}
                x2={geometry.x(hover)}
                y1={MARGIN.top}
                y2={height - MARGIN.bottom}
                stroke="var(--ink-3)"
                strokeOpacity={0.5}
              />
              <circle
                cx={geometry.x(hover)}
                cy={geometry.y(active.expected)}
                r={4.5}
                fill={SERIES}
                stroke="var(--surface)"
                strokeWidth={2}
              />
            </g>
          )}

          <rect
            x={0}
            y={0}
            width={width - MARGIN.right}
            height={height}
            fill="transparent"
            onPointerMove={onPointerMove}
            onPointerLeave={() => setHover(null)}
            style={{ touchAction: 'pan-y' }}
          />
        </svg>
      )}
      {geometry && active && hover !== null && (
        <ChartTooltip
          x={geometry.x(hover)}
          y={geometry.y(active.expected)}
          bounds={width}
          title={format(parseISO(active.date), 'EEE, MMM d')}
        >
          <TooltipRow color={SERIES} label="Expected" value={money(active.expected)} />
          <TooltipRow label="Low" value={moneyCompact(active.low)} />
          <TooltipRow label="High" value={moneyCompact(active.high)} />
        </ChartTooltip>
      )}
    </div>
  );
}
