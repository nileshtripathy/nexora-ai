import { expect, test, type Page } from "@playwright/test";

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password").fill("demo1234");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/chat\//); // "/" redirects to a fresh /chat/<id> once the session cookie is set
}

// Requires a seeded database (npm run db:seed). The server runs with the offline mock LLM (see playwright.config.ts).
test("customer chats with the agent (RAG, tools, memory) and staff inspects it in the admin dashboard", async ({ page }) => {
  const heading = page.getByRole("heading", { name: "How can we help today?" });
  const message = page.getByRole("textbox", { name: "Message" });

  // ── Authentication gate ─────────────────────────────────────────
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
  await page.getByPlaceholder("Email").fill("alice@example.com");
  await page.getByPlaceholder("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Invalid email or password.")).toBeVisible();
  await signIn(page, "alice@example.com");
  await expect(heading).toBeVisible();

  // ── Customers cannot reach the admin area ───────────────────────
  await page.goto("/admin");
  await expect(page).not.toHaveURL(/\/admin/);
  await expect(heading).toBeVisible();
  const customerConversationId = new URL(page.url()).pathname.split("/").at(-1);

  // ── RAG: grounded answer with cited, expandable sources ─────────
  await message.fill("How long do refunds take after I return an item?");
  await message.press("Enter");
  await expect(page.getByText("Here's what our help articles say")).toBeVisible();
  await expect(page.getByText("Sources", { exact: true })).toBeVisible();
  await page.getByText("[1] Refund Policy").click();
  await expect(page.getByText(/\d+% match/).first()).toBeVisible();

  // ── Tool calling: order lookup shows up as a tool card + answer ─
  await message.fill("Where is my order SA-1001?");
  await message.press("Enter");
  const orderCard = page.getByRole("status").filter({ hasText: "Order SA-1001" });
  await expect(orderCard).toContainText("shipped");
  await expect(orderCard).toContainText("UPS");
  await expect(page.getByText("tracking number 1Z999AA10123456784")).toBeVisible();

  // ── Memory: answered from the earlier tool result, no new lookup ─
  await message.fill("What's the tracking number again?");
  await message.press("Enter");
  await expect(page.getByText("the tracking number is 1Z999AA10123456784")).toBeVisible();
  await expect(page.getByRole("status")).toHaveCount(1);

  // ── Persistence: history, sources and tool cards survive a reload ─
  await page.reload();
  const main = page.getByRole("main");
  await expect(main.getByText("How long do refunds take after I return an item?")).toBeVisible();
  await expect(main.getByText("[1] Refund Policy")).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "Order SA-1001" })).toContainText("shipped");
  await expect(page.getByRole("navigation", { name: "Conversations" })).toContainText("How long do refunds take");

  // ── New chat starts clean; another customer's order fails gracefully ─
  await page.getByRole("link", { name: "New chat" }).click();
  await expect(heading).toBeVisible();
  await message.fill("Where is my order SA-2001?");
  await message.press("Enter");
  await expect(page.getByRole("status")).toContainText("Couldn't complete that lookup");
  await expect(page.getByText("No order SA-2001 was found on your account.").first()).toBeVisible();
  await expect(page.getByText(/FedEx|794644790138/)).toHaveCount(0);

  // ── Sign out ────────────────────────────────────────────────────
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);

  // ── Staff: dashboard, conversation inspection, evals ────────────
  await signIn(page, "admin@example.com");
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  await expect(page.getByText("getOrderStatus").first()).toBeVisible();

  await page.getByRole("link", { name: "Conversations" }).click();
  await page.locator(`a[href="/admin/conversations/${customerConversationId}"]`).click();
  await expect(page.getByText("Retrieved context").first()).toBeVisible();
  await expect(page.getByText("Tool calls").first()).toBeVisible();
  await expect(page.getByText("[1] Refund Policy").first()).toBeVisible();
  await expect(page.getByText("getOrderStatus").first()).toBeVisible();

  await page.getByRole("link", { name: "Evals" }).click();
  await page.getByRole("button", { name: "Run evaluation" }).click();
  await expect(page.getByText(/\d+\/\d+ passed/)).toBeVisible({ timeout: 60_000 });
  await expect(page.getByLabel("failed")).toHaveCount(0);
});
