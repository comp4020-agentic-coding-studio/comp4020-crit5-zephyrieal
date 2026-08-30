import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

// Contract tests for crit 5 ("A game"): https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/crits/05-game/
// Retires with the brief it answers — see spec/README.md.
const dom = new JSDOM(readFileSync(resolve("dist/index.html"), "utf8"));
const { document } = dom.window;

describe("crit 5: a game", () => {
  it("has an outcome region that can announce a win, a loss or a finish", () => {
    // Play "ends somewhere" — the ending has to be perceivable, not just
    // implied by the screen going quiet. An `aria-live`/`role="status"`
    // region is how any ending gets announced, whatever the mechanic.
    const outcome = document.querySelector('[aria-live], [role="status"]');
    expect(
      outcome,
      "add an aria-live or role=status element the game updates when play ends",
    ).toBeTruthy();
  });

  it("gives no instructions anywhere on screen", () => {
    // The no-tutorial rule: no how-to-play text, modal or controls legend.
    // Tune this list if your concept's own vocabulary legitimately needs a
    // word here — the point is no explanatory copy, not banning words.
    const forbidden =
      /how\s*to\s*play|instructions?|tutorial|controls?:|press\s+\w+\s+to|click\s+to\s+(start|play|begin)|arrow\s*keys|use\s+(the\s+)?(mouse|keyboard)/i;
    const text = document.body.textContent ?? "";
    expect(
      forbidden.test(text),
      "found instructional copy in the page text — the opening screen has to teach by affordance, not words",
    ).toBe(false);
  });
});
