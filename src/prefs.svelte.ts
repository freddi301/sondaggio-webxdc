const SHOW_VOTES_KEY = "sondaggio-show-votes";

let showVotes = $state(sessionStorage.getItem(SHOW_VOTES_KEY) === "true");

export const prefs = {
  get showVotes() {
    return showVotes;
  },
  set showVotes(value: boolean) {
    showVotes = value;
    sessionStorage.setItem(SHOW_VOTES_KEY, String(value));
  },
};
