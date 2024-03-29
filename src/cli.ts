import { normalize } from 'path'
import { promises as fsp } from 'fs'
import { cac } from 'cac'
import { fetchIndex, sync } from 'nereid'
import { build, BuildOptions } from './build'
import { fetchVersions, publish } from './publish'

const cli = cac()

cli.command('build <path>', '构建 nereid store')
  .option('--chunk <size>', '单个分块的最大大小 (字节)')
  .option('--bucket <name>', '桶名')
  .option('--index <name>', '索引文件名')
  .action(async (path: string, { chunk, bucket, index }) => {
    if (normalize(path) === '.' && !bucket) {
      throw new Error('provide bucket name when path is .')
    }
    const options: BuildOptions = {}
    if (chunk) {
      options.chunkSize = +chunk
      if (!Number.isFinite(options.chunkSize)) {
        throw new Error('invalid chunk size')
      }
    }
    if (bucket) options.bucket = bucket
    if (index) options.index = index
    await build(path, `${process.cwd()}/nereid`, options)
  })

cli.command('publish-npm <package>', '发布到 npm')
  .alias('pub')
  .option('--token <token>', 'npm token')
  .action(async (pkg: string, { token }) => {
    if (!token) {
      token = process.env.NPM_TOKEN
    }
    if (!token) {
      throw new Error('token is required')
    }
    const store = `${process.cwd()}/nereid/store`
    const index = `${process.cwd()}/nereid/nereid.json`
    await fsp.access(index)
    const dir = await fsp.readdir(store)
    const versions = await fetchVersions(pkg)
    versions.reverse()
    let indexVersion: string
    for (const version of versions) {
      const match = version.match(/^0\.0\.0-latest-(\d+)$/)
      if (!match) continue
      indexVersion = `0.0.0-latest-${+match[1] + 1}`
      break
    }
    indexVersion ||= `0.0.0-latest-1`
    for (const file of dir) {
      const name = `0.0.0-${file}`
      if (versions.includes(name)) continue
      const data = await fsp.readFile(`${store}/${file}`)
      await publish(pkg, name, [{
        path: file, data,
      }], {
        defaultTag: 'store',
        forceAuth: { token },
      })
      console.log(`${file} published`)
    }
    await publish(pkg, indexVersion, [{
      path: 'nereid.json', data: await fsp.readFile(index)
    }], { forceAuth: { token } })
  })

cli.command('fetch-index <source>', '获取索引文件')
  .option('--output <path>', '输出文件夹', { default: './nereid' })
  .option('--index <name>', '索引文件名', { default: 'nereid.json' })
  .action(async (source: string, options) => {
    const index = await fetchIndex(source, { index: options.index })
    await fsp.mkdir(options.output, { recursive: true })
    await fsp.writeFile(`${options.output}/${options.index}`, JSON.stringify(index))
  })

cli.command('download <bucket> [...sources]', '下载')
  .alias('d')
  .option('--output <path>', '输出文件夹', { default: './nereid' })
  .action((bucket: string, sources: string[], options) => {
    const state = sync(sources, bucket, { output: options.output })
    state.on('download/composable/done', (composable) => {
      console.error(`${composable.hash} downloaded`)
    })
    state.on('failed', (error) => {
      console.error(error)
      console.error('failed to download')
    })
    state.on('done', (path) => {
      console.log(path)
    })
  })

cli.help()
cli.parse()

if (!cli.matchedCommand) {
  cli.outputHelp()
}
