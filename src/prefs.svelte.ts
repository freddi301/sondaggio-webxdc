export type View = "poll" | "dots" | "history" | "info";
const VIEWS: View[] = ["poll", "dots", "history", "info"];

const DARK_KEY = "sondaggio-dark";
const SHOW_VOTES_KEY = "sondaggio-show-votes";
const VIEW_KEY = "sondaggio-view";
const INFO_SEEN_KEY = "sondaggio-info-seen";

let dark = $state(localStorage.getItem(DARK_KEY) !== "false");
document.documentElement.classList.toggle("dark", dark);

let showVotes = $state(sessionStorage.getItem(SHOW_VOTES_KEY) === "true");

const infoSeen = localStorage.getItem(INFO_SEEN_KEY) === "true";
if (!infoSeen) localStorage.setItem(INFO_SEEN_KEY, "true");
const storedView = localStorage.getItem(VIEW_KEY) as View | null;
let view = $state<View>(
  !infoSeen
    ? "info"
    : storedView && VIEWS.includes(storedView)
      ? storedView
      : "poll",
);

export const prefs = {
  get dark() {
    return dark;
  },
  set dark(value: boolean) {
    dark = value;
    localStorage.setItem(DARK_KEY, String(value));
    document.documentElement.classList.toggle("dark", value);
  },
  get showVotes() {
    return showVotes;
  },
  set showVotes(value: boolean) {
    showVotes = value;
    sessionStorage.setItem(SHOW_VOTES_KEY, String(value));
  },
  get view() {
    return view;
  },
  set view(value: View) {
    view = value;
    localStorage.setItem(VIEW_KEY, value);
  },
};
