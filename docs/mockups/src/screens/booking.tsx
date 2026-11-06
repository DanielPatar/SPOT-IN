import { AlertTriangle, CheckCircle2, Clock, Download, FileText, Phone, Upload, ImagePlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { BookingProgress, DocPreview, Field, MoneyRow, Notice, PageTitle, Panel, SectionTitle, Status, type Tone } from "@/components/kit"
import { q2, rp } from "@/lib/data"
import type { ScreenDef } from "@/registry"
import { Shell } from "./shell"

/* ---------------- Booking workspace (§6.7) ---------------- */

type DocItem = { name: string; due: string; mandatory: boolean; status: [Tone, string]; note?: string; version?: string }

function Checklist({ items, venue }: { items: DocItem[]; venue?: boolean }) {
  return (
    <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
      {items.map((d) => (
        <li key={d.name} className="p-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium">{d.name}{!d.mandatory && <span className="font-normal text-muted-foreground"> (opsional)</span>}</p>
              <p className="text-[13px] text-muted-foreground">Paling lambat {d.due}{d.version && ` · ${d.version}`}</p>
            </div>
            <Status tone={d.status[0]}>{d.status[1]}</Status>
          </div>
          {d.note && <p className="mt-2 rounded-md bg-sunken px-3 py-2 text-[13px]"><b>Catatan pengelola:</b> {d.note}</p>}
          <div className="mt-2 flex flex-wrap gap-2">
            {venue && d.status[1] === "Dikirim" ? (
              <>
                <Button size="sm">Setujui dokumen</Button>
                <Button size="sm" variant="outline">Minta perubahan</Button>
              </>
            ) : !venue && d.status[1] !== "Disetujui" ? (
              <Button size="sm" variant="outline"><Upload className="size-4" />{d.status[1] === "Perlu perubahan" ? "Unggah versi baru" : "Unggah dokumen"}</Button>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  )
}

function Workspace({ state }: { state: string }) {
  const venue = state === "venue"
  const risk = state === "at-risk"
  const docs: DocItem[] = [
    { name: "Denah tata letak final", due: "Sab, 28 Nov 2026", mandatory: true, status: risk ? ["danger", "Belum dikirim"] : ["positive", "Disetujui"], version: risk ? undefined : "versi 2" },
    { name: "Asuransi tanggung gugat", due: "Sab, 5 Des 2026", mandatory: true, status: venue ? ["waiting", "Dikirim"] : ["danger", "Perlu perubahan"], note: venue ? undefined : "Nilai pertanggungan minimal Rp 1 miliar, polis saat ini Rp 500 juta.", version: "versi 1" },
    { name: "Susunan acara (rundown)", due: "Rab, 9 Des 2026", mandatory: false, status: ["neutral", "Belum dikirim"] },
  ]
  return (
    <Shell device="desktop" ctx={venue ? "venue" : "organizer"} active={venue ? "Pemesanan" : "Acara saya"} pilot>
      <PageTitle
        back={venue ? "Pemesanan" : "Acara saya"}
        title="Pekan Kopi Nusantara 2026"
        description="BK-0087 · Atrium Utama, Mal Cempaka Raya · Sab–Sen, 12–14 Des 2026, 10.00–22.00 WIB"
        actions={venue ? <Button variant="outline" className="bg-surface">Tandai berisiko</Button> : <Button>Buat halaman acara</Button>}
      />
      <BookingProgress current={4} device="desktop" />
      {risk && (
        <Notice tone="danger" className="mt-4" title="7 hari lagi acara, 1 dokumen wajib dan pelunasan belum selesai">
          Denah tata letak final belum dikirim dan pelunasan {rp(q2.balance)} belum dibayar. Pengelola bisa menandai pemesanan ini berisiko. Selesaikan keduanya sebelum Sab, 5 Des.
        </Notice>
      )}
      <div className="mt-5 grid gap-6 @5xl:grid-cols-[1fr_340px]">
        <Tabs defaultValue="docs">
          <TabsList className="bg-sunken">
            <TabsTrigger value="docs">Dokumen (1 dari 2 wajib)</TabsTrigger>
            <TabsTrigger value="pay">Pembayaran</TabsTrigger>
            <TabsTrigger value="timeline">Riwayat</TabsTrigger>
          </TabsList>
          <TabsContent value="docs" className="mt-4">
            <p className="mb-3 text-sm text-muted-foreground">Tenggat dihitung dari tanggal mulai acara, Sab 12 Des. PDF, JPG atau PNG, maksimal 10 MB. Versi lama tetap tersimpan.</p>
            <Checklist items={docs} venue={venue} />
          </TabsContent>
          <TabsContent value="pay" className="mt-4">
            <Panel>
              <div className="divide-y divide-line">
                <MoneyRow label="Uang muka" sub="Dibayar 13 Nov 2026 · PILOT-MCR-2026-0012" value={<span className="inline-flex items-center gap-2">{rp(q2.deposit)}<Status tone="positive">Dibayar</Status></span>} />
                <MoneyRow label="Pelunasan" sub="Ditagih 21 Nov · jatuh tempo Sab, 28 Nov 2026" value={<span className="inline-flex items-center gap-2">{rp(q2.balance)}<Status tone={risk ? "danger" : "waiting"}>{risk ? "Terlambat" : "Belum dibayar"}</Status></span>} />
              </div>
              {!venue && <Button className="mt-3">Bayar pelunasan {rp(q2.balance)}</Button>}
            </Panel>
          </TabsContent>
          <TabsContent value="timeline" className="mt-4">
            <ol className="space-y-2 text-sm">
              {["13 Nov 10.40 · Pemesanan terkonfirmasi", "13 Nov 10.38 · Uang muka uji diterima", "13 Nov 10.21 · Budi menyetujui perjanjian", "13 Nov 10.02 · Rina menyetujui perjanjian", "13 Nov 09.55 · Penawaran versi 2 diterima"].map((t) => <li key={t} className="flex gap-2"><Clock className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />{t}</li>)}
            </ol>
          </TabsContent>
        </Tabs>
        <aside className="space-y-4">
          <Panel>
            <SectionTitle>Kontak</SectionTitle>
            <p className="text-[13px] text-muted-foreground">Terlihat karena pemesanan sudah terkonfirmasi.</p>
            <ul className="mt-2 space-y-2 text-sm">
              <li><b>Budi Santoso</b>, Mal Cempaka Raya<br /><span className="inline-flex items-center gap-1.5"><Phone className="size-3.5" aria-hidden="true" />021 8370 1122</span></li>
              <li><b>Rina Wulandari</b>, PT Lintas Acara Kreatif<br /><span className="inline-flex items-center gap-1.5"><Phone className="size-3.5" aria-hidden="true" />0812 3456 7890</span></li>
            </ul>
          </Panel>
          <Panel>
            <SectionTitle>Dokumen pemesanan</SectionTitle>
            <ul className="space-y-1.5 text-sm">
              {["Perjanjian contoh (pilot)", "Penawaran versi 2", "Kuitansi uang muka"].map((d) => (
                <li key={d}><a href="#" onClick={(e) => e.preventDefault()} className="inline-flex items-center gap-2 font-medium text-brand hover:underline"><FileText className="size-4" aria-hidden="true" />{d}</a></li>
              ))}
            </ul>
          </Panel>
          <Panel>
            <SectionTitle>Halaman acara</SectionTitle>
            <p className="text-sm text-muted-foreground">Belum dibuat. Buat halaman untuk menerima pendaftaran gratis dari tamu undangan.</p>
          </Panel>
          {!venue && <Button variant="ghost" className="w-full text-danger">Batalkan pemesanan</Button>}
        </aside>
      </div>

      <Sheet open={state === "request-changes"}>
        <SheetContent className="@xl:max-w-md">
          <SheetHeader>
            <SheetTitle>Minta perubahan: Asuransi tanggung gugat</SheetTitle>
            <SheetDescription>Penyelenggara melihat komentar ini di daftar dokumen dan diminta mengunggah versi baru.</SheetDescription>
          </SheetHeader>
          <div className="px-4">
            <Field id="rc-c" label="Apa yang perlu diubah?"><Textarea rows={4} className="bg-surface" defaultValue="Nilai pertanggungan minimal Rp 1 miliar, polis saat ini Rp 500 juta." /></Field>
          </div>
          <SheetFooter className="border-t border-line"><Button>Kirim permintaan perubahan</Button></SheetFooter>
        </SheetContent>
      </Sheet>
    </Shell>
  )
}

/* ---------------- After the event (§6.10) ---------------- */

function AfterEvent({ state }: { state: string }) {
  const reported = state === "reported"
  const released = state === "released"
  return (
    <Shell pilot active="Acara saya">
      <BookingProgress current={6} />
      <PageTitle title="Acara selesai" description="Pekan Kopi Nusantara 2026 · berakhir Senin, 14 Des 2026 pukul 22.00 WIB" />
      {state === "default" && (
        <Notice tone="waiting" title="Masa laporan terbuka sampai Kamis, 17 Des 2026 pukul 22.00 WIB">
          Jika ada masalah dengan ruang atau pemesanan, laporkan sebelum waktu itu. Tanpa laporan, dana simulasi dicairkan ke pengelola pada Jumat, 18 Des 2026 pukul 10.00 WIB.
        </Notice>
      )}
      {reported && (
        <Notice tone="waiting" title="Laporan Anda diterima, pencairan ditahan">
          Admin Spot-In meninjau laporan Anda dan akan mencatat hasilnya. Pencairan berjalan setelah laporan selesai. Kami kabari lewat email.
        </Notice>
      )}
      {released && (
        <Notice tone="positive" title="Pencairan simulasi selesai Jumat, 18 Des 2026 10.00 WIB">Tidak ada masalah yang dilaporkan. Laporan penyelesaian sudah tersedia untuk kedua pihak.</Notice>
      )}
      {released ? (
        <DocPreview className="mt-4" title="Laporan penyelesaian (simulasi)" number="BK-0087 · 18 Des 2026" footer="Simulasi. Tidak ada dana sungguhan yang ditahan atau dicairkan.">
          <MoneyRow label="Dibayar penyelenggara" value={rp(q2.total)} />
          <MoneyRow label="Komisi Spot-In (10% dari Rp 81.000.000)" value={`− ${rp(q2.commission)}`} />
          <MoneyRow label="Biaya layanan Spot-In" value={`− ${rp(q2.fee)}`} />
          <MoneyRow label="Hak pengelola (simulasi)" value={rp(q2.venuePayable)} strong />
          <MoneyRow label="Pendapatan Spot-In (simulasi)" value={rp(q2.spotinRevenue)} muted />
        </DocPreview>
      ) : (
        <Panel className="mt-4">
          <SectionTitle>Rincian yang akan dicairkan</SectionTitle>
          <div className="divide-y divide-line">
            <MoneyRow label="Total dibayar" value={rp(q2.total)} />
            <MoneyRow label="Hak pengelola setelah komisi" value={rp(q2.venuePayable)} />
          </div>
        </Panel>
      )}
      {released && (
        <div className="mt-3 flex gap-2"><Button variant="outline" size="sm"><Download className="size-4" />PDF</Button><Button variant="outline" size="sm"><Download className="size-4" />CSV</Button></div>
      )}
      {state === "default" && <Button variant="outline" className="mt-5 w-full">Laporkan masalah</Button>}

      <Sheet open={state === "report"}>
        <SheetContent side="bottom" className="rounded-t-xl">
          <SheetHeader>
            <SheetTitle>Laporkan masalah</SheetTitle>
            <SheetDescription>Laporan menahan pencairan sampai Admin Spot-In mencatat hasilnya. Pengelola ikut diberi tahu.</SheetDescription>
          </SheetHeader>
          <div className="space-y-3 px-4">
            <Field id="rp-t" label="Apa yang terjadi?"><Textarea rows={4} className="bg-surface" defaultValue="Listrik padam 2 jam pada hari kedua (13 Des, 15.00–17.00). Booth tidak bisa beroperasi." /></Field>
            <Button variant="outline" size="sm"><ImagePlus className="size-4" />Tambah foto (opsional)</Button>
          </div>
          <SheetFooter className="border-t border-line"><Button className="h-11">Kirim laporan</Button></SheetFooter>
        </SheetContent>
      </Sheet>
    </Shell>
  )
}

/* ---------------- Cancellation by organizer (§6.11) ---------------- */

function CancelOrganizer({ state }: { state: string }) {
  const late = state === "20d"
  const member = state === "member"
  return (
    <Shell pilot active="Acara saya">
      <PageTitle back="Pekan Teh Nusantara 2027" title="Batalkan pemesanan" description="BK-0093 · Atrium Utama · Sab–Sen, 9–11 Jan 2027 · kebijakan Sedang" />
      {member ? (
        <Notice tone="neutral" title="Hanya Pemilik organisasi yang bisa membatalkan pemesanan">
          Anda Anggota di PT Lintas Acara Kreatif. Hubungi Rina Wulandari (Pemilik) jika pemesanan ini perlu dibatalkan.
        </Notice>
      ) : (
        <>
          <Panel>
            <p className="text-sm text-muted-foreground">Jika dibatalkan hari ini, {late ? "Minggu, 20 Des 2026 (20 hari sebelum acara)" : "Sabtu, 5 Des 2026 (35 hari sebelum acara)"}:</p>
            <div className="mt-2 divide-y divide-line">
              <MoneyRow label="Sudah Anda bayar (uang muka)" value={rp(q2.deposit)} />
              <MoneyRow label={late ? "Tingkat pengembalian 14–29 hari: 50%" : "Tingkat pengembalian 30 hari atau lebih: 100%"} value="" muted />
              <MoneyRow label="Ditahan pengelola" value={late ? rp(44_955_000) : "Rp 0"} />
              <MoneyRow label="Biaya layanan Spot-In" sub="Tidak dikembalikan: lewat 24 jam sejak terkonfirmasi" value={rp(q2.fee)} />
              <MoneyRow label="Dikembalikan ke Anda (simulasi)" value={late ? "Rp 0" : rp(44_955_000)} strong />
            </div>
          </Panel>
          {late && (
            <Notice tone="waiting" className="mt-4" title="Anda tidak menerima pengembalian dana">
              Pada 14–29 hari sebelum acara, pengelola berhak atas 50% dari total untuk tempat ({rp(44_955_000)}), sama dengan uang muka yang sudah Anda bayar.
            </Notice>
          )}
          <fieldset className="mt-5">
            <legend className="mb-2 font-semibold">Alasan pembatalan</legend>
            <RadioGroup defaultValue="client" className="gap-2">
              {[["client", "Klien membatalkan acara"], ["budget", "Anggaran berubah"], ["venue", "Menemukan tempat lain"], ["other", "Lainnya"]].map(([v, l]) => (
                <Label key={v} htmlFor={`cr-${v}`} className="flex items-center gap-2 font-normal"><RadioGroupItem id={`cr-${v}`} value={v} className="border-[#8f8778] text-brand" />{l}</Label>
              ))}
            </RadioGroup>
          </fieldset>
          <Panel className="mt-4 text-sm">
            <p className="font-semibold">Yang terjadi setelah dibatalkan</p>
            <ul className="mt-1.5 list-disc space-y-1 pl-5 text-ink/90">
              <li>Tanggal 9–11 Jan dilepas untuk penyelenggara lain.</li>
              <li>Halaman acara menampilkan Dibatalkan, pendaftaran ditutup, dan 41 pendaftar diberi tahu lewat email.</li>
              <li>Pengembalian dicatat sebagai "Refund (simulasi)" di buku besar.</li>
            </ul>
          </Panel>
          <Button variant="destructive" className="mt-5 h-11 w-full">Lanjut ke konfirmasi</Button>
        </>
      )}

      <AlertDialog open={state === "confirm"}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Batalkan pemesanan Atrium Utama?</AlertDialogTitle>
            <AlertDialogDescription>
              Ini tidak bisa diurungkan. Anda menerima pengembalian simulasi {rp(44_955_000)}, dan 41 pendaftar halaman acara akan diberi tahu bahwa acara dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Tetap pertahankan pemesanan</AlertDialogCancel>
            <AlertDialogAction variant="destructive">Batalkan pemesanan</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Shell>
  )
}

/* ---------------- Cancellation by venue (§6.12) ---------------- */

function CancelVenue({ state }: { state: string }) {
  if (state === "done") {
    return (
      <Shell device="desktop" ctx="venue" pilot active="Pemesanan">
        <PageTitle title="Pemesanan dibatalkan oleh pengelola" description="BK-0093 · Pekan Teh Nusantara 2027" />
        <Notice tone="neutral" title="Penyelenggara menerima pengembalian penuh (simulasi)">
          {rp(q2.deposit)} termasuk biaya layanan Spot-In dicatat sebagai Refund (simulasi). Tanggal 9–11 Jan kembali tersedia. Penalti pengelola tidak berlaku selama pilot.
        </Notice>
      </Shell>
    )
  }
  return (
    <Shell device="desktop" ctx="venue" pilot active="Pemesanan" narrow>
      <PageTitle back="BK-0093" title="Batalkan pemesanan sebagai pengelola" description="Hanya Pemilik yang bisa membatalkan pemesanan yang sudah terkonfirmasi." />
      <Notice tone="danger" title="Penyelenggara akan menerima pengembalian penuh">
        Semua yang sudah dibayar PT Lintas Acara Kreatif, {rp(q2.deposit)} termasuk biaya layanan Spot-In, dikembalikan (simulasi). Halaman acara mereka ditandai Dibatalkan dan 41 pendaftar diberi tahu.
      </Notice>
      <Panel className="mt-4 space-y-4">
        <Field id="cv-r" label="Alasan (dikirim ke penyelenggara)" error={state === "error" ? "Tulis alasan pembatalan. Penyelenggara perlu tahu kenapa acaranya batal." : undefined}>
          <Textarea rows={4} className="bg-surface" defaultValue={state === "error" ? "" : "Atrium ditutup untuk perbaikan atap darurat setelah kebocoran pada 20 Des."} />
        </Field>
        <div className="flex gap-2">
          <Button variant="destructive">Batalkan dan kembalikan dana</Button>
          <Button variant="outline">Kembali</Button>
        </div>
      </Panel>
    </Shell>
  )
}

/* ---------------- Organizer events dashboard ---------------- */

function OrganizerDashboard({ state }: { state: string }) {
  if (state === "empty") {
    return (
      <Shell active="Acara saya">
        <h1 className="text-[22px] font-bold tracking-tight">Acara saya</h1>
        <div className="mt-4 rounded-lg border border-dashed border-line-strong bg-surface p-5">
          <p className="font-semibold">Belum ada acara</p>
          <p className="mt-1 text-sm text-muted-foreground">Mulai dengan mencari ruang. Acara dibuat saat Anda mengirim permintaan pertama.</p>
          <Button className="mt-3">Cari ruang</Button>
        </div>
      </Shell>
    )
  }
  const events = [
    { n: "Pekan Kopi Nusantara 2026", d: "12–14 Des 2026", s: ["positive", "Terkonfirmasi"] as [Tone, string], next: "Unggah asuransi versi baru", reg: "64 / 300 pendaftar" },
    { n: "Peluncuran Teh Hijau Musim Hujan", d: "16 Jan 2027", s: ["waiting", "2 penawaran masuk"] as [Tone, string], next: "Bandingkan penawaran", reg: undefined },
    { n: "Workshop Latte Art", d: "7 Feb 2027", s: ["neutral", "Menunggu balasan"] as [Tone, string], next: "Batas balasan Sel, 10 Nov", reg: undefined },
  ]
  return (
    <Shell active="Acara saya">
      <h1 className="text-[22px] font-bold tracking-tight">Acara saya</h1>
      <ul className="mt-4 space-y-3">
        {events.map((e) => (
          <li key={e.n} className="rounded-lg border border-line bg-surface p-4">
            <div className="flex items-start justify-between gap-2">
              <div><p className="font-semibold">{e.n}</p><p className="text-[13px] text-muted-foreground">{e.d}</p></div>
              <Status tone={e.s[0]}>{e.s[1]}</Status>
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-sm"><AlertTriangle className="size-3.5 text-warm-ink" aria-hidden="true" /><span className="text-muted-foreground">Berikutnya:</span> {e.next}</p>
            {e.reg && <p className="mt-1 flex items-center gap-1.5 text-sm"><CheckCircle2 className="size-3.5 text-brand" aria-hidden="true" />{e.reg}</p>}
          </li>
        ))}
      </ul>
    </Shell>
  )
}

export const bookingScreens: ScreenDef[] = [
  {
    id: "organizer-dashboard",
    title: "Acara saya (dasbor penyelenggara)",
    section: "6.7",
    fr: ["FR-M22-06"],
    device: "mobile",
    role: "Penyelenggara",
    summary: "Setiap acara dengan status, langkah berikutnya dan jumlah pendaftar.",
    states: [
      { id: "default", label: "Daftar" },
      { id: "empty", label: "Kosong" },
    ],
    render: (s) => <OrganizerDashboard state={s} />,
  },
  {
    id: "workspace",
    title: "Ruang kerja pemesanan dan dokumen",
    section: "6.7",
    fr: ["FR-M17-01", "FR-M17-02", "FR-M17-03", "FR-M17-04", "FR-M15-09", "FR-M1-05"],
    device: "desktop",
    role: "Penyelenggara / pengelola",
    summary: "Daftar dokumen wajib dengan tenggat, pembayaran, kontak terbuka, riwayat.",
    states: [
      { id: "default", label: "Penyelenggara" },
      { id: "venue", label: "Pengelola meninjau" },
      { id: "request-changes", label: "Minta perubahan" },
      { id: "at-risk", label: "H-7 belum lengkap", ref: "AC-M17-1" },
    ],
    render: (s) => <Workspace state={s} />,
  },
  {
    id: "after-event",
    title: "Setelah acara dan pencairan simulasi",
    section: "6.10",
    fr: ["FR-M16-01", "FR-M16-07", "FR-M16-08", "FR-M16-09", "FR-M15-07"],
    device: "mobile",
    role: "Penyelenggara / pengelola",
    summary: "Masa laporan 72 jam, laporkan masalah, laporan penyelesaian sesuai §11.2.",
    states: [
      { id: "default", label: "Masa laporan" },
      { id: "report", label: "Laporkan masalah" },
      { id: "reported", label: "Pencairan ditahan", ref: "AC-M15/M16-5" },
      { id: "released", label: "Sudah dicairkan", ref: "AC-M15/M16-4" },
    ],
    render: (s) => <AfterEvent state={s} />,
  },
  {
    id: "cancel-organizer",
    title: "Pembatalan oleh penyelenggara",
    section: "6.11",
    fr: ["FR-M18-03", "FR-M18-04", "FR-M18-05", "FR-M18-10", "FR-M14-09"],
    device: "mobile",
    role: "Penyelenggara (Pemilik)",
    summary: "Pratinjau pengembalian sesuai tingkat kebijakan, alasan, konfirmasi.",
    states: [
      { id: "default", label: "35 hari sebelum", ref: "AC-M18-1" },
      { id: "20d", label: "20 hari sebelum", ref: "AC-M18-1" },
      { id: "confirm", label: "Dialog konfirmasi" },
      { id: "member", label: "Anggota (tanpa izin)", ref: "§4.3" },
    ],
    render: (s) => <CancelOrganizer state={s} />,
  },
  {
    id: "cancel-venue",
    title: "Pembatalan oleh pengelola",
    section: "6.11",
    fr: ["FR-M18-06", "FR-M38-08", "FR-M18-10"],
    device: "desktop",
    role: "Pengelola (Pemilik)",
    summary: "Peringatan pengembalian penuh, alasan wajib, hasil.",
    states: [
      { id: "default", label: "Formulir" },
      { id: "error", label: "Tanpa alasan" },
      { id: "done", label: "Selesai", ref: "AC-M18-2" },
    ],
    render: (s) => <CancelVenue state={s} />,
  },
]
