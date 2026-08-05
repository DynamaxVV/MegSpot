import assert from 'assert'
import {
  getDiagnosticConstants,
  sanitizeError,
  sanitizePath,
  sanitizeRowId,
  sanitizeText,
  trimPayload
} from './diagnosticLogCore'

assert.strictEqual(sanitizePath('/Users/test/photos/left.png'), 'left.png')
assert.strictEqual(sanitizePath('C:\\photos\\right.png'), 'right.png')
assert.strictEqual(sanitizeRowId('/a/left.png::/b/right.png'), 'left.png::right.png')
assert.strictEqual(sanitizeError(new Error('broken')).errorName, 'Error')
assert.strictEqual(sanitizeText('/Users/test/private.png'), '<path>')
assert.strictEqual(trimPayload({ value: 'ok' }).value, 'ok')

const { MAX_LOG_SIZE } = getDiagnosticConstants()
assert.ok(JSON.stringify(trimPayload({ details: 'x'.repeat(MAX_LOG_SIZE) })).length < MAX_LOG_SIZE)
console.log('diagnosticLog.check.js: ok')
