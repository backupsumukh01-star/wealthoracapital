/** Minimal `{{variable}}` interpolation for DB-managed email templates. */
export function renderVariables(input: string, variables: Record<string, string>): string {
  return input.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, key: string) => {
    const value = variables[key]
    return value === undefined ? match : value
  })
}

export function extractVariableNames(input: string): string[] {
  const names = new Set<string>()
  const pattern = /\{\{\s*([\w.]+)\s*\}\}/g
  let match: RegExpExecArray | null
  while ((match = pattern.exec(input)) !== null) {
    if (match[1]) names.add(match[1])
  }
  return [...names]
}
