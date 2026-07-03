/**
 * `common` namespace (English — source of truth).
 *
 * Generic, cross-cutting strings reused across pages: the app name, shared
 * action labels, and generic status text. Feature-specific copy lives in its
 * own namespace.
 */

const common = {
  appName: "Weight Tracker",
  actions: {
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    close: "Close",
    add: "Add",
    edit: "Edit",
    remove: "Remove",
    confirm: "Confirm",
    retry: "Retry",
    back: "Back",
    next: "Next",
    finish: "Finish",
    continue: "Continue",
  },
  status: {
    loading: "Loading…",
    saving: "Saving…",
    error: "Something went wrong.",
    empty: "No data yet.",
  },
};

export type CommonResource = typeof common;

export default common;
