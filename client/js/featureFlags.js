export const featureFlags = {
  alertaPreco: true
}

if (typeof window !== 'undefined') {
  window.featureFlags = window.featureFlags || featureFlags
}
