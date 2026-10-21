import { exportPoll, importPoll, syncNow } from "./yjs-sync";

/** Returns true when the template was copied to the clipboard. */
export async function exportPollText(): Promise<boolean> {
  const text = JSON.stringify(exportPoll(), null, 2);
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    if (!window.webxdc) return false;
    // clipboard unavailable: let the user send it to a chat instead
    // (sendToChat may close the app)
    syncNow();
    await window.webxdc.sendToChat({ text });
    return false;
  }
}

/** Returns false when the text is not a valid template. */
export function importPollText(text: string): boolean {
  try {
    return importPoll(JSON.parse(text));
  } catch {
    return false;
  }
}
