import { existsSync, mkdtempSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { inboxFolder } from './InboxFolder.ts'

function folderIn(projectRoot: string, inboxDirectory = 'LinkedinScreenShots/followers/') {
  return inboxFolder({ projectRoot, inboxDirectory: () => inboxDirectory, archiveDirectory: () => 'data/screenshots/followers/' })
}

const freshProject = () => mkdtempSync(path.join(tmpdir(), 'tracker-'))

describe('screenshot inbox folder', () => {
  it('writes a screenshot into the inbox folder', async () => {
    const project = freshProject()

    await folderIn(project).store('a.png', 'aGk=')

    expect(readdirSync(path.join(project, 'LinkedinScreenShots/followers'))).toEqual(['a.png'])
  })

  it('never overwrites a screenshot already in the inbox', async () => {
    const project = freshProject()
    await folderIn(project).store('a.png', 'aGk=')

    expect(await folderIn(project).store('a.png', 'aGk=')).toBe('already-present')
  })

  it('refuses an inbox setting that points outside the project', async () => {
    await expect(folderIn(freshProject(), '../elsewhere').store('a.png', 'aGk=')).rejects.toThrow('inside the project')
  })

  it('deletes a screenshot once it is no longer needed', async () => {
    const project = freshProject()
    await folderIn(project).store('a.png', 'aGk=')

    await folderIn(project).remove('a.png')

    expect(existsSync(path.join(project, 'LinkedinScreenShots/followers/a.png'))).toBe(false)
  })

  it('archives a screenshot under its scan date', async () => {
    const project = freshProject()
    await folderIn(project).store('a.png', 'aGk=')

    await folderIn(project).archive('a.png', '2026-09-22')

    expect(await folderIn(project).archivedFiles('2026-09-22')).toEqual(['a.png'])
  })
})
