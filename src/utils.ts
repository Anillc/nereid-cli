export async function itArray<T>(iter: AsyncIterable<T>) {
  const results: Awaited<T>[] = []
  for await (const element of iter) {
    results.push(element)
  }
  return results
}
