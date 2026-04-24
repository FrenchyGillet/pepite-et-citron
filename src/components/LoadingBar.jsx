import { useState, useEffect } from 'react';

// Barre de chargement progressive fictive.
// Progresse automatiquement jusqu'à ~92%, puis complète à 100% + disparaît.
export function LoadingBar({ done = false }) {
  const [width,   setWidth]   = useState(0);
  const [opacity, setOpacity] = useState(1);
  const [visible, setVisible] = useState(true);

  // Progression fictive
  useEffect(() => {
    const steps = [
      [80,   5],
      [300, 30],
      [700, 58],
      [1400, 75],
      [3500, 88],
      [8000, 93],
    ];
    const timers = steps.map(([delay, target]) =>
      setTimeout(() => setWidth(target), delay)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  // Quand done=true : complète à 100 % puis efface
  useEffect(() => {
    if (!done) return;
    setWidth(100);
    const t1 = setTimeout(() => setOpacity(0), 200);
    const t2 = setTimeout(() => setVisible(false), 600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [done]);

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0,
      height: 3, zIndex: 9999,
      opacity,
      transition: 'opacity 0.4s ease',
    }}>
      <div style={{
        height: '100%',
        width: `${width}%`,
        background: 'var(--gold)',
        transition: width <= 5 ? 'none' : 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
        borderRadius: '0 2px 2px 0',
        boxShadow: '0 0 8px rgba(255,214,10,0.5)',
      }} />
    </div>
  );
}
