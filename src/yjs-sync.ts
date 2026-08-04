import * as Y from 'yjs'

export const ydoc = new Y.Doc()
export const ytitle = ydoc.getText('title')
export const ydescription = ydoc.getText('description')
export const yoptionTexts = ydoc.getMap<Y.Text>('optionTexts')
export const yoptionOrder = ydoc.getArray<string>('optionOrder')
// Per option, a set of voter ids emulated as a `Y.Map<voterId, name>` (Yjs has no
// Set type); the value is the voter's display name at the time they voted, so it
// doubles as the set membership check (`.has(id)`) and the label to show for it.
export const yoptionVotes = ydoc.getMap<Y.Map<string>>('optionVotes')

// Trusting clients to only vote as themselves through this UI; webxdc gives
// receivers no authenticated sender info to verify that server-side.
export const selfId = window.webxdc?.selfAddr ?? 'local'
export const selfName = window.webxdc?.selfName ?? 'You'

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

// Resolves once every update sent before this session started has been
// replayed into `ydoc`, so callers can tell "nothing was ever added" apart
// from "the past updates just haven't arrived yet".
export const initialSyncDone: Promise<void> = window.webxdc
  ? window.webxdc.setUpdateListener((update) => {
      Y.applyUpdate(ydoc, base64ToBytes(update.payload), REMOTE)
    })
  : Promise.resolve()

if (window.webxdc) {
  ydoc.on('update', (update: Uint8Array, origin: unknown) => {
    if (origin === REMOTE) return
    window.webxdc.sendUpdate({ payload: bytesToBase64(update) }, '')
  })
}
