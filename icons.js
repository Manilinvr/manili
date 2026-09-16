/* МаниЛи — общий набор SVG-иконок. Используется на сайте и в админке.
   Чтобы иконка получила анимацию, ей достаточно класса "icon" (+ модификатора) из styles.css/admin/styles.css. */
window.MANILI_ICONS = {
  telegram: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M21 4L3 11.5l6 2m12-9.5l-3.5 16-8.5-6.5m12-9.5L9 13.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  whatsapp: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 20l1.4-4.2A8 8 0 1 1 9 18.5L4 20Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 10.5c0 3 2.5 5.5 5.5 5.5.6 0 1-.5.8-1l-.6-1.4c-.1-.4-.6-.5-.9-.3l-.8.5a4.6 4.6 0 0 1-2.8-2.8l.5-.8c.2-.3.1-.8-.3-.9L9 8.3c-.5-.2-1 .2-1 .8v1.4Z" fill="currentColor"/></svg>',
  instagram: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="5" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.8"/><circle cx="17.2" cy="6.8" r="1.1" fill="currentColor"/></svg>',
  vk: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 4.5c.3 8 4.4 13 11.6 13h.7v-4.4c2.6.3 4.6 2.2 5.4 4.4H24c-1-3.7-3.7-5.8-5.4-6.6 1.7-1 4-3 4.6-6.2h-3.5c-.8 2.8-2.9 4.8-4.9 5V4.5h-3.5v8.5C9.6 12.6 7.5 9 7.2 4.5H4Z" fill="currentColor"/></svg>',
  tiktok: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M14 3v10.8a3.2 3.2 0 1 1-2.6-3.15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M14 3c.4 2.6 2.2 4.5 5 4.8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  youtube: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="2.5" y="6" width="19" height="12" rx="4" stroke="currentColor" stroke-width="1.8"/><path d="M10.5 9.5v5l4.5-2.5-4.5-2.5Z" fill="currentColor"/></svg>',
  phone: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 3.5 9 4l1 3.5-2 1.5a12 12 0 0 0 6 6l1.5-2 3.5 1 .5 3c0 1-1 2-2 2C10.5 19 4 12.5 4 5.5c0-1 1-2 2-2Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
  email: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="2.5" y="5" width="19" height="14" rx="2.5" stroke="currentColor" stroke-width="1.8"/><path d="m3.5 6.5 8.5 6.5 8.5-6.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  link: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9.5 14.5 14.5 9.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M11 7.5 12.7 5.8a3.8 3.8 0 0 1 5.4 5.4L16.5 13M13 16.5l-1.7 1.7a3.8 3.8 0 0 1-5.4-5.4L7.5 11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  'arrow-up-right': '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  download: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5M4.5 18.5v1a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="18" cy="5" r="2.6" stroke="currentColor" stroke-width="1.8"/><circle cx="6" cy="12" r="2.6" stroke="currentColor" stroke-width="1.8"/><circle cx="18" cy="19" r="2.6" stroke="currentColor" stroke-width="1.8"/><path d="m8.3 10.7 7.4-4.2M8.3 13.3l7.4 4.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'
};
window.manili_icon = function (key) {
  return window.MANILI_ICONS[key] || window.MANILI_ICONS.link;
};
