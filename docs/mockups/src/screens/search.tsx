import { Bookmark, CalendarDays, ChevronLeft, ChevronRight, FileText, Link2, List, Map as MapIcon, Paperclip, Plus, Search, SlidersHorizontal, Upload, Users, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  CheckRow,
  Facts,
  Field,
  MapCanvas,
  MoneyRow,
  Notice,
  Panel,
  SectionTitle,
  SelectBox,
  SkeletonList,
  SpacePhoto,
  StateBlock,
  Status,
  VerifiedBadge,
  Divider,
  ErrorSummary,
} from "@/components/kit"
import { cn } from "@/lib/utils"
import { rp, searchResults, space } from "@/lib/data"
import type { ScreenDef } from "@/registry"
import { Shell } from "./shell"

type Result = (typeof searchResults)[number]

function Availability({ a }: { a: Result["availability"] }) {
  return a === "available" ? <Status tone="positive">Tersedia 12–14 Des</Status> : <Status tone="waiting">Ketersediaan terbatas – kirim permintaan</Status>
}

function ResultCard({ r }: { r: Result }) {
  return (
    <article className="flex gap-3 rounded-lg border border-line bg-surface p-3">
      <SpacePhoto art={r.art} label={`Foto ${r.name}`} className="h-24 w-24 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="leading-snug font-semibold">
            <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-brand">{r.name}</a>
          </h3>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" aria-label={`Simpan ${r.name} ke daftar pilihan`} className="-mt-1 -mr-1 grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-sunken hover:text-brand">
                <Bookmark className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Simpan ke daftar pilihan</TooltipContent>
          </Tooltip>
        </div>
        <p className="text-[13px] text-muted-foreground">{r.property} · {r.area}</p>
        <p className="mt-1 flex flex-wrap gap-x-3 text-[13px] text-ink">
          <span className="inline-flex items-center gap-1"><Users className="size-3.5 text-muted-foreground" aria-hidden="true" />{r.capacity} orang</span>
          <span className="inline-flex items-center gap-1"><Zap className="size-3.5 text-muted-foreground" aria-hidden="true" />{r.power} kVA</span>
        </p>
        <p className="mt-1 text-sm"><span className="text-muted-foreground">Mulai </span><b className="num">{rp(r.from)}</b><span className="text-muted-foreground"> {r.unit}</span></p>
        <div className="mt-1.5"><Availability a={r.availability} /></div>
      </div>
    </article>
  )
}

function SearchBar({ value = "aula jaksel" }: { value?: string }) {
  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute top-3 left-3 size-4 text-muted-foreground" aria-hidden="true" />
        <Input aria-label="Cari nama ruang, tempat, kota atau area" defaultValue={value} className="h-11 bg-surface pl-9" />
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="shrink-0 bg-surface"><CalendarDays className="size-4" />12–14 Des</Button>
          </PopoverTrigger>
          <PopoverContent className="w-72">
            <MiniCalendar />
          </PopoverContent>
        </Popover>
        <Button variant="outline" size="sm" className="shrink-0 bg-surface"><Users className="size-4" />300 orang</Button>
        <Button variant="outline" size="sm" className="shrink-0 bg-surface">≤ Rp 100 jt</Button>
        <Button variant="outline" size="sm" className="shrink-0 bg-surface"><SlidersHorizontal className="size-4" />Filter (2)</Button>
      </div>
    </div>
  )
}

function MiniCalendar({ venue }: { venue?: boolean }) {
  // Desember 2026 starts on Tuesday.
  const days = Array.from({ length: 31 }, (_, i) => i + 1)
  const lead = 1
  const stateOf = (d: number): "avail" | "unavail" | "limited" | "sel" | "closed" => {
    if (d >= 12 && d <= 14) return "sel"
    if (d === 5 || d === 6 || d === 19 || d === 20) return "unavail"
    if (d === 26 || d === 27) return "limited"
    if (d === 25) return "closed"
    return "avail"
  }
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <Button variant="ghost" size="icon-sm" aria-label="Bulan sebelumnya"><ChevronLeft className="size-4" /></Button>
        <p className="text-sm font-semibold">Desember 2026</p>
        <Button variant="ghost" size="icon-sm" aria-label="Bulan berikutnya"><ChevronRight className="size-4" /></Button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs" role="grid" aria-label="Ketersediaan Desember 2026">
        {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((d) => (
          <div key={d} className="py-1 font-medium text-muted-foreground" role="columnheader">{d}</div>
        ))}
        {Array.from({ length: lead }).map((_, i) => <div key={`l${i}`} />)}
        {days.map((d) => {
          const s = stateOf(d)
          const label = s === "unavail" ? "tidak tersedia" : s === "limited" ? "terbatas" : s === "sel" ? "dipilih" : s === "closed" ? "tutup" : "tersedia"
          return (
            <button
              key={d}
              type="button"
              role="gridcell"
              aria-label={`${d} Desember, ${venue && s === "unavail" ? "dipesan" : label}`}
              aria-selected={s === "sel"}
              disabled={s === "unavail" || s === "closed"}
              className={cn(
                "num relative aspect-square rounded-md text-sm",
                s === "avail" && "hover:bg-brand-soft",
                s === "sel" && "bg-brand font-semibold text-white",
                s === "unavail" && "text-muted-foreground line-through decoration-1",
                s === "closed" && "text-muted-foreground line-through",
                s === "limited" && "bg-warm-soft text-warm-ink",
              )}
            >
              {d}
            </button>
          )
        })}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <li className="flex items-center gap-1"><span className="size-3 rounded-sm border border-line bg-surface" />Tersedia</li>
        <li className="flex items-center gap-1"><span className="size-3 rounded-sm bg-warm-soft" />Terbatas – kirim permintaan</li>
        <li className="flex items-center gap-1"><span className="text-[11px] line-through">17</span>Tidak tersedia</li>
      </ul>
    </div>
  )
}

/* ---------------- Search ---------------- */

function SearchScreen({ state }: { state: string }) {
  if (state === "map") {
    return (
      <Shell active="Cari ruang">
        <SearchBar value="hall jakarta selatan" />
        <div className="mt-3 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">4 ruang di peta</p>
          <ViewToggle value="map" />
        </div>
        <MapCanvas
          className="mt-3 h-[430px]"
          activePin={0}
          pins={[
            { x: 34, y: 30, label: "Atrium Utama, Rp 20 jt, dipilih", price: "Rp 20 jt" },
            { x: 72, y: 40, label: "Rooftop Barat, Rp 18 jt, ketersediaan terbatas", price: "Rp 18 jt", muted: true },
            { x: 20, y: 42, label: "Aula Utama, Rp 12,5 jt", price: "Rp 12,5 jt" },
            { x: 55, y: 18, label: "Promo Spot Lobi Selatan, Rp 3,5 jt", price: "Rp 3,5 jt" },
          ]}
        >
          <div className="absolute inset-x-3 bottom-8">
            <ResultCard r={searchResults[0]} />
          </div>
        </MapCanvas>
      </Shell>
    )
  }
  if (state === "loading") {
    return (
      <Shell active="Cari ruang">
        <SearchBar />
        <div className="mt-4"><SkeletonList rows={4} label="Mencari ruang" /></div>
      </Shell>
    )
  }
  if (state === "empty") {
    return (
      <Shell active="Cari ruang">
        <SearchBar value="ballroom jaksel" />
        <div className="mt-4">
          <StateBlock icon={Search} title="Belum ada ruang yang cocok dengan semua filter" action={<><Button>Hapus filter daya listrik</Button><Button variant="outline">Lihat juga yang terbatas</Button></>}>
            <p>Tidak ada ballroom di Jakarta Selatan yang tersedia 12–14 Des dengan daya 30 kVA atau lebih. Melonggarkan satu filter biasanya cukup untuk memunculkan pilihan.</p>
          </StateBlock>
        </div>
      </Shell>
    )
  }
  if (state === "error") {
    return (
      <Shell active="Cari ruang">
        <SearchBar />
        <div className="mt-4">
          <StateBlock tone="danger" title="Hasil pencarian tidak bisa dimuat" action={<Button>Coba lagi</Button>}>
            <p>Ada gangguan di server kami. Filter Anda tetap tersimpan. Jika terus terjadi, sebutkan kode SRCH-7F2A saat menghubungi tim pilot.</p>
          </StateBlock>
        </div>
      </Shell>
    )
  }
  const filters = state === "filters"
  return (
    <Shell active="Cari ruang">
      <SearchBar value="aul jaksel" />
      <p className="mt-2 text-sm text-muted-foreground">
        Menampilkan hasil untuk <b className="text-ink">aula Jakarta Selatan</b>. <a href="#" className="font-medium text-brand underline">Cari persis "aul jaksel"</a>
      </p>
      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="text-sm"><b>4 ruang</b> <span className="text-muted-foreground">tersedia 12–14 Des</span></p>
        <ViewToggle value="list" />
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-line bg-surface px-3 py-2">
        <Label htmlFor="limited" className="text-sm font-normal">Tampilkan juga yang ketersediaannya terbatas</Label>
        <Switch id="limited" defaultChecked className="data-[state=checked]:bg-brand" />
      </div>
      <div className="mt-3 space-y-3">
        {searchResults.map((r) => <ResultCard key={r.id} r={r} />)}
      </div>

      <Sheet open={filters}>
        <SheetContent side="bottom" className="max-h-[85%] overflow-y-auto rounded-t-xl">
          <SheetHeader>
            <SheetTitle>Filter</SheetTitle>
            <SheetDescription>Hasil diperbarui setelah Anda menekan Tampilkan.</SheetDescription>
          </SheetHeader>
          <div className="space-y-5 px-4">
            <Field id="f-type" label="Jenis ruang"><SelectBox options={["Semua jenis", "Atrium", "Aula/ballroom", "Area luar ruang", "Booth/promo spot"]} defaultValue="Semua jenis" className="h-11" /></Field>
            <Field id="f-kva" label="Daya listrik minimal" hint="Pameran dengan mesin kopi biasanya butuh 30 kVA atau lebih."><SelectBox options={["Berapa saja", "15 kVA", "30 kVA", "50 kVA"]} defaultValue="30 kVA" className="h-11" /></Field>
            <fieldset className="space-y-2.5">
              <legend className="mb-1 text-sm font-medium">Kegiatan yang harus diizinkan</legend>
              <CheckRow id="f-fnb" defaultChecked>Sampling makanan dan minuman</CheckRow>
              <CheckRow id="f-sell">Berjualan</CheckRow>
              <CheckRow id="f-music">Musik langsung</CheckRow>
              <CheckRow id="f-fire">Memasak atau api terbuka</CheckRow>
            </fieldset>
            <Field id="f-env" label="Lingkungan"><SelectBox options={["Semua", "Dalam ruang", "Luar ruang", "Beratap"]} defaultValue="Semua" className="h-11" /></Field>
            <CheckRow id="f-ver" defaultChecked>Hanya tempat yang terverifikasi Spot-In</CheckRow>
            <Field id="f-sort" label="Urutkan"><SelectBox options={["Paling sesuai", "Harga terendah", "Jarak terdekat", "Terbaru"]} defaultValue="Paling sesuai" className="h-11" /></Field>
          </div>
          <SheetFooter className="flex-row border-t border-line">
            <Button variant="ghost" className="text-brand">Hapus semua</Button>
            <Button className="flex-1">Tampilkan 4 ruang</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </Shell>
  )
}

function ViewToggle({ value }: { value: "list" | "map" }) {
  return (
    <ToggleGroup type="single" defaultValue={value} variant="outline" size="sm" aria-label="Tampilan hasil" className="bg-surface">
      <ToggleGroupItem value="list" aria-label="Daftar" className="data-[state=on]:bg-brand-soft data-[state=on]:text-brand"><List className="size-4" />Daftar</ToggleGroupItem>
      <ToggleGroupItem value="map" aria-label="Peta" className="data-[state=on]:bg-brand-soft data-[state=on]:text-brand"><MapIcon className="size-4" />Peta</ToggleGroupItem>
    </ToggleGroup>
  )
}

/* ---------------- Space page ---------------- */

function SpacePage({ state }: { state: string }) {
  if (state === "loading") {
    return (
      <Shell>
        <div className="aspect-[4/3] animate-pulse rounded-lg bg-sunken" />
        <div className="mt-4"><SkeletonList rows={2} label="Memuat halaman ruang" /></div>
      </Shell>
    )
  }
  if (state === "notfound") {
    return (
      <Shell>
        <StateBlock title="Ruang ini sudah tidak tersedia" action={<Button>Cari ruang serupa</Button>}>
          <p>Pengelola menyembunyikan ruang ini atau tautannya salah. Pencarian dengan tanggal dan kota yang sama mungkin menemukan pilihan lain.</p>
        </StateBlock>
      </Shell>
    )
  }
  const estimate = state === "estimate"
  return (
    <Shell>
      <div className="-mx-4 -mt-5">
        <SpacePhoto art="atrium" label="Atrium Utama Mal Cempaka Raya, foto 1 dari 8" className="aspect-[4/3] rounded-none" />
      </div>
      <p className="mt-2 text-right text-xs text-muted-foreground">Foto 1 dari 8</p>
      <div className="mt-2">
        <VerifiedBadge />
        <h1 className="mt-1 text-[22px] leading-tight font-bold tracking-tight">Atrium Utama</h1>
        <p className="text-[15px] text-muted-foreground">Mal Cempaka Raya · Tebet, Jakarta Selatan</p>
        <p className="mt-2 text-[15px]">Mulai <b className="num">{rp(20_000_000)}</b> per hari</p>
      </div>
      <div className="mt-4 flex gap-2">
        <Button className="h-11 flex-1">Kirim permintaan</Button>
        <Button variant="outline" className="h-11 bg-surface" aria-label="Simpan ke daftar pilihan"><Bookmark className="size-4" />Simpan</Button>
      </div>

      <Divider className="my-6" />
      <section aria-labelledby="sp-specs">
        <SectionTitle id="sp-specs">Spesifikasi</SectionTitle>
        <Facts
          cols={2}
          items={[
            { k: "Luas", v: `${space.size} m²` },
            { k: "Tinggi plafon", v: `${space.ceiling} m` },
            { k: "Kapasitas berdiri", v: "600 orang" },
            { k: "Teater / kelas", v: "350 / 180 orang" },
            { k: "Booth", v: "24 booth" },
            { k: "Daya listrik", v: "40 kVA" },
            { k: "Lokasi", v: "GF, zona tengah, dalam ruang" },
            { k: "Lama sewa", v: "1–14 hari" },
          ]}
        />
        <p className="mt-3 text-sm"><span className="text-muted-foreground">Diizinkan:</span> berjualan, sampling makanan dan minuman, musik langsung.</p>
        <p className="text-sm"><span className="text-muted-foreground">Tidak diizinkan:</span> api terbuka, kendaraan.</p>
      </section>

      <Divider className="my-6" />
      <section aria-labelledby="sp-cal">
        <SectionTitle id="sp-cal" hint="Hijau berarti bisa diminta. Tanggal terbatas sedang ditahan penyelenggara lain, tetapi Anda tetap bisa mengirim permintaan.">Ketersediaan</SectionTitle>
        <Panel><MiniCalendar /></Panel>
      </section>

      <Divider className="my-6" />
      <section aria-labelledby="sp-rate">
        <SectionTitle id="sp-rate">Tarif</SectionTitle>
        <Panel className="divide-y divide-line py-1">
          <MoneyRow label="Senin–Jumat" value={`${rp(20_000_000)}/hari`} />
          <MoneyRow label="Sabtu–Minggu" value={`${rp(25_000_000)}/hari`} />
          <MoneyRow label="Akhir tahun (18 Des–3 Jan)" value={`${rp(30_000_000)}/hari`} />
          <MoneyRow label="Listrik (wajib)" value={`${rp(50_000)}/kVA/hari`} />
        </Panel>
        <p className="mt-2 text-[13px] text-muted-foreground">Harga sebelum PPN. Tempat ini PKP, jadi PPN efektif 11% ditambahkan.</p>
      </section>

      <Divider className="my-6" />
      <section aria-labelledby="sp-est">
        <SectionTitle id="sp-est">Perkiraan biaya</SectionTitle>
        {estimate ? (
          <Panel>
            <p className="text-sm text-muted-foreground">Sab–Sen, 12–14 Des 2026 · listrik 40 kVA</p>
            <div className="mt-2 divide-y divide-line">
              <MoneyRow label="Sewa 3 hari" sub="Sab dan Min tarif akhir pekan, Sen tarif hari kerja" value={rp(70_000_000)} />
              <MoneyRow label="Listrik 40 kVA × 3 hari" value={rp(6_000_000)} />
              <MoneyRow label="PPN" value={rp(8_360_000)} />
              <MoneyRow label="Biaya layanan Spot-In (3%)" value={rp(2_280_000)} />
              <MoneyRow label="Perkiraan total" value={rp(86_640_000)} strong />
            </div>
            <Notice tone="neutral" className="mt-3" title="Ini perkiraan, bukan penawaran">
              Harga akhir ada di penawaran dari pengelola dan bisa berbeda, misalnya karena layanan tambahan atau diskon.
            </Notice>
          </Panel>
        ) : (
          <Panel className="space-y-3">
            <p className="text-sm text-muted-foreground">Pilih tanggal dan layanan untuk melihat perkiraan. Perkiraan tidak mengikat.</p>
            <Button variant="outline" className="w-full">Hitung perkiraan untuk 12–14 Des</Button>
          </Panel>
        )}
      </section>

      <Divider className="my-6" />
      <section aria-labelledby="sp-rules" className="space-y-4">
        <div>
          <SectionTitle id="sp-rules">Aturan tempat</SectionTitle>
          <p className="text-sm leading-relaxed">Dilarang api terbuka di atrium. Musik maksimal 85 dB sampai 21.00. Semua instalasi lolos pemeriksaan teknis H-1.</p>
        </div>
        <div>
          <SectionTitle>Dokumen yang diminta setelah pemesanan</SectionTitle>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            <li>Denah tata letak final, 14 hari sebelum acara (wajib)</li>
            <li>Asuransi tanggung gugat, 7 hari sebelum acara (wajib)</li>
            <li>Susunan acara, 3 hari sebelum acara</li>
          </ul>
        </div>
        <div>
          <SectionTitle>Kebijakan pembatalan: Sedang</SectionTitle>
          <p className="text-sm">100% kembali jika batal 30 hari atau lebih sebelum acara, 50% jika 14–29 hari, setelah itu tidak ada pengembalian.</p>
        </div>
        <div>
          <SectionTitle>Lokasi</SectionTitle>
          <MapCanvas className="h-40" pins={[{ x: 50, y: 55, label: "Mal Cempaka Raya" }]} />
          <p className="mt-2 text-sm text-muted-foreground">Jl. Cempaka Raya No. 18, Tebet, Jakarta Selatan</p>
        </div>
      </section>
    </Shell>
  )
}

/* ---------------- Shortlist + share ---------------- */

function Shortlist({ state }: { state: string }) {
  if (state === "empty") {
    return (
      <Shell active="Daftar pilihan">
        <h1 className="text-[22px] font-bold tracking-tight">Daftar pilihan</h1>
        <div className="mt-4">
          <StateBlock icon={Bookmark} title="Belum ada ruang yang disimpan" action={<Button>Cari ruang</Button>}>
            <p>Tekan ikon simpan di hasil pencarian untuk mengumpulkan kandidat, lalu bagikan ke klien atau kirim permintaan ke beberapa ruang sekaligus.</p>
          </StateBlock>
        </div>
      </Shell>
    )
  }
  const share = state === "share"
  return (
    <Shell active="Daftar pilihan">
      <h1 className="text-[22px] font-bold tracking-tight">Pekan Kopi – kandidat ruang</h1>
      <p className="mt-1 text-[15px] text-muted-foreground">3 ruang · dibuat oleh Rina</p>
      <div className="mt-4 flex gap-2">
        <Button className="flex-1">Kirim permintaan ke 3 ruang</Button>
        <Button variant="outline" className="bg-surface"><Link2 className="size-4" />Bagikan</Button>
      </div>
      <ul className="mt-4 space-y-3">
        {searchResults.slice(0, 3).map((r, i) => (
          <li key={r.id} className="rounded-lg border border-line bg-surface p-3">
            <div className="flex gap-3">
              <CheckRow id={`sl-${r.id}`} defaultChecked><span className="sr-only">Pilih {r.name}</span></CheckRow>
              <SpacePhoto art={r.art} label={r.name} className="size-16 shrink-0" />
              <div className="min-w-0">
                <p className="font-semibold">{r.name}</p>
                <p className="text-[13px] text-muted-foreground">{r.property}</p>
                <p className="num text-sm">Mulai {rp(r.from)}/hari</p>
              </div>
            </div>
            <Field id={`note-${r.id}`} label="Catatan" optional className="mt-3">
              <Input defaultValue={["Paling strategis, dekat pintu MRT", "Bagus untuk sore hari, tapi tanpa atap", "Paling hemat, daya listrik terbatas"][i]} className="bg-surface" />
            </Field>
          </li>
        ))}
      </ul>

      <Sheet open={share}>
        <SheetContent side="bottom" className="rounded-t-xl">
          <SheetHeader>
            <SheetTitle>Bagikan daftar ke klien</SheetTitle>
            <SheetDescription>Siapa pun yang punya tautan bisa melihat ruang, catatan dan perkiraan harga tanpa masuk. Pesan dan penawaran tidak ikut terlihat.</SheetDescription>
          </SheetHeader>
          <div className="space-y-3 px-4">
            <div className="flex gap-2">
              <Input readOnly aria-label="Tautan bagikan" value="spot-in.id/s/k7Qm2xPa" className="bg-sunken" />
              <Button>Salin tautan</Button>
            </div>
            <p className="text-[13px] text-muted-foreground">Dibuat 6 Nov 2026. Anda bisa mencabut tautan kapan saja; setelah dicabut, tautan berhenti bekerja.</p>
          </div>
          <SheetFooter className="border-t border-line">
            <Button variant="outline" className="text-danger">Cabut tautan</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </Shell>
  )
}

function SharedShortlist({ state }: { state: string }) {
  if (state === "revoked") {
    return (
      <Shell ctx="public">
        <StateBlock title="Tautan tidak tersedia">
          <p>Pemilik daftar ini sudah mencabut tautannya. Minta tautan baru kepada orang yang membagikannya.</p>
        </StateBlock>
      </Shell>
    )
  }
  return (
    <Shell ctx="public">
      <p className="text-sm text-muted-foreground">Dibagikan oleh Rina Wulandari, PT Lintas Acara Kreatif</p>
      <h1 className="mt-1 text-[22px] font-bold tracking-tight">Pekan Kopi – kandidat ruang</h1>
      <p className="mt-1 text-[15px] text-muted-foreground">Hanya untuk dilihat. Harga adalah perkiraan dari tarif tempat, bukan penawaran.</p>
      <ul className="mt-4 space-y-3">
        {searchResults.slice(0, 3).map((r, i) => (
          <li key={r.id} className="rounded-lg border border-line bg-surface p-3">
            <div className="flex gap-3">
              <SpacePhoto art={r.art} label={r.name} className="size-20 shrink-0" />
              <div className="min-w-0">
                <p className="font-semibold">{r.name}</p>
                <p className="text-[13px] text-muted-foreground">{r.property} · {r.area}</p>
                <p className="num mt-1 text-sm">Mulai {rp(r.from)}/hari · {r.capacity} orang</p>
              </div>
            </div>
            <p className="mt-2 rounded-md bg-sunken px-3 py-2 text-sm"><span className="text-muted-foreground">Catatan Rina: </span>{["Paling strategis, dekat pintu MRT", "Bagus untuk sore hari, tapi tanpa atap", "Paling hemat, daya listrik terbatas"][i]}</p>
          </li>
        ))}
      </ul>
    </Shell>
  )
}

/* ---------------- Event + multi-venue enquiry ---------------- */

function EnquiryForm({ state }: { state: string }) {
  if (state === "sent") {
    return (
      <Shell pilot active="Acara saya">
        <StateBlock title="Permintaan terkirim ke 3 ruang" action={<><Button>Lihat acara saya</Button><Button variant="outline">Kembali ke pencarian</Button></>}>
          <p>Setiap ruang punya percakapan sendiri. Pengelola perlu membalas paling lambat <b className="text-ink">Selasa, 10 Nov 2026 pukul 23.59 WIB</b> (2 hari kerja). Kami memberi tahu Anda lewat email dan notifikasi di aplikasi.</p>
        </StateBlock>
      </Shell>
    )
  }
  const warn = state === "warnings"
  const err = state === "errors"
  const limit = state === "limit"
  const unverified = state === "unverified"
  return (
    <Shell pilot active="Acara saya">
      <h1 className="text-[22px] font-bold tracking-tight">Kirim permintaan ke 3 ruang</h1>
      <p className="mt-1.5 text-[15px] text-muted-foreground">Detail acara diisi sekali dan dikirim ke setiap ruang yang Anda pilih. Pengelola menjawab dengan penawaran.</p>

      {unverified && (
        <Notice tone="waiting" className="mt-4" title="Verifikasi email Anda dulu">
          Permintaan baru bisa dikirim setelah email rina@lintasacara.id terverifikasi. Isian Anda tetap tersimpan.
          <div className="mt-2"><Button size="sm" variant="outline">Kirim ulang tautan verifikasi</Button></div>
        </Notice>
      )}
      {err && (
        <div className="mt-4">
          <ErrorSummary title="Ada 2 hal yang perlu dilengkapi" items={[{ href: "#eq-att", text: "Perkiraan pengunjung" }, { href: "#q-atrium-1", text: "Pertanyaan dari Mal Cempaka Raya" }]} />
        </div>
      )}

      <form className="mt-5 space-y-6" onSubmit={(e) => e.preventDefault()} noValidate>
        <section className="space-y-4">
          <SectionTitle>Acara</SectionTitle>
          <Field id="eq-name" label="Nama acara"><Input defaultValue="Pekan Kopi Nusantara 2026" className="h-11 bg-surface" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field id="eq-type" label="Jenis"><SelectBox options={["Pameran dan bazar", "Peluncuran produk", "Konser", "Lokakarya", "Lainnya"]} defaultValue="Pameran dan bazar" className="h-11" /></Field>
            <Field id="eq-brand" label="Merek/klien" optional><Input defaultValue="Rasa Kopi Indonesia" className="h-11 bg-surface" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field id="eq-date" label="Tanggal"><Input defaultValue="12–14 Des 2026" className="h-11 bg-surface" /></Field>
            <Field id="eq-time" label="Jam setiap hari"><Input defaultValue="10.00–22.00" className="h-11 bg-surface" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field id="eq-att" label="Perkiraan pengunjung" error={err ? "Isi jumlah orang, misalnya 300." : undefined}><Input inputMode="numeric" defaultValue={err ? "" : warn ? "700" : "300"} className="h-11 bg-surface" /></Field>
            <Field id="eq-budget" label="Anggaran"><Input defaultValue="Rp 60–100 jt" className="h-11 bg-surface" /></Field>
          </div>
          <Field id="eq-desc" label="Deskripsi"><Textarea rows={3} className="bg-surface" defaultValue="Pameran 20 roastery lokal dengan sampling kopi, kelas seduh manual setiap sore, dan penjualan biji kopi." /></Field>
          <div className="grid gap-1.5">
            <Label className="text-sm font-medium">Proposal</Label>
            <p className="text-[13px] text-muted-foreground">PDF, JPG atau PNG, maksimal 10 MB per file, 5 file per acara. Jangan cantumkan nomor telepon atau email di file.</p>
            <ul className="space-y-1.5">
              <li className="flex items-center gap-2 rounded-md border border-line bg-surface px-3 py-2 text-sm"><FileText className="size-4 text-brand" aria-hidden="true" /><span className="flex-1 truncate">Proposal Pekan Kopi 2026.pdf</span><span className="text-muted-foreground">4,2 MB</span></li>
              {state === "virus" && (
                <li className="rounded-md border border-danger/40 bg-danger-soft px-3 py-2 text-sm">
                  <p className="flex items-center gap-2 font-medium text-danger"><Paperclip className="size-4" aria-hidden="true" />Denah booth.pdf tidak diunggah</p>
                  <p className="mt-0.5 text-ink/80">Pemindai keamanan menemukan masalah pada file ini. File lain tetap tersimpan. Simpan ulang denah sebagai PDF baru lalu unggah lagi.</p>
                </li>
              )}
            </ul>
            <Button type="button" variant="outline" size="sm" className="w-fit bg-surface"><Upload className="size-4" />Tambah file</Button>
          </div>
        </section>

        <section className="space-y-4">
          <SectionTitle hint="Setiap ruang menerima permintaan terpisah dengan batas balasan masing-masing.">Ruang yang dituju (3 dari maks. 5)</SectionTitle>
          {searchResults.slice(0, 3).map((r) => (
            <div key={r.id} className="space-y-3 rounded-lg border border-line bg-surface p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold">{r.name} <span className="font-normal text-muted-foreground">· {r.property}</span></p>
                <Button variant="ghost" size="sm" className="text-brand">Hapus</Button>
              </div>
              {warn && r.id === "atrium" && (
                <Notice tone="waiting" title="700 pengunjung melebihi kapasitas berdiri 600 orang">Anda tetap bisa mengirim. Pengelola mungkin menyarankan jam kunjung bergilir.</Notice>
              )}
              {warn && r.id === "aula" && (
                <Notice tone="waiting" title="Daya listrik hanya 15 kVA">Acara Anda membutuhkan sekitar 30 kVA untuk mesin kopi. Tanyakan genset tambahan di permintaan.</Notice>
              )}
              {r.id === "rooftop" && warn && (
                <Notice tone="waiting" title="Senin, 14 Des di luar hari operasional">Rooftop Barat hanya buka Rabu–Minggu. Anda tetap bisa mengirim dan menanyakan pengecualian.</Notice>
              )}
              {r.id === "atrium" && (
                <>
                  <Field id="q-atrium-1" label="Apakah ada instalasi lebih tinggi dari 4 meter?" error={err ? "Pertanyaan ini wajib dijawab untuk Atrium Utama." : undefined}>
                    <Input className="bg-surface" defaultValue={err ? "" : "Tidak, maksimal 3 meter"} />
                  </Field>
                  <Field id="q-atrium-2" label="Merek apa saja yang akan tampil?"><Input className="bg-surface" defaultValue="20 roastery lokal, daftar di proposal halaman 4" /></Field>
                </>
              )}
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" className="bg-surface"><Plus className="size-4" />Tambah ruang dari daftar pilihan</Button>
        </section>

        {limit && (
          <Notice tone="waiting" title="Batas permintaan hari ini sudah tercapai">
            Satu organisasi bisa mengirim 20 permintaan baru per hari selama pilot. Permintaan ini tersimpan sebagai draf dan bisa dikirim besok mulai pukul 00.00 WIB.
          </Notice>
        )}
        <div className="flex flex-col gap-2 border-t border-line pt-4">
          <Button className="h-11" disabled={limit || unverified}>Kirim ke 3 ruang</Button>
          <Button variant="ghost" className="text-brand">Simpan sebagai draf</Button>
        </div>
      </form>
    </Shell>
  )
}

export const searchScreens: ScreenDef[] = [
  {
    id: "search",
    title: "Cari ruang (daftar dan peta)",
    section: "6.2",
    fr: ["FR-M7-01", "FR-M7-02", "FR-M7-03", "FR-M7-04", "FR-M7-10", "FR-M7-12", "FR-M7-13"],
    device: "mobile",
    role: "Penyelenggara",
    summary: "Kata kunci toleran salah ketik, filter, daftar dan peta, ketersediaan terbatas.",
    states: [
      { id: "default", label: "Daftar (salah ketik dikoreksi)", ref: "AC-M7/M8-2" },
      { id: "filters", label: "Panel filter" },
      { id: "map", label: "Peta" },
      { id: "loading", label: "Memuat" },
      { id: "empty", label: "Tidak ada hasil" },
      { id: "error", label: "Galat server", ref: "§12.7" },
    ],
    render: (s) => <SearchScreen state={s} />,
  },
  {
    id: "space",
    title: "Halaman ruang",
    section: "6.2",
    fr: ["FR-M4-03", "FR-M5-06", "FR-M5-07", "FR-M6-02", "FR-M3-08", "FR-M7-06"],
    device: "mobile",
    role: "Penyelenggara",
    summary: "Galeri, spesifikasi, kalender, tarif, perkiraan tidak mengikat, aturan dan dokumen.",
    states: [
      { id: "default", label: "Halaman" },
      { id: "estimate", label: "Perkiraan biaya", ref: "AC-M4/M5-5" },
      { id: "loading", label: "Memuat" },
      { id: "notfound", label: "Tidak ditemukan", ref: "§12.7" },
    ],
    render: (s) => <SpacePage state={s} />,
  },
  {
    id: "shortlist",
    title: "Daftar pilihan dan tautan bagikan",
    section: "6.2",
    fr: ["FR-M8-01", "FR-M8-02", "FR-M8-04"],
    device: "mobile",
    role: "Penyelenggara",
    summary: "Daftar pilihan bernama dengan catatan, bagikan tautan lihat-saja, kirim permintaan dari daftar.",
    states: [
      { id: "default", label: "Daftar" },
      { id: "share", label: "Bagikan tautan" },
      { id: "empty", label: "Kosong" },
    ],
    render: (s) => <Shortlist state={s} />,
  },
  {
    id: "shortlist-public",
    title: "Tautan daftar pilihan (tanpa masuk)",
    section: "6.2",
    fr: ["FR-M8-02"],
    device: "mobile",
    role: "Klien penyelenggara",
    summary: "Tampilan lihat-saja; tautan yang dicabut.",
    states: [
      { id: "default", label: "Dibuka tanpa masuk" },
      { id: "revoked", label: "Tautan dicabut", ref: "AC-M7/M8-3" },
    ],
    render: (s) => <SharedShortlist state={s} />,
  },
  {
    id: "enquiry",
    title: "Buat acara dan kirim permintaan",
    section: "6.2",
    fr: ["FR-M9-01", "FR-M9-02", "FR-M9-03", "FR-M9-04", "FR-M9-05", "FR-M1-02"],
    device: "mobile",
    role: "Penyelenggara",
    summary: "Detail acara, proposal, pertanyaan tiap ruang, peringatan sebelum kirim, batas kirim.",
    states: [
      { id: "default", label: "Formulir" },
      { id: "warnings", label: "Peringatan (tidak memblokir)", ref: "AC-M9/M10-2" },
      { id: "errors", label: "Galat isian", ref: "§12.7" },
      { id: "virus", label: "File ditolak", ref: "§12.2" },
      { id: "limit", label: "Batas harian", ref: "§12.2" },
      { id: "unverified", label: "Email belum terverifikasi", ref: "FR-M1-02" },
      { id: "sent", label: "Terkirim" },
    ],
    render: (s) => <EnquiryForm state={s} />,
  },
]
