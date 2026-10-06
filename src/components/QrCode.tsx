import { useMemo } from 'react';
import qrcode from 'qrcode-generator';

interface QrCodeProps {
  value: string;
  /** Rendered width and height in px. */
  size?: number;
  label: string;
}

/**
 * QR code as inline SVG (one path, no canvas). Always black on white with a
 * quiet zone, whatever the theme: phone cameras need that contrast.
 */
export function QrCode({ value, size = 220, label }: QrCodeProps) {
  const { path, count } = useMemo(() => {
    const qr = qrcode(0, 'M');
    qr.addData(value);
    qr.make();
    const n = qr.getModuleCount();
    let d = '';
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        if (qr.isDark(y, x)) d += `M${x + 4} ${y + 4}h1v1h-1z`;
      }
    }
    return { path: d, count: n + 8 };
  }, [value]);

  return (
    <svg role="img" aria-label={label} width={size} height={size}
      viewBox={`0 0 ${count} ${count}`} shapeRendering="crispEdges"
      style={{ display: 'block', borderRadius: 8 }}>
      <rect width={count} height={count} fill="#fff" />
      <path d={path} fill="#000" />
    </svg>
  );
}
