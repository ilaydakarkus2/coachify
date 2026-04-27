/**
 * CSV export utility — BOM-prefixed, Excel-friendly for Turkish characters.
 */

function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) return ""
  const str = String(value)
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function generateCSV(headers: string[], rows: Record<string, unknown>[]): string {
  const headerLine = headers.map(h => escapeCSV(h)).join(",")
  const dataLines = rows.map(row =>
    Object.keys(row).map(key => escapeCSV(row[key])).join(",")
  )
  // BOM prefix for Excel UTF-8 compatibility
  return "\uFEFF" + [headerLine, ...dataLines].join("\n")
}

export function csvResponse(csv: string, filename: string): Response {
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
    },
  })
}

export function formatDate(d: Date | null | undefined): string {
  if (!d) return ""
  return d instanceof Date ? d.toISOString().slice(0, 10) : String(d)
}
