import cac from 'cac'
import { build, BuildOptions } from 'nereid'

const cli = cac()

cli.command('build <path>', '构建 nereid store')
  .option('--chunk <size>', '单个分块的最大大小 (字节)')
  .option('--bucket <name>', '桶名')
  .option('--index <name>', '索引文件名')
  .action(async (path: string, { chunk, bucket, index }) => {
    const options: BuildOptions = {}
    if (chunk) {
      options.chunkSize = +chunk
      if (!Number.isFinite(options.chunkSize)) {
        throw new Error('invalid chunk size')
      }
    }
    if (bucket) options.bucket = bucket
    if (index) options.index = index
    const cwd = process.cwd()
    await build(path, `${cwd}/nereid`, options)
  })

cli.command('publish [target]', '发布')
  .alias('pub')
  .action((target: string) => {

  })

cli.help()
cli.parse()
