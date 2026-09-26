import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { cn } from '@/utils/format';

interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

const revealCallbacks = new Map<Element, () => void>();
let sharedObserver: IntersectionObserver | null = null;

function observeReveal(element: Element, onReveal: () => void): () => void {
  if (!sharedObserver) {
    sharedObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const reveal = revealCallbacks.get(entry.target);
        if (!reveal) continue;
        revealCallbacks.delete(entry.target);
        sharedObserver?.unobserve(entry.target);
        reveal();
      }

      if (revealCallbacks.size === 0) {
        sharedObserver?.disconnect();
        sharedObserver = null;
      }
    }, {
      threshold: 0.12,
      rootMargin: '0px 0px -32px 0px',
    });
  }

  revealCallbacks.set(element, onReveal);
  sharedObserver.observe(element);

  return () => {
    revealCallbacks.delete(element);
    sharedObserver?.unobserve(element);
    if (revealCallbacks.size === 0) {
      sharedObserver?.disconnect();
      sharedObserver = null;
    }
  };
}

export function Reveal({ children, className, delay = 0 }: RevealProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
      setIsVisible(true);
      return;
    }

    return observeReveal(element, () => setIsVisible(true));
  }, []);

  const revealStyle = { '--reveal-delay': `${Math.max(0, delay)}ms` } as CSSProperties;

  return (
    <div
      ref={elementRef}
      style={revealStyle}
      className={cn('scroll-reveal', isVisible && 'scroll-reveal-visible', className)}
    >
      {children}
    </div>
  );
}
