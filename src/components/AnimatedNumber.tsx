import { useState, useEffect, useRef } from 'react';

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

function useCountUp(target: number, delay = 0): number {
  const [count, setCount] = useState(0);
  const rafRef  = useRef<number>(0);

  useEffect(() => {
    if (target === 0) { setCount(0); return; }
    const duration = 700;
    let startTime: number | null = null;

    const timeoutId = window.setTimeout(() => {
      const animate = (ts: number) => {
        if (startTime === null) startTime = ts;
        const progress = Math.min((ts - startTime) / duration, 1);
        setCount(Math.round(easeOutCubic(progress) * target));
        if (progress < 1) rafRef.current = requestAnimationFrame(animate);
      };
      rafRef.current = requestAnimationFrame(animate);
    }, delay);

    return () => {
      clearTimeout(timeoutId);
      cancelAnimationFrame(rafRef.current);
    };
  }, [target, delay]);

  return count;
}

interface AnimatedNumberProps {
  value: number;
  delay?: number;
}

export function AnimatedNumber({ value, delay = 0 }: AnimatedNumberProps) {
  const count = useCountUp(value, delay);
  return <>{count}</>;
}
