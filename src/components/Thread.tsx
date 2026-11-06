"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

type Msg = {
  id: string;
  mine: boolean;
  side: string;
  senderName: string | null;
  body: string | null;
  wasMasked: boolean;
  attachments: { fileId: string; filename: string; size: number; mime: string; url: string }[];
  createdAt: string;
  edited: boolean;
  deleted: boolean;
  editable: boolean;
};

/** Message thread with polling every 5 s (FR-M10-01), attachments, edit/delete and report. */
export function Thread({
  enquiryId,
  canSend,
  savedReplies = [],
  postAction,
  editAction,
  deleteAction,
  reportAction,
  confirmed,
}: {
  enquiryId: string;
  canSend: boolean;
  savedReplies?: { id: string; title: string; body: string }[];
  postAction: (form: FormData) => Promise<{ error?: string; masked?: boolean }>;
  editAction: (form: FormData) => Promise<{ error?: string }>;
  deleteAction: (form: FormData) => Promise<{ error?: string }>;
  reportAction: (form: FormData) => Promise<{ error?: string }>;
  confirmed: boolean;
}) {
  const t = useTranslations("thread");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [otherRead, setOtherRead] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [hasFiles, setHasFiles] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const r = await fetch(`/api/enquiries/${enquiryId}/messages`, { cache: "no-store" });
    if (!r.ok) return;
    const data = (await r.json()) as { messages: Msg[]; otherLastReadAt: string | null };
    setMessages((prev) => {
      if (prev.length !== data.messages.length) setTimeout(() => endRef.current?.scrollIntoView({ block: "nearest" }), 50);
      return data.messages;
    });
    setOtherRead(data.otherLastReadAt);
  }, [enquiryId]);

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [load]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    setNotice(null);
    const form = new FormData();
    form.set("enquiryId", enquiryId);
    form.set("body", text);
    for (const f of Array.from(fileRef.current?.files ?? [])) form.append("files", f);
    const r = await postAction(form);
    setSending(false);
    if (r.error) return setError(r.error);
    if (r.masked) setNotice(t("maskedNotice"));
    setText("");
    if (fileRef.current) fileRef.current.value = "";
    setHasFiles(false);
    load();
  }

  async function simple(action: (f: FormData) => Promise<{ error?: string }>, fields: Record<string, string>) {
    const f = new FormData();
    for (const [k, v] of Object.entries(fields)) f.set(k, v);
    const r = await action(f);
    if (r.error) setError(r.error);
    setEditing(null);
    load();
  }

  const lastMine = [...messages].reverse().find((m) => m.mine);
  return (
    <section className="card" aria-label={t("title")}>
      <h2 style={{ marginTop: 0 }}>{t("title")}</h2>
      <div className="thread" aria-live="polite">
        {messages.length === 0 ? <p className="muted small">{t("empty")}</p> : null}
        {messages.map((m) => (
          <div key={m.id} className={`msg ${m.mine ? "msg-mine" : ""}`} data-testid="message">
            {m.deleted ? (
              <em className="muted">{t("deleted")}</em>
            ) : editing === m.id ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  simple(editAction, { messageId: m.id, body: String(new FormData(e.currentTarget).get("body") ?? "") });
                }}
              >
                <textarea name="body" defaultValue={m.body ?? ""} aria-label={t("editLabel")} />
                <button className="btn btn-secondary small" type="submit">
                  {t("saveEdit")}
                </button>
              </form>
            ) : (
              <>
                {m.body}
                {m.attachments.map((a) => (
                  <div key={a.fileId} className="small">
                    {a.mime.startsWith("image/") ? <img src={a.url} alt={a.filename} style={{ maxWidth: 220, display: "block", borderRadius: 6 }} /> : null}
                    <a href={a.url} target="_blank" rel="noreferrer">
                      {a.filename}
                    </a>
                  </div>
                ))}
              </>
            )}
            <div className="msg-meta">
              {m.mine ? t("you") : (m.senderName ?? t("deletedUser"))} · {new Date(m.createdAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" })}
              {m.edited ? ` · ${t("edited")}` : ""}
              {m.wasMasked ? ` · ${t("maskedShort")}` : ""}
              {m.mine && m.id === lastMine?.id && otherRead && new Date(otherRead) >= new Date(m.createdAt) ? ` · ${t("read")}` : ""}
              {m.editable && editing !== m.id ? (
                <>
                  {" · "}
                  <button className="link-btn small" type="button" onClick={() => setEditing(m.id)}>
                    {t("edit")}
                  </button>
                  {" · "}
                  <button className="link-btn small" type="button" onClick={() => simple(deleteAction, { messageId: m.id })}>
                    {t("delete")}
                  </button>
                </>
              ) : null}
              {!m.mine && !m.deleted ? (
                <>
                  {" · "}
                  <button className="link-btn small" type="button" onClick={() => simple(reportAction, { messageId: m.id, reason: "inappropriate" })}>
                    {t("report")}
                  </button>
                </>
              ) : null}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      {error ? <p className="alert alert-error" role="alert">{error}</p> : null}
      {notice ? <p className="alert alert-warn" role="status">{notice}</p> : null}
      {canSend ? (
        <form onSubmit={send} className="form" style={{ marginTop: 12 }}>
          {savedReplies.length ? (
            <label>
              {t("savedReply")}
              <select onChange={(e) => { const r = savedReplies.find((x) => x.id === e.target.value); if (r) setText(r.body); }} defaultValue="">
                <option value="">{t("chooseSavedReply")}</option>
                {savedReplies.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label>
            {t("message")}
            <textarea value={text} onChange={(e) => setText(e.target.value)} name="body" />
          </label>
          <label>
            {t("attach")}
            <input ref={fileRef} type="file" name="files" multiple accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx" onChange={(e) => setHasFiles(!!e.target.files?.length)} />
            {!confirmed ? <span className="small muted">{t("noContactInFiles")}</span> : null}
          </label>
          <button className="btn btn-primary" type="submit" disabled={sending || (!text.trim() && !hasFiles)}>
            {sending ? t("sending") : t("send")}
          </button>
        </form>
      ) : null}
    </section>
  );
}
