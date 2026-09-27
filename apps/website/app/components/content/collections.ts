import { Doc01Icon, FileEditIcon, SparklesIcon } from "@travada-books/ui/icons"

import type { Collection } from "~/components/content/article-layout"

// Eyebrow label, index route and icon for each MDX collection.
export const GUIDES: Collection = { label: "Guides", href: "/guides", icon: Doc01Icon }
export const UPDATES: Collection = { label: "Updates", href: "/updates", icon: SparklesIcon }
export const LEGAL: Collection = { label: "Legal", href: "/legal/terms", icon: FileEditIcon }
