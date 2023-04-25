import fetch, { FetchOptions } from 'npm-registry-fetch'
import { publish as npmpublish } from 'libnpmpublish'
import { create } from 'archiver'
import { inc } from 'semver'
import { itArray } from './utils'

interface File {
  path: string
  data: Buffer | string
}

export async function publish(name: string, files: File[], options?: FetchOptions) {
  const pj = {
    name,
    version: null,
  }
  const current = await exists(name, options) || '0.0.0'
  pj.version = inc(current, 'patch')
  const tarball = await createTarball([
    { path: 'package.json', data: JSON.stringify(pj) },
    ...files,
  ])
  await npmpublish(pj, tarball, options)
}

export async function exists(name: string, options?: FetchOptions): Promise<string> {
  try {
    const body = await fetch.json(`/${name}`, options)
    const version = Object.keys(body.versions).at(-1)
    return version
  } catch (e) {
    if (e?.code === 'E404') {
      return null
    }
    throw e
  }
}

async function createTarball(files: File[]) {
  const tarball = create('tar', { gzip: true, store: false })
  for (const file of files) {
    tarball.append(file.data, { name: `package/${file.path}` })
  }
  tarball.finalize()
  return Buffer.concat(await itArray(tarball))
}
