import { describe, it, expect } from 'vitest';
import { PULL_THRESHOLD_PX, pullProgress, isSwipeBack, dialogIsOpen } from '@/lib/gestures';

describe('dialogIsOpen', () => {
  it('is true when the page holds an open dialog', () => {
    const doc = { querySelector: (sel: string) => (sel.includes('dialog') ? {} : null) };
    expect(dialogIsOpen(doc)).toBe(true);
  });

  it('is false when no dialog is open', () => {
    expect(dialogIsOpen({ querySelector: () => null })).toBe(false);
  });
});

describe('pullProgress', () => {
  it('is half way after half the threshold', () => {
    expect(pullProgress(0, PULL_THRESHOLD_PX / 2, 0)).toBe(0.5);
  });

  it('is capped at 1', () => {
    expect(pullProgress(0, 200, 0)).toBe(1);
  });

  it('is 0 when the page is scrolled down', () => {
    expect(pullProgress(0, 100, 10)).toBe(0);
  });

  it('is 0 when dragging upward', () => {
    expect(pullProgress(100, 50, 0)).toBe(0);
  });
});

describe('isSwipeBack', () => {
  it('accepts a long swipe right from the left edge', () => {
    expect(isSwipeBack(10, 300, 120, 310)).toBe(true);
  });

  it('rejects a swipe that does not start at the edge', () => {
    expect(isSwipeBack(100, 300, 220, 310)).toBe(false);
  });

  it('rejects a mostly vertical swipe', () => {
    expect(isSwipeBack(10, 300, 120, 420)).toBe(false);
  });

  it('rejects a short swipe', () => {
    expect(isSwipeBack(10, 300, 50, 300)).toBe(false);
  });
});
