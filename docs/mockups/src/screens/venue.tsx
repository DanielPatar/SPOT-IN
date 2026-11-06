import type { ReactNode } from "react"
import { CalendarClock, EyeOff, FileText, Lock, Paperclip, Plus, Send, Trash2, Inbox } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Facts, Field, MoneyRow, Notice, PageTitle, Panel, SectionTitle, SelectBox, SkeletonList, StateBlock, Status, Divider } from "@/components/kit"
import { cn } from "@/lib/utils"
import { q2, rp } from "@/lib/data"
import type { ScreenDef } from "@/registry"
import { Shell } from "./shell"

/* ---------------- Inbox ---------------- */

const inbox = [
  { who: "PT Lintas Acara Kreatif", ev: "Pekan Kopi Nusantara 2026", space: "Atrium Utama", dates: "12–14 Des", status: ["waiting", "Belum dibalas"] as const, due: "Sisa 4 jam", overdue: true, unread: true },
  { who: "Komunitas Pasar Kriya", ev: "Bazar Kriya Akhir Tahun", space: "Atrium Utama", dates: "13 Des", status: ["waiting", "Info diminta"] as const, due: "Menunggu penyelenggara", overdue: false, unread: false },
  { who: "Studio Gerak Bersama", ev: "Kelas Yoga Pagi", space: "Promo Spot Lobi Selatan", dates: "20 Des", status: ["positive", "Penawaran terkirim"] as const, due: "Berlaku sampai 13 Nov", overdue: false, unread: false },
  { who: "PT Sinar Elektronik", ev: "Peluncuran Ponsel S9", space: "Atrium Utama", dates: "9–10 Jan 2027", status: ["neutral", "Baru"] as const, due: "Batas Rab, 11 Nov", overdue: false, unread: true },
]

function VenueInbox({ state }: { state: string }) {
  return (
    <Shell device="desktop" ctx="venue" active="Kotak masuk">
      <PageTitle title="Kotak masuk permintaan" description="Balas setiap permintaan dalam 2 hari kerja. Membalas pesan, meminta info, mengirim penawaran atau menolak semuanya dihitung sebagai balasan." />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {["Semua (4)", "Belum dibalas (2)", "Menunggu saya (1)"].map((f, i) => (
          <Button key={f} size="sm" variant={i === 0 ? "secondary" : "outline"} aria-pressed={i === 0} className={cn(i !== 0 && "bg-surface")}>{f}</Button>
        ))}
        <div className="ml-auto w-56"><SelectBox options={["Semua ruang", "Atrium Utama", "Promo Spot Lobi Selatan"]} defaultValue="Semua ruang" /></div>
      </div>
      {state === "loading" ? (
        <SkeletonList rows={4} label="Memuat permintaan" />
      ) : state === "empty" ? (
        <StateBlock icon={Inbox} title="Belum ada permintaan masuk" action={<Button variant="outline">Lihat halaman ruang saya</Button>}>
          <p>Permintaan dari penyelenggara akan muncul di sini dan dikirim ke email Anda. Ruang yang lengkap fotonya dan jelas harganya lebih sering dihubungi.</p>
        </StateBlock>
      ) : state === "denied" ? (
        <StateBlock icon={Lock} title="Anda tidak punya akses ke permintaan ini" action={<Button variant="outline">Kembali ke kotak masuk</Button>}>
          <p>Hubungi Pemilik Mal Cempaka Raya, Lestari Hadiwijaya, jika Anda membutuhkan akses.</p>
        </StateBlock>
      ) : (
        <div className="rounded-lg border border-line bg-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Penyelenggara dan acara</TableHead>
                <TableHead>Ruang</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Batas balasan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inbox.map((r) => (
                <TableRow key={r.ev} className="cursor-pointer">
                  <TableCell>
                    <a href="#" onClick={(e) => e.preventDefault()} className={cn("block", r.unread && "font-semibold")}>
                      {r.unread && <span className="mr-1.5 inline-block size-2 rounded-full bg-brand align-middle" aria-label="Belum dibaca" />}
                      {r.who}
                    </a>
                    <span className="text-sm text-muted-foreground">{r.ev}</span>
                  </TableCell>
                  <TableCell>{r.space}</TableCell>
                  <TableCell className="num">{r.dates}</TableCell>
                  <TableCell><Status tone={r.status[0]}>{r.status[1]}</Status></TableCell>
                  <TableCell>{r.overdue ? <Status tone="danger">{r.due}</Status> : <span className="text-sm text-muted-foreground">{r.due}</span>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Shell>
  )
}

/* ---------------- Enquiry detail ---------------- */

function EnquiryDetail({ state }: { state: string }) {
  const viewer = state === "viewer"
  return (
    <Shell device="desktop" ctx="venue" active="Kotak masuk" pilot>
      <PageTitle
        back="Kotak masuk"
        title="Pekan Kopi Nusantara 2026"
        description="PT Lintas Acara Kreatif · Atrium Utama · Sab–Sen, 12–14 Des 2026, 10.00–22.00 WIB"
        actions={
          viewer ? undefined : (
            <>
              <Button variant="outline" className="bg-surface">Minta info</Button>
              <Button variant="outline" className="bg-surface">Tahan tanggal</Button>
              <Button variant="outline" className="bg-surface text-danger">Tolak</Button>
              <Button>Buat penawaran</Button>
            </>
          )
        }
      />
      {viewer && (
        <Notice tone="neutral" className="mb-4" title="Anda melihat sebagai Pengamat">Anda bisa membaca permintaan dan pesan, tetapi tidak bisa membalas atau membuat penawaran.</Notice>
      )}
      {state === "hold-placed" && (
        <Notice tone="positive" className="mb-4" title="Tanggal 12–14 Des ditahan sampai Rab, 11 Nov 2026 23.59 WIB">
          Penyelenggara sudah diberi tahu. Anda bisa melepas tahanan ini kapan saja dari kalender.
        </Notice>
      )}
      {state === "declined" && (
        <Notice tone="neutral" className="mb-4" title="Permintaan ditolak">Alasan yang Anda pilih dikirim ke penyelenggara: "Tanggal tidak tersedia".</Notice>
      )}
      <div className="grid gap-6 @5xl:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <Notice tone="waiting" title="Balas sebelum Selasa, 10 Nov 2026 pukul 23.59 WIB">
            Sisa 4 jam. Jika tidak dibalas, permintaan kedaluwarsa dan tingkat respons tempat Anda turun.
          </Notice>
          <Panel>
            <SectionTitle>Detail acara</SectionTitle>
            <Facts
              cols={2}
              items={[
                { k: "Jenis", v: "Pameran dan bazar" },
                { k: "Merek/klien", v: "Rasa Kopi Indonesia" },
                { k: "Perkiraan pengunjung", v: "300 orang" },
                { k: "Anggaran", v: "Rp 60–100 jt" },
              ]}
            />
            <p className="mt-3 text-sm leading-relaxed">Pameran 20 roastery lokal dengan sampling kopi, kelas seduh manual setiap sore, dan penjualan biji kopi.</p>
            <a href="#" onClick={(e) => e.preventDefault()} className="mt-3 inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm font-medium hover:border-brand">
              <FileText className="size-4 text-brand" aria-hidden="true" />Proposal Pekan Kopi 2026.pdf · 4,2 MB
            </a>
          </Panel>
          <Panel>
            <SectionTitle>Jawaban atas pertanyaan Anda</SectionTitle>
            <dl className="space-y-2 text-sm">
              <div><dt className="text-muted-foreground">Apakah ada instalasi lebih tinggi dari 4 meter?</dt><dd className="font-medium">Tidak, maksimal 3 meter</dd></div>
              <div><dt className="text-muted-foreground">Merek apa saja yang akan tampil?</dt><dd className="font-medium">20 roastery lokal, daftar di proposal halaman 4</dd></div>
            </dl>
          </Panel>
        </div>
        <aside className="space-y-4">
          <Panel>
            <SectionTitle>Kalender 12–14 Des</SectionTitle>
            <p className="text-sm"><Status tone="positive">Kosong</Status></p>
            <p className="mt-2 text-sm text-muted-foreground">Tidak ada tahanan atau pemesanan lain di tanggal ini.</p>
          </Panel>
          <Panel>
            <SectionTitle hint="Hanya terlihat oleh tim Mal Cempaka Raya.">
              <span className="inline-flex items-center gap-1.5"><EyeOff className="size-4 text-muted-foreground" aria-hidden="true" />Catatan internal</span>
            </SectionTitle>
            <ul className="space-y-2 text-sm">
              <li className="rounded-md bg-sunken p-2.5"><b>Lestari</b> <span className="text-muted-foreground">· kemarin 16.10</span><br />EO ini pernah sewa lobi 2025, pembayaran lancar.</li>
            </ul>
            {!viewer && (
              <div className="mt-2 space-y-2">
                <Textarea aria-label="Tambah catatan internal" placeholder="Tulis catatan untuk tim" className="bg-surface" rows={2} />
                <Button size="sm" variant="outline">Simpan catatan</Button>
              </div>
            )}
          </Panel>
        </aside>
      </div>

      {/* Request info — sheet keeps the enquiry visible behind it */}
      <Sheet open={state === "request-info"}>
        <SheetContent className="@xl:max-w-md">
          <SheetHeader>
            <SheetTitle>Minta info tambahan</SheetTitle>
            <SheetDescription>Pesan ini masuk ke percakapan dan dihitung sebagai balasan. Status permintaan berubah menjadi Info diminta.</SheetDescription>
          </SheetHeader>
          <div className="space-y-3 px-4">
            <Field id="ri-msg" label="Pertanyaan untuk penyelenggara">
              <Textarea rows={5} className="bg-surface" defaultValue="Halo Bu Rina, berapa mesin espresso yang akan menyala bersamaan? Kami perlu memastikan 40 kVA cukup. Mohon juga kirim denah booth awal." />
            </Field>
            <Field id="ri-saved" label="Sisipkan balasan tersimpan" optional>
              <SelectBox options={["Pertanyaan kebutuhan listrik", "Permintaan denah awal", "Informasi bongkar muat"]} placeholder="Pilih balasan" />
            </Field>
          </div>
          <SheetFooter className="border-t border-line">
            <Button>Kirim pertanyaan</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Tentative hold */}
      <Dialog open={state === "hold"}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tahan tanggal 12–14 Des untuk Lintas Acara?</DialogTitle>
            <DialogDescription>Selama ditahan, penyelenggara lain melihat tanggal ini sebagai terbatas. Penawaran ke mereka akan terkirim sebagai penawaran cadangan.</DialogDescription>
          </DialogHeader>
          <Field id="hold-days" label="Lama tahanan" hint="Bawaan 5 hari, paling lama 14 hari. Penyelenggara diingatkan 24 jam sebelum berakhir.">
            <SelectBox options={["5 hari (sampai Rab, 11 Nov)", "7 hari (sampai Jum, 13 Nov)", "14 hari (sampai Jum, 20 Nov)"]} defaultValue="5 hari (sampai Rab, 11 Nov)" />
          </Field>
          <DialogFooter>
            <Button variant="outline">Batal</Button>
            <Button>Tahan tanggal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Decline with reason */}
      <Dialog open={state === "decline"}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tolak permintaan Pekan Kopi?</DialogTitle>
            <DialogDescription>Alasan yang Anda pilih dikirim ke penyelenggara agar mereka bisa mencari tempat lain lebih cepat.</DialogDescription>
          </DialogHeader>
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Alasan</legend>
            <RadioGroup defaultValue="dates" className="gap-2">
              {[["dates", "Tanggal tidak tersedia"], ["cap", "Kapasitas tidak sesuai"], ["fit", "Acara tidak cocok dengan tempat"], ["other", "Lainnya"]].map(([v, l]) => (
                <Label key={v} htmlFor={`dc-${v}`} className="flex items-center gap-2 font-normal"><RadioGroupItem id={`dc-${v}`} value={v} className="border-[#8f8778] text-brand" />{l}</Label>
              ))}
            </RadioGroup>
          </fieldset>
          <Field id="dc-msg" label="Pesan untuk penyelenggara" optional>
            <Textarea rows={3} className="bg-surface" defaultValue="Tanggal 12–14 Des sudah dipakai acara internal mal. Kami terbuka untuk 19–21 Des." />
          </Field>
          <DialogFooter>
            <Button variant="outline">Batal</Button>
            <Button variant="destructive">Tolak permintaan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  )
}

/* ---------------- Message thread ---------------- */

function Bubble({ me, who, time, children }: { me?: boolean; who: string; time: string; children: ReactNode }) {
  return (
    <li className={cn("flex flex-col", me ? "items-end" : "items-start")}>
      <div className={cn("max-w-[85%] rounded-lg px-3 py-2 text-[14px] leading-relaxed", me ? "bg-brand text-white" : "border border-line bg-surface text-ink")}>{children}</div>
      <span className="mt-1 text-[11px] text-muted-foreground">{who} · {time}</span>
    </li>
  )
}

function Masked() {
  return <span className="rounded bg-white/20 px-1 font-semibold">[kontak disembunyikan]</span>
}

function Thread({ state }: { state: string }) {
  const confirmed = state === "confirmed"
  return (
    <Shell ctx="organizer" active="Pesan" pilot bare>
      <div className="border-b border-line bg-surface px-4 py-3">
        <p className="font-semibold">Mal Cempaka Raya · Atrium Utama</p>
        <p className="text-[13px] text-muted-foreground">Pekan Kopi Nusantara 2026 · {confirmed ? "Terkonfirmasi" : "Penawaran versi 2"}</p>
      </div>
      <div className="px-4 py-4">
        {!confirmed && (
          <Notice tone="neutral" className="mb-4" title="Kontak disembunyikan sampai pemesanan terkonfirmasi">
            Nomor telepon, email dan tautan WhatsApp di pesan otomatis disembunyikan. Nomor kontak kedua pihak muncul di halaman pemesanan setelah terkonfirmasi.
          </Notice>
        )}
        {state === "loading" ? (
          <SkeletonList rows={3} label="Memuat pesan" />
        ) : (
          <ol className="space-y-4" aria-label="Pesan">
            <Bubble who="Budi (Mal Cempaka Raya)" time="Sen 9 Nov, 14.02">
              Halo Bu Rina, berapa mesin espresso yang akan menyala bersamaan? Kami perlu memastikan 40 kVA cukup.
            </Bubble>
            <Bubble me who="Anda" time="Sen 9 Nov, 14.30">
              Maksimal 12 mesin. Total listrik sekitar 36 kVA, jadi 40 kVA cukup. Luas booth total sekitar 300 m², budget sewa sampai Rp 25.000.000 per hari.
            </Bubble>
            {state === "masked" ? (
              <li className="flex flex-col items-end">
                <div className="max-w-[85%] rounded-lg bg-brand px-3 py-2 text-[14px] leading-relaxed text-white">
                  Biar cepat, hubungi saya di <Masked /> atau <Masked /> ya Pak.
                </div>
                <p role="status" className="mt-1.5 max-w-[85%] rounded-md border border-line bg-surface px-2.5 py-1.5 text-[12px] text-ink">
                  Kami menyembunyikan nomor telepon dan email di pesan Anda. Setelah pemesanan terkonfirmasi, kontak kedua pihak tampil otomatis di halaman pemesanan.
                </p>
              </li>
            ) : confirmed ? (
              <Bubble me who="Anda" time="Kam 12 Nov, 09.15">Pak Budi, untuk koordinasi loading saya di 0812-3456-7890 ya.</Bubble>
            ) : null}
            <Bubble who="Budi (Mal Cempaka Raya)" time="Sen 9 Nov, 15.10">
              <span className="inline-flex items-center gap-2"><FileText className="size-4" aria-hidden="true" />Penawaran versi 1 sudah dikirim.</span>
            </Bubble>
          </ol>
        )}
        {state === "error" && (
          <Notice tone="danger" className="mt-4" title="Pesan terakhir belum terkirim">
            Koneksi terputus saat mengirim. Pesan Anda masih ada di kotak tulis.
            <div className="mt-2"><Button size="sm" variant="outline">Kirim ulang</Button></div>
          </Notice>
        )}
      </div>
      <div className="sticky bottom-0 border-t border-line bg-surface p-3">
        <div className="flex items-end gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Lampirkan file"><Paperclip className="size-5" /></Button>
            </TooltipTrigger>
            <TooltipContent>PDF, JPG, PNG, DOCX, XLSX, maks. 10 MB. Jangan bagikan detail kontak di dalam file.</TooltipContent>
          </Tooltip>
          <Textarea aria-label="Tulis pesan" rows={1} placeholder="Tulis pesan" className="min-h-10 bg-surface" defaultValue={state === "error" ? "Apakah bisa loading mulai 11 Des malam?" : ""} />
          <Button size="icon" aria-label="Kirim pesan"><Send className="size-4" /></Button>
        </div>
      </div>
    </Shell>
  )
}

/* ---------------- Quote builder ---------------- */

function QuoteBuilder({ state }: { state: string }) {
  const pending = state === "pending"
  const owner = state === "owner"
  const blocked = state === "blocked"
  const unverified = state === "unverified"
  const backup = state === "backup"
  return (
    <Shell device="desktop" ctx="venue" active="Kotak masuk" pilot initials={owner ? "LH" : "BS"}>
      <PageTitle
        back="Pekan Kopi Nusantara 2026"
        title={owner ? "Setujui penawaran dari Budi" : "Penawaran untuk Pekan Kopi Nusantara 2026"}
        description="Atrium Utama · Sab–Sen, 12–14 Des 2026 · diisi otomatis dari tarif ruang"
      />
      {pending && (
        <Notice tone="waiting" className="mb-4" title="Menunggu persetujuan Lestari (Pemilik)">
          Total {rp(q2.total)} di atas batas {rp(50_000_000)}, jadi penawaran belum terlihat oleh penyelenggara. Kami mengingatkan Lestari jika belum disetujui dalam 1 hari kerja. Masa berlaku 7 hari baru dihitung setelah terkirim.
        </Notice>
      )}
      {owner && (
        <Notice tone="waiting" className="mb-4" title="Penawaran ini perlu persetujuan Anda">
          Budi menyusunnya Selasa, 10 Nov pukul 11.05 WIB. Jika Anda mengubah isinya, tersimpan sebagai draf baru dan Budi diberi tahu.
        </Notice>
      )}
      {blocked && (
        <Notice tone="danger" className="mb-4" title="Tanggal 13 Des sudah dipesan">
          Penawaran tidak bisa dikirim untuk tanggal yang sudah dipesan atau diblokir. Pemesanan yang bentrok: BK-0094. Ubah tanggal atau tolak permintaan ini.
        </Notice>
      )}
      {unverified && (
        <Notice tone="waiting" className="mb-4" title="Tempat Anda belum terverifikasi">
          Penawaran baru bisa dikirim setelah tim Spot-In memverifikasi Mal Cempaka Raya. Anda tetap bisa menyusun dan menyimpan draf.
        </Notice>
      )}
      {backup && (
        <Notice tone="waiting" className="mb-4" title="Akan terkirim sebagai penawaran cadangan">
          Tanggal 13 Des sedang ditahan penyelenggara lain sampai Kam, 12 Nov. Komunitas Pasar Kriya baru bisa menerima penawaran ini jika tahanan itu dilepas.
        </Notice>
      )}
      <div className="grid gap-6 @5xl:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <Panel>
            <SectionTitle>Rincian biaya</SectionTitle>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-muted-foreground">
                    <th className="py-2 font-medium">Item</th>
                    <th className="py-2 font-medium">Jumlah</th>
                    <th className="py-2 font-medium">Harga satuan</th>
                    <th className="py-2 font-medium">Diskon</th>
                    <th className="py-2 text-right font-medium">Subtotal</th>
                    <th className="py-2"><span className="sr-only">Hapus</span></th>
                  </tr>
                </thead>
                <tbody className="num">
                  {[
                    ["Sewa Atrium Utama", "3 hari", "Rp 25.000.000", "–", rp(q2.rental)],
                    ["Listrik 40 kVA", "120 kVA·hari", "Rp 50.000", "–", rp(q2.electricity)],
                  ].map(([a, b, c, d, e]) => (
                    <tr key={a} className="border-b border-line">
                      <td className="py-2 pr-2"><Input aria-label="Nama item" defaultValue={a} className="h-9 bg-surface" disabled={pending} /></td>
                      <td className="py-2 pr-2"><Input aria-label={`Jumlah ${a}`} defaultValue={b} className="h-9 w-28 bg-surface" disabled={pending} /></td>
                      <td className="py-2 pr-2"><Input aria-label={`Harga satuan ${a}`} defaultValue={c} className="h-9 w-36 bg-surface" disabled={pending} /></td>
                      <td className="py-2 pr-2"><Input aria-label={`Diskon ${a}`} defaultValue={d} className="h-9 w-20 bg-surface" disabled={pending} /></td>
                      <td className="py-2 text-right font-medium">{e}</td>
                      <td className="py-2 pl-1"><Button variant="ghost" size="icon-sm" aria-label={`Hapus ${a}`} disabled={pending}><Trash2 className="size-4" /></Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-2 flex gap-2">
              <Button variant="outline" size="sm" disabled={pending}><Plus className="size-4" />Tambah dari layanan tambahan</Button>
              <Button variant="ghost" size="sm" className="text-brand" disabled={pending}>Pakai templat tersimpan</Button>
            </div>
          </Panel>

          <Panel className="space-y-4">
            <SectionTitle>Jadwal pembayaran</SectionTitle>
            <div className="grid gap-3 @xl:grid-cols-3">
              <Field id="qb-dep" label="Uang muka" hint="Minimal 20%."><Input defaultValue="50%" className="bg-surface" disabled={pending} /></Field>
              <Field id="qb-depdue" label="Jatuh tempo uang muka"><SelectBox options={["1 hari setelah diterima", "3 hari setelah diterima", "7 hari setelah diterima"]} defaultValue="3 hari setelah diterima" /></Field>
              <Field id="qb-bal" label="Pelunasan" hint="Minimal 3 hari sebelum acara." error={state === "bal-error" ? "Pelunasan paling lambat 3 hari sebelum acara. Ubah ke 3 hari atau lebih." : undefined}>
                <Input defaultValue={state === "bal-error" ? "1 hari sebelum acara" : "14 hari sebelum acara"} className="bg-surface" disabled={pending} />
              </Field>
            </div>
          </Panel>

          <Panel className="space-y-4">
            <SectionTitle>Ketentuan</SectionTitle>
            <div className="grid gap-3 @xl:grid-cols-2">
              <Field id="qb-valid" label="Berlaku"><SelectBox options={["3 hari", "7 hari", "14 hari"]} defaultValue="7 hari" /></Field>
              <Field id="qb-pol" label="Kebijakan pembatalan"><SelectBox options={["Fleksibel", "Sedang", "Ketat"]} defaultValue="Sedang" /></Field>
            </div>
            <Field id="qb-inc" label="Termasuk dan tidak termasuk"><Textarea rows={2} className="bg-surface" defaultValue="Termasuk keamanan area dan kebersihan harian. Tidak termasuk dekorasi, sound system dan genset tambahan." disabled={pending} /></Field>
            <Field id="qb-terms" label="Ketentuan khusus" optional><Textarea rows={2} className="bg-surface" defaultValue="Bongkar muat 11 Des pukul 22.00–06.00 tanpa biaya tambahan." disabled={pending} /></Field>
          </Panel>
        </div>

        <aside className="@5xl:sticky @5xl:top-4 @5xl:self-start">
          <Panel>
            <SectionTitle>Ringkasan</SectionTitle>
            <div className="divide-y divide-line">
              <MoneyRow label="Sewa + layanan tambahan" value={rp(q2.subtotal)} />
              <MoneyRow label="Biaya layanan tempat" value="Rp 0" muted />
              <MoneyRow label="PPN" sub="12% × DPP 11/12" value={rp(q2.ppn)} />
              <MoneyRow label="Total untuk tempat" value={rp(q2.venueTotal)} />
              <MoneyRow label="Biaya layanan Spot-In" sub="3%, dibayar penyelenggara" value={rp(q2.fee)} />
              <MoneyRow label="Total penyelenggara" value={rp(q2.total)} strong />
            </div>
            <Divider className="my-3" />
            <div className="divide-y divide-line">
              <MoneyRow label="Uang muka" sub="jatuh tempo 3 hari setelah diterima" value={rp(q2.deposit)} />
              <MoneyRow label="Pelunasan" sub="jatuh tempo Sab, 28 Nov 2026" value={rp(q2.balance)} />
            </div>
            {!pending && !owner && (
              <p className="mt-3 flex items-start gap-2 rounded-md bg-warm-soft px-3 py-2 text-[13px] text-warm-ink">
                <CalendarClock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                Total di atas {rp(50_000_000)}. Setelah Anda kirim, penawaran menunggu persetujuan Lestari dulu.
              </p>
            )}
            <div className="mt-4 flex flex-col gap-2">
              {owner ? (
                <>
                  <Button>Setujui dan kirim ke penyelenggara</Button>
                  <Button variant="outline">Kembalikan ke Budi dengan catatan</Button>
                </>
              ) : pending ? (
                <Button variant="outline">Tarik kembali ke draf</Button>
              ) : (
                <>
                  <Button disabled={blocked || unverified}>{backup ? "Kirim sebagai penawaran cadangan" : "Ajukan untuk disetujui"}</Button>
                  <Button variant="outline">Simpan draf</Button>
                  <Button variant="ghost" className="text-brand">Pratinjau PDF</Button>
                </>
              )}
            </div>
          </Panel>
        </aside>
      </div>
    </Shell>
  )
}

/* ---------------- Venue pipeline dashboard ---------------- */

function Pipeline() {
  const cols = [
    ["Baru", [["Peluncuran Ponsel S9", "PT Sinar Elektronik", "Batas Rab 11 Nov"]]],
    ["Dalam diskusi", [["Bazar Kriya Akhir Tahun", "Komunitas Pasar Kriya", "Info diminta"]]],
    ["Penawaran terkirim", [["Kelas Yoga Pagi", "Studio Gerak Bersama", "Berlaku s.d. 13 Nov"]]],
    ["Menunggu persetujuan", [["Pekan Kopi Nusantara 2026", "PT Lintas Acara Kreatif", rp(92_340_000)]]],
    ["Diterima", []],
    ["Terkonfirmasi", [["Festival Batik Muda", "Rumah Kain Nusantara", "21–22 Nov"]]],
  ] as const
  return (
    <Shell device="desktop" ctx="venue" active="Pemesanan">
      <PageTitle title="Alur permintaan dan pemesanan" description="Semua permintaan Mal Cempaka Raya, dari baru masuk sampai terkonfirmasi." />
      <div className="grid gap-3 @5xl:grid-cols-6">
        {cols.map(([t, items]) => (
          <section key={t} aria-label={t} className="rounded-lg bg-sunken p-2">
            <h2 className="px-1 pb-2 text-sm font-semibold">{t} <span className="font-normal text-muted-foreground">({items.length})</span></h2>
            <ul className="space-y-2">
              {items.map(([a, b, c]) => (
                <li key={a} className="rounded-md border border-line bg-surface p-2.5 text-sm">
                  <p className="font-medium leading-snug">{a}</p>
                  <p className="text-xs text-muted-foreground">{b}</p>
                  <p className="num mt-1 text-xs">{c}</p>
                </li>
              ))}
              {items.length === 0 && <li className="px-1 text-xs text-muted-foreground">Kosong</li>}
            </ul>
          </section>
        ))}
      </div>
      <div className="mt-6 grid gap-4 @5xl:grid-cols-3">
        <Panel>
          <SectionTitle>Minggu ini</SectionTitle>
          <ul className="space-y-1.5 text-sm">
            <li>Sab 21 Nov · Festival Batik Muda dimulai</li>
            <li>2 dokumen menunggu ditinjau</li>
            <li>1 pelunasan jatuh tempo Jum 13 Nov</li>
          </ul>
        </Panel>
        <Panel className="@5xl:col-span-2">
          <SectionTitle hint="1–6 Nov 2026">Ringkasan</SectionTitle>
          <dl className="grid grid-cols-3 gap-3 text-sm @xl:grid-cols-6">
            {[["Permintaan", "4"], ["Penawaran", "2"], ["Pemesanan", "1"], ["Konversi", "25%"], ["Respons median", "5 jam kerja"], ["Pendapatan simulasi", "Rp 38,4 jt"]].map(([k, v]) => (
              <div key={k}><dt className="text-muted-foreground">{k}</dt><dd className="num font-semibold">{v}</dd></div>
            ))}
          </dl>
          <Button variant="outline" size="sm" className="mt-3">Unduh CSV</Button>
        </Panel>
      </div>
    </Shell>
  )
}

export const venueScreens: ScreenDef[] = [
  {
    id: "venue-inbox",
    title: "Kotak masuk pengelola",
    section: "6.3",
    fr: ["FR-M10-07", "FR-M9-06", "FR-M9-07", "FR-M2-14"],
    device: "desktop",
    role: "Pengelola",
    summary: "Filter belum dibalas / menunggu saya / per ruang, batas balasan, status.",
    states: [
      { id: "default", label: "Daftar" },
      { id: "loading", label: "Memuat" },
      { id: "empty", label: "Kosong" },
      { id: "denied", label: "Tanpa akses", ref: "§12.7" },
    ],
    render: (s) => <VenueInbox state={s} />,
  },
  {
    id: "venue-enquiry",
    title: "Detail permintaan (pengelola)",
    section: "6.3",
    fr: ["FR-M9-07", "FR-M9-08", "FR-M9-11", "FR-M6-04", "FR-M10-04"],
    device: "desktop",
    role: "Pengelola",
    summary: "Minta info, tahan tanggal, tolak dengan alasan, catatan internal.",
    states: [
      { id: "default", label: "Detail" },
      { id: "request-info", label: "Minta info (panel)" },
      { id: "hold", label: "Tahan tanggal (dialog)" },
      { id: "hold-placed", label: "Tanggal ditahan" },
      { id: "decline", label: "Tolak (dialog)" },
      { id: "declined", label: "Sudah ditolak" },
      { id: "viewer", label: "Sebagai Pengamat", ref: "§4.3" },
    ],
    render: (s) => <EnquiryDetail state={s} />,
  },
  {
    id: "thread",
    title: "Percakapan dan penyembunyian kontak",
    section: "6.3",
    fr: ["FR-M10-01", "FR-M10-02", "FR-M10-03", "FR-M10-09"],
    device: "mobile",
    role: "Penyelenggara / pengelola",
    summary: "Percakapan per permintaan; kontak disembunyikan sampai terkonfirmasi.",
    states: [
      { id: "default", label: "Percakapan" },
      { id: "masked", label: "Kontak disembunyikan", ref: "AC-M9/M10-5" },
      { id: "confirmed", label: "Setelah terkonfirmasi" },
      { id: "loading", label: "Memuat" },
      { id: "error", label: "Gagal terkirim", ref: "§12.7" },
    ],
    render: (s) => <Thread state={s} />,
  },
  {
    id: "quote-builder",
    title: "Penyusun penawaran dan persetujuan",
    section: "6.3",
    fr: ["FR-M12-01", "FR-M12-02", "FR-M12-03", "FR-M12-04", "FR-M12-05", "FR-M2-06", "FR-M3-03", "FR-M12-13"],
    device: "desktop",
    role: "Pengelola (Staf, Pemilik)",
    summary: "Rincian dari tarif, jadwal bayar, ketentuan, total sesuai §11.2, batas persetujuan.",
    states: [
      { id: "default", label: "Draf (Staf)" },
      { id: "pending", label: "Menunggu persetujuan", ref: "AC-M2-4" },
      { id: "owner", label: "Tampilan Pemilik" },
      { id: "backup", label: "Akan jadi cadangan", ref: "§12.1" },
      { id: "blocked", label: "Tanggal sudah dipesan", ref: "§12.1" },
      { id: "bal-error", label: "Pelunasan terlalu dekat", ref: "AC-M12-3" },
      { id: "unverified", label: "Belum terverifikasi", ref: "AC-M3-1" },
    ],
    render: (s) => <QuoteBuilder state={s} />,
  },
  {
    id: "venue-pipeline",
    title: "Dasbor alur pengelola",
    section: "6.3",
    fr: ["FR-M22-01", "FR-M22-02", "FR-M22-03"],
    device: "desktop",
    role: "Pengelola",
    summary: "Kolom status permintaan, minggu ini, ringkasan periode.",
    states: [{ id: "default", label: "Dasbor" }],
    render: () => <Pipeline />,
  },
]
