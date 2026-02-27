<script setup lang="ts">
import type { ChatMessage } from '@/types/chat'

defineProps<{
  message: ChatMessage
}>()

/**
 * Lightweight markdown renderer for assistant messages.
 * Handles: bold, italic, inline code, code blocks, tables, ordered/unordered lists, headings, hr, line breaks.
 */
function renderMarkdown(text: string): string {
  let html = text
    // Escape HTML entities first
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // Fenced code blocks (``` ... ```)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, _lang, code) => {
    return `<pre><code>${code.trim()}</code></pre>`
  })

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')

  // Tables: detect contiguous lines starting with |
  html = html.replace(/((?:^\|.+\|\s*$\n?){2,})/gm, (tableBlock) => {
    const rows = tableBlock.trim().split('\n').filter(r => r.trim())
    // Skip separator row (|---|---|)
    const dataRows = rows.filter(r => !/^\|[\s\-:|]+\|$/.test(r))
    if (dataRows.length === 0) return tableBlock

    const parseRow = (row: string) =>
      row.split('|').slice(1, -1).map(cell => cell.trim())

    const headerCells = parseRow(dataRows[0]!)
    const thead = `<thead><tr>${headerCells.map(c => `<th>${c}</th>`).join('')}</tr></thead>`
    const bodyRows = dataRows.slice(1).map(row => {
      const cells = parseRow(row)
      return `<tr>${cells.map(c => `<td>${c}</td>`).join('')}</tr>`
    }).join('')
    const tbody = bodyRows ? `<tbody>${bodyRows}</tbody>` : ''

    return `<table>${thead}${tbody}</table>`
  })

  // Horizontal rule
  html = html.replace(/^---+$/gm, '<hr>')

  // Headings (### -> h4, ## -> h3 within chat)
  html = html.replace(/^### (.+)$/gm, '<h4>$1</h4>')
  html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>')

  // Bold + italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')

  // Ordered lists (1. 2. 3.)
  html = html.replace(/^(\d+)\. (.+)$/gm, '<oli>$2</oli>')
  html = html.replace(/(<oli>.*<\/oli>\n?)+/g, (match) => {
    const items = match.replace(/<\/?oli>/g, (tag) => tag === '<oli>' ? '<li>' : '</li>')
    return `<ol>${items}</ol>`
  })

  // Unordered lists
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>')
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => {
    // Don't re-wrap if already inside <ol>
    if (match.includes('<ol>')) return match
    return `<ul>${match}</ul>`
  })

  // Paragraphs (double newlines)
  html = html.replace(/\n\n/g, '</p><p>')
  html = `<p>${html}</p>`

  // Clean up empty paragraphs
  html = html.replace(/<p>\s*<\/p>/g, '')
  // Fix block elements wrapped in <p>
  html = html.replace(/<p>(<(?:h[34]|pre|ul|ol|table|hr)[\s>])/g, '$1')
  html = html.replace(/(<\/(?:h[34]|pre|ul|ol|table)>|<hr>)<\/p>/g, '$1')

  // Single newlines to <br> (but not after block elements)
  html = html.replace(/(?<!<\/li>|<\/tr>|<\/thead>|<\/tbody>|<\/table>|<hr>)\n(?!<)/g, '<br>')

  return html
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div
    class="chat-message"
    :class="`chat-message--${message.role}`"
  >
    <div class="chat-message__bubble">
      <div
        v-if="message.role === 'assistant'"
        class="chat-message__content chat-message__content--markdown"
        v-html="renderMarkdown(message.content)"
      />
      <div v-else class="chat-message__content">
        {{ message.content }}
      </div>
    </div>
    <div class="chat-message__time">
      {{ formatTime(message.timestamp) }}
    </div>
  </div>
</template>

<style scoped>
.chat-message {
  display: flex;
  flex-direction: column;
  margin-bottom: 16px;
}

.chat-message--user {
  align-items: flex-end;
}

.chat-message--assistant {
  align-items: flex-start;
}

.chat-message__bubble {
  max-width: 80%;
  padding: 12px 16px;
  line-height: 1.5;
  font-size: 14px;
}

.chat-message--user .chat-message__bubble {
  max-width: 70%;
  background: var(--telekom-color-primary-standard, #e20074);
  color: #fff;
  border-radius: 16px 16px 4px 16px;
}

.chat-message--assistant .chat-message__bubble {
  background: var(--telekom-color-background-surface, #fff);
  border: 1px solid var(--telekom-color-ui-border-standard, #ccc);
  color: var(--telekom-color-text-and-icon-standard, #191919);
  border-radius: 16px 16px 16px 4px;
}

.chat-message__time {
  font-size: 11px;
  color: var(--telekom-color-text-and-icon-additional, #6c6c6c);
  margin-top: 4px;
  padding: 0 4px;
}

/* Markdown content styles */
.chat-message__content--markdown :deep(h3) {
  font-size: 15px;
  font-weight: 700;
  margin: 12px 0 4px;
}

.chat-message__content--markdown :deep(h4) {
  font-size: 14px;
  font-weight: 700;
  margin: 10px 0 4px;
}

.chat-message__content--markdown :deep(p) {
  margin: 0 0 8px;
}

.chat-message__content--markdown :deep(p:last-child) {
  margin-bottom: 0;
}

.chat-message__content--markdown :deep(strong) {
  font-weight: 700;
}

.chat-message__content--markdown :deep(code) {
  background: rgba(0, 0, 0, 0.06);
  padding: 2px 5px;
  border-radius: 3px;
  font-size: 13px;
  font-family: monospace;
}

.chat-message__content--markdown :deep(pre) {
  background: rgba(0, 0, 0, 0.06);
  padding: 12px;
  border-radius: 6px;
  overflow-x: auto;
  margin: 8px 0;
}

.chat-message__content--markdown :deep(pre code) {
  background: none;
  padding: 0;
  font-size: 13px;
}

.chat-message__content--markdown :deep(ul) {
  margin: 4px 0 8px;
  padding-left: 20px;
}

.chat-message__content--markdown :deep(li) {
  margin-bottom: 2px;
}

.chat-message__content--markdown :deep(ol) {
  margin: 4px 0 8px;
  padding-left: 20px;
}

.chat-message__content--markdown :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 8px 0;
  font-size: 13px;
}

.chat-message__content--markdown :deep(th),
.chat-message__content--markdown :deep(td) {
  border: 1px solid var(--telekom-color-ui-border-standard, #ccc);
  padding: 8px 12px;
  text-align: left;
}

.chat-message__content--markdown :deep(th) {
  background: rgba(0, 0, 0, 0.04);
  font-weight: 600;
}

.chat-message__content--markdown :deep(tr:hover td) {
  background: rgba(0, 0, 0, 0.02);
}

.chat-message__content--markdown :deep(hr) {
  border: none;
  border-top: 1px solid var(--telekom-color-ui-border-standard, #ccc);
  margin: 12px 0;
}

.chat-message__content--markdown :deep(hr:last-child) {
  display: none;
}
</style>
