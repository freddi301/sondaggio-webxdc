import * as Y from "yjs";
import { WebxdcProvider } from "y-webxdc";
import { m } from "./paraglide/messages.js";

export const ydoc = new Y.Doc();
export const ytitle = ydoc.getText("title");
export const ydescription = ydoc.getText("description");
export const yoptionTexts = ydoc.getMap<Y.Text>("optionTexts");
export const yoptionOrder = ydoc.getArray<string>("optionOrder");
export const yoptionVotes = ydoc.getMap<Y.Map<string>>("optionVotes");
export const yopeners = ydoc.getMap<boolean>("openers");

export const selfId = window.webxdc?.selfAddr ?? "local";
export const selfName = window.webxdc?.selfName ?? "You";

export type EditField =
  | { kind: "title" }
  | { kind: "description" }
  | { kind: "option" };

export type EditAction =
  | { kind: "select"; optionLabel: string }
  | { kind: "deselect"; optionLabel: string }
  | { kind: "edit"; field: EditField; oldValue: string; newValue: string };

export interface EditLogEntry {
  at: number;
  userId: string;
  userName: string;
  action: EditAction;
}

export const yeditLog = ydoc.getArray<EditLogEntry>("editLog");

export function logEdit(action: EditAction) {
  yeditLog.push([
    { at: Date.now(), userId: selfId, userName: selfName, action },
  ]);
}

function totalVoterCount(): number {
  const voters = new Set<string>();
  for (const id of yoptionOrder.toArray()) {
    const votes = yoptionVotes.get(id);
    if (votes) for (const voter of votes.keys()) voters.add(voter);
  }
  return voters.size;
}

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

export function syncNow() {
  provider?.syncToChatPeers();
}

if (!yopeners.has(selfId)) {
  setTimeout(() => {
    yopeners.set(selfId, true);
    syncNow();
  }, 2000);
}
