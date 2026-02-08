export const formatDistance = (value: number) =>
  Number.isFinite(value) && value > 0 ? `${value}km` : "-"

export const formatDate = (value: string) => {
  if (!value) return "-"
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? "-" : parsed.toLocaleDateString()
}

export const formatDateTime = (value: string) => {
  if (!value) return "-"
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? "-" : parsed.toLocaleString()
}
