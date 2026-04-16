export const fmt = (n) => '$' + Number(n).toLocaleString('es-MX')

export const today = () => {
  return new Date().toISOString().split('T')[0]
}
