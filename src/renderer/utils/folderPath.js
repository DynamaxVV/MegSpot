import fs from 'fs'
import path from 'path'

/**
 * Resolve a folder through a chain of folders that each contain exactly one
 * entry, and that entry is another folder.
 *
 * Hidden files such as macOS .DS_Store do not affect the decision. A folder
 * containing an image (or any other visible additional entry) is kept as-is.
 */
export const resolveInnermostFolder = async (folderPath) => {
  let currentPath = path.resolve(folderPath)

  while (true) {
    let entries
    try {
      entries = await fs.promises.readdir(currentPath, { withFileTypes: true })
    } catch (error) {
      return currentPath
    }

    const visibleEntries = entries.filter((entry) => entry.isDirectory() || !entry.name.startsWith('.'))
    if (visibleEntries.length !== 1 || !visibleEntries[0].isDirectory()) {
      return currentPath
    }

    currentPath = path.resolve(currentPath, visibleEntries[0].name)
  }
}
