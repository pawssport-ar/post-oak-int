'use client';

import { animate, useReducedMotion } from 'motion/react';
import { useEffect, useEffectEvent, useRef, useState } from 'react';

interface AnimatedNumberProps {
  value: number;
  format: (value: number) => string;
  /** Skip the tween, for values that track the pointer. */
  instant?: boolean;
  /** Where the very first count starts from. Defaults to the value itself. */
  animateFrom?: number;
  duration?: number;
  className?: string;
}

/**
 * Counts toward its value, so balance changes read as movement rather than a swap.
 * Frames write straight to the DOM, which keeps a running tween out of React's render.
 */
export function AnimatedNumber({
  value,
  format,
  instant = false,
  animateFrom,
  duration = 0.9,
  className,
}: AnimatedNumberProps) {
  const reduced = useReducedMotion();
  const node = useRef<HTMLSpanElement>(null);
  const shown = useRef(animateFrom ?? value);
  const [initialText] = useState(() => format(animateFrom ?? value));

  const paint = useEffectEvent((current: number) => {
    shown.current = current;
    if (node.current) node.current.textContent = format(current);
  });

  useEffect(() => {
    if (instant || reduced) {
      paint(value);
      return;
    }
    const controls = animate(shown.current, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: paint,
    });
    return () => controls.stop();
  }, [value, instant, reduced, duration]);

  return (
    <span ref={node} className={className}>
      {initialText}
    </span>
  );
}
