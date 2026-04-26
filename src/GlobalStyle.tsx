export function GlobalStyle() {
  return (
  <style>{`
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg:           #000000;
      --bg2:          #1c1c1e;
      --bg3:          #2c2c2e;
      --bg4:          #3a3a3c;
      --separator:    rgba(255,255,255,0.08);
      --separator2:   rgba(255,255,255,0.12);
      --label:        #ffffff;
      --label2:       rgba(235,235,245,0.6);
      --label3:       rgba(235,235,245,0.3);
      --label4:       rgba(235,235,245,0.18);
      --gold:         #ffd60a;
      --gold-dim:     rgba(255,214,10,0.15);
      --gold-subtle:  rgba(255,214,10,0.08);
      --lemon:        #aadd00;
      --lemon-dim:    rgba(170,221,0,0.15);
      --lemon-subtle: rgba(170,221,0,0.08);
      --green:        #30d158;
      --green-dim:    rgba(48,209,88,0.15);
      --red:          #ff453a;
      --red-dim:      rgba(255,69,58,0.12);
      --radius-sm: 8px;
      --radius:    12px;
      --radius-lg: 16px;
      --tab-bar-height: 49px;
    }

    body {
      background: var(--bg);
      color: var(--label);
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif;
      min-height: 100vh;
      font-size: 15px;
      -webkit-font-smoothing: antialiased;
    }

    button { font-family: inherit; cursor: pointer; border: none; transition: all 0.15s ease; }

    input, textarea {
      font-family: inherit;
      background: var(--bg3);
      border: none;
      color: var(--label);
      border-radius: var(--radius);
      padding: 14px 16px;
      font-size: 16px;
      min-height: 50px;
      outline: none;
      width: 100%;
      -webkit-font-smoothing: antialiased;
      transition: box-shadow 0.15s ease;
    }
    input:focus, textarea:focus {
      box-shadow: 0 0 0 3px rgba(255,214,10,0.25);
    }
    input::placeholder, textarea::placeholder { color: var(--label3); }
    textarea { resize: none; }

    .app-wrapper {
      max-width: 430px;
      margin: 0 auto;
      min-height: 100vh;
      padding-bottom: calc(var(--tab-bar-height) + env(safe-area-inset-bottom, 0px) + 16px);
    }

    /* HEADER */
    .header {
      padding: 14px 20px 10px;
      position: sticky;
      top: 0;
      z-index: 100;
      background: rgba(0,0,0,0.85);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-bottom: 0.5px solid var(--separator);
    }
    .header-logo { display: flex; align-items: center; gap: 5px; }
    .header-pepite { font-size: 22px; font-weight: 700; color: var(--gold); letter-spacing: -0.3px; }
    .header-amp    { font-size: 16px; font-weight: 300; color: var(--label3); }
    .header-citron { font-size: 22px; font-weight: 700; color: var(--lemon); letter-spacing: -0.3px; }
    .header-sub    { font-size: 12px; color: var(--label3); margin-top: 2px; }

    /* BOTTOM TAB BAR */
    .tab-bar {
      position: fixed;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 100%;
      max-width: 430px;
      height: calc(var(--tab-bar-height) + env(safe-area-inset-bottom, 0px));
      padding-bottom: env(safe-area-inset-bottom, 0px);
      display: flex;
      align-items: flex-start;
      background: rgba(0,0,0,0.88);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-top: 0.5px solid var(--separator);
      z-index: 200;
    }
    .tab-bar-item {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 3px;
      min-height: 44px;
      padding: 8px 4px 6px;
      background: transparent;
      border: none;
      color: var(--label3);
      font-size: 10px;
      font-weight: 500;
      letter-spacing: 0.02em;
      cursor: pointer;
      transition: color 0.15s ease;
    }
    .tab-bar-item.active {
      color: var(--gold);
    }
    .tab-bar-item:active {
      opacity: 0.75;
    }

    /* NAV (legacy) */
    .nav {
      display: flex;
      background: rgba(0,0,0,0.85);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-bottom: 0.5px solid var(--separator);
      position: sticky;
      top: 65px;
      z-index: 99;
    }
    .nav-btn {
      flex: 1; padding: 11px 4px;
      background: transparent;
      color: var(--label3);
      font-size: 11px; font-weight: 500;
      letter-spacing: 0.03em;
      border-bottom: 1.5px solid transparent;
    }
    .nav-btn.active { color: var(--label); border-bottom-color: var(--label2); }

    /* CONTENT */
    .content { padding: 16px; }

    /* GROUPED LIST */
    .group {
      background: var(--bg2);
      border-radius: 14px;
      overflow: hidden;
      margin-bottom: 8px;
    }
    .section-label {
      font-size: 13px;
      font-weight: 600;
      color: var(--label3);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 8px;
    }
    .row {
      display: flex; align-items: center; gap: 12px;
      padding: 13px 16px;
      border-bottom: 0.5px solid var(--separator);
      min-height: 52px;
    }
    .row:last-child { border-bottom: none; }
    .row-icon {
      width: 30px; height: 30px; border-radius: 7px;
      display: flex; align-items: center; justify-content: center;
      font-size: 15px; flex-shrink: 0;
    }
    .row-icon.gold   { background: var(--gold-dim);  }
    .row-icon.lemon  { background: var(--lemon-dim); }
    .row-icon.green  { background: var(--green-dim); }
    .row-icon.red    { background: var(--red-dim);   }
    .row-body { flex: 1; min-width: 0; }
    .row-title { font-size: 15px; font-weight: 500; }
    .row-sub   { font-size: 12px; color: var(--label3); margin-top: 1px; }
    .row-value { font-size: 17px; font-weight: 600; }
    .row-value.gold  { color: var(--gold);  }
    .row-value.lemon { color: var(--lemon); }

    /* BUTTONS */
    .btn {
      display: inline-flex; align-items: center; justify-content: center;
      gap: 6px; border-radius: var(--radius);
      font-size: 16px; font-weight: 600;
      padding: 13px 20px;
      min-height: 50px;
    }
    .btn-primary   { background: var(--gold); color: #000000; }
    .btn-secondary { background: var(--bg3); color: var(--label); }
    .btn-danger    { background: var(--red-dim); color: var(--red); }
    .btn-full { width: 100%; }
    .btn:active:not(:disabled) { opacity: 0.75; transform: scale(0.98); }
    .btn:disabled { opacity: 0.3; cursor: not-allowed; }

    /* PLAYER GRID */
    .player-grid {
      display: grid; grid-template-columns: 1fr 1fr;
      gap: 1px; background: var(--separator);
      border-radius: var(--radius-lg); overflow: hidden; margin: 8px 0;
    }
    .player-chip {
      padding: 14px 12px; background: var(--bg2);
      color: var(--label2); font-size: 15px; font-weight: 500;
      cursor: pointer; text-align: left; border: none;
      transition: background 0.12s;
      min-height: 48px;
    }
    .player-chip:active     { background: var(--bg3); }
    .player-chip.sel-1st    { background: var(--gold-subtle);  color: var(--gold);          animation: chipSelect 0.28s cubic-bezier(0.34, 1.56, 0.64, 1); }
    .player-chip.sel-2nd    { background: var(--gold-subtle);  color: rgba(255,214,10,0.6); animation: chipSelect 0.28s cubic-bezier(0.34, 1.56, 0.64, 1); }
    .player-chip.sel-lemon  { background: var(--lemon-subtle); color: var(--lemon);         animation: chipSelect 0.28s cubic-bezier(0.34, 1.56, 0.64, 1); }

    /* STEP BAR */
    .step-bar { display: flex; gap: 4px; margin-bottom: 16px; }
    .step-seg { flex: 1; height: 3px; border-radius: 2px; background: var(--bg3); transition: background 0.3s; }
    .step-seg.done   { background: var(--label2); }
    .step-seg.active { background: var(--label3); }

    /* SCORE BAR */
    .score-bar-wrap { flex-shrink: 0; width: 80px; height: 3px; background: var(--bg3); border-radius: 2px; overflow: hidden; }
    .score-bar { height: 100%; border-radius: 2px; transition: width 0.5s ease; }

    /* COMMENT */
    .comment {
      padding: 9px 16px; border-top: 1px solid var(--separator);
      font-size: 13px; color: var(--label3); font-style: italic; line-height: 1.4;
    }

    /* BADGES & TAGS */
    .badge { display: inline-flex; align-items: center; padding: 3px 9px; border-radius: 20px; font-size: 11px; font-weight: 600; }
    .badge-open   { background: var(--green-dim); color: var(--green); }
    .badge-closed { background: var(--bg3); color: var(--label3); }
    .tag { display: inline-flex; align-items: center; padding: 3px 8px; border-radius: 6px; font-size: 12px; font-weight: 600; }
    .tag-gold  { background: var(--gold-dim);  color: var(--gold);  }
    .tag-lemon { background: var(--lemon-dim); color: var(--lemon); }
    .tag-dim   { background: var(--bg3); color: var(--label3); cursor: pointer; }

    /* TOAST */
    .toast {
      position: fixed;
      bottom: calc(var(--tab-bar-height) + env(safe-area-inset-bottom, 0px) + 16px);
      left: 50%; transform: translateX(-50%);
      background: var(--bg3); color: var(--label);
      padding: 11px 22px; border-radius: 24px;
      font-weight: 500; font-size: 14px; z-index: 999;
      border: 1px solid var(--separator2); white-space: nowrap;
      animation: toastIn 0.25s ease;
    }
    @keyframes toastIn {
      from { opacity: 0; transform: translateX(-50%) translateY(8px); }
      to   { opacity: 1; transform: translateX(-50%) translateY(0);   }
    }
    @keyframes livePulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50%       { opacity: 0.35; transform: scale(0.75); }
    }
    @keyframes revealPop {
      0%   { opacity: 0; transform: translateY(6px) scale(0.97); }
      100% { opacity: 1; transform: translateY(0)   scale(1);    }
    }
    @keyframes chipSelect {
      0%   { transform: scale(1);    }
      35%  { transform: scale(0.91); }
      65%  { transform: scale(1.07); }
      100% { transform: scale(1);    }
    }
    @keyframes podiumReveal {
      0%   { opacity: 0; transform: translateY(20px) scale(0.96); }
      100% { opacity: 1; transform: translateY(0)    scale(1);    }
    }

    .demo-banner {
      background: rgba(255,214,10,0.06);
      border-bottom: 1px solid rgba(255,214,10,0.1);
      padding: 7px 16px; font-size: 12px;
      color: rgba(255,214,10,0.5); text-align: center;
    }

    .flex         { display: flex; }
    .flex-between { display: flex; justify-content: space-between; align-items: center; }
    .gap-8  { gap: 8px; }
    .mt-4   { margin-top: 4px;  }
    .mt-8   { margin-top: 8px;  }
    .mt-12  { margin-top: 12px; }
    .mt-16  { margin-top: 16px; }
    .mb-4   { margin-bottom: 4px;  }
    .mb-8   { margin-bottom: 8px;  }
    .mb-12  { margin-bottom: 12px; }
    .empty  { text-align: center; color: var(--label3); padding: 80px 20px; font-size: 15px; line-height: 1.6; }

    /* LIGHT MODE */
    [data-theme="light"] {
      --bg:           #f2f2f7;
      --bg2:          #ffffff;
      --bg3:          #e5e5ea;
      --bg4:          #d1d1d6;
      --separator:    rgba(0,0,0,0.08);
      --separator2:   rgba(0,0,0,0.12);
      --label:        #000000;
      --label2:       rgba(60,60,67,0.6);
      --label3:       rgba(60,60,67,0.35);
      --label4:       rgba(60,60,67,0.18);
      color-scheme: light;
    }
    [data-theme="light"] body { background: #f2f2f7; }
    [data-theme="light"] .header { background: rgba(242,242,247,0.88); border-bottom-color: rgba(0,0,0,0.08); }
    [data-theme="light"] .tab-bar { background: rgba(242,242,247,0.92); border-top-color: rgba(0,0,0,0.08); }
    [data-theme="light"] input,
    [data-theme="light"] textarea { background: var(--bg3); color: var(--label); }
    [data-theme="light"] .demo-banner { background: rgba(255,180,0,0.08); color: rgba(160,100,0,0.7); border-color: rgba(255,180,0,0.15); }
  `}</style>
  );
}
