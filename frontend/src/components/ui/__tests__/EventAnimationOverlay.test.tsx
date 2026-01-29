import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from '@testing-library/react';
import { useEventAnimationOverlay } from '../EventAnimationOverlay';
import { MINI_EVENTS } from '../../../types';
import { renderHook } from '@testing-library/react';

/**
 * Tests for EventAnimationOverlay component
 * **Validates: Requirements 22.3, 11.4**
 * 
 * Note: Full component rendering tests are skipped due to framer-motion
 * animation complexity. The hook and type definitions are tested instead.
 */
describe('useEventAnimationOverlay hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes with no event and not showing', () => {
    const { result } = renderHook(() => useEventAnimationOverlay());

    expect(result.current.currentEvent).toBeNull();
    expect(result.current.isShowing).toBe(false);
  });

  it('shows event when showEvent is called', () => {
    const { result } = renderHook(() => useEventAnimationOverlay());
    const event = MINI_EVENTS[0];

    act(() => {
      result.current.showEvent(event);
    });

    expect(result.current.currentEvent).toBe(event);
    expect(result.current.isShowing).toBe(true);
  });

  it('hides event when hideEvent is called', () => {
    const { result } = renderHook(() => useEventAnimationOverlay());
    const event = MINI_EVENTS[0];

    act(() => {
      result.current.showEvent(event);
    });

    act(() => {
      result.current.hideEvent();
    });

    expect(result.current.isShowing).toBe(false);
  });

  it('clears event after hide animation delay', () => {
    const { result } = renderHook(() => useEventAnimationOverlay());
    const event = MINI_EVENTS[0];

    act(() => {
      result.current.showEvent(event);
    });

    act(() => {
      result.current.hideEvent();
    });

    // Event should still be present immediately after hide
    expect(result.current.currentEvent).toBe(event);

    // After 500ms delay, event should be cleared
    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(result.current.currentEvent).toBeNull();
  });

  it('can show different event types', () => {
    const { result } = renderHook(() => useEventAnimationOverlay());

    // Test with different event types
    MINI_EVENTS.forEach((event) => {
      act(() => {
        result.current.showEvent(event);
      });

      expect(result.current.currentEvent).toBe(event);
      expect(result.current.isShowing).toBe(true);

      act(() => {
        result.current.hideEvent();
        vi.advanceTimersByTime(600);
      });
    });
  });
});

describe('EventAnimationOverlay types', () => {
  it('MINI_EVENTS contains all required event types', () => {
    // Verify all event effect types are represented
    const effectTypes = new Set(MINI_EVENTS.map(e => e.effect.type));
    
    expect(effectTypes.has('score_multiplier')).toBe(true);
    expect(effectTypes.has('steal_points')).toBe(true);
    expect(effectTypes.has('swap_scores')).toBe(true);
    expect(effectTypes.has('double_or_nothing')).toBe(true);
    expect(effectTypes.has('immunity')).toBe(true);
    expect(effectTypes.has('vote_reveal')).toBe(true);
    expect(effectTypes.has('sabotage')).toBe(true);
  });

  it('MINI_EVENTS contains all required timing types', () => {
    const timings = new Set(MINI_EVENTS.map(e => e.timing));
    
    expect(timings.has('pre-round')).toBe(true);
    expect(timings.has('mid-round')).toBe(true);
    expect(timings.has('post-round')).toBe(true);
  });

  it('all events have required fields', () => {
    MINI_EVENTS.forEach((event) => {
      expect(event.id).toBeDefined();
      expect(event.name).toBeDefined();
      expect(event.description).toBeDefined();
      expect(event.icon).toBeDefined();
      expect(event.timing).toBeDefined();
      expect(event.effect).toBeDefined();
      expect(event.probability).toBeDefined();
      expect(event.probability).toBeGreaterThan(0);
      expect(event.probability).toBeLessThanOrEqual(1);
    });
  });
});
