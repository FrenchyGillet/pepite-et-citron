import { useEffect } from 'react';

interface ToastProps {
  msg: string;
  onDone: () => void;
}

export function Toast({ msg, onDone }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onDone, 2500);
    return () => clearTimeout(t);
  }, [onDone]);
  return <div className="toast">{msg}</div>;
}
