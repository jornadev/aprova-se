const PALETTE = ['#7c3aed', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#f97316']

// Lines to skip unconditionally
const SKIP_RE = [
  /^\d{1,3}$/,                                                         // bare page numbers
  /^(concurso|edital|cargo|prova|banca|local:|data:|vagas:)/i,         // common headers
  /^(gabarito|questão|questoes|nome:|cpf:|assinatura)/i,
]

// Sub-numbered topic: 1.1, 1.2.3, 2.1, etc. (must have at least one dot)
const SUB_NUMBERED_RE = /^(\d+\.)+\d+[\s.)-]/

// Lettered bullet: a) b) c) ...
const LETTER_BULLET_RE = /^[a-zA-Z]\)/

// Symbol bullet: •, -, *, ·  (only when at start of line)
const SYMBOL_BULLET_RE = /^[•\-*·]\s+/

// Roman numeral subject header: I - ... II - ... III. ... IV. ...
const ROMAN_SUBJECT_RE = /^(I{1,3}|IV|VI{0,3}|IX|XI{0,3}|XIV|XV|XVI|XX?)[\s.\-–—]+/i

// Top-level numbered: starts with digit(s) and a dot/paren, e.g. "1." or "2)"
const TOP_LEVEL_NUM_RE = /^(\d+)[.)]\s+(.+)/

function isAllCaps(text) {
  // All caps if it has no lowercase letters AND has at least one uppercase letter
  // and length > 3 chars (after stripping numbers/punctuation)
  const letters = text.replace(/[^a-zA-ZÀ-ÿ]/g, '')
  return letters.length > 3 && letters === letters.toUpperCase()
}

function cleanText(text) {
  // Remove leading numbering/bullets, trim whitespace
  return text
    .replace(/^(\d+\.)+\d+[\s.)-]+/, '')  // sub-numbered prefix
    .replace(/^[a-zA-Z]\)\s*/, '')          // letter bullet
    .replace(/^[•\-*·]\s+/, '')             // symbol bullet
    .replace(/^(I{1,3}|IV|VI{0,3}|IX|XI{0,3}|XIV|XV|XVI|XX?)[\s.\-–—]+/i, '') // roman
    .replace(/^\d+[.)]\s+/, '')             // top-level number
    .trim()
}

/**
 * Parse edital text into an array of subjects with their topics.
 * @param {string} text - raw pasted text from the edital PDF
 * @returns {{ name: string, color: string, topics: string[] }[]}
 */
export function parseEdital(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)

  const subjects = []
  let currentSubject = null
  let colorIdx = 0

  const pushSubject = (name) => {
    const cleaned = cleanText(name).trim()
    if (!cleaned) return
    currentSubject = { name: cleaned, color: PALETTE[colorIdx % PALETTE.length], topics: [] }
    colorIdx++
    subjects.push(currentSubject)
  }

  const pushTopic = (name) => {
    const cleaned = cleanText(name).trim()
    if (!cleaned) return
    if (!currentSubject) {
      // Topics before any subject header — create an implicit subject
      pushSubject('GERAL')
    }
    if (!currentSubject.topics.includes(cleaned)) {
      currentSubject.topics.push(cleaned)
    }
  }

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue

    // Skip noise lines
    if (SKIP_RE.some(re => re.test(line))) continue
    if (line.length < 3) continue

    // --- Classify the line ---

    // 1) Sub-numbered → topic (1.1 text, 1.2.3 text, etc.)
    if (SUB_NUMBERED_RE.test(line)) {
      pushTopic(line)
      continue
    }

    // 2) Letter bullet → topic (a) text)
    if (LETTER_BULLET_RE.test(line)) {
      pushTopic(line)
      continue
    }

    // 3) Symbol bullet → topic (• text, - text)
    if (SYMBOL_BULLET_RE.test(line)) {
      pushTopic(line)
      continue
    }

    // 4) Roman numeral subject header (I - TÍTULO, II. TÍTULO)
    if (ROMAN_SUBJECT_RE.test(line)) {
      pushSubject(line)
      continue
    }

    // 5) ALL CAPS line with no lowercase → subject
    if (isAllCaps(line)) {
      pushSubject(line)
      continue
    }

    // 6) Top-level numbered line: "1. TEXTO" or "2) TEXTO"
    const topMatch = TOP_LEVEL_NUM_RE.exec(line)
    if (topMatch) {
      const body = topMatch[2].trim()
      // If body is mostly uppercase → subject header
      if (isAllCaps(body)) {
        pushSubject(line)
      } else {
        // lowercase body → topic
        pushTopic(line)
      }
      continue
    }

    // 7) Fallback: if no current subject, treat as subject; otherwise as topic
    if (!currentSubject) {
      pushSubject(line)
    } else {
      pushTopic(line)
    }
  }

  // Filter out subjects with no topics (lone headers become topics of next, not standalone)
  return subjects.filter(s => s.name && s.topics.length >= 0)
}
