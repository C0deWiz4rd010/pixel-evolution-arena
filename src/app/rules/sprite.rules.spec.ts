import { describe, expect, it } from 'vitest';
import { heroSprite, stillSprite } from './sprite.rules';

describe('sprite rules', () => {
  it('maps animated creature sprites to their still copies', () => {
    expect(stillSprite('assets/creatures/playable/m001-bubblit.svg')).toBe('assets/creatures/playable-still/m001-bubblit.svg');
    expect(stillSprite('assets/creatures/generated-100/n059-ironkite.svg')).toBe('assets/creatures/generated-100-still/n059-ironkite.svg');
    expect(stillSprite('assets/ui/icon.svg')).toBe('assets/ui/icon.svg');
    expect(stillSprite(undefined)).toBe('');
  });

  it('keeps hero sprites animated unless motion is reduced', () => {
    const url = 'assets/creatures/playable/m001-bubblit.svg';
    expect(heroSprite(url, false)).toBe(url);
    expect(heroSprite(url, true)).toContain('playable-still');
  });
});
