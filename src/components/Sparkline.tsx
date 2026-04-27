interface SparklineProps {
  /** Per-match points, chronological order. */
  data: number[];
  color: string;
  width?: number;
  height?: number;
}

/**
 * Inline SVG sparkline showing a player's cumulative score progression.
 * Renders nothing if fewer than 2 data points or all points are zero.
 */
export function Sparkline({ data, color, width = 56, height = 22 }: SparklineProps) {
  if (data.length < 2) return null;

  // Build cumulative series.
  const cumulative: number[] = [];
  let running = 0;
  for (const v of data) { running += v; cumulative.push(running); }

  const max = cumulative[cumulative.length - 1];
  if (max === 0) return null;

  const PAD = 2.5;
  const xScale = (i: number) =>
    PAD + (i / (cumulative.length - 1)) * (width - PAD * 2);
  const yScale = (v: number) =>
    height - PAD - (v / max) * (height - PAD * 2);

  const pts = cumulative.map((v, i) => ({ x: xScale(i), y: yScale(v) }));
  const linePath = pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ');
  const areaPath = [
    linePath,
    `L${pts[pts.length - 1].x.toFixed(1)},${height}`,
    `L${pts[0].x.toFixed(1)},${height}`,
    'Z',
  ].join(' ');

  const last = pts[pts.length - 1];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ flexShrink: 0, overflow: 'visible' }}
      aria-hidden="true"
    >
      <path d={areaPath} fill={color} opacity="0.08" />
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.65"
      />
      <circle cx={last.x} cy={last.y} r="2.5" fill={color} />
    </svg>
  );
}
