export interface PromptComponents {
  role: string
  context?: string
  rules: string
  examples: string
  constraints: string
}

export function composePrompt(c: PromptComponents): string {
  return [
    `<role>\n${c.role}\n</role>`,
    c.context ? `<context>\n${c.context}\n</context>` : null,
    `<rules>\n${c.rules}\n</rules>`,
    `<examples>\n${c.examples}\n</examples>`,
    `<constraints>\n${c.constraints}\n</constraints>`,
  ]
    .filter(Boolean)
    .join("\n\n")
}
