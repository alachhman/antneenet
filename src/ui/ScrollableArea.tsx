import { useEffect, useRef, useState, type CSSProperties, type PropsWithChildren } from 'react';

type Props = PropsWithChildren<{
  className?: string;
  style?: CSSProperties;
  /** How far from the bottom (px) still counts as "there's more below". */
  threshold?: number;
}>;

// Wraps scrollable content and shows a soft gradient fade + floating down-arrow
// badge at the bottom when there's overflow below the visible area. The
// indicator fades out smoothly once the user scrolls to the end.
export function ScrollableArea({
  className,
  style,
  threshold = 6,
  children,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    const scrollEl = scrollRef.current;
    const contentEl = contentRef.current;
    if (!scrollEl || !contentEl) return;

    const check = () => {
      const el = scrollRef.current;
      if (!el) return;
      setHasMore(el.scrollTop + el.clientHeight < el.scrollHeight - threshold);
    };

    check();
    scrollEl.addEventListener('scroll', check, { passive: true });
    // Re-check when either the scroll container or its content resizes
    // (e.g., new items loaded in, viewport resized, etc.).
    const ro = new ResizeObserver(check);
    ro.observe(scrollEl);
    ro.observe(contentEl);
    return () => {
      scrollEl.removeEventListener('scroll', check);
      ro.disconnect();
    };
  }, [threshold]);

  return (
    <div
      className={className}
      style={{ position: 'relative', minHeight: 0, flex: 1, ...style }}
    >
      <div
        ref={scrollRef}
        style={{ height: '100%', overflowY: 'auto' }}
      >
        <div ref={contentRef}>{children}</div>
      </div>
      <ScrollHint visible={hasMore} />
    </div>
  );
}

function ScrollHint({ visible }: { visible: boolean }) {
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 48,
        pointerEvents: 'none',
        background:
          'linear-gradient(to bottom, rgba(232, 237, 242, 0) 0%, var(--bg) 85%)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        paddingBottom: 16,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.2s ease',
      }}
    >
      <div
        style={{
          width: 26,
          height: 26,
          borderRadius: '50%',
          background: 'var(--bg)',
          boxShadow: 'var(--raised-sm)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--accent)',
          fontSize: 13,
          lineHeight: 1,
          transform: visible ? 'translateY(0)' : 'translateY(4px)',
          transition: 'transform 0.2s ease',
        }}
      >
        ↓
      </div>
    </div>
  );
}
