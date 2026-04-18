/**
 * Paginador — componente reutilizable de paginación
 *
 * Props:
 *   total    — número total de items
 *   page     — página actual (1-indexed)
 *   perPage  — items por página (default 10)
 *   onChange — función (newPage) => void
 */
export function Paginador({ total, page, perPage = 10, onChange }) {
  const totalPages = Math.ceil(total / perPage)
  if (totalPages <= 1) return null

  const desde = (page - 1) * perPage + 1
  const hasta  = Math.min(page * perPage, total)

  // Generar array de páginas a mostrar (max 5, centrado en la actual)
  const rango = () => {
    const delta = 2
    const left  = Math.max(1, page - delta)
    const right = Math.min(totalPages, page + delta)
    const pages = []
    for (let i = left; i <= right; i++) pages.push(i)
    // Añadir primera y última con "..." si hace falta
    if (pages[0] > 2) pages.unshift('...')
    if (pages[0] !== 1) pages.unshift(1)
    if (pages[pages.length - 1] < totalPages - 1) pages.push('...')
    if (pages[pages.length - 1] !== totalPages) pages.push(totalPages)
    return pages
  }

  return (
    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 select-none">
      <div className="text-xs text-gray-400">
        {desde}–{hasta} <span className="text-gray-300">de</span> {total}
      </div>
      <div className="flex items-center gap-1">
        <button
          className="btn btn-sm px-2"
          disabled={page === 1}
          onClick={() => onChange(page - 1)}
        >
          ‹
        </button>
        {rango().map((p, i) =>
          p === '...'
            ? <span key={`e${i}`} className="text-xs text-gray-300 px-1">…</span>
            : (
              <button
                key={p}
                onClick={() => onChange(p)}
                className={`btn btn-sm min-w-[28px] ${page === p ? 'btn-primary' : ''}`}
              >
                {p}
              </button>
            )
        )}
        <button
          className="btn btn-sm px-2"
          disabled={page === totalPages}
          onClick={() => onChange(page + 1)}
        >
          ›
        </button>
      </div>
    </div>
  )
}
