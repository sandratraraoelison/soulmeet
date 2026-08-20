import { describe, expect, it } from 'vitest';
import { displaySoulprintValue } from './entry-card';

describe('displaySoulprintValue', () => {
  it('renders strings, arrays and nested objects', () => {
    expect(displaySoulprintValue('hello')).toBe('hello');
    expect(displaySoulprintValue(['a', 'b'])).toBe('a, b');
    expect(displaySoulprintValue({ key: 'value' })).toBe('key: value');
    expect(displaySoulprintValue({ a: ['x', 'y'] })).toBe('a: x, y');
  });

  it('renders nullish and numbers safely', () => {
    expect(displaySoulprintValue(null)).toBe('');
    expect(displaySoulprintValue(undefined)).toBe('');
    expect(displaySoulprintValue(42)).toBe('42');
  });
});