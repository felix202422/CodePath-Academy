import { useEffect, useRef, useState } from 'react';
import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

function showImmediately() {
  return (
    typeof window === 'undefined' ||
    typeof window.IntersectionObserver === 'undefined' ||
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
  );
}

/**
 * Progressive-enhancement scroll reveal. Content is visible when motion is
 * reduced or IntersectionObserver is unavailable; otherwise it fades/lifts in
 * as the section enters the viewport.
 */
export function ScrollReveal({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  const element = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(showImmediately);

  useEffect(() => {
    if (visible || !element.current || typeof window.IntersectionObserver === 'undefined') {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -36px 0px' },
    );

    observer.observe(element.current);
    return () => observer.disconnect();
  }, [visible]);

  return (
    <div
      ref={element}
      className={cn('scroll-reveal', visible && 'scroll-reveal-visible', className)}
      {...rest}
    >
      {children}
    </div>
  );
}
