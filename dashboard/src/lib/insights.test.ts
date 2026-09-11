import { describe, expect, it } from 'vitest';
import { changeLabel, rate } from './insights';
describe('Metric presentation', () => {
  it('does not invent percentage growth from zero', () => {
    expect(changeLabel(10, 0)).toBe('New activity (+10)');
    expect(changeLabel(0, 0)).toBe('No change');
    expect(changeLabel(0, 10)).toBe('-100% vs previous period');
    expect(changeLabel(15, 10)).toBe('+50% vs previous period');
  });
  it('distinguishes no eligible cohort from zero retention', () => {
    expect(rate(0, 0)).toBe('Not enough data');
    expect(rate(0, 5)).toBe('0%');
  });
});
