import { Camera, CheckCircle2, Copy, Flag, ImagePlus, Lock, MapPin, Printer, Search, Share2, Undo2, Users, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CheckRow, Field, MapCanvas, Notice, PageTitle, Panel, PilotEventLabel, QrCode, SectionTitle, SelectBox, SkeletonList, SpacePhoto, StateBlock, Status } from "@/components/kit"
import { cn } from "@/lib/utils"
import { attendees } from "@/lib/data"
import type { ScreenDef } from "@/registry"
import { Shell } from "./shell"

/* ---------------- Event page editor (§6.8 steps 1–3) ---------------- */

function EventEditor({ state }: { state: string }) {
  const live = state === "live"
  return (
    <Shell pilot active="Acara saya">
      <PageTitle back="Pemesanan BK-0087" title={live ? "Halaman acara sudah tayang" : "Buat halaman acara"} description="Halaman ini tidak terdaftar: hanya orang yang menerima tautannya yang bisa membukanya, dan tidak muncul di mesin pencari." />
      {live && (
        <Notice tone="positive" className="mb-4" title="Bagikan tautan ini ke tamu undangan">
          <div className="mt-1 flex gap-2">
            <Input readOnly aria-label="Tautan halaman acara" value="spot-in.id/e/pekan-kopi-7Hq2" className="bg-surface" />
            <Button><Copy className="size-4" />Salin</Button>
          </div>
        </Notice>
      )}
      {state === "capacity" && (
        <Notice tone="danger" className="mb-4" title="Kapasitas tidak bisa diturunkan di bawah 64">
          Sudah ada 64 pendaftar di sesi Sabtu. Batalkan pendaftaran tertentu (dengan pesan) dulu jika kapasitas harus dikurangi.
        </Notice>
      )}
      <PilotEventLabel className="mb-4" />
      <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
        <Panel className="space-y-1 bg-sunken">
          <p className="flex items-center gap-1.5 text-sm font-semibold"><Lock className="size-3.5" aria-hidden="true" />Diambil dari pemesanan</p>
          <p className="text-sm">Atrium Utama, Mal Cempaka Raya · Jl. Cempaka Raya No. 18, Tebet</p>
          <p className="text-[13px] text-muted-foreground">Tempat dan peta tidak bisa diubah di halaman acara.</p>
        </Panel>
        <Field id="ev-title" label="Judul"><Input defaultValue="Pekan Kopi Nusantara 2026" className="h-11 bg-surface" /></Field>
        <Field id="ev-sum" label="Ringkasan" hint="Maksimal 160 karakter. Tampil di bawah judul dan saat tautan dibagikan."><Input defaultValue="Tiga hari mencicipi kopi dari 20 roastery lokal, kelas seduh manual setiap sore." className="h-11 bg-surface" /></Field>
        <div className="grid gap-1.5">
          <Label className="text-sm font-medium">Gambar sampul</Label>
          <button type="button" className="grid aspect-[16/9] place-items-center rounded-lg border-2 border-dashed border-line-strong bg-surface text-sm text-muted-foreground hover:border-brand">
            <span className="flex flex-col items-center gap-1"><ImagePlus className="size-5" aria-hidden="true" />Unggah gambar sampul (wajib)</span>
          </button>
        </div>
        <Field id="ev-desc" label="Deskripsi"><Textarea rows={4} className="bg-surface" defaultValue="Pekan Kopi Nusantara mempertemukan 20 roastery dari Aceh sampai Flores. Cicipi, ikut kelas seduh, dan bawa pulang biji kopi favorit." /></Field>
        <Field id="ev-age" label="Batas usia"><Input readOnly value="Khusus 18 tahun ke atas (wajib selama pilot)" className="h-11 bg-sunken" /></Field>

        <section>
          <SectionTitle hint="Satu sesi untuk setiap hari yang dipesan. Kapasitas maksimal 600 (kapasitas berdiri).">Sesi dan kapasitas</SectionTitle>
          <ul className="space-y-2">
            {[["Sab, 12 Des 2026", "300", "64"], ["Min, 13 Des 2026", "300", "41"], ["Sen, 14 Des 2026", "200", "12"]].map(([d, c, r]) => (
              <li key={d} className="flex items-end gap-3 rounded-lg border border-line bg-surface p-3">
                <div className="flex-1">
                  <p className="text-sm font-medium">{d}</p>
                  <p className="text-[13px] text-muted-foreground">10.00–22.00 WIB · {r} pendaftar</p>
                </div>
                <Field id={`cap-${d}`} label="Kapasitas" error={state === "capacity" && d.startsWith("Sab") ? "Minimal 64." : undefined}>
                  <Input inputMode="numeric" defaultValue={state === "capacity" && d.startsWith("Sab") ? "50" : c} className="h-10 w-24 bg-surface" />
                </Field>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-3">
          <SectionTitle hint="Maksimal 3 pertanyaan.">Pertanyaan pendaftaran</SectionTitle>
          <Notice tone="neutral" title="Jangan tanyakan data sensitif">Pertanyaan tentang nomor identitas, kesehatan, agama atau sejenisnya tidak diizinkan dan akan ditolak.</Notice>
          <Field id="ev-q1" label="Pertanyaan 1 (pilihan tunggal)"><Input defaultValue="Hari apa Anda berencana datang?" className="h-11 bg-surface" /></Field>
          {state === "sensitive" && (
            <Field id="ev-q2" label="Pertanyaan 2 (teks singkat)" error="Pertanyaan ini meminta nomor identitas. Hapus atau ganti dengan pertanyaan lain.">
              <Input defaultValue="Nomor KTP Anda" className="h-11 bg-surface" />
            </Field>
          )}
        </section>

        <Field id="ev-close" label="Pendaftaran ditutup"><SelectBox options={["Saat sesi dimulai", "1 hari sebelum sesi", "Tutup manual"]} defaultValue="Saat sesi dimulai" className="h-11" /></Field>

        <div className="flex flex-col gap-2 border-t border-line pt-4">
          <Button className="h-11">{live ? "Simpan perubahan" : "Tayangkan halaman"}</Button>
          <Button variant="ghost" className="text-brand">Pratinjau</Button>
        </div>
      </form>

      <AlertDialog open={state === "notify"}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>64 orang akan diberi tahu</AlertDialogTitle>
            <AlertDialogDescription>
              Jam sesi Sabtu berubah dari 10.00–22.00 menjadi 12.00–22.00 WIB. Semua pendaftar sesi ini menerima email berisi perubahan tersebut.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Jangan ubah</AlertDialogCancel>
            <AlertDialogAction>Simpan dan kirim email</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Shell>
  )
}

/* ---------------- Public event page + registration (§6.8 steps 4–5) ---------------- */

function EventPage({ state }: { state: string }) {
  const full = state === "full"
  const cancelled = state === "cancelled"
  const removed = state === "removed"
  if (removed) {
    return (
      <Shell ctx="public">
        <StateBlock title="Halaman tidak tersedia"><p>Halaman acara ini sudah dihapus oleh tim Spot-In. Jika Anda sudah mendaftar, kami sudah mengirim email penjelasan.</p></StateBlock>
      </Shell>
    )
  }
  if (state === "check-email") {
    return (
      <Shell ctx="public">
        <PilotEventLabel />
        <h1 className="mt-4 text-[22px] font-bold tracking-tight">Satu langkah lagi: buka email Anda</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
          Kami mengirim tautan ke <b className="text-ink">maya.anggraini@surel.id</b>. Klik tautan itu untuk mengonfirmasi pendaftaran, lalu kartu masuk QR dikirim ke email yang sama.
        </p>
        <Notice tone="waiting" className="mt-4" title="Tempat Anda ditahan selama 2 jam">Jika tautan belum diklik sampai pukul 21.12 WIB, tempat dilepas untuk orang lain. Cek juga folder Spam.</Notice>
        <Button variant="outline" className="mt-4 w-full">Kirim ulang email</Button>
      </Shell>
    )
  }
  if (state === "registered") {
    return (
      <Shell ctx="public">
        <PilotEventLabel />
        <Notice tone="positive" className="mt-4" title="Anda sudah terdaftar untuk sesi ini">
          Email maya.anggraini@surel.id sudah terdaftar di Sabtu, 12 Des. Kartu masuk Anda tetap sama.
          <div className="mt-2"><Button size="sm">Lihat kartu masuk</Button></div>
        </Notice>
      </Shell>
    )
  }
  return (
    <Shell ctx="public">
      <div className="-mx-4 -mt-5">
        <SpacePhoto art="atrium" label="Gambar sampul Pekan Kopi Nusantara 2026" className="aspect-[16/9] rounded-none" />
      </div>
      <PilotEventLabel className="mt-4" />
      {cancelled && (
        <Notice tone="danger" className="mt-3" title="Acara ini dibatalkan">
          Penyelenggara membatalkan pemesanan tempat. Pendaftaran ditutup dan semua kartu masuk tidak berlaku lagi. Pendaftar sudah diberi tahu lewat email.
        </Notice>
      )}
      <h1 className={cn("mt-3 text-[24px] leading-tight font-bold tracking-tight", cancelled && "text-muted-foreground line-through")}>Pekan Kopi Nusantara 2026</h1>
      <p className="mt-1 text-[15px] text-muted-foreground">Tiga hari mencicipi kopi dari 20 roastery lokal, kelas seduh manual setiap sore.</p>
      <ul className="mt-4 space-y-2 text-sm">
        <li><b>Sab–Sen, 12–14 Des 2026</b> · 10.00–22.00 WIB</li>
        <li className="flex items-start gap-1.5"><MapPin className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />Atrium Utama, Mal Cempaka Raya, Tebet, Jakarta Selatan</li>
        <li className="flex items-start gap-1.5"><Users className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />Oleh PT Lintas Acara Kreatif · khusus 18 tahun ke atas</li>
      </ul>
      <div className="mt-3 flex gap-2">
        <Button variant="outline" size="sm" className="bg-surface"><Share2 className="size-4" />Bagikan</Button>
        <Button variant="ghost" size="sm" className="text-muted-foreground"><Flag className="size-4" />Laporkan</Button>
      </div>

      {!cancelled && (
        <section aria-labelledby="reg-h" className="mt-6 rounded-lg border border-line bg-surface p-4">
          <h2 id="reg-h" className="text-lg font-semibold">Daftar gratis</h2>
          {full ? (
            <Notice tone="neutral" className="mt-3" title="Pendaftaran penuh untuk Sabtu, 12 Des">
              Semua 300 tempat sudah terisi. Minggu dan Senin masih ada tempat.
              <div className="mt-2"><Button size="sm" variant="outline">Daftar untuk Minggu, 13 Des</Button></div>
            </Notice>
          ) : (
            <form className="mt-3 space-y-4" onSubmit={(e) => e.preventDefault()} noValidate>
              <fieldset>
                <legend className="mb-2 text-sm font-medium">Pilih hari</legend>
                <div className="grid gap-2">
                  {[["Sab, 12 Des", 236], ["Min, 13 Des", 259], ["Sen, 14 Des", 188]].map(([d, left], i) => (
                    <Label key={d} htmlFor={`ses-${i}`} className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-line p-3 font-normal has-[:checked]:border-brand has-[:checked]:bg-brand-soft/40">
                      <span className="flex items-center gap-2"><input id={`ses-${i}`} type="radio" name="ses" defaultChecked={i === 0} className="size-4 accent-[#0f5c4d]" />{d}</span>
                      <span className="text-[13px] text-muted-foreground">sisa {left} tempat</span>
                    </Label>
                  ))}
                </div>
              </fieldset>
              <Field id="rg-name" label="Nama lengkap" error={state === "errors" ? "Tulis nama Anda seperti yang ingin tertera di kartu masuk." : undefined}>
                <Input autoComplete="name" defaultValue={state === "errors" ? "" : "Maya Anggraini"} className="h-11 bg-surface" />
              </Field>
              <Field id="rg-email" label="Email" hint="Kartu masuk dikirim ke sini. Tidak perlu kata sandi.">
                <Input type="email" autoComplete="email" defaultValue="maya.anggraini@surel.id" className="h-11 bg-surface" />
              </Field>
              <Field id="rg-q1" label="Hari apa Anda berencana datang?"><SelectBox options={["Sabtu", "Minggu", "Senin", "Belum tahu"]} defaultValue="Sabtu" className="h-11" /></Field>
              <details className="rounded-md border border-line bg-sunken text-[13px]">
                <summary className="cursor-pointer px-3 py-2 font-medium">Pemberitahuan pilot</summary>
                <p className="px-3 pb-3 leading-relaxed">Spot-In adalah proyek mata kuliah tim Group4. Acara ini adalah demo dan bukan acara sungguhan. Kami menyimpan nama dan email Anda di server di Singapura dan menghapusnya pada 31 Jan 2027. Kontak: pilot@spot-in.id</p>
              </details>
              <CheckRow id="rg-age" error={state === "errors" ? "Pendaftaran hanya untuk usia 18 tahun ke atas." : undefined}>Saya berusia 18 tahun atau lebih.</CheckRow>
              <CheckRow id="rg-notice" defaultChecked={state !== "errors"}>Saya sudah membaca pemberitahuan pilot dan memahami ini bukan acara sungguhan.</CheckRow>
              <Button className="h-11 w-full">Daftar dan kirim kartu masuk</Button>
            </form>
          )}
        </section>
      )}

      <section className="mt-6">
        <SectionTitle>Tentang acara</SectionTitle>
        <p className="text-[15px] leading-relaxed">Pekan Kopi Nusantara mempertemukan 20 roastery dari Aceh sampai Flores. Cicipi, ikut kelas seduh, dan bawa pulang biji kopi favorit.</p>
      </section>
      <section className="mt-6">
        <SectionTitle>Aturan tempat</SectionTitle>
        <p className="text-sm">Dilarang api terbuka di atrium. Musik maksimal 85 dB sampai 21.00.</p>
      </section>
      <MapCanvas className="mt-4 h-40" pins={[{ x: 50, y: 55, label: "Mal Cempaka Raya" }]} />
    </Shell>
  )
}

/* ---------------- Pass (§6.8 step 4, §6.9) ---------------- */

function Pass({ state }: { state: string }) {
  const stranger = state === "stranger"
  const organizer = state === "organizer"
  const checked = state === "checked"
  const undo = state === "undo"
  const voided = state === "voided"
  const other = state === "other-session"
  if (stranger) {
    return (
      <Shell ctx="public">
        <div className="mx-auto max-w-xs text-center">
          <PilotEventLabel />
          <h1 className="mt-4 text-[22px] font-bold">Kartu masuk milik Maya</h1>
          <p className="mt-1 text-muted-foreground">Pekan Kopi Nusantara 2026</p>
          <p className="mt-6 rounded-lg border border-line bg-surface p-4 text-sm">Tunjukkan ke panitia di pintu masuk.</p>
        </div>
      </Shell>
    )
  }
  return (
    <Shell ctx={organizer || checked || undo || other ? "organizer" : "attendee"}>
      <article aria-label="Kartu masuk" className="pilot-watermark mx-auto max-w-sm overflow-hidden rounded-xl border border-line-strong bg-white">
        <div className="bg-brand px-5 py-4 text-white">
          <p className="text-sm text-white/85">Kartu masuk · P-0087-0142</p>
          <h1 className="text-lg font-bold">Pekan Kopi Nusantara 2026</h1>
        </div>
        <div className="relative px-5 py-5">
          <PilotEventLabel />
          <div className="mt-4 flex justify-center">
            <QrCode seed={142} size={190} dimmed={voided} />
          </div>
          {voided && <p className="mt-3 text-center font-semibold text-danger">Dibatalkan, kartu tidak berlaku</p>}
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-muted-foreground">Nama</dt><dd className="font-semibold">Maya Anggraini</dd></div>
            <div><dt className="text-muted-foreground">Sesi</dt><dd className="font-semibold">Sab, 12 Des 2026</dd></div>
            <div><dt className="text-muted-foreground">Jam</dt><dd className="font-semibold">10.00–22.00 WIB</dd></div>
            <div><dt className="text-muted-foreground">Tempat</dt><dd className="font-semibold">Atrium Utama, Mal Cempaka Raya</dd></div>
          </dl>
          <a href="#" onClick={(e) => e.preventDefault()} className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand underline-offset-2 hover:underline"><MapPin className="size-3.5" aria-hidden="true" />Buka peta</a>
        </div>
      </article>

      <div className="mx-auto mt-4 max-w-sm">
        {organizer && (
          <Panel className="space-y-2">
            <p className="text-sm text-muted-foreground">Anda masuk sebagai panitia PT Lintas Acara Kreatif.</p>
            <Button className="h-12 w-full text-base"><CheckCircle2 className="size-5" />Check-in Maya</Button>
          </Panel>
        )}
        {checked && (
          <Notice tone="waiting" live title="Sudah check-in pukul 10.42 oleh Rina">
            Kartu ini sudah dipakai untuk masuk hari ini. Jika orang yang berbeda menunjukkan kartu ini, minta mereka menghubungi penyelenggara.
          </Notice>
        )}
        {undo && (
          <Notice tone="positive" live title="Maya berhasil check-in pukul 10.42">
            Salah orang? Anda bisa membatalkan check-in ini sampai pukul 10.47.
            <div className="mt-2"><Button size="sm" variant="outline"><Undo2 className="size-4" />Batalkan check-in</Button></div>
          </Notice>
        )}
        {other && (
          <Notice tone="waiting" title="Kartu ini untuk sesi Minggu, 13 Des">
            Hari ini Sabtu, 12 Des. Pemegang kartu terdaftar untuk sesi besok. Jangan check-in kecuali penyelenggara mengizinkan.
          </Notice>
        )}
        {!organizer && !checked && !undo && !other && !voided && (
          <div className="flex flex-col gap-2">
            <Button variant="outline">Tambahkan ke kalender</Button>
            <Button variant="ghost" className="text-danger">Batalkan pendaftaran</Button>
          </div>
        )}
      </div>
    </Shell>
  )
}

/* ---------------- Check-in list (§6.9) ---------------- */

function CheckIn({ state }: { state: string }) {
  const statusEl = (a: (typeof attendees)[number]) =>
    a.status === "checked" ? <Status tone="positive">Check-in {a.time} oleh {a.by}</Status> : a.status === "cancelled" ? <Status tone="danger">Dibatalkan</Status> : <Status tone="neutral" icon={false}>Belum datang</Status>
  return (
    <Shell pilot active="Acara saya">
      <PageTitle title="Check-in Sab, 12 Des" description="Pekan Kopi Nusantara 2026 · 10.00–22.00 WIB" />
      {state === "offline" && (
        <Notice tone="danger" className="mb-4" title="Anda sedang offline">Daftar ini dari pukul 10.51. Check-in belum bisa disimpan sampai koneksi kembali. Gunakan daftar cetak sebagai cadangan.</Notice>
      )}
      <div className="mb-3">
        <div className="flex items-baseline justify-between text-sm"><span><b className="num text-lg">2</b> dari 64 sudah masuk</span><span className="text-muted-foreground">1 dibatalkan</span></div>
        <Progress value={3} aria-label="2 dari 64 sudah check-in" className="mt-1.5 h-2 bg-sunken [&>div]:bg-brand" />
      </div>
      <div className="flex gap-2">
        <Button className="flex-1"><Camera className="size-4" />Pindai QR</Button>
        <Button variant="outline" className="bg-surface"><Printer className="size-4" />Cetak daftar</Button>
      </div>
      <p className="mt-2 text-[13px] text-muted-foreground">Pindai dengan kamera ponsel. Kode QR membuka kartu masuk, dan tombol check-in muncul karena Anda masuk sebagai panitia.</p>
      <div className="relative mt-4">
        <Search className="absolute top-3 left-3 size-4 text-muted-foreground" aria-hidden="true" />
        <Input aria-label="Cari nama atau email peserta" placeholder="Cari nama atau email" defaultValue={state === "search" ? "andi" : ""} className="h-11 bg-surface pl-9" />
      </div>
      <Tabs defaultValue="all" className="mt-3">
        <TabsList className="w-full bg-sunken">
          <TabsTrigger value="all">Semua</TabsTrigger>
          <TabsTrigger value="in">Sudah masuk</TabsTrigger>
          <TabsTrigger value="out">Belum datang</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-3">
          {state === "loading" ? (
            <SkeletonList rows={4} label="Memuat peserta" />
          ) : (
            <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
              {(state === "search" ? attendees.filter((a) => a.name.startsWith("Andi")) : attendees).map((a) => (
                <li key={a.name} className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className="font-medium">{a.name}</p>
                    <p className="truncate text-[13px] text-muted-foreground">{a.email} · daftar {a.at}</p>
                    <div className="mt-1">{statusEl(a)}</div>
                  </div>
                  {a.status === "issued" && <Button size="sm" variant="outline">Check-in</Button>}
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </Shell>
  )
}

/* ---------------- Organizer attendee list (desktop) ---------------- */

function Attendees({ state }: { state: string }) {
  const member = state === "member"
  return (
    <Shell device="desktop" pilot active="Acara saya" initials={member ? "YP" : "RW"}>
      <PageTitle
        back="Pekan Kopi Nusantara 2026"
        title="Pendaftar"
        description="117 pendaftar di 3 sesi · halaman tayang sejak 20 Nov 2026"
        actions={
          <>
            <Button variant="outline" className="bg-surface">Tutup pendaftaran</Button>
            {member ? (
              <Button variant="outline" disabled aria-describedby="exp-why">Unduh CSV</Button>
            ) : (
              <Button variant="outline" className="bg-surface">Unduh CSV</Button>
            )}
          </>
        }
      />
      {member && <p id="exp-why" className="-mt-3 mb-4 text-right text-[13px] text-muted-foreground">Hanya Pemilik yang bisa mengunduh daftar pendaftar.</p>}
      <div className="rounded-lg border border-line bg-surface">
        <Table>
          <TableHeader><TableRow><TableHead>Nama</TableHead><TableHead>Email</TableHead><TableHead>Sesi</TableHead><TableHead>Daftar</TableHead><TableHead>Status</TableHead><TableHead><span className="sr-only">Tindakan</span></TableHead></TableRow></TableHeader>
          <TableBody>
            {attendees.map((a) => (
              <TableRow key={a.name}>
                <TableCell className="font-medium">{a.name}</TableCell>
                <TableCell className="text-muted-foreground">{a.email}</TableCell>
                <TableCell>Sab, 12 Des</TableCell>
                <TableCell className="num">{a.at}</TableCell>
                <TableCell>{a.status === "checked" ? <Status tone="positive">Sudah masuk</Status> : a.status === "cancelled" ? <Status tone="danger">Dibatalkan</Status> : <Status tone="neutral" icon={false}>Terdaftar</Status>}</TableCell>
                <TableCell className="text-right">{a.status === "issued" && <Button variant="ghost" size="sm" className="text-danger">Batalkan pendaftaran</Button>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Shell>
  )
}

/* ---------------- My passes ---------------- */

function MyPasses({ state }: { state: string }) {
  return (
    <Shell ctx="attendee">
      <h1 className="text-[22px] font-bold tracking-tight">Kartu masuk saya</h1>
      {state === "empty" ? (
        <div className="mt-4"><StateBlock title="Belum ada kartu masuk">Kartu muncul di sini setelah Anda mendaftar lewat tautan halaman acara dan mengonfirmasi email.</StateBlock></div>
      ) : (
        <ul className="mt-4 space-y-3">
          <li className="flex items-center gap-3 rounded-lg border border-line bg-surface p-3">
            <QrCode seed={142} size={56} />
            <div className="min-w-0 flex-1"><p className="font-semibold">Pekan Kopi Nusantara 2026</p><p className="text-[13px] text-muted-foreground">Sab, 12 Des 2026 · 10.00 WIB</p></div>
            <Status tone="positive">Aktif</Status>
          </li>
          <li className="flex items-center gap-3 rounded-lg border border-line bg-surface p-3 opacity-80">
            <span className="grid size-14 place-items-center rounded-md bg-sunken"><XCircle className="size-5 text-muted-foreground" aria-hidden="true" /></span>
            <div className="min-w-0 flex-1"><p className="font-semibold">Pekan Teh Nusantara 2027</p><p className="text-[13px] text-muted-foreground">Sab, 9 Jan 2027 · acara dibatalkan</p></div>
            <Status tone="danger">Tidak berlaku</Status>
          </li>
        </ul>
      )}
    </Shell>
  )
}

export const eventScreens: ScreenDef[] = [
  {
    id: "event-editor",
    title: "Buat halaman acara",
    section: "6.8",
    fr: ["FR-M28-01", "FR-M28-02", "FR-M28-03", "FR-M28-04", "FR-M28-05", "FR-M28-09", "FR-M30-02", "FR-M30-08"],
    device: "mobile",
    role: "Penyelenggara",
    summary: "Tidak terdaftar, label pilot demo, sesi per hari, kapasitas, pertanyaan tanpa data sensitif.",
    states: [
      { id: "default", label: "Draf" },
      { id: "live", label: "Tayang + tautan" },
      { id: "notify", label: "Ubah jam (beri tahu pendaftar)", ref: "AC-M28-3" },
      { id: "capacity", label: "Kapasitas di bawah pendaftar", ref: "§12.5" },
      { id: "sensitive", label: "Pertanyaan sensitif ditolak", ref: "AC-M28-4" },
    ],
    render: (s) => <EventEditor state={s} />,
  },
  {
    id: "event-page",
    title: "Halaman acara dan pendaftaran",
    section: "6.8",
    fr: ["FR-M28-13", "FR-M28-17", "FR-M30-01", "FR-M30-04", "FR-M30-09", "FR-M1-10", "FR-M36-04", "FR-M18-10"],
    device: "mobile",
    role: "Tamu (Maya)",
    summary: "Halaman publik tidak terdaftar, daftar gratis dengan 18+ dan pemberitahuan pilot.",
    states: [
      { id: "default", label: "Formulir" },
      { id: "errors", label: "Galat isian" },
      { id: "check-email", label: "Cek email" },
      { id: "registered", label: "Sudah terdaftar", ref: "§12.5" },
      { id: "full", label: "Pendaftaran penuh", ref: "§12.5" },
      { id: "cancelled", label: "Acara dibatalkan", ref: "FR-M18-10" },
      { id: "removed", label: "Dihapus Admin", ref: "AC-M36-8" },
    ],
    render: (s) => <EventPage state={s} />,
  },
  {
    id: "pass",
    title: "Kartu masuk QR",
    section: "6.9",
    fr: ["FR-M31-01", "FR-M31-02", "FR-M31-03", "FR-M31-07", "FR-M32-01", "FR-M32-03", "FR-M32-08"],
    device: "mobile",
    role: "Tamu / panitia",
    summary: "Kartu pemegang, tampilan orang lain, tombol check-in panitia, sudah dipakai, batalkan check-in.",
    states: [
      { id: "default", label: "Pemegang kartu" },
      { id: "stranger", label: "Dibuka orang lain", ref: "§12.5" },
      { id: "organizer", label: "Panitia: check-in" },
      { id: "undo", label: "Batalkan dalam 5 menit", ref: "AC-M32-7" },
      { id: "checked", label: "Sudah check-in", ref: "§12.5" },
      { id: "other-session", label: "Sesi lain", ref: "FR-M32-03" },
      { id: "voided", label: "Tidak berlaku" },
    ],
    render: (s) => <Pass state={s} />,
  },
  {
    id: "checkin",
    title: "Check-in dari daftar",
    section: "6.9",
    fr: ["FR-M32-01", "FR-M32-12", "FR-M30-11"],
    device: "mobile",
    role: "Penyelenggara (panitia)",
    summary: "Cari peserta, check-in dari daftar, pindai QR, cetak daftar cadangan.",
    states: [
      { id: "default", label: "Daftar" },
      { id: "search", label: "Cari" },
      { id: "loading", label: "Memuat" },
      { id: "offline", label: "Offline", ref: "§12.7" },
    ],
    render: (s) => <CheckIn state={s} />,
  },
  {
    id: "attendees",
    title: "Daftar pendaftar (penyelenggara)",
    section: "6.8",
    fr: ["FR-M30-11", "FR-M30-08", "FR-M2-10"],
    device: "desktop",
    role: "Penyelenggara",
    summary: "Daftar pendaftar, batalkan dengan pesan, tutup pendaftaran, unduh CSV khusus Pemilik.",
    states: [
      { id: "default", label: "Sebagai Pemilik" },
      { id: "member", label: "Sebagai Anggota", ref: "AC-M28-5" },
    ],
    render: (s) => <Attendees state={s} />,
  },
  {
    id: "my-passes",
    title: "Kartu masuk saya",
    section: "6.8",
    fr: ["FR-M31-01", "FR-M30-07"],
    device: "mobile",
    role: "Tamu",
    summary: "Semua kartu milik tamu, termasuk yang tidak berlaku.",
    states: [
      { id: "default", label: "Daftar" },
      { id: "empty", label: "Kosong" },
    ],
    render: (s) => <MyPasses state={s} />,
  },
]
