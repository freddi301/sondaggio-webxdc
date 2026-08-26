import type { Webxdc } from "@webxdc/types";
import type { Payload } from "y-webxdc";

declare global {
  interface Window {
    webxdc: Webxdc<Payload>;
  }
}
