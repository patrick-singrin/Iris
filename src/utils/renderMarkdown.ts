/**
 * Lightweight markdown → HTML renderer.
 *
 * Supports: headings (h1–h4), bold, italic, strikethrough, inline code,
 * fenced code blocks, links, images, blockquotes, tables, ordered/unordered
 * lists, task lists, and horizontal rules.
 *
 * No external dependencies — intentionally minimal for preview use.
 */
export function renderMarkdown(md: string): string {
  const escaped = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  const lines = escaped.split('\n')
  const html: string[] = []
  let inCodeBlock = false
  let inList: 'ul' | 'ol' | null = null
  let inBlockquote = false
  let inTable = false

  const closeList = () => {
    if (inList) { html.push(inList === 'ul' ? '</ul>' : '</ol>'); inList = null }
  }
  const closeBlockquote = () => {
    if (inBlockquote) { html.push('</blockquote>'); inBlockquote = false }
  }
  const closeTable = () => {
    if (inTable) { html.push('</tbody></table>'); inTable = false }
  }

  for (const line of lines) {
    // Code blocks
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        html.push('</code></pre>')
        inCodeBlock = false
      } else {
        closeList(); closeBlockquote(); closeTable()
        html.push('<pre class="md-code-block"><code>')
        inCodeBlock = true
      }
      continue
    }
    if (inCodeBlock) {
      html.push(line)
      continue
    }

    // Inline formatting (order matters: code → bold → italic → strikethrough → images → links)
    const fmt = (s: string) =>
      s.replace(/`([^`]+)`/g, '<code class="md-inline-code">$1</code>')
       .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
       .replace(/__(.+?)__/g, '<strong>$1</strong>')
       .replace(/\*(.+?)\*/g, '<em>$1</em>')
       .replace(/_(.+?)_/g, '<em>$1</em>')
       .replace(/~~(.+?)~~/g, '<del>$1</del>')
       .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img class="md-image" src="$2" alt="$1" />')
       .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a class="md-link" href="$2" target="_blank" rel="noopener">$1</a>')

    const trimmed = line.trim()

    // Empty line → close open blocks
    if (!trimmed) {
      closeList(); closeBlockquote(); closeTable()
      continue
    }

    // Headings
    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/)
    if (headingMatch) {
      closeList(); closeBlockquote(); closeTable()
      const level = headingMatch[1]!.length
      html.push(`<h${level} class="md-h${level}">${fmt(headingMatch[2]!)}</h${level}>`)
      continue
    }

    // Blockquote
    if (trimmed.startsWith('&gt; ') || trimmed === '&gt;') {
      closeList(); closeTable()
      if (!inBlockquote) {
        html.push('<blockquote class="md-blockquote">')
        inBlockquote = true
      }
      const content = trimmed.replace(/^&gt;\s?/, '')
      if (content) html.push(`<p class="md-p">${fmt(content)}</p>`)
      continue
    } else if (inBlockquote) {
      closeBlockquote()
    }

    // Table row (pipes at start and end)
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      closeList(); closeBlockquote()
      const cells = trimmed.slice(1, -1).split('|').map(c => c.trim())
      // Separator row (e.g. |---|---|) → skip
      if (cells.every(c => /^[-:]+$/.test(c))) continue
      if (!inTable) {
        html.push('<table class="md-table"><thead><tr>')
        cells.forEach(c => html.push(`<th>${fmt(c)}</th>`))
        html.push('</tr></thead><tbody>')
        inTable = true
      } else {
        html.push('<tr>')
        cells.forEach(c => html.push(`<td>${fmt(c)}</td>`))
        html.push('</tr>')
      }
      continue
    } else if (inTable) {
      closeTable()
    }

    // Unordered list (also handles task lists)
    if (trimmed.match(/^[-*]\s+/)) {
      closeBlockquote(); closeTable()
      if (inList !== 'ul') {
        if (inList) html.push('</ol>')
        html.push('<ul class="md-list">')
        inList = 'ul'
      }
      let content = trimmed.replace(/^[-*]\s+/, '')
      // Task list checkboxes
      if (content.startsWith('[x] ') || content.startsWith('[X] ')) {
        content = `<span class="md-checkbox md-checkbox--checked">&#9745;</span> ${content.slice(4)}`
      } else if (content.startsWith('[ ] ')) {
        content = `<span class="md-checkbox">&#9744;</span> ${content.slice(4)}`
      }
      html.push(`<li>${fmt(content)}</li>`)
      continue
    }

    // Ordered list
    if (trimmed.match(/^\d+\.\s+/)) {
      closeBlockquote(); closeTable()
      if (inList !== 'ol') {
        if (inList) html.push('</ul>')
        html.push('<ol class="md-list">')
        inList = 'ol'
      }
      html.push(`<li>${fmt(trimmed.replace(/^\d+\.\s+/, ''))}</li>`)
      continue
    }

    // Horizontal rule
    if (trimmed.match(/^[-*_]{3,}$/)) {
      closeList(); closeBlockquote(); closeTable()
      html.push('<hr class="md-hr">')
      continue
    }

    // Paragraph
    closeList(); closeBlockquote(); closeTable()
    html.push(`<p class="md-p">${fmt(trimmed)}</p>`)
  }

  if (inCodeBlock) html.push('</code></pre>')
  closeList(); closeBlockquote(); closeTable()

  return html.join('\n')
}
