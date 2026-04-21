export function EmptyState({ icon, title, subtitle, action }) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      padding: "48px 32px",
      minHeight: "260px",
      gap: "16px",
    }}>
      <div style={{
        width: 72,
        height: 72,
        borderRadius: "50%",
        background: "var(--bg3)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}>
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--label3)"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {icon}
        </svg>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxWidth: 280 }}>
        <div style={{
          fontSize: 17,
          fontWeight: 600,
          color: "var(--label1)",
          letterSpacing: "-0.01em",
          lineHeight: 1.3,
        }}>
          {title}
        </div>
        {subtitle && (
          <div style={{
            fontSize: 14,
            color: "var(--label3)",
            lineHeight: 1.5,
          }}>
            {subtitle}
          </div>
        )}
      </div>

      {action && (
        <button
          onClick={action.onClick}
          style={{
            marginTop: 4,
            padding: "10px 24px",
            background: "var(--gold)",
            color: "#000",
            border: "none",
            borderRadius: 12,
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
            minHeight: 44,
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
