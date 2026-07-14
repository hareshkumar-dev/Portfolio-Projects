// Styles ship as a string injected at mount time, so the whole app
// stays a single JS static resource (no separate .css file).
export const CSS = `
.ms-root { font-family: "Segoe UI", system-ui, -apple-system, sans-serif; color: #12181f; }

.ms-toolbar { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; }
.ms-month { font-size: 18px; font-weight: 700; min-width: 170px; }
.ms-spacer { flex: 1; }

.ms-btn { padding: 8px 13px; font-size: 13px; font-weight: 600; border-radius: 8px;
  border: 1px solid #dfe3e8; background: #fff; color: #12181f; cursor: pointer; }
.ms-btn:hover { background: #f4f6f9; }
.ms-btn.primary { background: #2a78d6; border-color: #2a78d6; color: #fff; }
.ms-btn.primary:hover { background: #1c5cab; }
.ms-btn.icon { padding: 8px 11px; }
.ms-btn.danger { color: #dc2626; border-color: #fecaca; }
.ms-btn.danger:hover { background: #fef2f2; }
.ms-btn:disabled { opacity: .55; cursor: not-allowed; }

.ms-filters { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px; }
.ms-chip { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; font-size: 12px;
  font-weight: 600; border-radius: 999px; border: 1px solid #dfe3e8; background: #fff;
  color: #4a5560; cursor: pointer; }
.ms-chip.active { border-color: currentColor; }
.ms-dot { width: 8px; height: 8px; border-radius: 999px; display: inline-block; }

.ms-error { background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; font-size: 13px;
  padding: 10px 12px; border-radius: 8px; margin-bottom: 12px; }
.ms-loading { padding: 40px 16px; text-align: center; color: #4a5560; }

.ms-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
.ms-dow { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em;
  color: #869097; text-align: center; padding: 4px 0; }

.ms-cell { background: #fff; border: 1px solid #e3e7ec; border-radius: 10px; min-height: 96px;
  padding: 6px; cursor: pointer; transition: border-color .1s; overflow: hidden; }
.ms-cell:hover { border-color: #2a78d6; }
.ms-cell.other { background: #f6f8fa; color: #b0b7bf; cursor: default; }
.ms-cell.other:hover { border-color: #e3e7ec; }
.ms-daynum { font-size: 12px; font-weight: 600; margin-bottom: 4px; }
.ms-cell.today .ms-daynum { display: inline-flex; align-items: center; justify-content: center;
  width: 22px; height: 22px; border-radius: 999px; background: #2a78d6; color: #fff; }

.ms-event { display: block; width: 100%; text-align: left; border: none; color: #fff;
  border-radius: 6px; padding: 2px 7px; margin-bottom: 3px; font-size: 11px; font-weight: 600;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer; font-family: inherit; }
.ms-more { font-size: 11px; color: #4a5560; padding-left: 4px; }

.ms-backdrop { position: fixed; inset: 0; background: rgba(18,24,31,.5); display: grid;
  place-items: center; z-index: 9000; padding: 16px; }
.ms-modal { background: #fff; width: 100%; max-width: 420px; border-radius: 14px; padding: 22px;
  box-shadow: 0 25px 60px rgba(0,0,0,.3); }
.ms-modal h3 { margin: 0 0 16px; font-size: 17px; }
.ms-field { display: block; font-size: 13px; font-weight: 600; margin-bottom: 12px; color: #37424d; }
.ms-field input, .ms-field select, .ms-field textarea { display: block; width: 100%; margin-top: 5px;
  padding: 9px 11px; font-size: 14px; font-family: inherit; border: 1px solid #dfe3e8; border-radius: 8px; }
.ms-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.ms-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 6px; }

.ms-detail-head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.ms-type-tag { color: #fff; border-radius: 999px; padding: 2px 10px; font-size: 11px; font-weight: 700; }
.ms-detail dl { margin: 12px 0 0; }
.ms-detail dl div { display: flex; justify-content: space-between; gap: 16px; padding: 7px 0;
  border-bottom: 1px solid #eef1f5; font-size: 14px; }
.ms-detail dt { color: #4a5560; margin: 0; }
.ms-detail dd { margin: 0; font-weight: 500; text-align: right; }
.ms-notes { margin-top: 12px; background: #f6f8fa; border-radius: 8px; padding: 10px 12px;
  font-size: 13px; color: #4a5560; }
`;
