/** Downloads a JSON payload as a file. Revokes the object URL afterwards. */
export function downloadJson(filename: string, payload: unknown): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  // Safari needs the URL alive until the download starts.
  window.setTimeout(() => URL.revokeObjectURL(url), 4000)
}

export function todayStamp(): string {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export class FileTooLargeError extends Error {
  constructor() {
    super('That file is larger than 1 MB.')
    this.name = 'FileTooLargeError'
  }
}

/** Reads a text file, refusing anything large enough to hang the tab. */
export async function readTextFile(file: File, maxBytes = 1_000_000): Promise<string> {
  if (file.size > maxBytes) throw new FileTooLargeError()
  return file.text()
}

export function pickJsonFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json,.json'
    input.style.display = 'none'
    let settled = false
    const finish = (file: File | null) => {
      if (settled) return
      settled = true
      input.remove()
      resolve(file)
    }
    input.addEventListener('change', () => finish(input.files?.[0] ?? null))
    input.addEventListener('cancel', () => finish(null))
    document.body.appendChild(input)
    input.click()
  })
}
