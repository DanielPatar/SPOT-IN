import net from "node:net";
import { config } from "@/lib/config";

/**
 * Virus scan adapter (PRD §10): ClamAV (clamd INSTREAM) in hosted environments; in
 * dev/test the "eicar" driver detects the standard EICAR test signature only.
 */
export type ScanResult = "clean" | "infected" | "error";

const EICAR = "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*";

export async function scan(body: Buffer): Promise<ScanResult> {
  if (config().SCANNER_DRIVER === "eicar") return body.includes(EICAR) ? "infected" : "clean";
  return clamdScan(body);
}

function clamdScan(body: Buffer): Promise<ScanResult> {
  return new Promise((resolve) => {
    const cfg = config();
    const socket = net.createConnection({ host: cfg.CLAMD_HOST, port: cfg.CLAMD_PORT });
    let out = "";
    socket.setTimeout(30_000, () => {
      socket.destroy();
      resolve("error");
    });
    socket.on("error", () => resolve("error"));
    socket.on("data", (d) => (out += d.toString()));
    socket.on("end", () => resolve(out.includes("FOUND") ? "infected" : out.includes("OK") ? "clean" : "error"));
    socket.write("zINSTREAM\0");
    for (let i = 0; i < body.length; i += 64 * 1024) {
      const chunk = body.subarray(i, i + 64 * 1024);
      const len = Buffer.alloc(4);
      len.writeUInt32BE(chunk.length);
      socket.write(len);
      socket.write(chunk);
    }
    socket.write(Buffer.alloc(4));
  });
}
