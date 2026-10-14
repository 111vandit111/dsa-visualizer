export type ShortcutAction = "toggle" | "prev" | "next" | "first" | "last" | "faster" | "slower";

/**
 * What currently has keyboard focus:
 * editable = text input/editor (never hijack keys), slider = a range thumb (owns arrows/Home/End),
 * button = a native button/link (owns Space/Enter), group = tabs/toggle group/menu (owns arrows), other.
 */
export type ShortcutTarget = "editable" | "slider" | "button" | "group" | "other";

const KEY_ACTIONS: Record<string, ShortcutAction> = {
  " ": "toggle",
  Spacebar: "toggle",
  ArrowLeft: "prev",
  ArrowRight: "next",
  Home: "first",
  End: "last",
  ArrowUp: "faster",
  ArrowDown: "slower",
};

const ARROW_KEYS: ReadonlySet<string> = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"]);
const SLIDER_KEYS: ReadonlySet<string> = new Set([...ARROW_KEYS, "Home", "End", "PageUp", "PageDown"]);
const ACTIVATION_KEYS: ReadonlySet<string> = new Set([" ", "Spacebar", "Enter"]);

const EDITABLE_SELECTOR = "input, textarea, select, [contenteditable]:not([contenteditable='false']), .cm-editor";
const SLIDER_SELECTOR = "[role='slider']";
const BUTTON_SELECTOR = "button, a[href], summary";
const GROUP_SELECTOR = "[role='tablist'], [role='radiogroup'], [role='menu'], [role='listbox'], [data-slot='toggle-group']";

export function classifyTarget(target: EventTarget | null): ShortcutTarget {
  if (!(target instanceof Element)) return "other";
  if (target.closest(EDITABLE_SELECTOR)) return "editable";
  if (target.closest(SLIDER_SELECTOR)) return "slider";
  if (target.closest(GROUP_SELECTOR)) return "group";
  return target.closest(BUTTON_SELECTOR) ? "button" : "other";
}

function isOwnedByTarget(key: string, target: ShortcutTarget): boolean {
  switch (target) {
    case "editable":
      return true;
    case "slider":
      return SLIDER_KEYS.has(key);
    case "group":
      return ARROW_KEYS.has(key) || ACTIVATION_KEYS.has(key);
    case "button":
      return ACTIVATION_KEYS.has(key);
    case "other":
      return false;
  }
}

/** The player action for a key press, or null when the key is unrelated or the focused control owns it. */
export function actionForKey(key: string, target: ShortcutTarget, hasModifier = false): ShortcutAction | null {
  if (hasModifier) return null;
  const action = KEY_ACTIONS[key];
  if (!action || isOwnedByTarget(key, target)) return null;
  return action;
}
