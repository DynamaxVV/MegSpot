import assert from 'assert'
import fs from 'fs-extra'
import os from 'os'
import path from 'path'
import { resolveInnermostFolder } from './folderPath.js'

const run = async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'megspot-folder-path-'))
  try {
    const chainRoot = path.join(root, 'root')
    const middle = path.join(chainRoot, 'middle')
    const leaf = path.join(middle, 'leaf')
    await fs.ensureDir(leaf)
    await fs.writeFile(path.join(chainRoot, '.DS_Store'), '')

    assert.strictEqual(await resolveInnermostFolder(chainRoot), leaf)

    const mixedRoot = path.join(root, 'mixed')
    await fs.ensureDir(path.join(mixedRoot, 'child'))
    await fs.writeFile(path.join(mixedRoot, 'image.png'), '')
    assert.strictEqual(await resolveInnermostFolder(mixedRoot), mixedRoot)

    const visibleFileRoot = path.join(root, 'visible-file')
    await fs.ensureDir(path.join(visibleFileRoot, 'child'))
    await fs.writeFile(path.join(visibleFileRoot, 'notes.txt'), '')
    assert.strictEqual(await resolveInnermostFolder(visibleFileRoot), visibleFileRoot)

    const singleFolder = path.join(root, 'single')
    await fs.ensureDir(singleFolder)
    assert.strictEqual(await resolveInnermostFolder(singleFolder), singleFolder)

    console.log('folderPath.check.js: ok')
  } finally {
    await fs.remove(root)
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
