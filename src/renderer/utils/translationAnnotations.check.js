import assert from 'assert'
import { getTranslationForImage, parseTranslationText } from './translationAnnotations'

const translation = parseTranslationText(`\uFEFF1,0\n-\n框内\n框外\n\n>>>>>>>>[059.jpeg]<<<<<<<<\n----------------[1]----------------[0.858,0.108,1]\n其實 我很清楚\n\n----------------[2]----------------[0.691,0.137,1]\n討厭的事\n總是會比快樂的事\n更讓人牢記在心\n\n>>>>>>>>[060.jpeg]<<<<<<<<\n----------------[1]----------------[0.972,0.126,2]\n久留真珠海`)
const images = translation.annotations

assert.strictEqual(images['059.jpeg'].length, 2)
assert.deepStrictEqual(translation.imageOrder, ['059.jpeg', '060.jpeg'])
assert.deepStrictEqual(images['059.jpeg'][0], {
  id: '059.jpeg:1',
  number: 1,
  text: '其實 我很清楚',
  x: 0.858,
  y: 0.108,
  type: 1
})
assert.strictEqual(images['059.jpeg'][1].text, '討厭的事\n總是會比快樂的事\n更讓人牢記在心')
assert.strictEqual(images['060.jpeg'][0].type, 2)
assert.deepStrictEqual(getTranslationForImage({
  type: 'folder',
  path: '/tmp/pages',
  translation: { annotations: images }
}, '/tmp/pages/059.jpeg'), images['059.jpeg'])
assert.deepStrictEqual(getTranslationForImage({
  type: 'folder',
  path: '/tmp/pages',
  translation: { annotations: images }
}, '/tmp/other/059.jpeg'), [])

const emptyPages = parseTranslationText(
  '>>>>>>>>[132.jpeg]<<<<<<<<\n\n>>>>>>>>[133.jpeg]<<<<<<<<\n\n>>>>>>>>[134.jpeg]<<<<<<<<'
)
assert.deepStrictEqual(emptyPages.imageOrder, ['132.jpeg', '133.jpeg', '134.jpeg'])

console.log('translationAnnotations.check.js: ok')
