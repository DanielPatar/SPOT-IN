import { Check, Copy, ImagePlus, MapPin, Plus, Trash2, Info, CircleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  CheckRow,
  ErrorSummary,
  Field,
  MapCanvas,
  Notice,
  Panel,
  SectionTitle,
  SelectBox,
  SkeletonList,
  SpacePhoto,
  Status,
} from "@/components/kit"
import { cn } from "@/lib/utils"
import { rp } from "@/lib/data"
import type { ScreenDef } from "@/registry"
import { Shell } from "./shell"

const steps = ["Profil tempat", "Properti", "Ruang", "Harga", "Dokumen wajib", "Tim", "Kirim untuk ditinjau"]

/** Setup is a real sequence, so numbered steps are meaningful. */
function SetupSteps({ current }: { current: number }) {
  return (
    <nav aria-label="Langkah penyiapan" className="mb-5">
      <p className="text-sm text-muted-foreground">
        Langkah {current + 1} dari {steps.length}: <span className="font-semibold text-ink">{steps[current]}</span>
      </p>
      <ol className="mt-2 flex gap-1" aria-hidden="true">
        {steps.map((s, i) => (
          <li key={s} className={cn("h-1.5 flex-1 rounded-full", i < current ? "bg-brand" : i === current ? "bg-brand/60" : "bg-line")} title={s} />
        ))}
      </ol>
    </nav>
  )
}

function Footer({ primary, secondary = "Simpan dan lanjutkan nanti" }: { primary: string; secondary?: string }) {
  return (
    <div className="mt-6 flex flex-col gap-2 border-t border-line pt-4">
      <Button className="h-11">{primary}</Button>
      <Button variant="ghost" className="text-brand">{secondary}</Button>
    </div>
  )
}

/* ---------------- Operator profile ---------------- */

function OperatorStep() {
  return (
    <Shell ctx="venue" initials="BS">
      <SetupSteps current={0} />
      <h1 className="text-[22px] font-bold tracking-tight">Ceritakan tentang tempat Anda</h1>
      <p className="mt-1.5 text-[15px] text-muted-foreground">Nama tampilan muncul di halaman ruang. Nama badan usaha hanya untuk perjanjian contoh.</p>
      <form className="mt-5 space-y-4" onSubmit={(e) => e.preventDefault()}>
        <Field id="op-name" label="Nama tampilan">
          <Input defaultValue="Mal Cempaka Raya" className="h-11 bg-surface" />
        </Field>
        <Field id="op-legal" label="Nama badan usaha" hint="Tulis saja namanya. Kami tidak meminta NPWP, NIB atau akta selama pilot.">
          <Input defaultValue="PT Cempaka Raya Properti" className="h-11 bg-surface" />
        </Field>
        <Field id="op-city" label="Kota">
          <SelectBox options={["Jakarta Selatan", "Jakarta Barat", "Jakarta Pusat", "Tangerang Selatan", "Bandung", "Denpasar"]} defaultValue="Jakarta Selatan" className="h-11" />
        </Field>
        <Field id="op-phone" label="Telepon kontak" optional hint="Tidak diverifikasi. Penyelenggara baru melihatnya setelah pemesanan terkonfirmasi.">
          <Input type="tel" defaultValue="021 8370 1122" className="h-11 bg-surface" />
        </Field>
      </form>
      <Footer primary="Simpan dan lanjut ke properti" />
    </Shell>
  )
}

/* ---------------- Property with map pin ---------------- */

function PropertyStep({ state }: { state: string }) {
  const noPin = state === "no-pin"
  const mapDown = state === "map-down"
  return (
    <Shell ctx="venue" initials="BS" offline={state === "offline"}>
      <SetupSteps current={1} />
      <h1 className="text-[22px] font-bold tracking-tight">Data properti</h1>
      <p className="mt-1.5 text-[15px] text-muted-foreground">Satu tempat bisa punya beberapa ruang. Ruangnya diisi di langkah berikut.</p>
      {noPin && (
        <div className="mt-4">
          <ErrorSummary title="Ada 2 hal yang perlu dilengkapi" items={[{ href: "#pr-pin", text: "Tandai lokasi di peta" }, { href: "#pr-hours", text: "Isi jam operasional" }]} />
        </div>
      )}
      <form className="mt-5 space-y-4" onSubmit={(e) => e.preventDefault()}>
        <Field id="pr-name" label="Nama properti">
          <Input defaultValue="Mal Cempaka Raya" className="h-11 bg-surface" />
        </Field>
        <Field id="pr-type" label="Jenis properti">
          <SelectBox options={["Mal", "Gedung aula/tempat acara", "Pusat konvensi", "Area luar ruang", "Lainnya"]} defaultValue="Mal" className="h-11" />
        </Field>
        <Field id="pr-address" label="Alamat">
          <Textarea defaultValue="Jl. Cempaka Raya No. 18, Tebet, Jakarta Selatan 12820" className="bg-surface" rows={2} />
        </Field>
        <Field id="pr-area" label="Area">
          <SelectBox options={["Tebet", "Kemang", "Pasar Minggu", "Kebayoran Baru"]} defaultValue="Tebet" className="h-11" />
        </Field>

        <div id="pr-pin" className="grid gap-1.5">
          <Label className="text-sm font-medium">Lokasi di peta</Label>
          <p id="pr-pin-hint" className="text-[13px] text-muted-foreground">
            Seret peta sampai penanda tepat di pintu masuk utama. Lokasi ini yang dipakai penyelenggara untuk mencari dan menghitung jarak.
          </p>
          {mapDown ? (
            <Notice tone="waiting" title="Peta sedang tidak bisa dimuat">
              Alamat tetap tersimpan. Anda bisa menandai lokasi nanti, tetapi properti baru bisa dikirim untuk ditinjau setelah lokasi ditandai.
              <div className="mt-2">
                <Button size="sm" variant="outline">Muat ulang peta</Button>
              </div>
            </Notice>
          ) : noPin ? (
            <div className="rounded-lg border-2 border-danger">
              <MapCanvas className="h-48 rounded-md border-0" label="Peta, belum ada penanda" />
            </div>
          ) : (
            <MapCanvas className="h-48" pins={[{ x: 48, y: 52, label: "Penanda Mal Cempaka Raya" }]} label="Peta dengan penanda lokasi" />
          )}
          {noPin ? (
            <p className="flex items-center gap-1.5 text-[13px] font-medium text-danger">
              <CircleAlert className="size-3.5" aria-hidden="true" />
              Tandai lokasi properti di peta. Tanpa penanda, ruang tidak muncul di pencarian.
            </p>
          ) : !mapDown ? (
            <p className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
              <MapPin className="size-3.5 text-brand" aria-hidden="true" />
              -6,2297, 106,8531 · terdeteksi di zona WIB
            </p>
          ) : null}
        </div>

        <Field id="pr-tz" label="Zona waktu" hint="Diisi otomatis dari lokasi. Semua jam acara dan tenggat memakai zona ini.">
          <SelectBox options={["WIB (Jakarta)", "WITA (Bali, Makassar)", "WIT (Jayapura)"]} defaultValue="WIB (Jakarta)" className="h-11" />
        </Field>
        <Field id="pr-hours" label="Jam operasional" error={noPin ? "Isi jam buka dan tutup, misalnya 10.00–22.00." : undefined}>
          <Input defaultValue={noPin ? "" : "Setiap hari, 10.00–22.00"} className="h-11 bg-surface" />
        </Field>
        <Field id="pr-load" label="Akses bongkar muat" optional>
          <Textarea className="bg-surface" rows={2} defaultValue="Dock B, lewat Jl. Cempaka Dalam. Bongkar muat 22.00–06.00." />
        </Field>
        <Field id="pr-rules" label="Aturan tempat">
          <Textarea className="bg-surface" rows={3} defaultValue="Dilarang api terbuka di atrium. Musik maksimal 85 dB sampai 21.00. Semua instalasi lolos pemeriksaan teknis H-1." />
        </Field>
        <div className="grid gap-1.5">
          <Label className="text-sm font-medium">Foto properti</Label>
          <div className="grid grid-cols-3 gap-2">
            <SpacePhoto art="atrium" label="Foto atrium" className="aspect-square" />
            <SpacePhoto art="booth" label="Foto lobi" className="aspect-square" />
            <button type="button" className="grid aspect-square place-items-center rounded-md border-2 border-dashed border-line-strong bg-surface text-sm text-muted-foreground hover:border-brand">
              <span className="flex flex-col items-center gap-1">
                <ImagePlus className="size-5" aria-hidden="true" />
                Tambah foto
              </span>
            </button>
          </div>
        </div>
      </form>
      <Footer primary="Simpan dan lanjut ke ruang" />
    </Shell>
  )
}

/* ---------------- Space ---------------- */

function SpaceStep({ state }: { state: string }) {
  const photosFull = state === "photos-full"
  return (
    <Shell ctx="venue" initials="BS">
      <SetupSteps current={2} />
      <h1 className="text-[22px] font-bold tracking-tight">Tambah ruang: Atrium Utama</h1>
      <p className="mt-1.5 text-[15px] text-muted-foreground">Isi selengkap mungkin. Penyelenggara menyaring pencarian berdasarkan kapasitas, daya listrik dan kegiatan yang diizinkan.</p>
      <form className="mt-5 space-y-6" onSubmit={(e) => e.preventDefault()}>
        <section className="space-y-4">
          <SectionTitle>Dasar</SectionTitle>
          <Field id="sp-name" label="Nama ruang">
            <Input defaultValue="Atrium Utama" className="h-11 bg-surface" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field id="sp-type" label="Jenis ruang">
              <SelectBox options={["Atrium", "Booth/promo spot", "Unit pop-up", "Aula/ballroom", "Ruang rapat", "Area luar ruang", "Lainnya"]} defaultValue="Atrium" className="h-11" />
            </Field>
            <Field id="sp-level" label="Lantai/zona">
              <Input defaultValue="GF, zona tengah" className="h-11 bg-surface" />
            </Field>
            <Field id="sp-area" label="Luas (m²)">
              <Input inputMode="numeric" defaultValue="420" className="h-11 bg-surface" />
            </Field>
            <Field id="sp-ceil" label="Tinggi plafon (m)">
              <Input inputMode="decimal" defaultValue="14" className="h-11 bg-surface" />
            </Field>
          </div>
        </section>

        <section className="space-y-3">
          <SectionTitle hint="Kosongkan tata letak yang tidak bisa dipakai.">Kapasitas per tata letak</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            {[["Berdiri", "600"], ["Teater", "350"], ["Kelas", "180"], ["Banquet", "240"], ["Jumlah booth", "24"]].map(([l, v]) => (
              <Field key={l} id={`cap-${l}`} label={l}>
                <Input inputMode="numeric" defaultValue={v} className="h-11 bg-surface" />
              </Field>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <SectionTitle>Fasilitas dan kegiatan</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <Field id="sp-kva" label="Daya listrik (kVA)">
              <Input inputMode="numeric" defaultValue="40" className="h-11 bg-surface" />
            </Field>
            <Field id="sp-env" label="Lingkungan">
              <SelectBox options={["Dalam ruang", "Luar ruang", "Beratap"]} defaultValue="Dalam ruang" className="h-11" />
            </Field>
          </div>
          <fieldset className="space-y-2.5">
            <legend className="mb-1 text-sm font-medium">Kegiatan yang diizinkan</legend>
            <CheckRow id="act-sell" defaultChecked>Berjualan</CheckRow>
            <CheckRow id="act-fnb" defaultChecked>Sampling makanan dan minuman</CheckRow>
            <CheckRow id="act-fire">Memasak atau api terbuka</CheckRow>
            <CheckRow id="act-music" defaultChecked>Musik langsung</CheckRow>
            <CheckRow id="act-veh">Kendaraan di dalam area</CheckRow>
          </fieldset>
          <div className="grid grid-cols-2 gap-3">
            <Field id="sp-min" label="Minimal sewa (hari)">
              <Input inputMode="numeric" defaultValue="1" className="h-11 bg-surface" />
            </Field>
            <Field id="sp-max" label="Maksimal sewa (hari)">
              <Input inputMode="numeric" defaultValue="14" className="h-11 bg-surface" />
            </Field>
          </div>
        </section>

        <section className="space-y-3">
          <SectionTitle hint="Maksimal 15 foto. Foto pertama menjadi sampul.">Foto</SectionTitle>
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: photosFull ? 7 : 3 }).map((_, i) => (
              <SpacePhoto key={i} art={(["atrium", "booth", "hall", "rooftop"] as const)[i % 4]} label={`Foto ${i + 1}`} className="aspect-square" />
            ))}
            {!photosFull && (
              <button type="button" className="grid aspect-square place-items-center rounded-md border-2 border-dashed border-line-strong bg-surface text-muted-foreground hover:border-brand" aria-label="Tambah foto">
                <ImagePlus className="size-5" aria-hidden="true" />
              </button>
            )}
          </div>
          {photosFull && (
            <Notice tone="danger" title="Foto ke-16 tidak ditambahkan">
              Satu ruang bisa memuat paling banyak 15 foto. Hapus foto yang kurang penting, lalu unggah lagi.
            </Notice>
          )}
        </section>

        <section className="space-y-3">
          <SectionTitle hint="Maksimal 5. Penyelenggara wajib menjawabnya saat mengirim permintaan.">Pertanyaan untuk penyelenggara</SectionTitle>
          {["Apakah ada instalasi lebih tinggi dari 4 meter?", "Merek apa saja yang akan tampil?"].map((q, i) => (
            <div key={q} className="flex items-center gap-2">
              <Input aria-label={`Pertanyaan ${i + 1}`} defaultValue={q} className="h-11 bg-surface" />
              <Button variant="ghost" size="icon" aria-label={`Hapus pertanyaan ${i + 1}`}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm"><Plus className="size-4" />Tambah pertanyaan</Button>
        </section>
      </form>
      <Footer primary="Simpan dan lanjut ke harga" secondary="Duplikat ruang ini" />
    </Shell>
  )
}

/* ---------------- Pricing, add-ons, policy, threshold ---------------- */

function PricingStep({ state }: { state: string }) {
  const staff = state === "staff"
  return (
    <Shell ctx="venue" initials="BS">
      <SetupSteps current={3} />
      <h1 className="text-[22px] font-bold tracking-tight">Harga Atrium Utama</h1>
      <p className="mt-1.5 text-[15px] text-muted-foreground">Masukkan harga sebelum pajak. Spot-In menghitung PPN dan biaya layanan di penawaran.</p>
      <form className="mt-5 space-y-6" onSubmit={(e) => e.preventDefault()}>
        <section className="space-y-4">
          <SectionTitle>Tarif sewa</SectionTitle>
          <Field id="pr-unit" label="Satuan harga">
            <SelectBox options={["Per hari", "Per setengah hari", "Per jam"]} defaultValue="Per hari" className="h-11" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field id="pr-wd" label="Senin–Jumat">
              <Input defaultValue="Rp 20.000.000" className="num h-11 bg-surface" />
            </Field>
            <Field id="pr-we" label="Sabtu–Minggu">
              <Input defaultValue="Rp 25.000.000" className="num h-11 bg-surface" />
            </Field>
          </div>
          <Panel className="space-y-2 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">Musim khusus</p>
              <Button size="sm" variant="ghost" className="text-brand"><Plus className="size-4" />Tambah musim</Button>
            </div>
            <ul className="divide-y divide-line text-sm">
              <li className="flex justify-between gap-2 py-2"><span>Akhir tahun · 18 Des 2026–3 Jan 2027</span><span className="num font-medium">{rp(30_000_000)}/hari</span></li>
              <li className="flex justify-between gap-2 py-2"><span>Lebaran · 16–24 Mar 2027</span><span className="num font-medium">{rp(32_000_000)}/hari</span></li>
            </ul>
          </Panel>
          <Field id="pr-from" label="Harga mulai yang ditampilkan" hint="Selalu tampil di pencarian. Anda bisa memilih untuk menampilkan tarif lengkap juga.">
            <Input defaultValue="Rp 20.000.000 per hari" className="num h-11 bg-surface" />
          </Field>
          <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface p-3">
            <Label htmlFor="pr-full" className="text-sm font-normal">Tampilkan tarif lengkap di halaman ruang</Label>
            <Switch id="pr-full" defaultChecked className="data-[state=checked]:bg-brand" />
          </div>
        </section>

        <section>
          <SectionTitle hint="Berlaku untuk semua ruang di properti ini.">Layanan tambahan</SectionTitle>
          <div className="overflow-x-auto rounded-lg border border-line bg-surface">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Layanan</TableHead>
                  <TableHead>Satuan</TableHead>
                  <TableHead className="text-right">Harga</TableHead>
                  <TableHead>Wajib</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-sm">
                <TableRow><TableCell>Listrik</TableCell><TableCell>per kVA per hari</TableCell><TableCell className="num text-right">{rp(50_000)}</TableCell><TableCell>Ya</TableCell></TableRow>
                <TableRow><TableCell>Keamanan tambahan</TableCell><TableCell>per orang per hari</TableCell><TableCell className="num text-right">{rp(350_000)}</TableCell><TableCell>Tidak</TableCell></TableRow>
                <TableRow><TableCell>Kebersihan</TableCell><TableCell>per hari</TableCell><TableCell className="num text-right">{rp(500_000)}</TableCell><TableCell>Tidak</TableCell></TableRow>
              </TableBody>
            </Table>
          </div>
          <Button variant="outline" size="sm" className="mt-2"><Plus className="size-4" />Tambah layanan</Button>
        </section>

        <section className="space-y-4">
          <SectionTitle>Pajak dan biaya layanan tempat</SectionTitle>
          <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface p-3">
            <div>
              <Label htmlFor="pr-pkp" className="text-sm">Tempat ini PKP</Label>
              <p className="text-[13px] text-muted-foreground">Jika ya, PPN efektif 11% ditambahkan ke sewa dan layanan kena pajak.</p>
            </div>
            <Switch id="pr-pkp" defaultChecked className="data-[state=checked]:bg-brand" />
          </div>
          <Field id="pr-sc" label="Biaya layanan tempat (%)" optional>
            <Input defaultValue="0" inputMode="decimal" className="h-11 bg-surface" />
          </Field>
        </section>

        <section className="space-y-3">
          <SectionTitle hint="Menentukan berapa yang kembali ke penyelenggara jika mereka membatalkan.">Kebijakan pembatalan</SectionTitle>
          <RadioGroup defaultValue="sedang" className="gap-2">
            {[
              ["fleksibel", "Fleksibel", "100% kembali sampai 14 hari sebelum acara, 50% pada 7–13 hari."],
              ["sedang", "Sedang", "100% kembali sampai 30 hari sebelum acara, 50% pada 14–29 hari."],
              ["ketat", "Ketat", "50% kembali jika batal 30 hari atau lebih sebelum acara."],
            ].map(([v, t, d]) => (
              <Label key={v} htmlFor={`pol-${v}`} className="flex cursor-pointer items-start gap-3 rounded-lg border border-line bg-surface p-3 font-normal has-[[data-state=checked]]:border-brand">
                <RadioGroupItem id={`pol-${v}`} value={v} className="mt-0.5 border-[#8f8778] text-brand" />
                <span><span className="block font-semibold">{t}</span><span className="text-[13px] text-muted-foreground">{d}</span></span>
              </Label>
            ))}
          </RadioGroup>
        </section>

        <section className="space-y-3">
          <SectionTitle>Batas persetujuan penawaran</SectionTitle>
          {staff ? (
            <Notice tone="neutral" title="Hanya Pemilik yang bisa mengubah batas ini">
              Saat ini penawaran senilai {rp(50_000_000)} atau lebih perlu persetujuan Lestari Hadiwijaya (Pemilik) sebelum terkirim.
            </Notice>
          ) : (
            <Field id="pr-thr" label="Penawaran mulai nilai ini perlu persetujuan Pemilik" optional hint="Kosongkan jika semua penawaran boleh langsung dikirim oleh Staf.">
              <Input defaultValue="Rp 50.000.000" className="num h-11 bg-surface" />
            </Field>
          )}
        </section>
      </form>
      <Footer primary="Simpan dan lanjut ke dokumen" />
    </Shell>
  )
}

/* ---------------- Required documents ---------------- */

function DocsStep({ state }: { state: string }) {
  const empty = state === "empty"
  return (
    <Shell ctx="venue" initials="BS">
      <SetupSteps current={4} />
      <h1 className="text-[22px] font-bold tracking-tight">Dokumen yang harus dikirim penyelenggara</h1>
      <p className="mt-1.5 text-[15px] text-muted-foreground">
        Setiap pemesanan otomatis mendapat daftar ini, lengkap dengan tenggat yang dihitung dari tanggal acara. Jangan minta KTP, NPWP atau nomor rekening.
      </p>
      {empty ? (
        <div className="mt-5 rounded-lg border border-dashed border-line-strong bg-surface p-5">
          <p className="font-semibold">Belum ada dokumen wajib</p>
          <p className="mt-1 text-sm text-muted-foreground">Contoh yang biasa diminta mal: denah tata letak final, asuransi tanggung gugat, dan susunan acara.</p>
          <Button className="mt-3" variant="outline"><Plus className="size-4" />Tambah dokumen</Button>
        </div>
      ) : (
        <ul className="mt-5 space-y-2">
          {[
            ["Denah tata letak final", true, 14],
            ["Asuransi tanggung gugat", true, 7],
            ["Susunan acara (rundown)", false, 3],
          ].map(([n, m, d]) => (
            <li key={n as string} className="flex items-center gap-3 rounded-lg border border-line bg-surface p-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{n}</p>
                <p className="text-[13px] text-muted-foreground">
                  {m ? "Wajib" : "Opsional"} · paling lambat {d} hari sebelum acara
                </p>
              </div>
              <Button variant="ghost" size="sm" className="text-brand">Ubah</Button>
            </li>
          ))}
        </ul>
      )}
      {!empty && <Button variant="outline" size="sm" className="mt-3"><Plus className="size-4" />Tambah dokumen</Button>}
      <Footer primary="Simpan dan lanjut ke tim" />
    </Shell>
  )
}

/* ---------------- Team invite ---------------- */

function TeamStep({ state }: { state: string }) {
  return (
    <Shell ctx="venue" initials="BS">
      <SetupSteps current={5} />
      <h1 className="text-[22px] font-bold tracking-tight">Undang rekan kerja</h1>
      <p className="mt-1.5 text-[15px] text-muted-foreground">Langkah ini boleh dilewati. Pemilik tunggal seperti pemilik aula pribadi tidak perlu tim.</p>
      <form className="mt-5 space-y-4" onSubmit={(e) => e.preventDefault()}>
        <Field id="tm-email" label="Email rekan" error={state === "error" ? "Email ini sudah menjadi anggota Mal Cempaka Raya." : undefined}>
          <Input type="email" defaultValue="anisa.r@cempakaraya.co.id" className="h-11 bg-surface" />
        </Field>
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Peran</legend>
          <RadioGroup defaultValue="staf" className="gap-2">
            {[
              ["staf", "Staf", "Menjawab permintaan, membuat penawaran, mengatur kalender dan meninjau dokumen."],
              ["viewer", "Pengamat", "Hanya melihat permintaan, pemesanan dan buku besar."],
              ["owner", "Pemilik", "Semua akses, termasuk mengatur tim, batas persetujuan dan membatalkan pemesanan."],
            ].map(([v, t, d]) => (
              <Label key={v} htmlFor={`role-${v}`} className="flex cursor-pointer items-start gap-3 rounded-lg border border-line bg-surface p-3 font-normal has-[[data-state=checked]]:border-brand">
                <RadioGroupItem id={`role-${v}`} value={v} className="mt-0.5 border-[#8f8778] text-brand" />
                <span><span className="block font-semibold">{t}</span><span className="text-[13px] text-muted-foreground">{d}</span></span>
              </Label>
            ))}
          </RadioGroup>
        </fieldset>
        <Button variant="outline" className="w-full">Kirim undangan</Button>
      </form>
      <div className="mt-6">
        <SectionTitle>Anggota dan undangan</SectionTitle>
        <ul className="divide-y divide-line rounded-lg border border-line bg-surface text-sm">
          <li className="flex items-center justify-between gap-2 p-3"><span><b>Lestari Hadiwijaya</b><br /><span className="text-muted-foreground">Pemilik</span></span><Status tone="positive">Aktif</Status></li>
          <li className="flex items-center justify-between gap-2 p-3"><span><b>Budi Santoso</b> (Anda)<br /><span className="text-muted-foreground">Staf</span></span><Status tone="positive">Aktif</Status></li>
          <li className="flex items-center justify-between gap-2 p-3">
            <span><b>anisa.r@cempakaraya.co.id</b><br /><span className="text-muted-foreground">Staf · undangan berlaku sampai 13 Nov 2026</span></span>
            {state === "sent" ? <Status tone="waiting">Terkirim</Status> : <Button variant="ghost" size="sm" className="text-brand">Kirim ulang</Button>}
          </li>
        </ul>
      </div>
      <Footer primary="Lanjut ke peninjauan" secondary="Lewati, saya bekerja sendiri" />
    </Shell>
  )
}

/* ---------------- Submit for review ---------------- */

function SubmitStep({ state }: { state: string }) {
  if (state === "loading") {
    return (
      <Shell ctx="venue" initials="BS">
        <SetupSteps current={6} />
        <SkeletonList rows={4} label="Memeriksa kelengkapan" />
      </Shell>
    )
  }
  const submitted = state === "submitted"
  const blocked = state === "blocked"
  const checks = [
    ["Profil tempat", true],
    ["Properti dan lokasi di peta", !blocked],
    ["2 ruang dengan foto dan harga", true],
    ["3 dokumen wajib", true],
    ["Kebijakan pembatalan", true],
  ] as const
  return (
    <Shell ctx="venue" initials="BS">
      <SetupSteps current={6} />
      <h1 className="text-[22px] font-bold tracking-tight">{submitted ? "Tempat Anda sedang ditinjau" : "Periksa sebelum dikirim"}</h1>
      <p className="mt-1.5 text-[15px] text-muted-foreground">
        {submitted
          ? "Tim Spot-In akan menghubungi Anda lewat telepon atau chat dalam 2 hari kerja untuk verifikasi singkat. Tidak ada dokumen yang perlu diunggah."
          : "Setelah dikirim, tim Spot-In memverifikasi tempat Anda lewat telepon atau chat. Ruang baru muncul di pencarian setelah disetujui."}
      </p>
      {submitted && (
        <Notice tone="waiting" className="mt-4" title="Dikirim Jumat, 6 Nov 2026 pukul 10.20 WIB">
          Paling lambat ditinjau Selasa, 10 Nov 2026. Selama menunggu, Anda masih bisa mengubah foto dan deskripsi.
        </Notice>
      )}
      {blocked && (
        <Notice tone="danger" className="mt-4" title="Lokasi properti belum ditandai">
          Ruang tidak bisa dicari tanpa titik di peta. Tandai lokasi dulu, lalu kirim lagi.
          <div className="mt-2"><Button size="sm" variant="outline">Tandai lokasi di peta</Button></div>
        </Notice>
      )}
      <ul className="mt-5 space-y-2">
        {checks.map(([t, ok]) => (
          <li key={t} className="flex items-center gap-3 rounded-lg border border-line bg-surface p-3 text-sm">
            {ok ? <Check className="size-4 text-brand" aria-hidden="true" /> : <CircleAlert className="size-4 text-danger" aria-hidden="true" />}
            <span className="flex-1">{t}</span>
            <span className={cn("text-xs font-semibold", ok ? "text-brand" : "text-danger")}>{ok ? "Lengkap" : "Belum lengkap"}</span>
          </li>
        ))}
      </ul>
      <Panel className="mt-4 text-sm">
        <p className="flex items-center gap-1.5 font-semibold">
          Status ruang
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" aria-label="Penjelasan status ruang" className="text-muted-foreground"><Info className="size-4" /></button>
            </TooltipTrigger>
            <TooltipContent className="max-w-60">Draf → Ditinjau → Tayang. Ruang yang tayang bisa Anda sembunyikan kapan saja.</TooltipContent>
          </Tooltip>
        </p>
        <ul className="mt-2 space-y-1.5">
          <li className="flex justify-between"><span>Atrium Utama</span><Status tone={submitted ? "waiting" : "neutral"}>{submitted ? "Ditinjau" : "Draf"}</Status></li>
          <li className="flex justify-between"><span>Promo Spot Lobi Selatan</span><Status tone={submitted ? "waiting" : "neutral"}>{submitted ? "Ditinjau" : "Draf"}</Status></li>
        </ul>
      </Panel>
      {!submitted && <Footer primary="Kirim untuk ditinjau" secondary="Kembali ke ruang" />}
      {submitted && (
        <Button variant="outline" className="mt-6 w-full"><Copy className="size-4" />Duplikat ruang untuk ruang lain</Button>
      )}
    </Shell>
  )
}

export const onboardingScreens: ScreenDef[] = [
  { id: "onb-operator", title: "Penyiapan: profil tempat", section: "6.1", fr: ["FR-M2-01", "FR-M2-02", "FR-M1-05"], device: "mobile", role: "Pengelola (Pemilik/Staf)", summary: "Nama tampilan, nama badan usaha (teks saja), kota dan telepon opsional.", states: [{ id: "default", label: "Formulir" }], render: () => <OperatorStep /> },
  {
    id: "onb-property",
    title: "Penyiapan: properti dan titik peta",
    section: "6.1",
    fr: ["FR-M4-01", "FR-M4-04", "FR-M4-08"],
    device: "mobile",
    role: "Pengelola",
    summary: "Alamat, titik peta wajib, zona waktu dari titik, jam, aturan dan foto.",
    states: [
      { id: "default", label: "Terisi" },
      { id: "no-pin", label: "Belum ada titik", ref: "AC-M4/M5-1" },
      { id: "map-down", label: "Peta tidak bisa dimuat", ref: "§12.7" },
      { id: "offline", label: "Offline", ref: "§12.7" },
    ],
    render: (s) => <PropertyStep state={s} />,
  },
  {
    id: "onb-space",
    title: "Penyiapan: ruang",
    section: "6.1",
    fr: ["FR-M4-02", "FR-M4-03", "FR-M4-04", "FR-M4-09", "FR-M4-11", "FR-M4-16"],
    device: "mobile",
    role: "Pengelola",
    summary: "Spesifikasi, kapasitas per tata letak, daya, kegiatan yang diizinkan, foto, pertanyaan.",
    states: [
      { id: "default", label: "Terisi" },
      { id: "photos-full", label: "Batas 15 foto", ref: "AC-M4/M5-2" },
    ],
    render: (s) => <SpaceStep state={s} />,
  },
  {
    id: "onb-pricing",
    title: "Penyiapan: harga, layanan tambahan, kebijakan",
    section: "6.1",
    fr: ["FR-M5-01", "FR-M5-02", "FR-M5-04", "FR-M5-05", "FR-M5-06", "FR-M18-03", "FR-M2-06"],
    device: "mobile",
    role: "Pengelola",
    summary: "Tarif hari kerja/akhir pekan, musim, layanan tambahan, PKP, kebijakan pembatalan, batas persetujuan.",
    states: [
      { id: "default", label: "Sebagai Pemilik" },
      { id: "staff", label: "Sebagai Staf (tanpa akses batas)", ref: "§4.3" },
    ],
    render: (s) => <PricingStep state={s} />,
  },
  {
    id: "onb-docs",
    title: "Penyiapan: dokumen wajib",
    section: "6.1",
    fr: ["FR-M4-08", "FR-M38-04"],
    device: "mobile",
    role: "Pengelola",
    summary: "Daftar dokumen yang harus dikirim penyelenggara dan tenggatnya.",
    states: [
      { id: "default", label: "Terisi" },
      { id: "empty", label: "Kosong" },
    ],
    render: (s) => <DocsStep state={s} />,
  },
  {
    id: "onb-team",
    title: "Penyiapan: undang tim",
    section: "6.1",
    fr: ["FR-M2-03", "FR-M2-08"],
    device: "mobile",
    role: "Pengelola (Pemilik)",
    summary: "Undang Staf atau Pengamat; undangan berlaku 7 hari.",
    states: [
      { id: "default", label: "Formulir" },
      { id: "sent", label: "Undangan terkirim" },
      { id: "error", label: "Sudah anggota" },
    ],
    render: (s) => <TeamStep state={s} />,
  },
  {
    id: "onb-submit",
    title: "Penyiapan: kirim untuk ditinjau",
    section: "6.1",
    fr: ["FR-M4-10", "FR-M3-02", "FR-M3-03"],
    device: "mobile",
    role: "Pengelola",
    summary: "Daftar periksa kelengkapan, kirim, lalu status menunggu verifikasi.",
    states: [
      { id: "default", label: "Siap dikirim" },
      { id: "loading", label: "Memuat" },
      { id: "blocked", label: "Belum lengkap", ref: "AC-M4/M5-1" },
      { id: "submitted", label: "Sedang ditinjau" },
    ],
    render: (s) => <SubmitStep state={s} />,
  },
]
