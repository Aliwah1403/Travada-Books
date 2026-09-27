// Client-side search for the /guides help centre. Small and dependency-free:
// normalised word matching over each article's title, keywords, category
// name and summary, weighted towards the title.

export type SearchableArticle = {
  slug: string
  title: string
  summary: string
  keywords?: string[]
  written: boolean
}

export type SearchDoc<T extends SearchableArticle> = {
  article: T
  title: string[]
  keywords: string[]
  category: string[]
  summary: string[]
}

// Words that carry no meaning in a help query ("how do I send an invoice").
// Dropped from the query unless the query is nothing but these.
const STOPWORDS = new Set([
  "a", "an", "and", "are", "can", "do", "does", "for", "how", "i", "in", "is",
  "it", "my", "of", "on", "or", "the", "to", "what", "when", "where", "with",
])

/**
 * Lowercase, strip accents and apostrophes, and split into words. Hyphenated
 * words are kept both joined and split ("M-Pesa" → "mpesa", "m", "pesa";
 * "part-paid" → "partpaid", "part", "paid") so either spelling matches.
 */
export function tokenize(text: string): string[] {
  const base = text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’]/g, "")
  const joined = base.replace(/(\w)-(\w)/g, "$1$2").split(/[^a-z0-9]+/)
  const split = base.split(/[^a-z0-9]+/)
  return [...new Set([...joined, ...split])].filter(Boolean)
}

function queryTokens(query: string): string[] {
  const base = query
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’]/g, "")
    .replace(/(\w)-(\w)/g, "$1$2")
  const words = [...new Set(base.split(/[^a-z0-9]+/).filter(Boolean))]
  const meaningful = words.filter((word) => !STOPWORDS.has(word))
  return meaningful.length > 0 ? meaningful : words
}

export function buildSearchIndex<T extends SearchableArticle>(
  articles: T[],
  categoryTitle: (article: T) => string,
): SearchDoc<T>[] {
  return articles.map((article) => ({
    article,
    title: tokenize(article.title),
    keywords: tokenize((article.keywords ?? []).join(" ")),
    category: tokenize(categoryTitle(article)),
    summary: tokenize(article.summary),
  }))
}

// 3 = whole word, 2 = word starts with the query token, 1 = contains it
// (only for tokens of 3+ characters, so "in" doesn't match "invoice" twice
// over), 0 = no match.
function fieldMatch(words: string[], token: string): number {
  let best = 0
  for (const word of words) {
    if (word === token) return 3
    if (word.startsWith(token)) best = Math.max(best, 2)
    else if (token.length >= 3 && word.includes(token)) best = Math.max(best, 1)
  }
  return best
}

const WEIGHTS = { title: 10, keywords: 6, category: 4, summary: 3 } as const

/**
 * Every query token must match somewhere in an article. Score is the sum,
 * per token, of the best field match × that field's weight; written
 * articles win ties over coming-soon ones, then the original order stands.
 */
export function searchArticles<T extends SearchableArticle>(index: SearchDoc<T>[], query: string): T[] {
  const tokens = queryTokens(query)
  if (tokens.length === 0) return []

  const scored: { article: T; score: number; order: number }[] = []
  index.forEach((doc, order) => {
    let score = 0
    for (const token of tokens) {
      let best = 0
      for (const field of ["title", "keywords", "category", "summary"] as const) {
        best = Math.max(best, fieldMatch(doc[field], token) * WEIGHTS[field])
      }
      if (best === 0) return
      score += best
    }
    if (doc.article.written) score += 1
    scored.push({ article: doc.article, score, order })
  })

  return scored.sort((a, b) => b.score - a.score || a.order - b.order).map((entry) => entry.article)
}
