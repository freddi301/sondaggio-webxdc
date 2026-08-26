import * as Y from "yjs";
import { WebxdcProvider } from "y-webxdc";
import { m } from "./paraglide/messages.js";

export const ydoc = new Y.Doc();
export const ytitle = ydoc.getText("title");
export const ydescription = ydoc.getText("description");
export const yoptionTexts = ydoc.getMap<Y.Text>("optionTexts");
export const yoptionOrder = ydoc.getArray<string>("optionOrder");
// Per option, a set of voter ids emulated as a `Y.Map<voterId, name>` (Yjs has no
// Set type); the value is the voter's display name at the time they voted, so it
// doubles as the set membership check (`.has(id)`) and the label to show for it.
export const yoptionVotes = ydoc.getMap<Y.Map<string>>("optionVotes");

// Trusting clients to only vote as themselves through this UI; webxdc gives
// receivers no authenticated sender info to verify that server-side.
export const selfId = window.webxdc?.selfAddr ?? "local";
export const selfName = window.webxdc?.selfName ?? "You";

function totalVoterCount(): number {
  const voters = new Set<string>();
  for (const id of yoptionOrder.toArray()) {
    const votes = yoptionVotes.get(id);
    if (votes) for (const voter of votes.keys()) voters.add(voter);
  }
  return voters.size;
}

// Without this, WebxdcProvider falls back to webxdc.sendUpdateInterval (or
// 10s if the host doesn't expose one) — fine as a ceiling, but too long a
// delay for text edits to feel synced. Votes and option add/delete/reorder
// bypass this entirely via `syncNow()` below.
const TEXT_EDIT_AUTOSAVE_MS = 3000;

const provider = window.webxdc
  ? new WebxdcProvider({
      webxdc: window.webxdc,
      ydoc,
      autosaveInterval: TEXT_EDIT_AUTOSAVE_MS,
      getEditInfo: () => {
        const votes = totalVoterCount();
        return {
          document: ytitle.toString(),
          summary: m.votes_summary({ count: votes }),
        };
      },
    })
  : undefined;

// Votes and option add/delete/reorder are discrete, deliberate actions —
// worth showing to other peers right away instead of waiting for the
// periodic autosave that WebxdcProvider otherwise uses to batch typing.
export function syncNow() {
  provider?.syncToChatPeers();
}
