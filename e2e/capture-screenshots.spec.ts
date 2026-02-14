import { test, expect } from "@playwright/test";

test("capture landing page screenshot", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("button", { name: /create session/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /join session/i })).toBeVisible();

  await page.screenshot({
    path: "e2e/screenshots/landing-page.png",
    fullPage: true,
  });
});

test("capture session page screenshot", async ({ page, request }) => {
  // Create a session via API
  const response = await request.post("/api/sessions", {
    data: {
      sessionName: "Screenshot Test",
      moderatorName: "Moderator",
    },
  });
  expect(response.ok()).toBeTruthy();
  const { roomId, moderatorId } = await response.json();

  // Navigate to origin first so we can set localStorage
  await page.goto("/");

  // Set localStorage keys so the session page recognises us
  await page.evaluate(
    ({ roomId, moderatorId }) => {
      localStorage.setItem(`session_${roomId}_userId`, moderatorId);
      localStorage.setItem(`session_${roomId}_name`, "Moderator");
    },
    { roomId, moderatorId },
  );

  // Navigate to the session page
  await page.goto(`/session/${roomId}`);

  // Wait for WebSocket to connect
  await expect(page.getByRole("status").getByText("Connected")).toBeVisible({
    timeout: 10000,
  });

  // Brief pause for session state to render
  await page.waitForTimeout(500);

  await page.screenshot({
    path: "e2e/screenshots/session-page.png",
    fullPage: true,
  });
});
