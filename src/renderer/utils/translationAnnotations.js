import path from 'path'

const SECTION_RE = /^\s*>>>>>>>>\[([^\]]+)\]<<<<<<<<\s*$/gm
const ENTRY_RE = /^\s*-{8,}\[(\d+)\]-{8,}\s*\[([^\]]+)\]\s*$/gm

export const normalizeTranslationImageName = (name = '') => {
  const fileName = String(name).split(/[\\/]/).pop() || ''
  return fileName.toLocaleLowerCase()
}

const parseCoordinate = (raw = '') => {
  const values = String(raw).split(',').map((value) => Number(value.trim()))
  if (values.length !== 3 || values.some((value) => !Number.isFinite(value))) {
    return null
  }
  const [x, y, type] = values
  if (x < 0 || x > 1 || y < 0 || y > 1 || ![1, 2].includes(type)) {
    return null
  }
  return { x, y, type }
}

const cleanText = (text = '') => text.replace(/^\uFEFF/, '').trim()

const parseSection = (imageName, sectionText) => {
  const entries = []
  ENTRY_RE.lastIndex = 0
  const matches = []
  let match = ENTRY_RE.exec(sectionText)
  while (match) {
    matches.push({ match, start: match.index, end: ENTRY_RE.lastIndex })
    match = ENTRY_RE.exec(sectionText)
  }
  matches.forEach((item, index) => {
    const coordinate = parseCoordinate(item.match[2])
    if (!coordinate) return
    const end = matches[index + 1] ? matches[index + 1].start : sectionText.length
    const text = cleanText(sectionText.slice(item.end, end))
    if (!text) return
    entries.push({
      id: `${normalizeTranslationImageName(imageName)}:${item.match[1]}`,
      number: Number(item.match[1]),
      text,
      ...coordinate
    })
  })
  return entries
}

export const parseTranslationText = (content = '') => {
  const source = String(content).replace(/^\uFEFF/, '')
  SECTION_RE.lastIndex = 0
  const sections = []
  let match = SECTION_RE.exec(source)
  while (match) {
    sections.push({ imageName: match[1].trim(), start: match.index, end: SECTION_RE.lastIndex })
    match = SECTION_RE.exec(source)
  }
  const images = {}
  sections.forEach((section, index) => {
    const end = sections[index + 1] ? sections[index + 1].start : source.length
    const entries = parseSection(section.imageName, source.slice(section.end, end))
    if (entries.length) images[normalizeTranslationImageName(section.imageName)] = entries
  })
  return images
}

export const getTranslationForImage = (source, imagePath) => {
  if (!source || source.type !== 'folder' || !source.translation || !imagePath) return []
  const expectedFolder = path.resolve(String(source.path))
  if (path.dirname(path.resolve(String(imagePath))) !== expectedFolder) return []
  return (source.translation.annotations || {})[normalizeTranslationImageName(imagePath)] || []
}
