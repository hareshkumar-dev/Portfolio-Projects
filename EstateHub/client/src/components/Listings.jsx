import { useEffect, useState, useCallback } from 'react';
import { fetchProperties, fetchCities } from '../api.js';
import PropertyCard from './PropertyCard.jsx';
import PropertyDetail from './PropertyDetail.jsx';
import PriceRange from './PriceRange.jsx';

// Slider bounds for the price filter (₹0 – ₹6 Cr, ₹5 L steps).
const PRICE_MIN = 0;
const PRICE_MAX = 60000000;
const PRICE_STEP = 500000;

const TYPES = ['Apartment', 'Villa', 'Independent House', 'Plot'];
const SORTS = [
  { key: '', label: 'Featured' },
  { key: 'priceAsc', label: 'Price: low to high' },
  { key: 'priceDesc', label: 'Price: high to low' },
  { key: 'newest', label: 'Newest' },
];

const EMPTY = { city: '', type: '', minPrice: '', maxPrice: '', bedrooms: '', sort: '' };

/**
 * Public listings page. The filter bar drives a server-side SOQL
 * query; changing any filter re-fetches from Salesforce.
 */
export default function Listings() {
  const [filters, setFilters] = useState(EMPTY);
  const [properties, setProperties] = useState(null);
  const [cities, setCities] = useState([]);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);

  const load = useCallback(async (activeFilters) => {
    setError('');
    try {
      setProperties(await fetchProperties(activeFilters));
    } catch (err) {
      setError(err.message);
      setProperties([]);
    }
  }, []);

  // Initial load + city list
  useEffect(() => {
    load(EMPTY);
    fetchCities().then(setCities).catch(() => {});
  }, [load]);

  function update(key, value) {
    const next = { ...filters, [key]: value };
    setFilters(next);
    load(next);
  }

  function updatePriceRange({ min, max }) {
    const next = { ...filters, minPrice: min, maxPrice: max };
    setFilters(next);
    load(next);
  }

  function reset() {
    setFilters(EMPTY);
    load(EMPTY);
  }

  const activeCount = Object.entries(filters)
    .filter(([k, v]) => k !== 'sort' && v !== '').length;

  return (
    <div>
      <section className="hero">
        <div className="hero-inner">
          <h1>Find your next home</h1>
          <p>Browse verified listings and connect with our agents.</p>
        </div>
      </section>

      <div className="page">
        <div className="filter-bar">
          <select value={filters.city} onChange={(e) => update('city', e.target.value)}>
            <option value="">All cities</option>
            {cities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          <select value={filters.type} onChange={(e) => update('type', e.target.value)}>
            <option value="">Any type</option>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>

          <select value={filters.bedrooms} onChange={(e) => update('bedrooms', e.target.value)}>
            <option value="">Any beds</option>
            {[1, 2, 3, 4, 5].map((b) => <option key={b} value={b}>{b}+ beds</option>)}
          </select>

          <PriceRange
            min={PRICE_MIN}
            max={PRICE_MAX}
            step={PRICE_STEP}
            valueMin={filters.minPrice}
            valueMax={filters.maxPrice}
            onChange={updatePriceRange}
          />

          <select value={filters.sort} onChange={(e) => update('sort', e.target.value)}>
            {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>

          {activeCount > 0 && (
            <button className="btn ghost small" onClick={reset}>Clear ({activeCount})</button>
          )}
        </div>

        {error && <div className="error-box">{error}</div>}

        {properties === null && !error ? (
          <div className="empty">Loading listings…</div>
        ) : properties?.length === 0 ? (
          <div className="empty">No properties match your filters. Try widening your search.</div>
        ) : (
          <>
            <div className="result-count">
              {properties.length} {properties.length === 1 ? 'property' : 'properties'}
            </div>
            <div className="listing-grid">
              {properties.map((p) => (
                <PropertyCard key={p.id} property={p} onOpen={() => setSelected(p)} />
              ))}
            </div>
          </>
        )}
      </div>

      {selected && (
        <PropertyDetail propertyId={selected.id} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
