const MAX_LOG_SIZE = 8 * 1024
const MAX_TEXT_LENGTH = 4000

const asText = (value) => {
  if (value === null || value === undefined) return ''
  return String(value)
}

export const sanitizePath = (value) => {
  const text = asText(value)
  if (!text) return ''
  const normalized = text.replace(/\\/g, '/')
  return normalized.split('/').pop() || '<unknown>'
}

export const sanitizeRowId = (value) => {
  return asText(value)
    .split('::')
    .map(sanitizePath)
    .join('::')
}

export const sanitizeText = (value, maxLength = MAX_TEXT_LENGTH) => {
  return asText(value)
    .replace(/[\r\n]+/g, ' ')
    .replace(/(?:[A-Za-z]:[\\/]|\/(?:Users|home|private|tmp|var)\/)[^\s)]+/g, '<path>')
    .slice(0, maxLength)
}

export const sanitizeError = (error) => {
  const source = error instanceof Error ? error : new Error(asText(error))
  return {
    errorName: sanitizeText(source.name || 'Error', 120),
    errorMessage: sanitizeText(source.message || source),
    stack: sanitizeText(source.stack || '', MAX_TEXT_LENGTH)
  }
}

export const trimPayload = (payload = {}) => {
  const text = JSON.stringify(payload)
  if (text.length <= MAX_LOG_SIZE) return payload
  return {
    ...payload,
    truncated: true,
    payloadSize: text.length,
    details: undefined
  }
}

export const getDiagnosticConstants = () => ({ MAX_LOG_SIZE, MAX_TEXT_LENGTH })
