import { test, expect, type Locator, type Page } from "@playwright/test";
import WebSocket from "ws";

// Records the README demo video to e2e/demo/demo.webm.
// `npm run demo` then converts it to a GIF and MP4.

const TEAM = ["Priya", "Marcus", "Sofia", "Jonas"];

// Playwright videos don't show the pointer, so draw one.
const CURSOR_SCRIPT = `
  window.addEventListener("DOMContentLoaded", () => {
    const dot = document.createElement("div");
    dot.style.cssText =
      "position:fixed;z-index:99999;pointer-events:none;width:22px;height:22px;" +
      "margin:-4px 0 0 -4px;border-radius:50%;background:rgba(37,99,235,.35);" +
      "border:2px solid #2563eb;box-shadow:0 2px 8px rgba(0,0,0,.25);" +
      "transition:transform .12s;left:-40px;top:-40px";
    document.body.appendChild(dot);
    window.addEventListener("mousemove", (e) => {
      dot.style.left = e.clientX + "px";
      dot.style.top = e.clientY + "px";
    });
    window.addEventListener("mousedown", () => (dot.style.transform = "scale(.7)"));
    window.addEventListener("mouseup", () => (dot.style.transform = "scale(1)"));
  });
`;

const pause = (page: Page, ms: number) => page.waitForTimeout(ms);

async function glideTo(page: Page, target: Locator) {
  // Scroll the target into the middle of the view smoothly, then glide over.
  await target.evaluate((el) => {
    const r = el.getBoundingClientRect();
    window.scrollTo({
      top: window.scrollY + r.top - window.innerHeight / 2 + r.height / 2,
      behavior: "smooth",
    });
  });
  await pause(page, 500);
  const box = (await target.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, {
    steps: 16,
  });
  await pause(page, 100);
}

async function glideClick(page: Page, target: Locator) {
  await glideTo(page, target);
  await target.click();
}

async function typeInto(page: Page, field: Locator, text: string) {
  await glideClick(page, field);
  await field.pressSequentially(text, { delay: 28 });
}

function connectBot(baseURL: string, roomId: string, name: string, id: string) {
  const ws = new WebSocket(
    `${baseURL.replace(/^http/, "ws")}/ws?roomId=${roomId}&userId=${id}`
  );
  return new Promise<WebSocket>((resolve, reject) => {
    ws.on("open", () => {
      ws.send(JSON.stringify({ type: "join-session", participantName: name }));
      resolve(ws);
    });
    ws.on("error", reject);
  });
}

const vote = (ws: WebSocket, value: string) =>
  ws.send(JSON.stringify({ type: "submit-vote", value }));

test("record demo", async ({ page, baseURL }) => {
  await page.addInitScript(CURSOR_SCRIPT);

  // 1. Landing page, then create a room
  await page.goto("/");
  await pause(page, 1000);
  await glideClick(page, page.getByRole("button", { name: "Create Room" }));
  await typeInto(page, page.locator("#sessionName"), "Sprint 42 Planning");
  await typeInto(page, page.locator("#moderatorName"), "Chris");
  await glideClick(page, page.locator('button[type="submit"]'));
  await page.waitForURL(/\/session\//);
  await expect(page.getByRole("status").getByText("Connected")).toBeVisible();
  await pause(page, 500);

  const welcome = page.getByRole("button", { name: /let's start/i });
  if (await welcome.isVisible().catch(() => false)) {
    await pause(page, 700);
    await glideClick(page, welcome);
  }

  // 2. The team joins one by one
  const roomId = page.url().split("/session/")[1].split(/[?#]/)[0];
  const bots: WebSocket[] = [];
  for (const [i, name] of TEAM.entries()) {
    bots.push(await connectBot(baseURL!, roomId, name, `bot-${i}`));
    await pause(page, 450);
  }
  await pause(page, 300);

  // 3. Round 1: a split vote
  await typeInto(
    page,
    page.getByPlaceholder("What are we estimating?"),
    "Add SSO login to the admin portal"
  );
  await glideClick(page, page.getByRole("button", { name: /start vote/i }));
  await pause(page, 600);

  const round1 = ["5", "8", "5", "3"];
  for (const [i, value] of round1.entries()) {
    vote(bots[i], value);
    await pause(page, 450);
  }
  await glideClick(page, page.getByRole("radio", { name: "Select 5" }));
  await pause(page, 700);
  await glideClick(page, page.getByRole("button", { name: "Reveal" }));
  await pause(page, 3200);

  // 4. Round 2: consensus
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await pause(page, 700);
  const topic = page.getByPlaceholder("What are we estimating?");
  await topic.fill("");
  await typeInto(page, topic, "Fix pagination on the orders table");
  await glideClick(page, page.getByRole("button", { name: /next vote/i }));
  await pause(page, 600);

  for (const bot of bots) {
    vote(bot, "3");
    await pause(page, 300);
  }
  await glideClick(page, page.getByRole("radio", { name: "Select 3" }));
  await pause(page, 600);
  await glideClick(page, page.getByRole("button", { name: "Reveal" }));
  await pause(page, 4500);

  bots.forEach((b) => b.close());
  await page.close();
  await page.video()!.saveAs("e2e/demo/demo.webm");
});
