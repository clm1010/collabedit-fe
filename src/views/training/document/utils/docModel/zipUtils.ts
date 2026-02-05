export interface ZipEntryInfo {
  filename: string
  uncompressedSize?: number
}

export const listZipEntries = async (arrayBuffer: ArrayBuffer): Promise<ZipEntryInfo[]> => {
  const zip = await import('@zip.js/zip.js')
  const { ZipReader, BlobReader } = zip
  const blob = new Blob([arrayBuffer])
  const reader = new ZipReader(new BlobReader(blob))
  try {
    const entries = await reader.getEntries()
    return entries.map((entry: any) => ({
      filename: entry.filename,
      uncompressedSize: entry.uncompressedSize
    }))
  } finally {
    await reader.close()
  }
}
