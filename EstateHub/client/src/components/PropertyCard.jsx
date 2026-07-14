import { formatPrice } from '../api.js';

// A stable accent per property type, used for the placeholder thumbnail.
const TYPE_COLOR = {
  Apartment: '#2a78d6',
  Villa: '#0e7490',
  'Independent House': '#b45309',
  Plot: '#4a3aa7',
};

/** Small inline icons — no emoji, so the cards read like a real product. */
const PinIcon = () => (
  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);
const HouseIcon = () => (
  <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="#fff"
       strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M9.5 21v-6h5v6" />
  </svg>
);
const BedIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
       strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 17v-5a2 2 0 0 1 2-2h13a3 3 0 0 1 3 3v4" /><path d="M2 12V6" /><path d="M22 17v3" />
    <path d="M2 20v-3" /><path d="M6 10V8a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);
const BathIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
       strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 12V6a2 2 0 0 1 4 0" /><path d="M2 12h20v3a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4z" />
    <path d="M6 19v2" /><path d="M18 19v2" />
  </svg>
);
const AreaIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
       strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 3h6M3 3v6M21 21h-6M21 21v-6M21 3h-6M21 3v6M3 21h6M3 21v-6" />
  </svg>
);

/** A single listing card in the grid. */
export default function PropertyCard({ property, onOpen }) {
  const p = property;
  return (
    <button className="listing-card" onClick={onOpen}>
      <div className="listing-thumb" style={{ background: TYPE_COLOR[p.type] || '#64748b' }}>
        {p.imageUrl ? (
          <img src={p.imageUrl} alt={p.title} loading="lazy" />
        ) : (
          <HouseIcon />
        )}
        {p.featured && <span className="featured-tag">Featured</span>}
        {p.status && p.status !== 'Available' && (
          <span className="status-tag">{p.status}</span>
        )}
      </div>
      <div className="listing-body">
        <div className="listing-price">{formatPrice(p.price)}</div>
        <div className="listing-title">{p.title}</div>
        <div className="listing-loc-row">
          <span className="listing-loc"><PinIcon /> {p.city || 'Location TBA'}</span>
          <span className="spec-type">{p.type}</span>
        </div>
        <div className="listing-specs">
          {p.bedrooms > 0 && <span><BedIcon /> {p.bedrooms} bd</span>}
          {p.bathrooms > 0 && <span><BathIcon /> {p.bathrooms} ba</span>}
          {p.area > 0 && <span><AreaIcon /> {p.area.toLocaleString('en-IN')} sqft</span>}
        </div>
      </div>
    </button>
  );
}
