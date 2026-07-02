import { getAllowedProteinTypes, PROTEIN_TYPES } from './constants';

describe('diet-type protein filtering', () => {
  it('never allows chicken or fish for a vegetarian - highest-risk trust rule in the app', () => {
    const allowed = getAllowedProteinTypes('vegetarian').map((p) => p.id);
    expect(allowed).not.toContain('chicken');
    expect(allowed).not.toContain('fish');
  });

  it('never allows chicken or fish for an eggetarian, but does allow eggs', () => {
    const allowed = getAllowedProteinTypes('eggetarian').map((p) => p.id);
    expect(allowed).not.toContain('chicken');
    expect(allowed).not.toContain('fish');
    expect(allowed).toContain('eggs');
  });

  it('excludes eggs and dairy in addition to meat/fish for a vegan', () => {
    const allowed = getAllowedProteinTypes('vegan').map((p) => p.id);
    expect(allowed).not.toContain('chicken');
    expect(allowed).not.toContain('fish');
    expect(allowed).not.toContain('eggs');
    expect(allowed).not.toContain('paneer');
    expect(allowed).not.toContain('dairy');
  });

  it('allows every protein type for non_veg', () => {
    expect(getAllowedProteinTypes('non_veg').map((p) => p.id)).toEqual(PROTEIN_TYPES.map((p) => p.id));
  });
});
