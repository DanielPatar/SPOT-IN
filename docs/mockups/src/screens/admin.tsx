import { useState } from "react"
import { Clock3, FastForward, Phone, Search, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Facts, Field, Notice, Panel, PageTitle, SectionTitle, SelectBox, SkeletonList, SpacePhoto, StateBlock, Status } from "@/components/kit"
import { rp } from "@/lib/data"
import type { ScreenDef } from "@/registry"
import { Shell } from "./shell"

/* ---------------- Verification queue ---------------- */

const queue = [
  { name: "Mal Cempaka Raya", kind: "Pengelola", city: "Jakarta Selatan", by: "Budi Santoso", waited: "1 hari kerja", over: false },
  { name: "Teras Langit Kemang", kind: "Pengelola", city: "Jakarta Selatan", by: "Ayu Lestari", waited: "3 hari kerja", over: true },
  { name: "Komunitas Pasar Kriya", kind: "Penyelenggara", city: "Bandung", by: "Sari Purnamasari", waited: "4 jam kerja", over: false },
]

function VerifyQueue({ state }: { state: string }) {
  const sheet = state === "review" || state === "reject"
  return (
    <Shell device="desktop" ctx="admin" active="Antrean">
      <PageTitle title="Antrean verifikasi" description="Verifikasi dilakukan lewat telepon atau chat. Catat tanggal, cara dan hasilnya saja; jangan unggah atau simpan dokumen identitas." />
      <Tabs defaultValue="verif">
        <TabsList className="bg-sunken">
          <TabsTrigger value="verif">Verifikasi (3)</TabsTrigger>
          <TabsTrigger value="space">Tinjauan ruang (2)</TabsTrigger>
          <TabsTrigger value="reports">Laporan (1)</TabsTrigger>
          <TabsTrigger value="problems">Masalah pasca-acara (1)</TabsTrigger>
        </TabsList>
        <TabsContent value="verif" className="mt-4">
          {state === "loading" ? (
            <SkeletonList rows={3} label="Memuat antrean" />
          ) : state === "empty" ? (
            <StateBlock title="Tidak ada yang menunggu verifikasi">Pengelola dan penyelenggara baru akan muncul di sini setelah mereka mengirim profil untuk ditinjau.</StateBlock>
          ) : (
            <>
              {queue.some((q) => q.over) && (
                <Notice tone="waiting" className="mb-4" title="1 pengajuan sudah menunggu lebih dari 2 hari kerja">
                  Teras Langit Kemang dikirim Selasa lalu. Pengajuan ini juga masuk email pengingat harian untuk Admin.
                </Notice>
              )}
              <div className="rounded-lg border border-line bg-surface">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama</TableHead>
                      <TableHead>Jenis</TableHead>
                      <TableHead>Kota</TableHead>
                      <TableHead>Diajukan oleh</TableHead>
                      <TableHead>Menunggu</TableHead>
                      <TableHead><span className="sr-only">Tindakan</span></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {queue.map((q) => (
                      <TableRow key={q.name}>
                        <TableCell className="font-medium">{q.name}</TableCell>
                        <TableCell>{q.kind}</TableCell>
                        <TableCell>{q.city}</TableCell>
                        <TableCell>{q.by}</TableCell>
                        <TableCell>{q.over ? <Status tone="danger">{q.waited}</Status> : <span className="text-muted-foreground">{q.waited}</span>}</TableCell>
                        <TableCell className="text-right"><Button size="sm" variant="outline">Tinjau</Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      <Sheet open={sheet}>
        <SheetContent className="w-full overflow-y-auto @xl:max-w-md">
          <SheetHeader>
            <SheetTitle>Verifikasi Mal Cempaka Raya</SheetTitle>
            <SheetDescription>Hubungi pengelola, pastikan mereka memang berwenang menyewakan ruang ini, lalu catat hasilnya.</SheetDescription>
          </SheetHeader>
          <div className="space-y-5 px-4">
            <Facts
              items={[
                { k: "Nama badan usaha", v: "PT Cempaka Raya Properti" },
                { k: "Kontak", v: <span className="inline-flex items-center gap-1.5"><Phone className="size-3.5" aria-hidden="true" />021 8370 1122 · Budi Santoso</span> },
                { k: "Properti", v: "Jl. Cempaka Raya No. 18, Tebet" },
                { k: "Ruang diajukan", v: "Atrium Utama, Promo Spot Lobi Selatan" },
              ]}
            />
            <Field id="vf-method" label="Cara verifikasi">
              <SelectBox options={["Telepon", "Video call", "Chat", "Kunjungan langsung"]} defaultValue="Video call" />
            </Field>
            <Field id="vf-date" label="Tanggal verifikasi">
              <Input defaultValue="6 Nov 2026" className="bg-surface" />
            </Field>
            <fieldset>
              <legend className="mb-2 text-sm font-medium">Hasil</legend>
              <RadioGroup defaultValue={state === "reject" ? "reject" : "approve"} className="gap-2">
                <Label htmlFor="vf-ok" className="flex items-center gap-2 font-normal"><RadioGroupItem id="vf-ok" value="approve" className="border-[#8f8778] text-brand" />Setujui, beri tanda Terverifikasi Spot-In</Label>
                <Label htmlFor="vf-no" className="flex items-center gap-2 font-normal"><RadioGroupItem id="vf-no" value="reject" className="border-[#8f8778] text-brand" />Tolak</Label>
              </RadioGroup>
            </fieldset>
            {state === "reject" ? (
              <Field id="vf-reason" label="Alasan penolakan" hint="Dikirim ke pengelola apa adanya. Jelaskan apa yang perlu mereka lakukan." error="Tulis alasan penolakan sebelum menyimpan.">
                <Textarea className="bg-surface" rows={3} />
              </Field>
            ) : (
              <Field id="vf-note" label="Catatan internal" optional>
                <Textarea className="bg-surface" rows={3} defaultValue="Video call dengan Budi dan Lestari (Pemilik). Menunjukkan area atrium dan kartu nama pengelola." />
              </Field>
            )}
          </div>
          <SheetFooter className="border-t border-line">
            <Button>{state === "reject" ? "Tolak dan beri tahu pengelola" : "Setujui verifikasi"}</Button>
            <Button variant="outline">Tutup tanpa menyimpan</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </Shell>
  )
}

/* ---------------- Space review queue ---------------- */

function SpaceReview({ state }: { state: string }) {
  return (
    <Shell device="desktop" ctx="admin" active="Antrean">
      <PageTitle back="Antrean" title="Tinjau ruang: Atrium Utama" description="Mal Cempaka Raya · diajukan 6 Nov 2026 pukul 10.20 WIB" />
      {state === "unverified" && (
        <Notice tone="waiting" className="mb-4" title="Pengelola ini belum terverifikasi">
          Ruang tidak bisa ditayangkan sebelum Mal Cempaka Raya diverifikasi. Selesaikan verifikasi dulu di antrean verifikasi.
        </Notice>
      )}
      <div className="grid gap-6 @5xl:grid-cols-[1.2fr_1fr]">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <SpacePhoto art="atrium" label="Foto sampul Atrium Utama" className="col-span-2 row-span-2 aspect-[4/3]" />
            <SpacePhoto art="booth" label="Foto 2" className="aspect-square" />
            <SpacePhoto art="hall" label="Foto 3" className="aspect-square" />
          </div>
          <Panel>
            <SectionTitle>Yang perlu diperiksa</SectionTitle>
            <ul className="space-y-2 text-sm">
              <li>Foto menunjukkan ruang yang sama dengan nama dan luasnya (420 m²).</li>
              <li>Harga mulai {rp(20_000_000)}/hari masuk akal untuk atrium mal di Jakarta Selatan.</li>
              <li>Pertanyaan untuk penyelenggara tidak meminta data sensitif (KTP, NIK, agama, kesehatan).</li>
              <li>Aturan tempat dan kebijakan pembatalan jelas.</li>
            </ul>
          </Panel>
        </div>
        <div className="space-y-4">
          <Panel>
            <Facts
              cols={2}
              items={[
                { k: "Jenis", v: "Atrium" },
                { k: "Kapasitas berdiri", v: "600 orang" },
                { k: "Daya listrik", v: "40 kVA" },
                { k: "Kebijakan", v: "Sedang" },
                { k: "Tarif hari kerja", v: rp(20_000_000) },
                { k: "Tarif akhir pekan", v: rp(25_000_000) },
              ]}
            />
          </Panel>
          {state === "reject" ? (
            <Panel>
              <Field id="sr-reason" label="Alasan dikembalikan" hint="Pengelola melihat alasan ini dan bisa memperbaiki lalu mengirim ulang.">
                <Textarea className="bg-surface" rows={4} defaultValue="Foto ke-3 menampilkan aula, bukan atrium. Ganti dengan foto Atrium Utama, lalu kirim ulang." />
              </Field>
              <div className="mt-3 flex gap-2">
                <Button>Kembalikan ke pengelola</Button>
                <Button variant="outline">Batal</Button>
              </div>
            </Panel>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button disabled={state === "unverified"}>Setujui dan tayangkan</Button>
              <Button variant="outline">Kembalikan dengan catatan</Button>
            </div>
          )}
        </div>
      </div>
    </Shell>
  )
}

/* ---------------- Settings, holidays, demo clock ---------------- */

function AdminSettings({ state }: { state: string }) {
  const [shift, setShift] = useState(state === "clock-moved" ? 3 : 0)
  return (
    <Shell device="desktop" ctx="admin" active="Pengaturan">
      <PageTitle title="Pengaturan pilot" description="Perubahan hanya berlaku untuk data yang dibuat setelahnya. Penawaran dan pemesanan yang sudah ada tidak berubah." />
      <Tabs defaultValue={state === "holidays" ? "holidays" : state.startsWith("clock") ? "clock" : "fees"}>
        <TabsList className="bg-sunken">
          <TabsTrigger value="fees">Biaya dan tenggat</TabsTrigger>
          <TabsTrigger value="holidays">Hari libur</TabsTrigger>
          <TabsTrigger value="invites">Undangan</TabsTrigger>
          <TabsTrigger value="clock">Jam demo</TabsTrigger>
        </TabsList>

        <TabsContent value="fees" className="mt-5">
          <div className="grid gap-6 @5xl:grid-cols-2">
            <Panel className="space-y-4">
              <SectionTitle>Biaya (simulasi)</SectionTitle>
              <div className="grid grid-cols-2 gap-3">
                <Field id="st-com" label="Komisi pengelola (%)"><Input defaultValue="10" className="bg-surface" /></Field>
                <Field id="st-fee" label="Biaya layanan Spot-In (%)"><Input defaultValue="3" className="bg-surface" /></Field>
                <Field id="st-min" label="Biaya layanan minimal"><Input defaultValue="Rp 50.000" className="bg-surface" /></Field>
                <Field id="st-max" label="Biaya layanan maksimal"><Input defaultValue="Rp 2.500.000" className="bg-surface" /></Field>
                <Field id="st-ppn" label="PPN" hint="12% atas DPP 11/12 (efektif 11%)."><Input defaultValue="12% × 11/12" className="bg-surface" /></Field>
                <Field id="st-dep" label="Uang muka minimal (%)"><Input defaultValue="20" className="bg-surface" /></Field>
              </div>
            </Panel>
            <Panel className="space-y-4">
              <SectionTitle>Tenggat</SectionTitle>
              <div className="grid grid-cols-2 gap-3">
                <Field id="st-resp" label="Batas balasan pengelola"><Input defaultValue="2 hari kerja" className="bg-surface" /></Field>
                <Field id="st-hold" label="Tahanan tanggal (bawaan/maks.)"><Input defaultValue="5 / 14 hari" className="bg-surface" /></Field>
                <Field id="st-post" label="Masa pasca-acara"><Input defaultValue="72 jam" className="bg-surface" /></Field>
                <Field id="st-del" label="Tanggal penghapusan data pilot"><Input defaultValue="31 Jan 2027" className="bg-surface" /></Field>
              </div>
              <Button>Simpan pengaturan</Button>
            </Panel>
          </div>
        </TabsContent>

        <TabsContent value="holidays" className="mt-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">Dipakai untuk semua hitungan hari kerja. Sumber: SKB 3 Menteri tentang libur nasional dan cuti bersama 2026.</p>
            <Button variant="outline" size="sm">Tambah tanggal</Button>
          </div>
          <div className="rounded-lg border border-line bg-surface">
            <Table>
              <TableHeader><TableRow><TableHead>Tanggal</TableHead><TableHead>Nama</TableHead><TableHead>Jenis</TableHead><TableHead><span className="sr-only">Tindakan</span></TableHead></TableRow></TableHeader>
              <TableBody>
                {[
                  ["Kam, 24 Des 2026", "Cuti bersama Natal", "Cuti bersama"],
                  ["Jum, 25 Des 2026", "Hari Raya Natal", "Libur nasional"],
                  ["Jum, 1 Jan 2027", "Tahun Baru 2027 Masehi", "Libur nasional"],
                ].map(([d, n, k]) => (
                  <TableRow key={d}><TableCell className="num">{d}</TableCell><TableCell>{n}</TableCell><TableCell>{k}</TableCell><TableCell className="text-right"><Button variant="ghost" size="sm" className="text-brand">Ubah</Button></TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="invites" className="mt-5">
          <Panel className="max-w-xl space-y-3">
            <Field id="inv-email" label="Undang email ke pilot"><Input type="email" placeholder="nama@perusahaan.co.id" className="bg-surface" /></Field>
            <Field id="inv-role" label="Sebagai"><SelectBox options={["Pengelola tempat", "Penyelenggara acara"]} defaultValue="Pengelola tempat" /></Field>
            <Button>Kirim undangan</Button>
          </Panel>
        </TabsContent>

        <TabsContent value="clock" className="mt-5">
          <div className="grid gap-6 @5xl:grid-cols-[1fr_1fr]">
            <Panel className="space-y-4">
              <SectionTitle hint="Hanya ada di lingkungan demo. Semua tenggat, pengingat, tahanan dan pencairan memakai jam ini.">Jam aplikasi</SectionTitle>
              <div className="rounded-lg bg-sunken p-4">
                <p className="text-sm text-muted-foreground">Waktu aplikasi sekarang</p>
                <p className="num mt-1 text-2xl font-bold" aria-live="polite">
                  {shift === 0 ? "Jum, 6 Nov 2026 · 10.20 WIB" : `Sen, 9 Nov 2026 · 10.20 WIB`}
                </p>
                {shift > 0 && <p className="mt-1 text-sm text-warm-ink">Dimajukan {shift} hari dari waktu sebenarnya</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                {[1, 3, 7].map((d) => (
                  <Button key={d} variant="outline" onClick={() => setShift(d)}>
                    <FastForward className="size-4" />
                    Majukan {d} hari
                  </Button>
                ))}
                <Button variant="ghost" className="text-brand" onClick={() => setShift(0)}>Kembalikan ke waktu sebenarnya</Button>
              </div>
            </Panel>
            <Panel>
              <SectionTitle>{shift > 0 ? "Yang terjadi setelah jam dimajukan" : "Terjadwal dalam 7 hari"}</SectionTitle>
              <ul className="space-y-2.5 text-sm">
                {(shift > 0
                  ? [
                      ["Tahanan tanggal untuk Komunitas Pasar Kriya kedaluwarsa", "positive"],
                      ["Pemesanan BK-0091 batal otomatis: uang muka tidak dibayar", "danger"],
                      ["2 pemegang penawaran cadangan diberi tahu bersamaan", "positive"],
                      ["Pengingat pelunasan BK-0087 terkirim", "positive"],
                    ]
                  : [
                      ["Sab, 7 Nov · Tahanan tanggal Pasar Kriya kedaluwarsa", "neutral"],
                      ["Sen, 9 Nov · Tenggat uang muka BK-0091", "neutral"],
                      ["Sel, 10 Nov · Batas balasan 3 permintaan", "neutral"],
                    ]
                ).map(([t, tone]) => (
                  <li key={t} className="flex items-start gap-2">
                    <Clock3 className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span className={tone === "danger" ? "text-danger" : ""}>{t}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </TabsContent>
      </Tabs>
    </Shell>
  )
}

/* ---------------- Admin search + ledger + reported problems ---------------- */

function AdminLedger({ state }: { state: string }) {
  return (
    <Shell device="desktop" ctx="admin" active="Buku besar">
      <PageTitle title="Buku besar sandbox" description="Semua jumlah simulasi. Pemeriksaan rekonsiliasi berjalan setiap kali ada entri baru." actions={<div className="relative"><Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" aria-hidden="true" /><Input aria-label="Cari pemesanan, pengguna, atau email" placeholder="Cari ID, nama atau email" className="w-72 bg-surface pl-8" /></div>} />
      {state === "mismatch" && (
        <Notice tone="danger" className="mb-4" title="BK-0087 tidak cocok dengan penawaran dan kuitansinya">
          Buku besar mencatat uang muka {rp(47_385_000)}, sedangkan kuitansi PILOT-MCR-2026-0012 mencatat {rp(47_475_000)}. Selisih {rp(90_000)}. Tim sudah diberi tahu lewat email; periksa entri terakhir sebelum pencairan.
        </Notice>
      )}
      <div className="rounded-lg border border-line bg-surface">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pemesanan</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Dibayar</TableHead><TableHead className="text-right">Ditahan</TableHead><TableHead className="text-right">Dikembalikan</TableHead><TableHead>Rekonsiliasi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="num">
            <TableRow><TableCell className="font-medium">BK-0087 · Atrium Utama</TableCell><TableCell>Terkonfirmasi</TableCell><TableCell className="text-right">{rp(47_385_000)}</TableCell><TableCell className="text-right">{rp(47_385_000)}</TableCell><TableCell className="text-right">Rp 0</TableCell><TableCell>{state === "mismatch" ? <Status tone="danger">Tidak cocok</Status> : <Status tone="positive">Cocok</Status>}</TableCell></TableRow>
            <TableRow><TableCell className="font-medium">BK-0091 · Rooftop Barat</TableCell><TableCell>Batal otomatis</TableCell><TableCell className="text-right">Rp 0</TableCell><TableCell className="text-right">Rp 0</TableCell><TableCell className="text-right">Rp 0</TableCell><TableCell><Status tone="positive">Cocok</Status></TableCell></TableRow>
            <TableRow><TableCell className="font-medium">BK-0079 · Aula Utama</TableCell><TableCell>Selesai</TableCell><TableCell className="text-right">{rp(50_985_000)}</TableCell><TableCell className="text-right">Rp 0</TableCell><TableCell className="text-right">Rp 0</TableCell><TableCell><Status tone="positive">Cocok</Status></TableCell></TableRow>
          </TableBody>
        </Table>
      </div>
      <div className="mt-6 max-w-2xl">
        <SectionTitle>Masalah pasca-acara</SectionTitle>
        <Panel>
          <p className="flex items-center gap-2 font-semibold"><ShieldAlert className="size-4 text-warm-ink" aria-hidden="true" />BK-0079 · dilaporkan pengelola, 16 Nov 2026 21.40 WIB</p>
          <p className="mt-1 text-sm text-muted-foreground">"Dua panel lantai di area panggung retak setelah acara. Foto terlampir." Pencairan ditahan sampai Anda mencatat hasilnya.</p>
          <div className="mt-3 flex gap-2"><Button size="sm">Catat hasil dan cairkan</Button><Button size="sm" variant="outline">Catat penyesuaian manual</Button></div>
        </Panel>
      </div>
    </Shell>
  )
}

export const adminScreens: ScreenDef[] = [
  {
    id: "admin-verify",
    title: "Admin: antrean verifikasi",
    section: "6.1",
    fr: ["FR-M3-02", "FR-M3-09", "FR-M24-01", "FR-M24-04", "FR-M24-10"],
    device: "desktop",
    role: "Admin Spot-In",
    summary: "Antrean pengelola dan penyelenggara, panel verifikasi lewat telepon/chat, setujui atau tolak dengan alasan.",
    states: [
      { id: "default", label: "Antrean" },
      { id: "review", label: "Panel verifikasi" },
      { id: "reject", label: "Tolak tanpa alasan", ref: "§12.7" },
      { id: "loading", label: "Memuat" },
      { id: "empty", label: "Kosong" },
    ],
    render: (s) => <VerifyQueue state={s} />,
  },
  {
    id: "admin-space",
    title: "Admin: tinjauan ruang",
    section: "6.1",
    fr: ["FR-M4-10", "FR-M3-03", "FR-M3-08"],
    device: "desktop",
    role: "Admin Spot-In",
    summary: "Periksa foto, harga dan pertanyaan; setujui atau kembalikan dengan catatan.",
    states: [
      { id: "default", label: "Tinjau" },
      { id: "reject", label: "Kembalikan" },
      { id: "unverified", label: "Pengelola belum terverifikasi", ref: "AC-M3-1" },
    ],
    render: (s) => <SpaceReview state={s} />,
  },
  {
    id: "admin-settings",
    title: "Admin: pengaturan, hari libur, jam demo",
    section: "6.1",
    fr: ["FR-M24-03", "FR-M24-11", "FR-M38-10", "FR-M38-02"],
    device: "desktop",
    role: "Admin Spot-In",
    summary: "Biaya, tenggat, kalender libur nasional dan cuti bersama, undangan, jam demo.",
    states: [
      { id: "default", label: "Biaya dan tenggat" },
      { id: "holidays", label: "Hari libur" },
      { id: "clock", label: "Jam demo" },
      { id: "clock-moved", label: "Jam dimajukan +3 hari" },
    ],
    render: (s) => <AdminSettings state={s} />,
  },
  {
    id: "admin-ledger",
    title: "Admin: buku besar dan masalah",
    section: "6.10",
    fr: ["FR-M24-05", "FR-M24-02", "FR-M16-08"],
    device: "desktop",
    role: "Admin Spot-In",
    summary: "Rekonsiliasi buku besar sandbox dan laporan masalah pasca-acara.",
    states: [
      { id: "default", label: "Semua cocok" },
      { id: "mismatch", label: "Tidak cocok", ref: "§12.4" },
    ],
    render: (s) => <AdminLedger state={s} />,
  },
]
