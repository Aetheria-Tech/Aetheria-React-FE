export const MAX_ROUTE_STEP_DISPLAY_LENGTH = 14

export const getRouteStepDisplayValue = (value: string) => {
  const trimmed = value.trim()
  return trimmed.length > MAX_ROUTE_STEP_DISPLAY_LENGTH
    ? `${trimmed.slice(0, MAX_ROUTE_STEP_DISPLAY_LENGTH)}...`
    : trimmed
}
