const DARK_KEY = "sondaggio-dark";
const SHOW_VOTES_KEY = "sondaggio-show-votes";

let dark = $state(localStorage.getItem(DARK_KEY) !== "false");
document.documentElement.classList.toggle("dark", dark);

let showVotes = $state(sessionStorage.getItem(SHOW_VOTES_KEY) === "true");

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
};
