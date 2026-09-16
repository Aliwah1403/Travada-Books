declare module "*.mdx" {
  import type { ComponentType } from "react"

  export const frontmatter: {
    title: string
    summary: string
    publishedAt: string
    updatedAt?: string
    image?: string
    tag?: string
    draft?: boolean
    placeholder?: boolean
    [key: string]: unknown
  }

  const MDXComponent: ComponentType<{
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    components?: Record<string, ComponentType<any>>
  }>
  export default MDXComponent
}
