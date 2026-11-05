/** Small deterministic PRNG (mulberry32), so every sandbox tells the same story. */
export class Random {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  between(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  int(min: number, max: number): number {
    return Math.floor(this.between(min, max + 1));
  }

  /** Dollars rounded to cents, with a natural-looking tail. */
  cents(minDollars: number, maxDollars: number): number {
    return Math.round(this.between(minDollars, maxDollars) * 100);
  }

  pick<T>(items: readonly T[]): T {
    const item = items[Math.floor(this.next() * items.length)];
    if (item === undefined) throw new Error('Cannot pick from an empty list');
    return item;
  }

  chance(probability: number): boolean {
    return this.next() < probability;
  }

  digits(length: number): string {
    let out = '';
    for (let i = 0; i < length; i += 1) out += String(this.int(0, 9));
    return out;
  }

  reference(): string {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let out = '';
    for (let i = 0; i < 15; i += 1) out += alphabet[this.int(0, alphabet.length - 1)];
    return out;
  }
}
