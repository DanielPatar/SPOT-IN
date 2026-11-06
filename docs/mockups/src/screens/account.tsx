import { Bell, CheckCircle2, FileText, KeyRound, Laptop, MessageSquare, Smartphone, AlertTriangle, ServerCrash } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Field, Notice, PageTitle, Panel, QrCode, SectionTitle, SkeletonList, StateBlock } from "@/components/kit"
import { cn } from "@/lib/utils"
import type { ScreenDef } from "@/registry"
import { Shell } from "./shell"

/* ---------------- Notifications ---------------- */

const notes = [
  { icon: FileText, t: "Mal Cempaka Raya mengirim penawaran versi 2", b: "Pekan Kopi Nusantara 2026 · total Rp 92.340.000", at: "10 menit lalu", unread: true },
  { icon: AlertTriangle, t: "Pelunasan jatuh tempo 3 hari lagi", b: "Rp 44.955.000 paling lambat Sab, 28 Nov 2026", at: "1 jam lalu", unread: true },
  { icon: MessageSquare, t: "Budi membalas pesan Anda", b: "\"Maksimal 12 mesin tidak masalah, 40 kVA cukup.\"", at: "Kemarin 15.10", unread: true },
  { icon: CheckCircle2, t: "Pemesanan terkonfirmasi", b: "Atrium Utama · 12–14 Des 2026", at: "13 Nov", unread: false },
]

function Notifications({ state }: { state: string }) {
  return (
    <Shell>
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-bold tracking-tight">Notifikasi</h1>
        {state !== "empty" && <Button variant="ghost" size="sm" className="text-brand">Tandai semua sudah dibaca</Button>}
      </div>
      {state === "loading" ? (
        <div className="mt-4"><SkeletonList rows={4} label="Memuat notifikasi" /></div>
      ) : state === "empty" ? (
        <div className="mt-4"><StateBlock icon={Bell} title="Belum ada notifikasi">Kabar tentang permintaan, penawaran, pembayaran dan acara Anda muncul di sini dan juga dikirim ke email.</StateBlock></div>
      ) : (
        <ul className="mt-4 divide-y divide-line rounded-lg border border-line bg-surface">
          {notes.map((n) => (
            <li key={n.t}>
              <a href="#" onClick={(e) => e.preventDefault()} className={cn("flex gap-3 p-3 hover:bg-sunken", n.unread && "bg-brand-soft/30")}>
                <n.icon className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className={cn("block text-sm", n.unread && "font-semibold")}>{n.unread && <span className="sr-only">Belum dibaca: </span>}{n.t}</span>
                  <span className="block truncate text-[13px] text-muted-foreground">{n.b}</span>
                  <span className="text-xs text-muted-foreground">{n.at}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
      {state === "bounce" && (
        <Notice tone="danger" className="mt-4" title="Email ke rina@lintasacara.id tidak terkirim">
          Server email Anda menolak pesan kami sejak 12 Nov. Periksa alamat email di pengaturan akun agar tidak melewatkan tagihan dan kartu masuk.
          <div className="mt-2"><Button size="sm" variant="outline">Periksa alamat email</Button></div>
        </Notice>
      )}
    </Shell>
  )
}

/* ---------------- Account settings ---------------- */

function Settings({ state }: { state: string }) {
  const tab = state === "2fa" ? "security" : state === "delete-blocked" || state === "delete" || state === "export" ? "data" : state === "prefs" ? "notif" : "security"
  return (
    <Shell device="desktop" narrow>
      <PageTitle title="Pengaturan akun" description="Rina Wulandari · rina@lintasacara.id" />
      <Tabs defaultValue={tab}>
        <TabsList className="bg-sunken">
          <TabsTrigger value="profile">Profil</TabsTrigger>
          <TabsTrigger value="security">Keamanan</TabsTrigger>
          <TabsTrigger value="notif">Notifikasi</TabsTrigger>
          <TabsTrigger value="data">Data dan akun</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-5">
          <Panel className="max-w-lg space-y-4">
            <Field id="pf-name" label="Nama"><Input defaultValue="Rina Wulandari" className="bg-surface" /></Field>
            <Field id="pf-phone" label="Telepon kontak" optional hint="Tidak diverifikasi. Hanya terlihat oleh pihak lain setelah pemesanan terkonfirmasi."><Input defaultValue="0812 3456 7890" className="bg-surface" /></Field>
            <Button>Simpan profil</Button>
          </Panel>
        </TabsContent>

        <TabsContent value="security" className="mt-5 space-y-5">
          {state === "2fa" ? (
            <Panel className="max-w-lg">
              <SectionTitle hint="Opsional untuk pengguna, wajib untuk Admin Spot-In.">Aktifkan verifikasi dua langkah</SectionTitle>
              <ol className="list-decimal space-y-3 pl-5 text-sm">
                <li>Pindai kode ini dengan aplikasi autentikator (Google Authenticator, Authy, atau 1Password).<div className="mt-2"><QrCode seed={33} size={140} /></div><p className="mt-1 text-[13px] text-muted-foreground">Tidak bisa memindai? Masukkan kode: <span className="num font-mono">JBSW Y3DP EHPK 3PXP</span></p></li>
                <li><Field id="tf-code" label="Masukkan 6 angka dari aplikasi"><Input inputMode="numeric" autoComplete="one-time-code" className="w-40 bg-surface" defaultValue="" /></Field></li>
              </ol>
              <div className="mt-4 flex gap-2"><Button>Aktifkan</Button><Button variant="outline">Batal</Button></div>
            </Panel>
          ) : (
            <>
              <Panel className="flex max-w-2xl items-center justify-between gap-3">
                <div className="flex gap-3"><KeyRound className="mt-0.5 size-5 text-muted-foreground" aria-hidden="true" /><div><p className="font-semibold">Verifikasi dua langkah</p><p className="text-sm text-muted-foreground">Belum aktif. Menambah lapisan keamanan saat masuk.</p></div></div>
                <Button variant="outline">Aktifkan</Button>
              </Panel>
              <Panel className="max-w-2xl">
                <SectionTitle hint="Sesi tanpa aktivitas selama 30 hari keluar otomatis.">Perangkat yang sedang masuk</SectionTitle>
                <ul className="divide-y divide-line">
                  {[
                    [Laptop, "Chrome di macOS", "Jakarta · sekarang (perangkat ini)", false],
                    [Smartphone, "Chrome di Android", "Jakarta · 2 jam lalu", true],
                    [Laptop, "Firefox di Windows", "Bandung · 12 hari lalu", true],
                  ].map(([I, d, m, revoke]) => {
                    const Icon = I as typeof Laptop
                    return (
                      <li key={d as string} className="flex items-center gap-3 py-3">
                        <Icon className="size-5 text-muted-foreground" aria-hidden="true" />
                        <div className="flex-1"><p className="text-sm font-medium">{d as string}</p><p className="text-[13px] text-muted-foreground">{m as string}</p></div>
                        {revoke ? <Button size="sm" variant="outline">Keluarkan</Button> : <span className="text-[13px] text-muted-foreground">Aktif</span>}
                      </li>
                    )
                  })}
                </ul>
              </Panel>
            </>
          )}
        </TabsContent>

        <TabsContent value="notif" className="mt-5">
          <Panel className="max-w-2xl">
            <SectionTitle hint="Email penting tentang pembayaran, perjanjian, pemesanan dan kartu masuk selalu dikirim dan tidak bisa dimatikan.">Email</SectionTitle>
            <ul className="divide-y divide-line">
              {[
                ["Pesan baru", true, false],
                ["Pengingat batas balasan dan tahanan tanggal", true, false],
                ["Penawaran baru dan revisi", true, false],
                ["Tagihan dan pembayaran", true, true],
                ["Pemesanan terkonfirmasi, batal otomatis atau dibatalkan", true, true],
              ].map(([l, on, locked]) => (
                <li key={l as string} className="flex items-center justify-between gap-3 py-3">
                  <Label htmlFor={`n-${l}`} className="text-sm font-normal">{l as string}{locked && <span className="block text-[13px] text-muted-foreground">Selalu dikirim</span>}</Label>
                  <Switch id={`n-${l}`} defaultChecked={on as boolean} disabled={locked as boolean} className="data-[state=checked]:bg-brand" />
                </li>
              ))}
            </ul>
          </Panel>
        </TabsContent>

        <TabsContent value="data" className="mt-5 space-y-5">
          <Panel className="max-w-2xl">
            <SectionTitle hint="Berisi profil, organisasi, acara, pesan, penawaran dan pendaftaran Anda dalam format JSON.">Unduh data saya</SectionTitle>
            {state === "export" ? (
              <Notice tone="positive" title="Data Anda siap diunduh">File spot-in-data-rina.json (182 KB) tersedia sampai 13 Nov 2026.<div className="mt-2"><Button size="sm">Unduh file</Button></div></Notice>
            ) : (
              <Button variant="outline">Siapkan file data</Button>
            )}
          </Panel>
          <Panel className="max-w-2xl">
            <SectionTitle hint="Semua data pilot dihapus otomatis pada 31 Jan 2027. Anda bisa menghapus akun lebih awal.">Hapus akun</SectionTitle>
            {state === "delete-blocked" ? (
              <Notice tone="waiting" title="Akun belum bisa dihapus">
                Anda satu-satunya Pemilik PT Lintas Acara Kreatif, yang masih punya pemesanan aktif (Pekan Kopi Nusantara 2026). Serahkan kepemilikan ke anggota lain, atau selesaikan atau batalkan pemesanan itu dulu.
                <div className="mt-2 flex gap-2"><Button size="sm" variant="outline">Serahkan kepemilikan</Button><Button size="sm" variant="outline">Lihat pemesanan</Button></div>
              </Notice>
            ) : (
              <Button variant="outline" className="text-danger">Hapus akun saya</Button>
            )}
          </Panel>
        </TabsContent>
      </Tabs>

      <AlertDialog open={state === "delete"}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus akun Anda secara permanen?</AlertDialogTitle>
            <AlertDialogDescription>
              Nama, email dan telepon Anda dihapus. Pesan dan catatan yang pernah Anda tulis tetap ada untuk pihak lain, dengan nama "Pengguna dihapus". Tindakan ini tidak bisa diurungkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Field id="del-confirm" label="Ketik HAPUS untuk melanjutkan"><Input className="bg-surface" /></Field>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction variant="destructive">Hapus akun</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Shell>
  )
}

/* ---------------- Generic §12.7 states ---------------- */

function GenericStates({ state }: { state: string }) {
  if (state === "denied") {
    return (
      <Shell>
        <StateBlock icon={KeyRound} title="Anda tidak punya akses ke halaman ini" action={<Button variant="outline">Kembali ke beranda</Button>}>
          <p>Hubungi Pemilik PT Lintas Acara Kreatif jika Anda memerlukan akses.</p>
        </StateBlock>
      </Shell>
    )
  }
  if (state === "notfound") {
    return (
      <Shell>
        <StateBlock title="Halaman ini tidak ditemukan" action={<Button>Cari ruang</Button>}>
          <p>Tautannya mungkin salah ketik atau halamannya sudah dihapus.</p>
        </StateBlock>
      </Shell>
    )
  }
  if (state === "server") {
    return (
      <Shell>
        <StateBlock icon={ServerCrash} tone="danger" title="Terjadi kesalahan di server kami" action={<><Button>Muat ulang</Button><Button variant="outline">Hubungi kami</Button></>}>
          <p>Kesalahan sudah dilaporkan otomatis ke tim. Jika menghubungi kami, sebutkan kode <span className="num font-mono text-ink">ERR-4F9C21</span>.</p>
        </StateBlock>
      </Shell>
    )
  }
  return (
    <Shell offline>
      <h1 className="text-[22px] font-bold tracking-tight">Buat halaman acara</h1>
      <p className="mt-2 text-sm text-muted-foreground">Isian Anda disimpan di perangkat ini dan dikirim saat koneksi kembali.</p>
      <div className="mt-4 space-y-3"><Field id="off-1" label="Judul"><Input defaultValue="Pekan Kopi Nusantara 2026" className="bg-surface" /></Field></div>
    </Shell>
  )
}

export const accountScreens: ScreenDef[] = [
  {
    id: "notifications",
    title: "Notifikasi",
    section: "x",
    fr: ["FR-M21-01", "FR-M21-02", "FR-M21-05", "FR-M21-07"],
    device: "mobile",
    role: "Semua pengguna",
    summary: "Daftar notifikasi dalam aplikasi, kosong, memuat, email terpental.",
    states: [
      { id: "default", label: "Daftar" },
      { id: "loading", label: "Memuat" },
      { id: "empty", label: "Kosong" },
      { id: "bounce", label: "Email terpental", ref: "§12.6" },
    ],
    render: (s) => <Notifications state={s} />,
  },
  {
    id: "settings",
    title: "Pengaturan akun",
    section: "x",
    fr: ["FR-M1-03", "FR-M1-04", "FR-M1-05", "FR-M1-08", "FR-M21-02", "FR-M38-05"],
    device: "desktop",
    role: "Semua pengguna",
    summary: "Sesi aktif, verifikasi dua langkah, preferensi email, unduh data, hapus akun.",
    states: [
      { id: "default", label: "Keamanan dan sesi" },
      { id: "2fa", label: "Aktifkan 2FA" },
      { id: "prefs", label: "Preferensi email" },
      { id: "export", label: "Unduh data" },
      { id: "delete", label: "Hapus akun" },
      { id: "delete-blocked", label: "Hapus diblokir", ref: "§12.6" },
    ],
    render: (s) => <Settings state={s} />,
  },
  {
    id: "generic",
    title: "Keadaan umum",
    section: "x",
    fr: ["§12.7", "FR-M2-14"],
    device: "mobile",
    role: "Semua pengguna",
    summary: "Offline, tanpa akses, tidak ditemukan, galat server dengan kode referensi.",
    states: [
      { id: "offline", label: "Offline", ref: "§12.7" },
      { id: "denied", label: "Tanpa akses", ref: "§12.7" },
      { id: "notfound", label: "Tidak ditemukan", ref: "§12.7" },
      { id: "server", label: "Galat server", ref: "§12.7" },
    ],
    render: (s) => <GenericStates state={s} />,
  },
]
