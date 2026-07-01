export function exportToCsv(filename, rows, columns) {
  // columns: [{ key, label }]
  const escape = (val) => {
    const s = val === null || val === undefined ? '' : String(val)
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }

  const header = columns.map((c) => escape(c.label)).join(';')
  const body = rows.map((row) => columns.map((c) => escape(row[c.key])).join(';')).join('\n')
  const csv = '\uFEFF' + header + '\n' + body // BOM para que Excel lea bien los acentos

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
