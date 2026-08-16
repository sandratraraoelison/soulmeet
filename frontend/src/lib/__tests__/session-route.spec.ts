import { getSessionRoute } from '../session-route';
describe('session routing', () => {
  it('sends guests public', () =>
    expect(getSessionRoute(false, false, false)).toBe('/(public)/welcome'));
  it('sends incomplete users to onboarding', () =>
    expect(getSessionRoute(true, false, false)).toBe(
      '/(onboarding)/companion',
    ));
  it('sends complete users home', () =>
    expect(getSessionRoute(true, true, true)).toBe('/(app)/home'));
});
