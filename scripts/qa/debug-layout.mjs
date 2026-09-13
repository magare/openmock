import { chromium } from "playwright-core";

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });

await page.goto("http://localhost:5199/", { waitUntil: "domcontentloaded" });
await page.evaluate(() => {
  localStorage.removeItem("openmock-project");
  localStorage.setItem("openmock-tour-seen", "1");
  localStorage.setItem("openmock-mobile-onboarded", "1");
  localStorage.setItem("openmock-show-tips", "0");
  localStorage.setItem("openmock-theme", "light");
});
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForSelector(".mockup-stage", { timeout: 20000 });
await page.waitForTimeout(500);

await page.locator('button[aria-label="Maximize timeline"]').click();
await page.waitForSelector(".timeline-toolbar", { state: "visible" });
await page.locator('.timeline-mode button', { hasText: "SIMPLE" }).click();
await page.waitForTimeout(300);

const data = await page.evaluate(() => {
  const getInfo = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cs = window.getComputedStyle(el);
    return {
      sel,
      x: Math.round(r.x),
      right: Math.round(r.right),
      w: Math.round(r.width),
      scrollW: el.scrollWidth,
      clientW: el.clientWidth,
      minW: cs.minWidth,
      maxW: cs.maxWidth,
      width: cs.width,
      flexShrink: cs.flexShrink
    };
  };

  const toolbarItems = Array.from(document.querySelectorAll(".timeline-toolbar > *")).map((el) => {
    const r = el.getBoundingClientRect();
    return {
      tag: el.tagName,
      className: el.className,
      w: Math.round(r.width),
      x: Math.round(r.x),
      right: Math.round(r.right)
    };
  });

  return {
    elements: [
      getInfo(".app-shell"),
      getInfo(".workspace-grid"),
      getInfo(".main-column"),
      getInfo(".mockup-stage"),
      getInfo(".timeline-shell"),
      getInfo(".timeline-toolbar"),
      getInfo(".timeline-content"),
      getInfo(".inspector-panel")
    ],
    toolbarItems
  };
});

console.log(JSON.stringify(data, null, 2));
await browser.close();
