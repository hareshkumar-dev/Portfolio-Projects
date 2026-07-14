import { useState } from 'react';
import { createProperty, updateProperty } from '../api.js';

const TYPES = ['Apartment', 'Villa', 'Independent House', 'Plot'];
const STATUSES = ['Available', 'Under Offer', 'Sold'];

/**
 * Property create/edit modal. Creates a new listing when no `property`
 * prop is provided; otherwise updates the given listing.
 */
export default function PropertyForm({ property, onClose, onSaved }) {
  const isEdit = Boolean(property);
  const [f, setF] = useState({
    title: property?.title || '',
    city: property?.city || '',
    address: property?.address || '',
    price: property?.price ?? '',
    bedrooms: property?.bedrooms ?? '',
    bathrooms: property?.bathrooms ?? '',
    area: property?.area ?? '',
    type: property?.type || 'Apartment',
    status: property?.status || 'Available',
    imageUrl: property?.imageUrl || '',
    description: property?.description || '',
    featured: property?.featured || false,
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setF((prev) => ({ ...prev, [key]: value }));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (isEdit) {
        await updateProperty(property.id, f);
      } else {
        await createProperty(f);
      }
      onSaved();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h2>{isEdit ? 'Edit listing' : 'New listing'}</h2>

        <label>
          Property title *
          <input value={f.title} onChange={set('title')} autoFocus required />
        </label>

        <div className="field-row">
          <label>
            City
            <input value={f.city} onChange={set('city')} />
          </label>
          <label>
            Price (₹)
            <input type="number" min="0" value={f.price} onChange={set('price')} />
          </label>
        </div>

        <label>
          Address
          <input value={f.address} onChange={set('address')} />
        </label>

        <div className="field-row three">
          <label>
            Bedrooms
            <input type="number" min="0" value={f.bedrooms} onChange={set('bedrooms')} />
          </label>
          <label>
            Bathrooms
            <input type="number" min="0" value={f.bathrooms} onChange={set('bathrooms')} />
          </label>
          <label>
            Area (sqft)
            <input type="number" min="0" value={f.area} onChange={set('area')} />
          </label>
        </div>

        <div className="field-row">
          <label>
            Type
            <select value={f.type} onChange={set('type')}>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label>
            Status
            <select value={f.status} onChange={set('status')}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
        </div>

        <label>
          Image URL
          <input value={f.imageUrl} onChange={set('imageUrl')} placeholder="https://… (optional)" />
        </label>

        <label>
          Description
          <textarea rows={3} value={f.description} onChange={set('description')} />
        </label>

        <label className="checkbox-label">
          <input type="checkbox" checked={f.featured} onChange={set('featured')} />
          Feature this listing
        </label>

        {error && <div className="error-box">{error}</div>}

        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create listing'}
          </button>
        </div>
      </form>
    </div>
  );
}
