'use client';

import { scaleLinear } from 'd3-scale';
import { curveMonotoneX, line } from 'd3-shape';
import { useMemo } from 'react';

interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  className?: string;
}

/** A bare trend mark. The stat beside it carries the numbers. */
export function Sparkline({ values, width = 88, height = 28, className }: SparklineProps) {
  const path = useMemo(() => {
    if (values.length < 2) return '';
    const min = Math.min(...values);
    const max = Math.max(...values);
    const x = scaleLinear()
      .domain([0, values.length - 1])
      .range([1, width - 3]);
    const y = scaleLinear()
      .domain([min, max === min ? min + 1 : max])
      .range([height - 3, 3]);
    return (
      line<number>()
        .x((_, index) => x(index))
        .y((value) => y(value))
        .curve(curveMonotoneX)(values) ?? ''
    );
  }, [values, width, height]);

  return (
    <svg width={width} height={height} aria-hidden className={className}>
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
