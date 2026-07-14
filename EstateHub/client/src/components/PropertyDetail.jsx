import { useEffect, useState } from 'react';
import { fetchProperty, inquire, formatPrice } from '../api.js';

const PinIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);
const HouseIcon = () => (
  <svg viewBox="0 0 24 24" width="56" height="56" fill="none" stroke="#fff"
       strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M9.5 21v-6h5v6" />
  </svg>
);
const CheckIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor"
       strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

/** Full property detail with an inquiry form (creates a Lead). */
export default function PropertyDetail({ propertyId, onClose }) {
  const [property, setProperty] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProperty(propertyId)
      .then(setProperty)
      .catch((err) => setError(err.message));
  }, [propertyId]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="detail-modal" onClick={(e) => e.stopPropagation()}>
        <button className="detail-close" onClick={onClose}>✕</button>

        {error && <div className="error-box">{error}</div>}
        {!property && !error ? (
          <div className="empty">Loading…</div>
        ) : property ? (
          <div className="detail-grid">
            <div className="detail-media">
              {property.imageUrl ? (
                <>
                  <img className="detail-media-bg" src={property.imageUrl} alt="" aria-hidden="true" />
                  <img className="detail-media-img" src={property.imageUrl} alt={property.title} />
                </>
              ) : (
                <div className="detail-placeholder"><HouseIcon /></div>
              )}
            </div>

            <div className="detail-info">
              <div className="detail-price">{formatPrice(property.price)}</div>
              <h2 className="detail-title">{property.title}</h2>
              <div className="detail-loc">
                <PinIcon /> {[property.address, property.city].filter(Boolean).join(', ') || 'Location TBA'}
              </div>

              <div className="detail-specs">
                {property.bedrooms > 0 && <div><b>{property.bedrooms}</b><span>Bedrooms</span></div>}
                {property.bathrooms > 0 && <div><b>{property.bathrooms}</b><span>Bathrooms</span></div>}
                {property.area > 0 && <div><b>{property.area.toLocaleString('en-IN')}</b><span>sq ft</span></div>}
                <div><b>{property.type}</b><span>Type</span></div>
              </div>

              {property.description && <p className="detail-desc">{property.description}</p>}

              <InquiryForm property={property} />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Inquiry form — creates a Salesforce Lead on submit. */
function InquiryForm({ property }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState(`I'm interested in "${property.title}". Please get in touch.`);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await inquire(property.id, { name, email, phone, message });
      setDone(true);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  if (done) {
    return (
      <div className="inquiry-done">
        <span className="success-mark"><CheckIcon /></span>
        <div>
          <b>Inquiry sent!</b>
          <p className="muted">An agent will reach out to you soon.</p>
        </div>
      </div>
    );
  }

  return (
    <form className="inquiry-form" onSubmit={handleSubmit}>
      <h3>Interested? Contact the agent</h3>
      <div className="field-row">
        <label>
          Name *
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          Phone
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
      </div>
      <label>
        Email *
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>
      <label>
        Message
        <textarea rows={2} value={message} onChange={(e) => setMessage(e.target.value)} />
      </label>

      {error && <div className="error-box">{error}</div>}

      <button type="submit" className="btn primary wide" disabled={saving}>
        {saving ? 'Sending…' : 'Send inquiry'}
      </button>
    </form>
  );
}
