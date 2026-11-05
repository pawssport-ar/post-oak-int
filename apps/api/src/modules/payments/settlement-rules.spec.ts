import { estimateArrival } from './settlement-rules.js';

// 2026-11-04 is a Wednesday. Central Time is UTC-6 in November.
const wednesdayMorning = new Date('2026-11-04T16:00:00Z');
const wednesdayEvening = new Date('2026-11-04T23:30:00Z');
const fridayEvening = new Date('2026-11-06T23:30:00Z');
const saturday = new Date('2026-11-07T16:00:00Z');

describe('estimateArrival', () => {
  it('lands a wire the same day before the Fedwire cut-off', () => {
    const estimate = estimateArrival('wire', wednesdayMorning);
    expect(estimate.afterCutoff).toBe(false);
    expect(estimate.label).toBe('Today');
  });

  it('rolls a late wire to the next business day', () => {
    const estimate = estimateArrival('wire', wednesdayEvening);
    expect(estimate.afterCutoff).toBe(true);
    expect(estimate.at.toISOString().slice(0, 10)).toBe('2026-11-05');
  });

  it('skips the weekend for a Friday evening wire', () => {
    const estimate = estimateArrival('wire', fridayEvening);
    expect(estimate.at.toISOString().slice(0, 10)).toBe('2026-11-09');
  });

  it('treats weekends as after cut-off', () => {
    expect(estimateArrival('ach', saturday).afterCutoff).toBe(true);
  });

  it('settles ACH on the next business day', () => {
    const estimate = estimateArrival('ach', wednesdayMorning);
    expect(estimate.at.toISOString().slice(0, 10)).toBe('2026-11-05');
  });

  it('settles instant and internal rails right away', () => {
    expect(estimateArrival('rtp', saturday).at).toEqual(saturday);
    expect(estimateArrival('book', saturday).at).toEqual(saturday);
  });
});
