import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { CSS } from './styles.js';

// One React root per mounted element, so the LWC host can cleanly
// unmount when it's removed from the page.
const roots = new WeakMap();

function injectStyles() {
  if (document.head.querySelector('style[data-meetslot]')) return;
  const style = document.createElement('style');
  style.setAttribute('data-meetslot', '');
  style.textContent = CSS;
  document.head.appendChild(style);
}

/**
 * Called by the LWC host once the bundle has loaded.
 * @param {HTMLElement} el   container to render into
 * @param {object}      api  bridge of async functions backed by Apex
 */
export function mount(el, api) {
  injectStyles();
  const root = createRoot(el);
  roots.set(el, root);
  root.render(<App api={api} />);
}

/** Called by the LWC host on disconnect. */
export function unmount(el) {
  const root = roots.get(el);
  if (root) {
    root.unmount();
    roots.delete(el);
  }
}
