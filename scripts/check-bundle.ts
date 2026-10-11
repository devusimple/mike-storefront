export {};
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const dir = join(process.cwd(), "dist", "assets");
const checks = ["meeet-signaling-server", "X-Guest-Token", "/api/cart/merge", "/api/orders/checkout"];
for (const f of await readdir(dir)) {
  if (!f.endsWith(".js")) continue;
  const text = await readFile(join(dir, f), "utf8");
  for (const c of checks) console.log(f, JSON.stringify(c), text.split(c).length - 1);
}
