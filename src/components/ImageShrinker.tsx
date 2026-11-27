"use client";
import { useEffect } from "react";

const MAX_SIDE = 1920;
const SKIP_BELOW = 500 * 1024; // small files go through untouched

async function shrink(file: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size < SKIP_BELOW) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.82));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", {
      type: "image/jpeg",
      lastModified: file.lastModified,
    });
  } catch {
    return file; // the server still validates and resizes
  }
}

/**
 * Shrinks photos in the browser before they are uploaded (any <input type="file"> on the page).
 * Phone photos are several MB each; hosts such as Vercel reject request bodies above ~4.5 MB,
 * which showed up as a generic error page. The server keeps its own checks and resizing.
 */
export function ImageShrinker() {
  useEffect(() => {
    const onChange = async (e: Event) => {
      const input = e.target as HTMLInputElement | null;
      if (!input || input.type !== "file" || !input.files?.length || input.dataset.shrunk === "1")
        return;
      const files = Array.from(input.files);
      if (!files.some((f) => f.type.startsWith("image/") && f.size >= SKIP_BELOW)) return;
      const form = input.form;
      form?.setAttribute("aria-busy", "true");
      try {
        const out = await Promise.all(files.map(shrink));
        const dt = new DataTransfer();
        for (const f of out) dt.items.add(f);
        input.dataset.shrunk = "1";
        input.files = dt.files;
      } finally {
        delete input.dataset.shrunk;
        form?.removeAttribute("aria-busy");
      }
    };
    document.addEventListener("change", onChange);
    return () => document.removeEventListener("change", onChange);
  }, []);
  return null;
}
