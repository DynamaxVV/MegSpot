import log from '../log'
import {
  sanitizeError,
  sanitizePath,
  sanitizeRowId,
  sanitizeText,
  trimPayload
} from './diagnosticLogCore'

let activeOperationId = ''

export const createOperationId = () => {
  const random = Math.random().toString(36).slice(2, 10)
  return `cmp-${Date.now().toString(36)}-${random}`
}

export const setOperationId = (operationId) => {
  activeOperationId = operationId || ''
  return activeOperationId
}

export const getOperationId = () => activeOperationId

export const ensureOperationId = () => {
  if (!activeOperationId) activeOperationId = createOperationId()
  return activeOperationId
}

export const clearOperationId = (operationId) => {
  if (!operationId || operationId === activeOperationId) activeOperationId = ''
}

const getRoute = () => {
  if (typeof window === 'undefined' || !window.location) return ''
  return `${window.location.pathname}${window.location.search || ''}`
}

const normalizeContext = (context = {}) => ({
  operationId: context.operationId || activeOperationId || '',
  taskVersion: Number.isFinite(context.taskVersion) ? context.taskVersion : undefined,
  route: sanitizeText(context.route || getRoute(), 500),
  index: Number.isInteger(context.index) ? context.index : undefined,
  rowId: context.rowId ? sanitizeRowId(context.rowId) : undefined,
  side: context.side || undefined,
  path: context.path ? sanitizePath(context.path) : undefined
})

const normalizeDetails = (details = {}) => {
  const normalized = { ...details }
  if (normalized.path) normalized.path = sanitizePath(normalized.path)
  if (normalized.location) normalized.location = sanitizeText(normalized.location)
  if (normalized.from) normalized.from = sanitizeText(normalized.from, 500)
  if (normalized.source) normalized.source = sanitizeText(normalized.source, 500)
  if (normalized.rowId) normalized.rowId = sanitizeRowId(normalized.rowId)
  if (normalized.previousRowId) normalized.previousRowId = sanitizeRowId(normalized.previousRowId)
  if (normalized.errorMessage) normalized.errorMessage = sanitizeText(normalized.errorMessage)
  if (normalized.stack) normalized.stack = sanitizeText(normalized.stack)
  return normalized
}

export const logDiagnosticEvent = (scope, event, context = {}, details = {}) => {
  const payload = trimPayload({
    scope,
    event,
    ...normalizeContext(context),
    ...normalizeDetails(details)
  })
  try {
    log.info(`[${scope}] ${JSON.stringify(payload)}`)
  } catch (error) {
    // Logging must never break the application flow.
  }
}

export const logCompareEvent = (event, context = {}, details = {}) => {
  logDiagnosticEvent('compare', event, context, details)
}

export const logDiagnosticError = (scope, event, error, context = {}, details = {}) => {
  logDiagnosticEvent(scope, event, context, {
    ...details,
    ...sanitizeError(error)
  })
}

export { sanitizeError, sanitizeText }
