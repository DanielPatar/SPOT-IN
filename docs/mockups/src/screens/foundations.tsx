import { CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, Notice, Panel, PilotBanner, PilotEventLabel, Status, VerifiedBadge, DocPreview, MoneyRow } from "@/components/kit"
import { rp } from "@/lib/data"
import type { ScreenDef } from "@/registry"

const swatches = [
  { name: "Brand", hex: "#0f5c4d", use: "Tombol utama, tautan, status positif", text: "#fff" },
  { name: "Brand soft", hex: "#dcefe9", use: "Latar status positif, item aktif", text: "#0f5c4d" },
  { name: "Accent", hex: "#d9822b", use: "Penanda pilot saja (garis, ikon). Tidak untuk teks.", text: "#1d1b16" },
  { name: "Accent ink", hex: "#8a4b0f", use: "Teks pada label pilot dan status menunggu", text: "#fff" },
  { name: "Background", hex: "#f7f5f0", use: "Latar halaman", text: "#1d1b16" },
  { name: "Ink", hex: "#1d1b16", use: "Teks utama", text: "#fff" },
  { name: "Muted", hex: "#6b665a", use: "Teks pendukung (5,25:1 di latar)", text: "#fff" },
  { name: "Line", hex: "#e2dccf", use: "Garis pemisah dan tepi panel", text: "#1d1b16" },
  { name: "Field", hex: "#8f8778", use: "Tepi kolom isian (3,56:1)", text: "#fff" },
  { name: "Danger", hex: "#b42318", use: "Galat dan tindakan yang tidak bisa dibatalkan", text: "#fff" },
]

function Foundations() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="text-[28px] font-bold tracking-tight text-ink">Fondasi desain Spot-In</h1>
      <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
        Satu warna merek yang tenang, satu warna aksen yang hanya menandai mode pilot, dan satu keluarga huruf. Hierarki dibangun dari ukuran, ketebalan dan jarak, bukan dari
        bayangan atau gradien.
      </p>

      <section className="mt-8" aria-labelledby="f-color">
        <h2 id="f-color" className="text-lg font-semibold">Warna</h2>
        <ul className="mt-3 grid gap-3 @xl:grid-cols-2 @5xl:grid-cols-5">
          {swatches.map((s) => (
            <li key={s.hex} className="overflow-hidden rounded-lg border border-line bg-surface">
              <div className="flex h-16 items-end p-2 text-xs font-semibold" style={{ background: s.hex, color: s.text }}>
                {s.hex}
              </div>
              <div className="p-2.5">
                <p className="text-sm font-semibold">{s.name}</p>
                <p className="text-xs leading-snug text-muted-foreground">{s.use}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10 grid gap-6 @5xl:grid-cols-2" aria-labelledby="f-type">
        <div>
          <h2 id="f-type" className="text-lg font-semibold">Tipografi: Plus Jakarta Sans</h2>
          <p className="mt-1 text-sm text-muted-foreground">Dirancang untuk identitas kota Jakarta; terbaca jelas di ukuran kecil dan punya angka tabular untuk Rupiah.</p>
          <div className="mt-4 space-y-3 rounded-lg border border-line bg-surface p-5">
            <p className="text-[28px] leading-tight font-bold tracking-tight">Judul halaman 28/22</p>
            <p className="text-lg font-semibold">Judul bagian 18/16</p>
            <p className="text-[15px] leading-relaxed">Teks isi 15 px, tinggi baris 1,6. Paragraf dibatasi sekitar 70 karakter agar nyaman dibaca di laptop.</p>
            <p className="text-sm text-muted-foreground">Teks pendukung 14/13 px untuk petunjuk dan keterangan.</p>
            <p className="num text-[22px] font-bold">{rp(92_340_000)}</p>
          </div>
        </div>
        <div>
          <h2 className="text-lg font-semibold">Tombol: satu tindakan utama per area</h2>
          <p className="mt-1 text-sm text-muted-foreground">Label tombol menyebut hasilnya, 2–4 kata, diawali kata kerja.</p>
          <div className="mt-4 space-y-4 rounded-lg border border-line bg-surface p-5">
            <div className="flex flex-wrap gap-2">
              <Button>Kirim penawaran</Button>
              <Button variant="outline">Simpan draf</Button>
              <Button variant="ghost" className="text-brand">Lihat versi 1</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="destructive">Batalkan pemesanan</Button>
              <Button variant="outline">Tetap pertahankan</Button>
            </div>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>Utama (hijau): langkah yang memajukan alur.</li>
              <li>Sekunder (garis): alternatif yang aman.</li>
              <li>Tersier (teks): navigasi atau detail tambahan.</li>
              <li>Bahaya (merah): hanya di dialog konfirmasi tindakan yang tidak bisa dibatalkan.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mt-10" aria-labelledby="f-status">
        <h2 id="f-status" className="text-lg font-semibold">Status selalu ikon + teks</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Status tone="positive">Terkonfirmasi</Status>
          <Status tone="waiting">Menunggu persetujuan</Status>
          <Status tone="waiting">Tanggal sedang ditahan</Status>
          <Status tone="danger">Kedaluwarsa</Status>
          <Status tone="neutral">Draf</Status>
          <VerifiedBadge />
        </div>
      </section>

      <section className="mt-10 grid gap-6 @5xl:grid-cols-2" aria-labelledby="f-msg">
        <div>
          <h2 id="f-msg" className="text-lg font-semibold">Pola pesan</h2>
          <div className="mt-3 space-y-3">
            <Notice tone="danger" title="Tanggal ini baru saja diambil">
              Penyelenggara lain menerima penawaran untuk 12–14 Des beberapa detik sebelum Anda. Penawaran ini tidak bisa diterima lagi.
            </Notice>
            <Notice tone="waiting" title="Menunggu persetujuan Pemilik">
              Total penawaran di atas {rp(50_000_000)}, jadi Lestari perlu menyetujuinya sebelum terkirim.
            </Notice>
            <Notice tone="positive" title="Pemesanan terkonfirmasi">Tanggal 12–14 Des sekarang tercatat sebagai dipesan.</Notice>
          </div>
        </div>
        <div>
          <h2 className="text-lg font-semibold">Kolom isian</h2>
          <div className="mt-3 space-y-4 rounded-lg border border-line bg-surface p-5">
            <Field id="f-1" label="Nama acara" hint="Hanya Anda dan pengelola yang Anda hubungi yang melihat nama ini.">
              <Input defaultValue="Pekan Kopi Nusantara 2026" />
            </Field>
            <Field id="f-2" label="Perkiraan jumlah pengunjung" error="Isi dengan angka, misalnya 300.">
              <Input defaultValue="tiga ratus" />
            </Field>
          </div>
        </div>
      </section>

      <section className="mt-10 grid gap-6 @5xl:grid-cols-2" aria-labelledby="f-pilot">
        <div>
          <h2 id="f-pilot" className="text-lg font-semibold">Penanda pilot</h2>
          <p className="mt-1 text-sm text-muted-foreground">Satu-satunya pemakaian oranye. Tidak bisa ditutup.</p>
          <div className="mt-3 overflow-hidden rounded-lg border border-line">
            <PilotBanner />
            <div className="bg-surface p-4">
              <PilotEventLabel />
            </div>
          </div>
        </div>
        <DocPreview title="Penawaran" number="Q-2026-0142 · Versi 2" footer="Dokumen latihan untuk pilot Spot-In. Tidak mengikat dan bukan faktur pajak.">
          <MoneyRow label="Sewa + layanan tambahan" value={rp(81_000_000)} />
          <MoneyRow label="PPN" value={rp(8_910_000)} />
          <MoneyRow label="Biaya layanan Spot-In" value={rp(2_430_000)} />
          <MoneyRow label="Total" value={rp(92_340_000)} strong />
        </DocPreview>
      </section>

      <Panel className="mt-10">
        <h2 className="flex items-center gap-2 font-semibold">
          <CheckCircle2 className="size-4 text-brand" aria-hidden="true" />
          Kapan memakai apa
        </h2>
        <ul className="mt-2 grid gap-1.5 text-sm text-ink @xl:grid-cols-2">
          <li><b>Pesan di halaman (Alert):</b> galat, peringatan dan status yang harus tetap terlihat.</li>
          <li><b>Dialog konfirmasi (AlertDialog):</b> tindakan yang tidak bisa dibatalkan, misalnya membatalkan pemesanan.</li>
          <li><b>Dialog (Dialog):</b> tugas pendek yang memblokir, misalnya masuk ulang saat sesi habis.</li>
          <li><b>Panel samping/bawah (Sheet):</b> tugas pendukung tanpa meninggalkan konteks, misalnya filter atau minta info.</li>
          <li><b>Popover:</b> isian kecil di tempat, misalnya kalender tanggal.</li>
          <li><b>Tooltip:</b> penjelasan istilah pada ikon atau label; tidak pernah berisi informasi penting.</li>
          <li><b>Toast:</b> tidak dipakai untuk hal penting. Hasil tindakan ditampilkan di halaman itu sendiri.</li>
        </ul>
      </Panel>
    </div>
  )
}

export const foundationScreens: ScreenDef[] = [
  {
    id: "foundations",
    title: "Fondasi desain",
    section: "0",
    fr: ["FR-M25-01", "FR-M25-02", "FR-M38-01", "NFR Aksesibilitas"],
    device: "desktop",
    role: "Tim",
    summary: "Warna merek, tipografi, tombol, status, pola pesan dan penanda pilot.",
    states: [{ id: "default", label: "Semua token" }],
    render: () => <Foundations />,
  },
]
