import { themePalettes, visualStyleOptions } from '../theme.store';

describe('visual styles', () => {
  it('offers inclusive style names without gender labels', () => {
    expect(visualStyleOptions.map((option) => option.id)).toEqual(['soft', 'balanced', 'bold']);
    expect(visualStyleOptions.map((option) => option.label).join(' ').toLowerCase()).not.toMatch(/female|male|feminine|masculine/);
  });

  it('provides distinct light and dark palettes for every style', () => {
    for (const option of visualStyleOptions) {
      expect(themePalettes[option.id].dark.canvas).not.toBe(themePalettes[option.id].light.canvas);
      expect(themePalettes[option.id].dark.primary).toMatch(/^#[0-9A-F]{6}$/i);
      expect(themePalettes[option.id].light.primary).toMatch(/^#[0-9A-F]{6}$/i);
    }
    expect(new Set(visualStyleOptions.map((option) => themePalettes[option.id].dark.primary)).size).toBe(3);
  });
});
