import { mkdtemp, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { folderInbox } from './folderInbox.ts'

describe('screenshot inbox folder', () => {
  it('writes a screenshot into the inbox folder', async () => {
    const projectRoot = await mkdtemp(path.join(tmpdir(), 'tracker-'))

    await folderInbox(projectRoot, () => 'LinkedinScreenShots/').store('a.png', 'aGk=')

    expect(await readdir(path.join(projectRoot, 'LinkedinScreenShots'))).toEqual(['a.png'])
  })

  it('refuses an inbox setting that points outside the project', async () => {
    const projectRoot = await mkdtemp(path.join(tmpdir(), 'tracker-'))

    await expect(folderInbox(projectRoot, () => '../elsewhere').store('a.png', 'aGk=')).rejects.toThrow('inside the project')
  })
})
