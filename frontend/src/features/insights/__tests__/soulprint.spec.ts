import { displayValue, getSoulprintErrorMessage } from '../api/soulprint.api';
import { soulprintKeys } from '../api/soulprint.query-keys';
import {
  PRIMARY_CATEGORIES,
  SOULPRINT_CATEGORY_META,
  VISIBILITY_META,
} from '../constants/soulprint.constants';
import { SOULPRINT_CATEGORIES } from '../types/soulprint.types';

describe('Soulprint frontend contract', () => {
  it('defines metadata for every backend category', () => {
    expect(Object.keys(SOULPRINT_CATEGORY_META)).toHaveLength(
      SOULPRINT_CATEGORIES.length,
    );
    SOULPRINT_CATEGORIES.forEach((category) =>
      expect(SOULPRINT_CATEGORY_META[category].label).toBeTruthy(),
    );
  });
  it('keeps primary categories unique', () =>
    expect(new Set(PRIMARY_CATEGORIES).size).toBe(PRIMARY_CATEGORIES.length));
  it('documents every visibility option', () =>
    expect(Object.keys(VISIBILITY_META)).toEqual([
      'PRIVATE',
      'GUIDANCE_ONLY',
      'MATCHING_ALLOWED',
    ]));
  it('builds hierarchical query keys', () => {
    expect(soulprintKeys.overview()).toEqual(['soulprint', 'overview']);
    expect(soulprintKeys.entry('entry-1')).toEqual([
      'soulprint',
      'entries',
      'detail',
      'entry-1',
    ]);
    expect(soulprintKeys.entryList({ category: 'CORE_VALUE' })).toEqual([
      'soulprint',
      'entries',
      { category: 'CORE_VALUE' },
    ]);
  });
  it.each([
    ['plain text', 'plain text'],
    [['kind', 'curious'], 'kind, curious'],
    [{ pace: 'slow', tone: 'warm' }, 'pace: slow · tone: warm'],
    [null, ''],
  ])('formats API values safely', (value, expected) =>
    expect(displayValue(value)).toBe(expected),
  );
  it('maps a backend error code to friendly copy', () => {
    const error = {
      isAxiosError: true,
      response: { data: { error: { code: 'ENTRY_NOT_FOUND' } } },
    };
    expect(getSoulprintErrorMessage(error)).toBe(
      'This detail no longer exists.',
    );
  });
  it('uses backend error text when no code is known', () => {
    const error = {
      isAxiosError: true,
      response: { data: { error: { message: 'Custom failure' } } },
    };
    expect(getSoulprintErrorMessage(error)).toBe('Custom failure');
  });
  it('handles ordinary errors', () =>
    expect(getSoulprintErrorMessage(new Error('Offline'))).toBe('Offline'));
});
