import * as Y from "yjs";

// Finds the minimal [start, oldEnd) / [start, newEnd) edit range between two
// strings that differ in one contiguous region — which is what a single
// native `input` event on a text field always produces (typing, pasting,
// cutting, autocorrect all replace one contiguous span).
function diffRange(oldStr: string, newStr: string) {
  const maxStart = Math.min(oldStr.length, newStr.length);
  let start = 0;
  while (start < maxStart && oldStr[start] === newStr[start]) start++;

  let oldEnd = oldStr.length;
  let newEnd = newStr.length;
  while (
    oldEnd > start &&
    newEnd > start &&
    oldStr[oldEnd - 1] === newStr[newEnd - 1]
  ) {
    oldEnd--;
    newEnd--;
  }

  return { start, oldEnd, newEnd };
}

export interface BindYTextOptions {
  yText: Y.Text;
  onCommit?(oldValue: string, newValue: string): void;
}

export function bindYText(
  node: HTMLTextAreaElement,
  options: BindYTextOptions,
) {
  const { yText, onCommit } = options;
  const doc = yText.doc;
  if (!doc) throw new Error("yText has no doc");

  node.value = yText.toString();

  let relStart: Y.RelativePosition | null = null;
  let relEnd: Y.RelativePosition | null = null;
  let direction: HTMLTextAreaElement["selectionDirection"] = "none";

  const onBeforeTransaction = () => {
    direction = node.selectionDirection;
    relStart = Y.createRelativePositionFromTypeIndex(
      yText,
      node.selectionStart ?? 0,
    );
    relEnd = Y.createRelativePositionFromTypeIndex(
      yText,
      node.selectionEnd ?? 0,
    );
  };
  doc.on("beforeTransaction", onBeforeTransaction);

  let applyingLocalChange = false;
  const onYTextChange = (_event: Y.YTextEvent, transaction: Y.Transaction) => {
    if (transaction.local && applyingLocalChange) {
      applyingLocalChange = false;
      return;
    }

    node.value = yText.toString();
    node.dispatchEvent(new Event("input"));

    if (document.activeElement === node && relStart && relEnd) {
      const start = Y.createAbsolutePositionFromRelativePosition(relStart, doc);
      const end = Y.createAbsolutePositionFromRelativePosition(relEnd, doc);
      if (start && end) {
        node.setSelectionRange(start.index, end.index, direction);
      }
    }
  };
  yText.observe(onYTextChange);

  const onInput = () => {
    const { start, oldEnd, newEnd } = diffRange(yText.toString(), node.value);
    // Nothing actually changed — e.g. the synthetic 'input' event this
    // binding dispatches after applying a remote change re-enters here.
    if (start === oldEnd && start === newEnd) return;

    applyingLocalChange = true;
    doc.transact(() => {
      if (oldEnd > start) yText.delete(start, oldEnd - start);
      if (newEnd > start) yText.insert(start, node.value.slice(start, newEnd));
    });
  };
  node.addEventListener("input", onInput);

  let valueAtFocus: string | null = null;
  const onFocus = () => {
    valueAtFocus = yText.toString();
  };
  const commitIfChanged = () => {
    if (valueAtFocus === null) return;
    const newValue = yText.toString();
    if (newValue !== valueAtFocus) onCommit?.(valueAtFocus, newValue);
    valueAtFocus = null;
  };
  node.addEventListener("focus", onFocus);
  node.addEventListener("blur", commitIfChanged);

  return {
    destroy() {
      // Commit a pending edit session if the field is removed while still
      // focused (e.g. its option gets deleted) instead of dropping it.
      commitIfChanged();
      doc.off("beforeTransaction", onBeforeTransaction);
      yText.unobserve(onYTextChange);
      node.removeEventListener("input", onInput);
      node.removeEventListener("focus", onFocus);
      node.removeEventListener("blur", commitIfChanged);
    },
  };
}
