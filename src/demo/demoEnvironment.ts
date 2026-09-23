/** GitHub Pages build: there is no backend, so the whole site is the demo. */
export const isStaticDemoBuild = import.meta.env.VITE_STATIC_DEMO === 'true'
