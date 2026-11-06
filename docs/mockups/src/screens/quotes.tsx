import type { ReactNode } from "react"
import { CheckCircle2, Clock, CreditCard, Download, Landmark, QrCode as QrIcon, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { BookingProgress, CheckRow, DocPreview, Facts, Field, MoneyRow, Notice, PageTitle, Panel, SectionTitle, Spinner, Status } from "@/components/kit"
import { compareQuotes, q1, q2, rp } from "@/lib/data"
import type { ScreenDef } from "@/registry"
import { Shell } from "./shell"

/* ---------------- Quote view (organizer) ---------------- */

function QuoteLines({ diff }: { diff?: boolean }) {
  return (
    <div className="divide-y divide-line">
      <MoneyRow
        label="Sewa Atrium Utama, 3 hari"
        sub={diff ? <span>Versi 1: {rp(q1.rentalPerDay)}/hari → versi 2: {rp(q2.rentalPerDay)}/hari</span> : `${rp(q2.rentalPerDay)}/hari`}
        value={
          diff ? (
            <span className="flex flex-col items-end">
              <span className="text-xs text-muted-foreground line-through">{rp(q1.rental)}</span>
              <span>{rp(q2.rental)}</span>
            </span>
          ) : (
            rp(q2.rental)
          )
        }
        className={diff ? "rounded-md bg-brand-soft/60 px-2" : undefined}
      />
      <MoneyRow label="Listrik 40 kVA × 3 hari" sub={`${rp(50_000)}/kVA/hari`} value={rp(q2.electricity)} />
      {diff && (
        <MoneyRow
          label={<span><span className="sr-only">Dihapus: </span>Kebersihan tambahan</span>}
          sub="Dihapus di versi 2, kebersihan harian sudah termasuk"
          value={rp(q1.cleaning)}
          changed="removed"
          className="rounded-md bg-sunken px-2"
        />
      )}
      <MoneyRow label="PPN" sub="12% × DPP 11/12" value={diff ? <span className="flex flex-col items-end"><span className="text-xs text-muted-foreground line-through">{rp(q1.ppn)}</span>{rp(q2.ppn)}</span> : rp(q2.ppn)} />
      <MoneyRow label="Biaya layanan Spot-In" sub="3% dari sewa dan layanan tambahan" value={diff ? <span className="flex flex-col items-end"><span className="text-xs text-muted-foreground line-through">{rp(q1.fee)}</span>{rp(q2.fee)}</span> : rp(q2.fee)} />
      <MoneyRow label="Total" value={diff ? <span className="flex flex-col items-end"><span className="text-xs font-normal text-muted-foreground line-through">{rp(q1.total)}</span>{rp(q2.total)}</span> : rp(q2.total)} strong />
    </div>
  )
}

function QuoteView({ state }: { state: string }) {
  const superseded = state === "superseded"
  const expired = state === "expired"
  const changed = state === "event-changed"
  const taken = state === "taken"
  const diff = state === "diff"
  const canAccept = !superseded && !expired && !changed && !taken
  return (
    <Shell pilot active="Acara saya">
      <PageTitle
        back="Pekan Kopi Nusantara 2026"
        title={superseded ? "Penawaran versi 1 dari Mal Cempaka Raya" : "Penawaran versi 2 dari Mal Cempaka Raya"}
        description={superseded ? "Versi ini sudah diganti dan hanya bisa dibaca." : "Atrium Utama · Sab–Sen, 12–14 Des 2026 · berlaku sampai Selasa, 17 Nov 2026"}
      />
      {superseded && (
        <Notice tone="neutral" className="mb-4" title="Sudah ada versi yang lebih baru">
          Mal Cempaka Raya mengirim versi 2 pada Selasa, 10 Nov. Hanya versi terbaru yang bisa diterima.
          <div className="mt-2"><Button size="sm" variant="outline">Buka versi 2</Button></div>
        </Notice>
      )}
      {expired && (
        <Notice tone="danger" className="mb-4" title="Penawaran ini sudah kedaluwarsa">
          Masa berlakunya habis Selasa, 17 Nov 2026. Minta Mal Cempaka Raya mengirim ulang jika Anda masih tertarik.
          <div className="mt-2"><Button size="sm" variant="outline">Minta kirim ulang</Button></div>
        </Notice>
      )}
      {changed && (
        <Notice tone="waiting" className="mb-4" title="Acara berubah, penawaran perlu ditinjau ulang">
          Anda mengubah jumlah pengunjung menjadi 450 setelah penawaran ini dikirim. Mal Cempaka Raya sudah diberi tahu dan perlu mengirim ulang atau merevisi sebelum bisa diterima.
        </Notice>
      )}
      {taken && (
        <Notice tone="danger" className="mb-4" live title="Tanggal ini baru saja diambil">
          Penyelenggara lain menerima penawaran untuk 12–14 Des beberapa detik sebelum Anda, jadi penawaran ini tidak bisa diterima. Mal Cempaka Raya juga sudah diberi tahu.
          <div className="mt-2 flex flex-wrap gap-2"><Button size="sm">Kirim pesan ke pengelola</Button><Button size="sm" variant="outline">Lihat ruang serupa</Button></div>
        </Notice>
      )}
      {diff && (
        <Notice tone="positive" className="mb-4" title="Yang berubah dari versi 1">
          Sewa turun dari {rp(q1.rentalPerDay)} menjadi {rp(q2.rentalPerDay)} per hari dan biaya kebersihan tambahan dihapus. Total turun {rp(q1.total - q2.total)}.
        </Notice>
      )}

      <Panel>
        <div className="mb-2 flex items-center justify-between">
          <SectionTitle>Rincian</SectionTitle>
          {diff ? <Status tone="positive">Menampilkan perubahan</Status> : <Button variant="ghost" size="sm" className="-mt-3 text-brand">Bandingkan dengan versi 1</Button>}
        </div>
        <QuoteLines diff={diff} />
      </Panel>

      <Panel className="mt-4">
        <SectionTitle>Pembayaran</SectionTitle>
        <div className="divide-y divide-line">
          <MoneyRow label="Uang muka (50% + biaya layanan Spot-In)" sub="Jatuh tempo 3 hari setelah Anda menerima" value={rp(q2.deposit)} />
          <MoneyRow label="Pelunasan" sub="Jatuh tempo Sabtu, 28 Nov 2026 (14 hari sebelum acara)" value={rp(q2.balance)} />
        </div>
        <p className="mt-3 rounded-md bg-sunken px-3 py-2 text-[13px] text-ink">Selama pilot, semua pembayaran memakai metode uji. Tidak ada uang sungguhan yang ditarik.</p>
      </Panel>

      <Panel className="mt-4">
        <SectionTitle>Ketentuan</SectionTitle>
        <Facts
          items={[
            { k: "Termasuk", v: "Keamanan area dan kebersihan harian" },
            { k: "Tidak termasuk", v: "Dekorasi, sound system, genset tambahan" },
            { k: "Kebijakan pembatalan", v: "Sedang: 100% kembali jika batal 30 hari atau lebih sebelum acara, 50% jika 14–29 hari" },
            { k: "Ketentuan khusus", v: "Bongkar muat 11 Des pukul 22.00–06.00 tanpa biaya tambahan" },
          ]}
        />
        <Button variant="outline" size="sm" className="mt-3 bg-surface"><Download className="size-4" />Unduh PDF penawaran</Button>
      </Panel>

      {canAccept && (
        <div className="sticky bottom-0 -mx-4 mt-6 border-t border-line bg-surface px-4 py-3">
          <div className="flex flex-col gap-2">
            <Button className="h-11">Terima penawaran ini</Button>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1">Minta revisi</Button>
              <Button variant="ghost" className="flex-1 text-danger">Tolak</Button>
            </div>
          </div>
        </div>
      )}

      {/* Acceptance confirmation: required pilot terms (FR-M12-10) */}
      <Sheet open={state === "accept"}>
        <SheetContent side="bottom" className="rounded-t-xl">
          <SheetHeader>
            <SheetTitle>Terima penawaran versi 2?</SheetTitle>
            <SheetDescription>
              Tanggal 12–14 Des langsung ditahan untuk Anda sampai tenggat uang muka, Senin 16 Nov 2026 pukul 23.59 WIB. Setelah itu Anda menyetujui perjanjian contoh dan membayar uang muka
              uji {rp(q2.deposit)}.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-3 px-4">
            <CheckRow id="acc-terms">
              Saya mengerti ini <b>pemesanan latihan</b> dalam pilot Spot-In: tidak mengikat secara hukum dan tidak ada uang sungguhan yang dibayar.
            </CheckRow>
            <p className="text-[13px] text-muted-foreground">Dua permintaan lain untuk acara ini (Rooftop Barat dan Aula Utama) akan kami tanyakan setelah ini: tandai sebagai tidak dilanjutkan atau biarkan terbuka.</p>
          </div>
          <SheetFooter className="border-t border-line">
            <Button className="h-11">Terima dan tahan tanggal</Button>
            <Button variant="outline">Kembali ke penawaran</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Revision request with per-line comments */}
      <Sheet open={state === "revise"}>
        <SheetContent side="bottom" className="max-h-[85%] overflow-y-auto rounded-t-xl">
          <SheetHeader>
            <SheetTitle>Minta revisi</SheetTitle>
            <SheetDescription>Komentar dikirim ke Mal Cempaka Raya. Penawaran ini tetap berlaku sampai versi baru dikirim.</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 px-4">
            <Field id="rv-general" label="Komentar umum"><Textarea rows={2} className="bg-surface" defaultValue="Anggaran klien maksimal Rp 25 jt per hari untuk sewa." /></Field>
            <Field id="rv-line1" label="Sewa Atrium Utama" optional><Input className="bg-surface" defaultValue="Bisa turun ke Rp 25.000.000/hari?" /></Field>
            <Field id="rv-line2" label="Kebersihan tambahan" optional><Input className="bg-surface" defaultValue="Bukankah kebersihan harian sudah termasuk?" /></Field>
          </div>
          <SheetFooter className="border-t border-line">
            <Button className="h-11">Kirim permintaan revisi</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Mark other enquiries lost */}
      <AlertDialog open={state === "mark-lost"}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Penawaran diterima. Bagaimana dengan 2 permintaan lain?</AlertDialogTitle>
            <AlertDialogDescription>
              Rooftop Barat dan Aula Utama masih menunggu kabar. Menandainya tidak dilanjutkan membantu mereka melepas tanggal untuk penyelenggara lain.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Field id="lost-reason" label="Alasan untuk pengelola" optional><Input className="bg-surface" defaultValue="Klien memilih lokasi dekat MRT" /></Field>
          <AlertDialogFooter>
            <AlertDialogCancel>Biarkan tetap terbuka</AlertDialogCancel>
            <AlertDialogAction>Tandai tidak dilanjutkan</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Shell>
  )
}

/* ---------------- Comparison ---------------- */

function Compare({ state }: { state: string }) {
  if (state === "one") {
    return (
      <Shell device="desktop" pilot active="Acara saya">
        <PageTitle back="Pekan Kopi Nusantara 2026" title="Bandingkan penawaran" />
        <Notice tone="neutral" title="Baru 1 dari 3 tempat yang mengirim penawaran">
          Perbandingan paling berguna setelah minimal 2 penawaran masuk. Rooftop Barat dan Aula Utama punya batas balasan sampai Selasa, 10 Nov 2026 pukul 23.59 WIB.
        </Notice>
      </Shell>
    )
  }
  const rows: { k: string; v: (q: (typeof compareQuotes)[number]) => ReactNode }[] = [
    { k: "Total", v: (q) => <b className="num">{rp(q.total)}</b> },
    { k: "Per hari", v: (q) => <span className="num">{rp(q.perDay)}</span> },
    { k: "Termasuk", v: (q) => q.inclusions },
    { k: "Uang muka", v: (q) => q.deposit },
    { k: "Pelunasan jatuh tempo", v: (q) => q.balance },
    { k: "Pembatalan", v: (q) => q.policy },
    { k: "Waktu balasan tempat", v: (q) => q.response },
    { k: "PPN", v: (q) => (q.ppn ? "Termasuk dalam total" : "Tempat bukan PKP") },
  ]
  return (
    <Shell device="desktop" pilot active="Acara saya">
      <PageTitle
        back="Pekan Kopi Nusantara 2026"
        title="Bandingkan 3 penawaran"
        description="Versi terbaru dari setiap tempat. Harga sudah termasuk PPN (jika ada) dan biaya layanan Spot-In."
        actions={<Button variant="outline" className="bg-surface"><Download className="size-4" />Unduh PDF untuk klien</Button>}
      />
      <div className="overflow-x-auto rounded-lg border border-line bg-surface">
        <Table className="min-w-[860px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-44"><span className="sr-only">Aspek</span></TableHead>
              {compareQuotes.map((q) => (
                <TableHead key={q.venue} scope="col" className="align-top whitespace-normal">
                  <span className="block py-2 text-sm font-semibold text-ink">{q.venue}</span>
                  <span className="text-xs font-normal">{q.version}</span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.k}>
                <TableHead scope="row" className="align-top font-medium text-muted-foreground">{r.k}</TableHead>
                {compareQuotes.map((q) => <TableCell key={q.venue} className="align-top text-sm whitespace-normal">{r.v(q)}</TableCell>)}
              </TableRow>
            ))}
            <TableRow>
              <TableHead scope="row"><span className="sr-only">Tindakan</span></TableHead>
              {compareQuotes.map((q, i) => (
                <TableCell key={q.venue}>
                  <Button size="sm" variant={i === 0 ? "default" : "outline"}>Buka penawaran</Button>
                </TableCell>
              ))}
            </TableRow>
          </TableBody>
        </Table>
      </div>
      <p className="mt-3 text-[13px] text-muted-foreground">PDF yang diunduh memuat tanda air PILOT dan referensi Spot-In untuk setiap penawaran.</p>
    </Shell>
  )
}

/* ---------------- Pilot agreement ---------------- */

function Agreement({ state }: { state: string }) {
  if (state === "generating") {
    return (
      <Shell pilot active="Acara saya">
        <PageTitle title="Perjanjian contoh (pilot)" />
        <Panel className="py-8 text-center"><Spinner label="Membuat perjanjian dari penawaran versi 2…" /></Panel>
        <p className="mt-3 text-sm text-muted-foreground">Biasanya selesai dalam kurang dari 1 menit. Anda boleh meninggalkan halaman ini; kami kirim email saat siap.</p>
      </Shell>
    )
  }
  if (state === "gen-failed") {
    return (
      <Shell pilot active="Acara saya">
        <PageTitle title="Perjanjian contoh (pilot)" />
        <Notice tone="danger" title="Perjanjian belum berhasil dibuat">
          Kami sudah mencoba 3 kali dan memberi tahu tim Spot-In. Tenggat uang muka diperpanjang selama gangguan ini, paling lama 24 jam.
          <div className="mt-2"><Button size="sm">Coba buat lagi</Button></div>
        </Notice>
      </Shell>
    )
  }
  const accepted = state === "accepted"
  const venue = state === "venue"
  return (
    <Shell pilot active="Acara saya" ctx={venue ? "venue" : "organizer"}>
      <BookingProgress current={1} />
      <PageTitle title="Setujui perjanjian contoh (pilot)" description="Dibuat dari penawaran versi 2 yang Anda terima. Perjanjian ini latihan dan tidak mengikat secara hukum." />
      <DocPreview
        title="Sample agreement (pilot) – Perjanjian contoh"
        number="AGR-2026-0087 · SHA-256 3f9a…c21e"
        footer="Dokumen ini dibuat untuk pilot mata kuliah Spot-In. Bukan kontrak yang mengikat; tanpa tanda tangan elektronik tersertifikasi dan tanpa e-meterai."
      >
        <div className="space-y-3 text-[13px] leading-relaxed">
          <p><b>Para pihak.</b> PT Cempaka Raya Properti ("Pengelola") dan PT Lintas Acara Kreatif ("Penyelenggara").</p>
          <p><b>Ruang dan waktu.</b> Atrium Utama, Mal Cempaka Raya, Sab–Sen 12–14 Des 2026, 10.00–22.00 WIB.</p>
          <p><b>Biaya.</b> Total {rp(q2.total)} termasuk PPN {rp(q2.ppn)} dan biaya layanan Spot-In {rp(q2.fee)}. Uang muka {rp(q2.deposit)}, pelunasan {rp(q2.balance)} paling lambat 28 Nov 2026.</p>
          <p><b>Pembatalan.</b> Kebijakan Sedang. <b>Dokumen wajib.</b> Denah tata letak final (28 Nov), asuransi tanggung gugat (5 Des).</p>
          <p className="text-muted-foreground">Halaman 1 dari 4</p>
        </div>
      </DocPreview>
      <Button variant="outline" size="sm" className="mt-3 bg-surface"><Download className="size-4" />Unduh PDF (4 halaman)</Button>

      <Panel className="mt-5">
        <SectionTitle>Status persetujuan</SectionTitle>
        <ol className="space-y-2 text-sm">
          <li className="flex items-center gap-2">
            {accepted || venue ? <CheckCircle2 className="size-4 text-brand" aria-hidden="true" /> : <Clock className="size-4 text-muted-foreground" aria-hidden="true" />}
            Penyelenggara{accepted || venue ? ": Rina Wulandari, Jum 13 Nov 2026 10.02 WIB" : " (Anda) – belum"}
          </li>
          <li className="flex items-center gap-2"><Clock className="size-4 text-muted-foreground" aria-hidden="true" />Pengelola – menunggu setelah penyelenggara</li>
        </ol>
        <p className="mt-2 text-[13px] text-muted-foreground">Tenggat kedua persetujuan dan uang muka: Senin, 16 Nov 2026 pukul 23.59 WIB.</p>
      </Panel>

      {accepted ? (
        <Notice tone="positive" className="mt-4" title="Anda sudah menyetujui perjanjian">
          Mal Cempaka Raya diberi tahu untuk menyetujui. Sambil menunggu, Anda bisa membayar uang muka uji sekarang.
          <div className="mt-2"><Button size="sm">Bayar uang muka {rp(q2.deposit)}</Button></div>
        </Notice>
      ) : (
        <Panel className="mt-4 space-y-4">
          <SectionTitle>{venue ? "Persetujuan pengelola" : "Persetujuan Anda"}</SectionTitle>
          <CheckRow id="agr-check" error={state === "errors" ? "Centang pernyataan ini untuk menyetujui." : undefined}>
            Saya telah membaca dan menyetujui perjanjian contoh ini, dan memahami bahwa ini latihan yang tidak mengikat.
          </CheckRow>
          <Field id="agr-name" label="Ketik nama lengkap Anda" hint="Nama, waktu dan alamat IP dicatat di halaman terakhir perjanjian." error={state === "errors" ? "Nama harus sama dengan nama di akun: Rina Wulandari." : undefined}>
            <Input className="h-11 bg-surface" defaultValue={state === "errors" ? "Rina" : venue ? "Budi Santoso" : ""} />
          </Field>
          <Button className="h-11 w-full">Setujui perjanjian</Button>
        </Panel>
      )}
    </Shell>
  )
}

/* ---------------- Sandbox payment ---------------- */

function Payment({ state }: { state: string }) {
  const balance = state === "balance"
  const amount = balance ? q2.balance : q2.deposit
  const label = balance ? "pelunasan" : "uang muka"
  if (state === "va") {
    return (
      <Shell pilot active="Acara saya">
        <PageTitle title="Bayar ke virtual account uji" description={`${rp(amount)} untuk ${label} Pekan Kopi Nusantara 2026`} />
        <Panel>
          <Facts items={[{ k: "Bank (uji)", v: "BCA – mode uji" }, { k: "Nomor virtual account", v: <span className="num text-lg tracking-wider">8808 0012 3456 7890</span> }, { k: "Berlaku sampai", v: "Senin, 16 Nov 2026 pukul 23.59 WIB" }]} />
          <Button variant="outline" size="sm" className="mt-3">Salin nomor</Button>
        </Panel>
        <Panel className="mt-4">
          <p className="text-sm">Di mode uji, pembayaran disimulasikan. Tekan tombol di bawah untuk meniru transfer dari bank.</p>
          <Button className="mt-3 w-full">Simulasikan transfer {rp(amount)}</Button>
        </Panel>
        <Notice tone="neutral" className="mt-4" title="Status: menunggu pembayaran">Halaman ini diperbarui otomatis saat pembayaran masuk.</Notice>
      </Shell>
    )
  }
  if (state === "processing") {
    return (
      <Shell pilot active="Acara saya">
        <PageTitle title="Pembayaran sedang diproses" description="Penyedia pembayaran uji belum mengirim konfirmasi. Biasanya hanya beberapa detik." />
        <Panel className="py-8 text-center"><Spinner label={`Diproses: ${rp(amount)}`} /></Panel>
        <p className="mt-3 text-sm text-muted-foreground">Jangan bayar ulang. Kami terus memeriksa statusnya, dan status tidak akan berubah menjadi gagal sebelum penyedia memastikannya.</p>
      </Shell>
    )
  }
  if (state === "paid") {
    return (
      <Shell pilot active="Acara saya">
        <BookingProgress current={3} />
        <div className="mt-4">
          <Notice tone="positive" title="Pemesanan terkonfirmasi">
            Uang muka uji {rp(q2.deposit)} diterima dan kedua pihak sudah menyetujui perjanjian. Tanggal 12–14 Des sekarang tercatat sebagai dipesan.
          </Notice>
        </div>
        <DocPreview className="mt-4" title="Pilot receipt – bukan faktur pajak" number="PILOT-MCR-2026-0012 · 13 Nov 2026" footer="Kuitansi pilot. Bukan faktur pajak. Tidak ada uang sungguhan yang dibayarkan.">
          <MoneyRow label="Uang muka sewa dan layanan (50%)" sub="Diterbitkan oleh Mal Cempaka Raya, termasuk PPN" value={rp(q2.depositVenue)} />
          <MoneyRow label="Biaya layanan Spot-In" sub="Diterbitkan oleh Spot-In" value={rp(q2.fee)} />
          <MoneyRow label="Dibayar (simulasi)" value={rp(q2.deposit)} strong />
        </DocPreview>
        <Button className="mt-5 h-11 w-full">Buka ruang kerja pemesanan</Button>
      </Shell>
    )
  }
  const declined = state === "declined"
  const down = state === "down"
  const expired = state === "expired"
  return (
    <Shell pilot active="Acara saya">
      {!balance && <BookingProgress current={2} />}
      <PageTitle
        title={balance ? "Bayar pelunasan" : "Bayar uang muka"}
        description={balance ? "Jatuh tempo Sabtu, 28 Nov 2026. Pengingat dikirim 3 hari dan 1 hari sebelumnya." : "Pemesanan terkonfirmasi setelah uang muka masuk dan kedua pihak menyetujui perjanjian."}
      />
      <Panel>
        <div className="divide-y divide-line">
          {balance ? (
            <>
              <MoneyRow label="Total penyelenggara" value={rp(q2.total)} />
              <MoneyRow label="Sudah dibayar (uang muka)" value={`− ${rp(q2.deposit)}`} muted />
              <MoneyRow label="Pelunasan" value={rp(q2.balance)} strong />
            </>
          ) : (
            <>
              <MoneyRow label="50% dari total untuk tempat" value={rp(q2.depositVenue)} />
              <MoneyRow label="Biaya layanan Spot-In" value={rp(q2.fee)} />
              <MoneyRow label="Uang muka" value={rp(q2.deposit)} strong />
            </>
          )}
        </div>
        {!balance && <p className="mt-2 text-[13px] text-muted-foreground">Tenggat: Senin, 16 Nov 2026 pukul 23.59 WIB. Jika lewat, pemesanan batal otomatis dan tanggal dilepas.</p>}
      </Panel>

      {declined && (
        <Notice tone="danger" className="mt-4" live title="Kartu uji ditolak">
          Kartu 4000 0000 0000 0002 adalah kartu uji yang selalu ditolak. Status pemesanan tidak berubah. Coba virtual account atau QRIS uji.
        </Notice>
      )}
      {down && (
        <Notice tone="danger" className="mt-4" live title="Layanan pembayaran uji sedang tidak tersedia">
          Pembayaran belum bisa dibuat. Coba lagi dalam beberapa menit. Jika berlangsung lama, Admin Spot-In bisa memperpanjang tenggat sekali.
          <div className="mt-2"><Button size="sm" variant="outline">Coba lagi</Button></div>
        </Notice>
      )}
      {expired && (
        <Notice tone="waiting" className="mt-4" title="Virtual account sebelumnya kedaluwarsa">
          Nomor VA berlaku 24 jam. Buat nomor baru; tenggat uang muka Anda tetap Senin, 16 Nov 2026.
        </Notice>
      )}

      <fieldset className="mt-5">
        <legend className="mb-2 font-semibold">Metode pembayaran uji</legend>
        <RadioGroup defaultValue={declined ? "card" : "va"} className="gap-2">
          {[
            ["va", Landmark, "Virtual account uji", "Nomor VA berlaku 24 jam"],
            ["qris", QrIcon, "QRIS uji", "Pindai dengan aplikasi simulasi"],
            ["ewallet", Wallet, "E-wallet uji", "Diarahkan ke halaman simulasi"],
            ["card", CreditCard, "Kartu uji", "Gunakan nomor kartu uji dari penyedia"],
          ].map(([v, Icon, t, d]) => {
            const I = Icon as typeof Landmark
            return (
              <Label key={v as string} htmlFor={`pm-${v}`} className="flex cursor-pointer items-center gap-3 rounded-lg border border-line bg-surface p-3 font-normal has-[[data-state=checked]]:border-brand">
                <RadioGroupItem id={`pm-${v}`} value={v as string} className="border-[#8f8778] text-brand" />
                <I className="size-5 text-muted-foreground" aria-hidden="true" />
                <span><span className="block font-semibold">{t as string}</span><span className="text-[13px] text-muted-foreground">{d as string}</span></span>
              </Label>
            )
          })}
        </RadioGroup>
      </fieldset>
      <div className="sticky bottom-0 -mx-4 mt-6 border-t border-line bg-surface px-4 py-3">
        <Button className="h-11 w-full" disabled={down}>{expired ? "Buat nomor VA baru" : `Bayar ${rp(amount)} (uji)`}</Button>
      </div>
    </Shell>
  )
}

/* ---------------- Backup quote (§6.6) ---------------- */

function BackupQuote({ state }: { state: string }) {
  const open = state === "open"
  const booked = state === "booked"
  const lost = state === "lost"
  return (
    <Shell pilot active="Acara saya" initials="SP">
      <PageTitle back="Bazar Kriya Akhir Tahun" title="Penawaran dari Mal Cempaka Raya" description="Atrium Utama · Minggu, 13 Des 2026 · 09.00–21.00 WIB" />
      {state === "default" && (
        <Notice tone="waiting" title="Penawaran cadangan: tanggal sedang ditahan">
          Penyelenggara lain sedang menahan 13 Des sampai Senin, 16 Nov 2026. Jika tahanan itu dilepas, Anda langsung diberi tahu dan bisa menerima penawaran ini. Masa berlaku diperpanjang
          otomatis sampai minimal 2 hari kerja setelah tanggal dilepas.
        </Notice>
      )}
      {open && (
        <Notice tone="positive" live title="Tanggal 13 Des sekarang bisa diterima">
          Tahanan sebelumnya berakhir. Penyelenggara lain dengan penawaran cadangan juga sudah diberi tahu, dan yang pertama menerima mendapatkan tanggal ini. Penawaran berlaku sampai Rabu, 18 Nov 2026
          pukul 23.59 WIB.
        </Notice>
      )}
      {booked && (
        <Notice tone="neutral" title="Penawaran kedaluwarsa: tanggal sudah dipesan">
          Penyelenggara lain mengonfirmasi pemesanan untuk 13 Des. Tanya Mal Cempaka Raya tentang tanggal lain, atau cari ruang serupa.
          <div className="mt-2 flex gap-2"><Button size="sm" variant="outline">Kirim pesan</Button><Button size="sm" variant="outline">Cari ruang serupa</Button></div>
        </Notice>
      )}
      {lost && (
        <Notice tone="danger" live title="Tanggal ini baru saja diambil">
          Penyelenggara lain menerima lebih dulu. Penawaran Anda kembali menjadi penawaran cadangan di belakang tahanan baru itu.
        </Notice>
      )}
      <Panel className="mt-4">
        <div className="mb-2"><Status tone={open ? "positive" : booked ? "danger" : "waiting"}>{open ? "Bisa diterima" : booked ? "Tanggal sudah dipesan" : "Tanggal sedang ditahan"}</Status></div>
        <div className="divide-y divide-line">
          <MoneyRow label="Sewa Atrium Utama, 1 hari" value={rp(25_000_000)} />
          <MoneyRow label="Listrik 20 kVA × 1 hari" value={rp(1_000_000)} />
          <MoneyRow label="PPN" value={rp(2_860_000)} />
          <MoneyRow label="Biaya layanan Spot-In" value={rp(780_000)} />
          <MoneyRow label="Total" value={rp(29_640_000)} strong />
        </div>
      </Panel>
      <div className="sticky bottom-0 -mx-4 mt-6 border-t border-line bg-surface px-4 py-3">
        <Button className="h-11 w-full" disabled={!open} aria-describedby={!open ? "bk-why" : undefined}>Terima penawaran ini</Button>
        {!open && <p id="bk-why" className="mt-2 text-center text-[13px] text-muted-foreground">{booked ? "Tidak bisa diterima karena tanggal sudah dipesan." : "Bisa diterima setelah tahanan dilepas."}</p>}
      </div>
    </Shell>
  )
}

export const quoteScreens: ScreenDef[] = [
  {
    id: "quote",
    title: "Penawaran untuk penyelenggara",
    section: "6.4",
    fr: ["FR-M12-06", "FR-M12-07", "FR-M12-08", "FR-M12-09", "FR-M12-10", "FR-M12-11", "FR-M9-09", "FR-M9-10"],
    device: "mobile",
    role: "Penyelenggara",
    summary: "Rincian §11.2, perbedaan versi, terima, minta revisi per baris, tolak, tandai permintaan lain.",
    states: [
      { id: "default", label: "Versi 2" },
      { id: "diff", label: "Perbedaan versi", ref: "AC-M12-2" },
      { id: "revise", label: "Minta revisi" },
      { id: "accept", label: "Konfirmasi terima" },
      { id: "mark-lost", label: "Tandai permintaan lain" },
      { id: "taken", label: "Tanggal baru saja diambil", ref: "§12.1" },
      { id: "superseded", label: "Versi lama", ref: "§12.2" },
      { id: "expired", label: "Kedaluwarsa", ref: "AC-M12-3" },
      { id: "event-changed", label: "Acara berubah", ref: "§12.2" },
    ],
    render: (s) => <QuoteView state={s} />,
  },
  {
    id: "compare",
    title: "Bandingkan penawaran",
    section: "6.4",
    fr: ["FR-M8-05"],
    device: "desktop",
    role: "Penyelenggara",
    summary: "Tabel berdampingan: total, per hari, termasuk, uang muka, pembatalan, waktu balasan; unduh PDF.",
    states: [
      { id: "default", label: "3 penawaran" },
      { id: "one", label: "Baru 1 penawaran" },
    ],
    render: (s) => <Compare state={s} />,
  },
  {
    id: "agreement",
    title: "Perjanjian contoh (pilot)",
    section: "6.5",
    fr: ["FR-M13-02", "FR-M13-05", "FR-M13-07", "FR-M13-09", "FR-M13-10", "FR-M38-01"],
    device: "mobile",
    role: "Penyelenggara, lalu pengelola",
    summary: "Pratinjau bertanda air, centang dan ketik nama, status persetujuan kedua pihak.",
    states: [
      { id: "default", label: "Belum disetujui" },
      { id: "errors", label: "Galat isian" },
      { id: "accepted", label: "Penyelenggara sudah setuju" },
      { id: "venue", label: "Giliran pengelola" },
      { id: "generating", label: "Sedang dibuat" },
      { id: "gen-failed", label: "Gagal dibuat", ref: "§12.3" },
    ],
    render: (s) => <Agreement state={s} />,
  },
  {
    id: "payment",
    title: "Pembayaran sandbox",
    section: "6.5",
    fr: ["FR-M14-01", "FR-M14-02", "FR-M14-03", "FR-M14-06", "FR-M14-08", "FR-M15-01"],
    device: "mobile",
    role: "Penyelenggara",
    summary: "Uang muka dan pelunasan dengan metode uji, VA, diproses, berhasil dengan kuitansi pilot.",
    states: [
      { id: "default", label: "Pilih metode (uang muka)" },
      { id: "va", label: "Virtual account uji" },
      { id: "processing", label: "Diproses", ref: "§12.4" },
      { id: "paid", label: "Terkonfirmasi + kuitansi" },
      { id: "balance", label: "Pelunasan" },
      { id: "declined", label: "Kartu ditolak", ref: "§12.4" },
      { id: "expired", label: "VA kedaluwarsa", ref: "§12.4" },
      { id: "down", label: "Penyedia tidak tersedia", ref: "§12.4" },
    ],
    render: (s) => <Payment state={s} />,
  },
  {
    id: "backup-quote",
    title: "Penawaran cadangan",
    section: "6.6",
    fr: ["FR-M12-13"],
    device: "mobile",
    role: "Penyelenggara (Sari)",
    summary: "Tanggal sedang ditahan, lalu bisa diterima, tanggal sudah dipesan, atau kalah cepat.",
    states: [
      { id: "default", label: "Tanggal sedang ditahan", ref: "AC-M12-4" },
      { id: "open", label: "Tahanan dilepas", ref: "AC-M12-5" },
      { id: "lost", label: "Kalah cepat", ref: "§12.1" },
      { id: "booked", label: "Tanggal sudah dipesan" },
    ],
    render: (s) => <BackupQuote state={s} />,
  },
]
