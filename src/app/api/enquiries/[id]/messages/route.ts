import { listMessages } from "@/server/messaging";
import { getSession } from "@/web/session";
import { PermissionError } from "@/lib/permissions";
import { signedFileUrl } from "@/adapters/storage";

export const dynamic = "force-dynamic";

/** Polled every few seconds by the thread view so new messages appear without reload (FR-M10-01). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getSession();
  if (!s) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  try {
    const r = await listMessages({ userId: s.userId }, id);
    return Response.json({
      otherLastReadAt: r.otherLastReadAt,
      messages: r.messages.map((m) => ({ ...m, attachments: m.attachments.map((a) => ({ ...a, url: signedFileUrl(a.fileId) })) })),
    });
  } catch (e) {
    if (e instanceof PermissionError) return new Response("Not found", { status: 404 });
    throw e;
  }
}
