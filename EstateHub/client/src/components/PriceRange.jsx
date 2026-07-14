import { useState, useEffect, useRef } from 'react';
import { formatPrice } from '../api.js';

/**
 * Dual-thumb price range slider. Two overlaid range inputs share one
 * track; only their thumbs are interactive. The visual updates live as
 * you drag, and the committed value (which triggers the server query) is
 * debounced so we don't re-fetch on every pixel.
 *
 * onChange receives { min, max } where a value sitting on the slider's
 * bound is reported as '' — i.e. "no limit on this side".
 */
export default function PriceRange({ min, max, step, valueMin, valueMax, onChange }) {
  const [lo, setLo] = useState(valueMin === '' || valueMin == null ? min : Number(valueMin));
  const [hi, setHi] = useState(valueMax === '' || valueMax == null ? max : Number(valueMax));
  const firstRun = useRef(true);

  // Re-sync when the parent resets the filters (e.g. "Clear").
  useEffect(() => { setLo(valueMin === '' || valueMin == null ? min : Number(valueMin)); }, [valueMin, min]);
  useEffect(() => { setHi(valueMax === '' || valueMax == null ? max : Number(valueMax)); }, [valueMax, max]);

  // Debounce the commit so dragging doesn't hammer the API.
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    const t = setTimeout(() => {
      onChange({ min: lo <= min ? '' : lo, max: hi >= max ? '' : hi });
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lo, hi]);

  const pct = (v) => ((v - min) / (max - min)) * 100;

  return (
    <div className="price-range">
      <div className="price-range-head">
        <span className="price-range-label">Price range</span>
        <span className="price-range-values">
          {formatPrice(lo)} – {formatPrice(hi)}{hi >= max ? '+' : ''}
        </span>
      </div>
      <div className="range-slider">
        <div className="range-track" />
        <div
          className="range-fill"
          style={{ left: `${pct(lo)}%`, right: `${100 - pct(hi)}%` }}
        />
        <input
          type="range" className="range-input" min={min} max={max} step={step} value={lo}
          onChange={(e) => setLo(Math.min(Number(e.target.value), hi - step))}
          aria-label="Minimum price"
        />
        <input
          type="range" className="range-input" min={min} max={max} step={step} value={hi}
          onChange={(e) => setHi(Math.max(Number(e.target.value), lo + step))}
          aria-label="Maximum price"
        />
      </div>
    </div>
  );
}
