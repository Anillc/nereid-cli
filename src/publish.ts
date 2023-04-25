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
  try {
    const body = await fetch.json(`/${name}`, options)
    const current = Object.keys(body.versions).at(-1)
    pj.version = inc(current, 'patch')
  } catch(e) {
    if (e?.code === 'E404') {
      pj.version = '0.0.1'
    } else {
      throw e
    }
  }
  const tarball = await createTarball([
    { path: 'package.json', data: JSON.stringify(pj) },
    ...files,
  ])
  await npmpublish(pj, tarball, options)
}

async function createTarball(files: File[]) {
  const tarball = create('tar', { gzip: true, store: false })
  for (const file of files) {
    tarball.append(file.data, { name: `package/${file.path}` })
  }
  await tarball.finalize()
  return Buffer.concat(await itArray(tarball))
}
