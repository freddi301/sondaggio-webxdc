import * as Y from 'yjs'

export const ydoc = new Y.Doc()
export const ytitle = ydoc.getText('title')
export const ydescription = ydoc.getText('description')

const REMOTE = 'remote'

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

if (window.webxdc) {
  window.webxdc.setUpdateListener((update) => {
    Y.applyUpdate(ydoc, base64ToBytes(update.payload), REMOTE)
  })

  ydoc.on('update', (update: Uint8Array, origin: unknown) => {
    if (origin === REMOTE) return
    window.webxdc.sendUpdate({ payload: bytesToBase64(update) }, '')
  })
}
