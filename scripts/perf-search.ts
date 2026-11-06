/** Search timings on the performance seed (PRD §8: search p95 ≤ 500 ms). */
import { searchSpaces } from "../src/server/search";
import { closeDb } from "../src/lib/db";

const queries = [
  { city: "Jakarta Selatan" },
  { q: "aula jaksel" },
  { q: "ballrom", dates: ["2026-12-12", "2026-12-13", "2026-12-14"] },
  { dates: ["2026-12-20"], attendance: 300, minPowerKva: 30 },
  { near: { lat: -6.2, lon: 106.82, radiusKm: 15 }, sort: "distance" as const },
  { activities: ["fnb_sampling"], budgetMax: 20_000_000, sort: "price" as const },
  { q: "atrium bandung", dates: ["2027-01-10", "2027-01-11"], showLimited: true },
];

async function main() {
  const times: number[] = [];
  for (let round = 0; round < 15; round++) {
    for (const q of queries) {
      const t = performance.now();
      await searchSpaces(q);
      times.push(performance.now() - t);
    }
  }
  times.sort((a, b) => a - b);
  const p = (x: number) => times[Math.min(times.length - 1, Math.floor(times.length * x))]!.toFixed(1);
  console.log(`search over ${times.length} runs: p50 ${p(0.5)} ms, p95 ${p(0.95)} ms, max ${times.at(-1)!.toFixed(1)} ms`);
  if (Number(p(0.95)) > 500) process.exitCode = 1;
}

main().finally(() => closeDb());
