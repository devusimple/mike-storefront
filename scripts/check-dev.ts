export {};
for (let i = 0; i < 15; i++) {
  try {
    const r = await fetch("http://localhost:5173/");
    const text = await r.text();
    console.log("status:", r.status, "bytes:", text.length, "has-root:", text.includes('id="root"'));
    process.exit(0);
  } catch {
    await new Promise((r) => setTimeout(r, 1000));
  }
}
console.log("DEV NOT UP");
process.exit(1);
