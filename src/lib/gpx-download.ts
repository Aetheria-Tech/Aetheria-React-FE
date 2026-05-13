export const sanitizeGpxFileName = (value: string) => {
  const sanitized = value
    .trim()
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 80)

  return sanitized || "aetheria-route"
}
