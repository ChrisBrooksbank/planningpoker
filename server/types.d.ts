import { PlanningPokerWebSocketServer } from "./websocket";

declare global {
  // eslint-disable-next-line no-var
  var wsServer: PlanningPokerWebSocketServer | undefined;
}

export {};
