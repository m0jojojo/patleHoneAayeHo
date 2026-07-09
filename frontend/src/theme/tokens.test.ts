import { colors, radius, shadows, spacing, typography } from './tokens';

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

describe('design tokens', () => {
  it('every color is a valid 6-digit hex value', () => {
    Object.values(colors).forEach((value) => {
      expect(value).toMatch(HEX_COLOR);
    });
  });

  it('spacing scale is strictly increasing', () => {
    const values = Object.values(spacing);
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThan(values[i - 1]);
    }
  });

  it('radius scale is strictly increasing up to the pill value', () => {
    const { pill, ...steps } = radius;
    const values = Object.values(steps);
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThan(values[i - 1]);
    }
    expect(pill).toBeGreaterThan(Math.max(...values));
  });

  it('card shadow has both Android (elevation) and iOS (shadow*) properties set', () => {
    expect(shadows.card.elevation).toBeGreaterThan(0);
    expect(shadows.card.shadowOpacity).toBeGreaterThan(0);
  });

  it('typography scale is defined for every expected role', () => {
    const expectedRoles = ['title', 'subtitle', 'body', 'bodyBold', 'caption', 'label', 'statValue'];
    expect(Object.keys(typography).sort()).toEqual(expectedRoles.sort());
  });
});
