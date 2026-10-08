// Fake device chrome is an explicit local design aid, never production UI.
export function designPreviewEnabled(preview = import.meta.env.VITE_NOM_DESIGN_PREVIEW === 'true') {
  return import.meta.env.DEV && preview === true
}
