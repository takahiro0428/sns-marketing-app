export default defineEventHandler(async (event) => {
  const formData = await readMultipartFormData(event)

  if (!formData || formData.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'NO_FILE_UPLOADED' })
  }

  const file = formData.find((f) => f.name === 'file')
  if (!file || !file.data) {
    throw createError({ statusCode: 400, statusMessage: 'FILE_NOT_FOUND' })
  }

  const contentType = file.type || ''
  const fileName = file.filename || ''

  if (contentType === 'application/pdf' || fileName.endsWith('.pdf')) {
    // Basic PDF text extraction
    // Extract visible text strings from PDF binary
    const buffer = file.data
    const text = extractTextFromPdfBuffer(buffer)
    return { text }
  }

  // Plain text / markdown
  const text = file.data.toString('utf-8')
  return { text }
})

function extractTextFromPdfBuffer(buffer: Buffer): string {
  // Simple PDF text extraction - extracts text between BT/ET markers
  // and parenthesized strings. For production, a proper PDF library would be used.
  const content = buffer.toString('latin1')
  const texts: string[] = []

  // Extract strings in parentheses within text objects
  const streamRegex = /stream\r?\n([\s\S]*?)endstream/g
  let streamMatch

  while ((streamMatch = streamRegex.exec(content)) !== null) {
    const stream = streamMatch[1]
    const textRegex = /\(([^)]*)\)/g
    let textMatch

    while ((textMatch = textRegex.exec(stream)) !== null) {
      const decoded = textMatch[1]
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\\(/g, '(')
        .replace(/\\\)/g, ')')
        .replace(/\\\\/g, '\\')
      if (decoded.trim()) {
        texts.push(decoded)
      }
    }
  }

  if (texts.length === 0) {
    // Fallback: extract any readable UTF-8 text
    const utf8Content = buffer.toString('utf-8')
    const readableRegex = /[\u3000-\u9FFF\u4E00-\u9FFF\uF900-\uFAFF\w\s,.!?。、！？]+/g
    let match
    while ((match = readableRegex.exec(utf8Content)) !== null) {
      if (match[0].trim().length > 5) {
        texts.push(match[0].trim())
      }
    }
  }

  return texts.join('\n') || 'テキストの抽出に失敗しました。テキストファイルまたはMarkdownファイルでのアップロードを推奨します。'
}
