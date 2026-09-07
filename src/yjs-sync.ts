import * as Y from "yjs";
import { WebxdcProvider } from "y-webxdc";
import { m } from "./paraglide/messages.js";

export const ydoc = new Y.Doc();
export const ytitle = ydoc.getText("title");
export const ydescription = ydoc.getText("description");
export const yoptionTexts = ydoc.getMap<Y.Text>("optionTexts");
export const yoptionOrder = ydoc.getArray<string>("optionOrder");
export const yoptionVotes = ydoc.getMap<Y.Map<string>>("optionVotes");

export interface DotVote {
  name: string;
  count: number;
}
export const ydotVotes = ydoc.getMap<Y.Map<DotVote>>("dotVotes");

export const DOT_BUDGET = 5;

export function orderedTextIds(): string[] {
  return yoptionOrder.toArray().filter((id) => yoptionTexts.has(id));
}

export const yopeners = ydoc.getMap<boolean>("openers");
// Per-voter preference: show their real name in the votes list, or a 🥷
// placeholder. Keyed by userId, defaults to true (shown) when absent.
export const yshowName = ydoc.getMap<boolean>("showName");

export const selfId = window.webxdc?.selfAddr ?? "local";
export const selfName = window.webxdc?.selfName ?? m.self_name_fallback();

export type EditField =
  { kind: "title" } | { kind: "description" } | { kind: "option" };

export type EditAction =
  | { kind: "select"; optionLabel: string }
  | { kind: "deselect"; optionLabel: string }
  | { kind: "dot_inc"; optionLabel: string }
  | { kind: "dot_dec"; optionLabel: string }
  | { kind: "edit"; field: EditField; oldValue: string; newValue: string };

export interface EditLogEntry {
  id?: string;
  at: number;
  userId: string;
  userName: string;
  action: EditAction;
}

export const yeditLog = ydoc.getArray<EditLogEntry>("editLog");

export function logEdit(action: EditAction) {
  yeditLog.push([
    {
      id: crypto.randomUUID(),
      at: Date.now(),
      userId: selfId,
      userName: selfName,
      action,
    },
  ]);
}

export function fieldCommit(field: EditField) {
  return (oldValue: string, newValue: string) => {
    logEdit({ kind: "edit", field, oldValue, newValue });
    syncNow();
  };
}

function totalVoterCount(): number {
  const voters = new Set<string>();
  for (const id of orderedTextIds()) {
    const votes = yoptionVotes.get(id);
    if (votes) for (const voter of votes.keys()) voters.add(voter);
    const dots = ydotVotes.get(id);
    if (dots) {
      for (const [voter, dot] of dots) {
        if (dot && dot.count > 0) voters.add(voter);
      }
    }
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

function pruneOrphans() {
  const live = new Set(yoptionOrder.toArray());
  const dead = new Set<string>();
  for (const id of yoptionVotes.keys()) if (!live.has(id)) dead.add(id);
  for (const id of ydotVotes.keys()) if (!live.has(id)) dead.add(id);
  if (dead.size === 0) return;
  ydoc.transact(() => {
    for (const id of dead) {
      yoptionVotes.delete(id);
      ydotVotes.delete(id);
    }
  });
}
yoptionOrder.observe(pruneOrphans);
yoptionVotes.observe(pruneOrphans);
ydotVotes.observe(pruneOrphans);

if (!yopeners.has(selfId)) {
  setTimeout(() => {
    yopeners.set(selfId, true);
    syncNow();
  }, 2000);
}
