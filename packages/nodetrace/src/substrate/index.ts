/** Substrate selection: prefer interactive Browserbase (exact boxes) when its keys are set, else fall
 *  back to Firecrawl (screenshot-only), else null (no capture substrate configured — caller errors). */
import type { BrowserSubstrate } from "../types.ts";
import { browserbaseSubstrate } from "./browserbase.ts";
import { firecrawlSubstrate } from "./firecrawl.ts";

export { browserbaseSubstrate } from "./browserbase.ts";
export { firecrawlSubstrate } from "./firecrawl.ts";

export function pickSubstrate(env: NodeJS.ProcessEnv = process.env): BrowserSubstrate | null {
  if (env.BROWSERBASE_API_KEY && env.BROWSERBASE_PROJECT_ID) return browserbaseSubstrate();
  if (env.FIRECRAWL_API_KEY) return firecrawlSubstrate();
  return null;
}
