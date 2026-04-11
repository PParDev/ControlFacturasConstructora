export const fmt = (n) => '$' + Number(n).toLocaleString('es-MX')

export const today = () => {
  const d = new Date()
  return `${d.getDate()}/${d.getMonth() + 1}`
}
