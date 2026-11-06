import type { ReactNode } from "react"

export type Device = "mobile" | "desktop"

export type ScreenState = {
  id: string
  /** Short label shown in the state switcher. */
  label: string
  /** Which PRD edge case this state illustrates, if any (e.g. "§12.1"). */
  ref?: string
}

export type ScreenDef = {
  id: string
  title: string
  /** PRD flow section, e.g. "6.1". Use "x" for cross-cutting screens. */
  section: string
  /** Requirement IDs this screen covers. */
  fr: string[]
  device: Device
  /** Who uses this screen. */
  role: string
  summary: string
  states: ScreenState[]
  render: (state: string) => ReactNode
}

export const sections: { id: string; title: string; note: string }[] = [
  { id: "0", title: "Fondasi desain", note: "Token warna, tipografi, komponen dan pola pesan yang dipakai semua layar." },
  { id: "6.1", title: "§6.1 Pilot dan pendaftaran pengelola", note: "Undangan, persetujuan pilot, verifikasi email, masuk, pilihan peran, penyiapan properti dan ruang, tinjauan Admin." },
  { id: "6.2", title: "§6.2 Pencarian dan permintaan", note: "Cari ruang, halaman ruang, daftar pilihan, tautan bagikan, buat acara dan kirim permintaan ke beberapa ruang." },
  { id: "6.3", title: "§6.3 Pengelola meninjau dan membuat penawaran", note: "Kotak masuk, detail permintaan, pesan, penyusun penawaran dan persetujuan Pemilik." },
  { id: "6.4", title: "§6.4 Revisi, perbandingan dan penerimaan", note: "Melihat penawaran, perbedaan versi, membandingkan penawaran." },
  { id: "6.5", title: "§6.5 Perjanjian, uang muka, terkonfirmasi", note: "Perjanjian contoh (pilot), pembayaran sandbox." },
  { id: "6.6", title: "§6.6 Penawaran cadangan", note: "Penawaran untuk tanggal yang sedang ditahan penyelenggara lain." },
  { id: "6.7", title: "§6.7 Dokumen dan pelunasan", note: "Ruang kerja pemesanan dengan daftar dokumen wajib." },
  { id: "6.8", title: "§6.8 Halaman acara, pendaftaran, kartu masuk", note: "Halaman acara tidak terdaftar, pendaftaran gratis, kartu masuk QR." },
  { id: "6.9", title: "§6.9 Check-in hari acara", note: "Pindai QR, daftar peserta, batalkan check-in." },
  { id: "6.10", title: "§6.10 Setelah acara", note: "Masa pasca-acara, laporkan masalah, pencairan simulasi." },
  { id: "6.11", title: "§6.11–6.12 Pembatalan", note: "Pembatalan oleh penyelenggara dan oleh pengelola dengan pratinjau pengembalian dana." },
  { id: "x", title: "Lintas alur", note: "Notifikasi, pengaturan akun, dan keadaan umum dari §12.7." },
]
