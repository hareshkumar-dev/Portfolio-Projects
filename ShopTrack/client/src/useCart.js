import { useState, useEffect, useCallback } from 'react';

/**
 * Shopping cart state, persisted to localStorage so it survives
 * page reloads. Keyed by pricebookEntryId (the sellable unit).
 */
const KEY = 'shoptrack-cart';

export function useCart() {
  const [items, setItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(KEY) || '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(items));
  }, [items]);

  const add = useCallback((product) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.pricebookEntryId === product.pricebookEntryId);
      if (existing) {
        return prev.map((i) =>
          i.pricebookEntryId === product.pricebookEntryId
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...prev, {
        pricebookEntryId: product.pricebookEntryId,
        name: product.name,
        price: product.price,
        quantity: 1,
      }];
    });
  }, []);

  const setQuantity = useCallback((pricebookEntryId, quantity) => {
    setItems((prev) =>
      quantity <= 0
        ? prev.filter((i) => i.pricebookEntryId !== pricebookEntryId)
        : prev.map((i) => (i.pricebookEntryId === pricebookEntryId ? { ...i, quantity } : i))
    );
  }, []);

  const remove = useCallback((pricebookEntryId) => {
    setItems((prev) => prev.filter((i) => i.pricebookEntryId !== pricebookEntryId));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const count = items.reduce((sum, i) => sum + i.quantity, 0);
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return { items, add, setQuantity, remove, clear, count, total };
}
