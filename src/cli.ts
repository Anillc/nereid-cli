import { normalize } from 'path'
import { promises as fsp } from 'fs'
import cac from 'cac'
import { sync } from 'nereid'
import { build, BuildOptions } from './build'
import { exists, publish } from './publish'

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

cli.command('publish-npm <org>', '发布到 npm')
  .alias('pub')
  .option('--token <token>', 'npm token')
  .action(async (org: string, { token }) => {
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
    for (const file of dir) {
      if (await exists(`@${org}/${file}`)) continue
      const data = await fsp.readFile(`${store}/${file}`)
      await publish(`@${org}/${file}`, [{
        path: file, data,
      }], { forceAuth: { token } })
      console.log(`${file} published`)
    }
    await publish(`@${org}/nereid.json`, [{
      path: 'nereid.json', data: await fsp.readFile(index)
    }], { forceAuth: { token } })
  })

cli.command('download <bucket> [...sources]', '下载')
  .alias('d')
  .option('--output <path>', '输出文件夹', { default: './nereid' })
  .action((bucket: string, sources: string[], options) => {
    const state = sync(sources, bucket, { output: options.output })
    state.on('download/composable/done', (composable) => {
      console.log(`${composable.hash} downloaded`)
    })
    state.on('failed', (error) => {
      console.error(error)
      console.log('failed to download')
    })
    state.on('done', (path) => {
      console.log(`downloaded in ${path}`)
    })
  })

cli.help()
cli.parse()

if (!cli.matchedCommand) {
  cli.outputHelp()
}
