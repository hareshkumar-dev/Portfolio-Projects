// Styles are shipped as a string and injected at mount time, so the
// whole app stays a single JS static resource (no separate .css file).
export const CSS = `
.pb-root { font-family: "Segoe UI", system-ui, -apple-system, sans-serif; color: #12181f; }
.pb-toolbar { display: flex; gap: 8px; align-items: center; margin-bottom: 14px; flex-wrap: wrap; }
.pb-toolbar h2 { margin: 0; font-size: 18px; flex: 1; }
.pb-btn { padding: 8px 13px; font-size: 13px; font-weight: 600; border-radius: 8px;
  border: 1px solid #dfe3e8; background: #fff; color: #12181f; cursor: pointer; }
.pb-btn:hover { background: #f4f6f9; }
.pb-btn.primary { background: #2a78d6; border-color: #2a78d6; color: #fff; }
.pb-btn.primary:hover { background: #1c5cab; }
.pb-btn.small { padding: 3px 8px; font-size: 12px; }
.pb-btn:disabled { opacity: .55; cursor: not-allowed; }

.pb-board { display: flex; gap: 12px; overflow-x: auto; align-items: flex-start; padding-bottom: 10px; }
.pb-col { background: #eef1f5; border: 1px solid transparent; border-radius: 12px; padding: 10px;
  width: 250px; flex-shrink: 0; min-height: 120px; }
.pb-col.over { border-color: #2a78d6; background: #e3edfa; }
.pb-col-head { display: flex; justify-content: space-between; align-items: center;
  padding: 2px 6px 10px; font-size: 13px; font-weight: 700; }
.pb-count { background: #fff; border-radius: 999px; padding: 1px 8px; font-size: 12px; color: #4a5560; }

.pb-card { background: #fff; border: 1px solid #e3e7ec; border-radius: 10px; padding: 10px 12px;
  margin-bottom: 8px; cursor: grab; box-shadow: 0 1px 2px rgba(18,24,31,.05); }
.pb-card:hover { border-color: #c7d4e8; }
.pb-card.dragging { opacity: .5; }
.pb-title { font-size: 14px; font-weight: 600; }
.pb-meta { display: flex; justify-content: space-between; align-items: center; margin-top: 8px;
  font-size: 12px; color: #4a5560; }
.pb-pill { padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; }
.pb-pill.High { background: #fef2f2; color: #dc2626; }
.pb-pill.Medium { background: #fffbeb; color: #d97706; }
.pb-pill.Low { background: #f0fdf4; color: #16a34a; }
.pb-assignee { color: #869097; }
.pb-del { border: none; background: none; color: #b0b7bf; cursor: pointer; font-size: 13px; }
.pb-del:hover { color: #dc2626; }
.pb-card-foot { display: flex; justify-content: space-between; align-items: center; margin-top: 6px; }
.pb-due { font-size: 11px; color: #869097; }

.pb-empty { padding: 40px 16px; text-align: center; color: #4a5560; background: #fff;
  border: 1px dashed #dfe3e8; border-radius: 12px; }
.pb-error { background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; font-size: 13px;
  padding: 10px 12px; border-radius: 8px; margin-bottom: 12px; }

.pb-backdrop { position: fixed; inset: 0; background: rgba(18,24,31,.5); display: grid;
  place-items: center; z-index: 9000; padding: 16px; }
.pb-modal { background: #fff; width: 100%; max-width: 420px; border-radius: 14px; padding: 22px;
  box-shadow: 0 25px 60px rgba(0,0,0,.3); }
.pb-modal h3 { margin: 0 0 16px; font-size: 17px; }
.pb-field { display: block; font-size: 13px; font-weight: 600; margin-bottom: 12px; color: #37424d; }
.pb-field input, .pb-field select, .pb-field textarea { display: block; width: 100%; margin-top: 5px;
  padding: 9px 11px; font-size: 14px; font-family: inherit; border: 1px solid #dfe3e8; border-radius: 8px; }
.pb-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.pb-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 6px; }
`;
