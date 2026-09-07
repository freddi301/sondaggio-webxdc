import { mount } from "svelte";
import "./app.css";
import App from "./App.svelte";
import { getLocale } from "./paraglide/runtime.js";

document.documentElement.lang = getLocale();

const app = mount(App, {
  target: document.getElementById("app")!,
});

export default app;
