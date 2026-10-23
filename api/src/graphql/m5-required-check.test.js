import { it, expect } from 'vitest';

// Tillfälligt bevis för #77. Denna PR ska stängas utan merge.
it('bevis: röd Integration måste blockera merge', () => {
  expect('avsiktligt rött').toBe('grönt');
});