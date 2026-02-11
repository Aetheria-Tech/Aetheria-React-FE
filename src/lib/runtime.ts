export function isDevEnvironment(): boolean {
  return Boolean(import.meta.env?.DEV)
}

