import { useEffect, useState } from 'react';
import { fetchCatalog, formatMoney } from '../api.js';

// A stable accent per product family (validated categorical hues).
const FAMILY_COLOR = {
  Audio: '#2a78d6',
  Wearables: '#1baf7a',
  Accessories: '#eda100',
  Video: '#4a3aa7',
  'Home Office': '#e87ba4',
};

/** Storefront catalog. Shoppers add products to the cart. */
export default function Storefront({ cart, onOpenCart }) {
  const [products, setProducts] = useState(null);
  const [error, setError] = useState('');
  const [family, setFamily] = useState('All');

  useEffect(() => {
    (async () => {
      try {
        setProducts(await fetchCatalog());
      } catch (err) {
        setError(err.message);
        setProducts([]);
      }
    })();
  }, []);

  if (products === null && !error) return <div className="empty">Loading products…</div>;

  const families = ['All', ...new Set((products || []).map((p) => p.family).filter(Boolean))];
  const shown = family === 'All' ? products : products.filter((p) => p.family === family);

  return (
    <div>
      <section className="hero">
        <h1>ShopTrack Store</h1>
        <p>Electronics and accessories, powered by Salesforce commerce objects.</p>
      </section>

      {error && (
        <div className="error-box">
          {error}
          {error.includes('Integration user') && (
            <div className="hint">Set credentials in <code>server/.env</code> and restart the API.</div>
          )}
        </div>
      )}

      {products?.length === 0 && !error ? (
        <div className="empty">
          No products are available right now. Please check back soon.
        </div>
      ) : (
        <>
          {families.length > 2 && (
            <div className="filters">
              {families.map((f) => (
                <button
                  key={f}
                  className={`chip ${family === f ? 'active' : ''}`}
                  onClick={() => setFamily(f)}
                >
                  {f}
                </button>
              ))}
            </div>
          )}

          <div className="product-grid">
            {shown?.map((p) => (
              <div className="product-card" key={p.pricebookEntryId}>
                <div
                  className="product-thumb"
                  style={{ background: FAMILY_COLOR[p.family] || '#64748b' }}
                >
                  {(p.name || '?').charAt(0)}
                </div>
                <div className="product-body">
                  {p.family && <span className="product-family">{p.family}</span>}
                  <h3 className="product-name">{p.name}</h3>
                  {p.description && <p className="product-desc">{p.description}</p>}
                </div>
                <div className="product-foot">
                  <span className="product-price">{formatMoney(p.price)}</span>
                  <button className="btn primary small" onClick={() => { cart.add(p); onOpenCart(); }}>
                    Add to cart
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
