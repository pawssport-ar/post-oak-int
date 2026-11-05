'use client';

import type { CardDesign, CardKind } from '@post-oak/contracts';
import { Snowflake, Wifi } from 'lucide-react';
import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from 'motion/react';
import { type PointerEvent, useRef } from 'react';
import { ColumnMark } from '@/components/brand/logo';
import { cn } from '@/lib/cn';

const DESIGNS: Record<CardDesign, { base: string; ink: string; muted: string; texture: string }> = {
  oak: {
    base: 'bg-[linear-gradient(135deg,#1f4a35_0%,#193e2c_46%,#0f2a1d_100%)]',
    ink: 'text-[#f4efe2]',
    muted: 'text-[#f4efe2]/60',
    texture: 'flutes opacity-70',
  },
  graphite: {
    base: 'bg-[linear-gradient(135deg,#3a3a3c_0%,#231f20_52%,#131112_100%)]',
    ink: 'text-[#ece7da]',
    muted: 'text-[#ece7da]/55',
    texture: 'flutes opacity-40',
  },
  ivory: {
    base: 'bg-[linear-gradient(135deg,#fbf8f0_0%,#f0ead9_55%,#e3dcc6_100%)]',
    ink: 'text-[#193e2c]',
    muted: 'text-[#193e2c]/60',
    texture: 'opacity-0',
  },
};

function Chip() {
  return (
    <svg viewBox="0 0 44 34" className="h-[30px] w-auto" aria-hidden>
      <defs>
        <linearGradient id="chip-gold" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#ecd9a6" />
          <stop offset="0.5" stopColor="#c9a862" />
          <stop offset="1" stopColor="#a8894a" />
        </linearGradient>
      </defs>
      <rect x="0.5" y="0.5" width="43" height="33" rx="6" fill="url(#chip-gold)" />
      <path
        d="M0 11h13c2 0 3 1.5 3 3v6c0 1.5-1 3-3 3H0M44 11H31c-2 0-3 1.5-3 3v6c0 1.5 1 3 3 3h13M16 0v9M28 0v9M16 34v-9M28 34v-9"
        fill="none"
        stroke="#7a6232"
        strokeOpacity="0.55"
        strokeWidth="1"
      />
    </svg>
  );
}

interface CardArtProps {
  design: CardDesign;
  kind: CardKind;
  nickname: string;
  holderName: string;
  last4: string;
  expiry: string;
  frozen?: boolean;
  /** Full number once revealed. */
  number?: string | undefined;
  cvc?: string | undefined;
  tilt?: boolean;
  className?: string;
}

/**
 * A card you want to hold. It tilts toward the pointer with a moving sheen, and a
 * frozen card frosts over rather than just changing a label.
 */
export function CardArt({
  design,
  kind,
  nickname,
  holderName,
  last4,
  expiry,
  frozen = false,
  number,
  cvc,
  tilt = false,
  className,
}: CardArtProps) {
  const ref = useRef<HTMLDivElement>(null);
  const pointerX = useMotionValue(0.5);
  const pointerY = useMotionValue(0.5);
  const spring = { stiffness: 220, damping: 22 };
  const rotateX = useSpring(useTransform(pointerY, [0, 1], [8, -8]), spring);
  const rotateY = useSpring(useTransform(pointerX, [0, 1], [-11, 11]), spring);
  const sheenX = useTransform(pointerX, [0, 1], ['0%', '100%']);
  const sheenY = useTransform(pointerY, [0, 1], ['0%', '100%']);
  const sheen = useMotionTemplate`radial-gradient(420px circle at ${sheenX} ${sheenY}, rgba(255,255,255,0.2), transparent 55%)`;

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!tilt || !ref.current) return;
    const bounds = ref.current.getBoundingClientRect();
    pointerX.set((event.clientX - bounds.left) / bounds.width);
    pointerY.set((event.clientY - bounds.top) / bounds.height);
  };

  const onPointerLeave = () => {
    pointerX.set(0.5);
    pointerY.set(0.5);
  };

  const styles = DESIGNS[design];

  return (
    <div className={cn('[perspective:1200px]', className)}>
      <motion.div
        ref={ref}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        style={tilt ? { rotateX, rotateY, transformStyle: 'preserve-3d' } : undefined}
        className={cn(
          'relative aspect-[1.586] w-full overflow-hidden rounded-[18px] shadow-[0_24px_48px_-16px_rgb(11_31_21/0.45),0_4px_12px_rgb(11_31_21/0.18)]',
          styles.base,
          styles.ink,
        )}
      >
        <div aria-hidden className={cn('absolute inset-0', styles.texture)} />
        <ColumnMark
          aria-hidden
          className="absolute -right-[6%] -bottom-[18%] h-[120%] w-auto opacity-[0.07]"
        />
        {tilt && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{ backgroundImage: sheen }}
          />
        )}

        <div className="absolute inset-0 flex flex-col justify-between p-[6.5%]">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <ColumnMark className="h-[26px] w-auto" />
              <div className="leading-none">
                <p className="font-display text-[15px] tracking-[0.04em]">POST OAK</p>
                <p className={cn('mt-0.5 text-[8.5px] font-bold tracking-[0.16em]', styles.muted)}>
                  BUSINESS DEBIT
                </p>
              </div>
            </div>
            <p className={cn('text-[10px] font-bold tracking-[0.14em] uppercase', styles.muted)}>
              {kind}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {kind === 'physical' ? <Chip /> : <span className="h-[30px]" />}
            {kind === 'physical' && <Wifi className={cn('size-5 rotate-90', styles.muted)} />}
          </div>

          <div>
            <p className="numeric font-display text-[clamp(17px,5.4cqw,23px)] tracking-[0.11em]">
              {number ?? `•••• •••• •••• ${last4}`}
            </p>
            <div className="mt-1.5 flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[12px] font-semibold">{holderName}</p>
                <p className={cn('truncate text-[10.5px]', styles.muted)}>{nickname}</p>
              </div>
              <div className="shrink-0 text-right leading-tight">
                <p className={cn('text-[8.5px] font-bold tracking-[0.12em]', styles.muted)}>
                  {cvc ? `CVC ${cvc}` : 'VALID THRU'}
                </p>
                <p className="numeric text-[12px] font-semibold">{expiry}</p>
              </div>
            </div>
          </div>
        </div>

        {frozen && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#dbe7ef]/45 backdrop-blur-[3px]">
            <span className="flex items-center gap-1.5 rounded-full bg-white/85 px-3 py-1.5 text-[12.5px] font-bold text-[#2f5578]">
              <Snowflake className="size-3.5" />
              Frozen
            </span>
          </div>
        )}
      </motion.div>
    </div>
  );
}
