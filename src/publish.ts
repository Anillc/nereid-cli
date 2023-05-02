import fetch, { FetchOptions } from 'npm-registry-fetch'
import { publish as npmpublish } from 'libnpmpublish'
import { create } from 'archiver'
import { itArray } from './utils'

interface File {
  path: string
  data: Buffer | string
}

export async function fetchVersions(name: string, options?: FetchOptions) {
  try {
    const response = await fetch.json(`/${name}`, options)
    return Object.keys(response.versions)
  } catch (error) {
    if (error?.code === 'E404') {
      return []
    }
    throw error
  }
}

export async function publish(name: string, version: string, files: File[], options?: FetchOptions) {
  const pj = { name, version }
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
  tarball.finalize()
  return Buffer.concat(await itArray(tarball))
}
