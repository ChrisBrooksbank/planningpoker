import { test, expect, type Page } from "@playwright/test";
import WebSocket from "ws";

const OUT = "e2e/screenshots";

const TEAM: { name: string; vote: string }[] = [
  { name: "Priya", vote: "5" },
  { name: "Marcus", vote: "8" },
  { name: "Sofia", vote: "5" },
  { name: "Jonas", vote: "5" },
];

function connectBot(
  baseURL: string,
  roomId: string,
  userId: string,
  name: string
): Promise<WebSocket> {
  const url = baseURL.replace(/^http/, "ws");
  const ws = new WebSocket(`${url}/ws?roomId=${roomId}&userId=${userId}`);
  return new Promise((resolve, reject) => {
    ws.on("open", () => {
      ws.send(JSON.stringify({ type: "join-session", participantName: name }));
      resolve(ws);
    });
    ws.on("error", reject);
  });
}

async function signInAsModerator(
  page: Page,
  roomId: string,
  moderatorId: string
) {
  await page.goto("/");
  await page.evaluate(
    ({ roomId, moderatorId }) => {
      localStorage.setItem(`session_${roomId}_userId`, moderatorId);
      localStorage.setItem(`session_${roomId}_name`, "Chris");
      localStorage.setItem(
        `session_${roomId}_moderatorWelcomeDismissed`,
        "true"
      );
    },
    { roomId, moderatorId }
  );
  await page.goto(`/session/${roomId}`);
  await expect(page.getByRole("status").getByText("Connected")).toBeVisible({
    timeout: 10000,
  });
}

test("capture landing page screenshot", async ({ page }, testInfo) => {
  const suffix = testInfo.project.name === "desktop" ? "-desktop" : "";
  await page.goto("/");

  await expect(
    page.getByRole("button", { name: /create room/i })
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /enter room/i })).toBeVisible();

  await page.screenshot({
    path: `${OUT}/landing-page${suffix}.png`,
    fullPage: true,
  });
});

test("capture session screenshots", async ({
  page,
  request,
  baseURL,
}, testInfo) => {
  const isDesktop = testInfo.project.name === "desktop";
  const suffix = isDesktop ? "-desktop" : "";

  const response = await request.post("/api/sessions", {
    data: { sessionName: "Sprint 42 Planning", moderatorName: "Chris" },
  });
  expect(response.ok()).toBeTruthy();
  const { roomId, moderatorId } = await response.json();

  await signInAsModerator(page, roomId, moderatorId);
  await page.waitForTimeout(500);
  await page.screenshot({
    path: `${OUT}/session-page${suffix}.png`,
    fullPage: true,
  });

  // Bring in a team of bots who join over WebSocket
  const bots: WebSocket[] = [];
  for (const [i, member] of TEAM.entries()) {
    bots.push(await connectBot(baseURL!, roomId, `bot-${i}`, member.name));
  }

  await page
    .getByPlaceholder("What are we estimating?")
    .fill("Add SSO login to the admin portal");
  await page.getByRole("button", { name: /start vote/i }).click();

  // Everyone but one person has voted, and the moderator picks a card
  for (const [i, member] of TEAM.entries()) {
    if (i === TEAM.length - 1) break;
    bots[i].send(JSON.stringify({ type: "submit-vote", value: member.vote }));
  }
  await page.waitForTimeout(500);
  await page.getByRole("radio", { name: "Select 5" }).click();
  await page.waitForTimeout(500);
  await page.screenshot({
    path: `${OUT}/session-voting${suffix}.png`,
    fullPage: true,
  });

  // Last vote arrives, then reveal
  const last = TEAM.length - 1;
  bots[last].send(
    JSON.stringify({ type: "submit-vote", value: TEAM[last].vote })
  );
  await page.waitForTimeout(300);
  await page
    .getByRole("button", { name: /^reveal/i })
    .first()
    .click();
  await page.waitForTimeout(1500);
  await page.screenshot({
    path: `${OUT}/session-results${suffix}.png`,
    fullPage: true,
  });

  bots.forEach((b) => b.close());
});
