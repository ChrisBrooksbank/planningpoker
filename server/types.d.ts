import { PlanningPokerWebSocketServer } from "./websocket.js";

declare global {
  // eslint-disable-next-line no-var
  var wsServer: PlanningPokerWebSocketServer | undefined;
}

export {};
