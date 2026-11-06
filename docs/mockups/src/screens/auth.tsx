import { CalendarSearch, Clock, Mail, MailCheck, Store, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { CheckRow, Field, Notice, Panel, StateBlock, TextLink } from "@/components/kit"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { ScreenDef } from "@/registry"
import { AuthShell, Shell } from "./shell"

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.3-4.8 3.3-8Z" />
      <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.8c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.8 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2.1a11 11 0 0 0 0 9.8l3.7-2.8Z" />
      <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7.1l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4Z" />
    </svg>
  )
}

/* ---------------- Sign-up from invite (§6.1 step 2) ---------------- */

function PilotNotice() {
  return (
    <details className="group rounded-lg border border-line bg-surface" open>
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-ink">
        Pemberitahuan pilot (versi 1.0, 1 Nov 2026)
        <span className="block text-[13px] font-normal text-muted-foreground">Baca sebelum mendaftar. Ringkasannya:</span>
      </summary>
      <ul className="space-y-2 border-t border-line px-4 py-3 text-[13px] leading-relaxed text-ink">
        <li><b>Siapa yang menjalankan:</b> tim mahasiswa Group4, sebagai proyek mata kuliah.</li>
        <li><b>Pemesanan bersifat latihan:</b> tidak mengikat dan tidak ada uang sungguhan yang berpindah.</li>
        <li><b>Data yang kami simpan:</b> nama, email, nomor telepon jika Anda mengisinya, dan isi percakapan di Spot-In. Kami tidak meminta KTP, NIK, NPWP atau nomor rekening.</li>
        <li><b>Lokasi penyimpanan:</b> server penyedia hosting di Singapura. Dengan mendaftar, Anda setuju data disimpan di luar Indonesia.</li>
        <li><b>Penghapusan:</b> semua data pribadi pilot dihapus pada 31 Jan 2027. Anda juga bisa menghapus akun kapan saja.</li>
        <li><b>Kontak:</b> pilot@spot-in.id</li>
      </ul>
    </details>
  )
}

function SignUp({ state }: { state: string }) {
  if (state === "uninvited") {
    return (
      <AuthShell>
        <StateBlock
          icon={Lock}
          title="Spot-In masih dalam pilot tertutup"
          action={<Button variant="outline">Hubungi tim pilot</Button>}
        >
          <p>
            Email <b className="text-ink">andre@contoh.co.id</b> belum ada di daftar undangan, jadi akun belum bisa dibuat. Jika Anda pengelola tempat atau penyelenggara acara yang
            ingin ikut mencoba, kirim pesan ke tim pilot dan sebutkan nama usaha Anda.
          </p>
        </StateBlock>
      </AuthShell>
    )
  }
  if (state === "expired") {
    return (
      <AuthShell>
        <StateBlock icon={Clock} title="Undangan ini sudah kedaluwarsa" action={<Button>Minta undangan baru</Button>}>
          <p>Undangan berlaku 7 hari dan yang ini dikirim pada 28 Okt 2026. Kami akan memberi tahu Admin pilot supaya mengirim ulang ke budi.santoso@cempakaraya.co.id.</p>
        </StateBlock>
      </AuthShell>
    )
  }
  const err = state === "errors"
  return (
    <AuthShell>
      <h1 className="text-[22px] leading-tight font-bold tracking-tight">Buat akun untuk pilot Spot-In</h1>
      <p className="mt-1.5 text-[15px] text-muted-foreground">Anda diundang oleh Dimas dari tim Spot-In. Pendaftaran hanya butuh dua menit.</p>

      <Button variant="outline" className="mt-5 h-11 w-full bg-surface">
        <GoogleMark />
        Daftar dengan Google
      </Button>
      <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
        <Separator className="flex-1" />
        atau dengan email
        <Separator className="flex-1" />
      </div>

      <form className="space-y-4" onSubmit={(e) => e.preventDefault()} noValidate>
        <Field id="su-name" label="Nama lengkap">
          <Input autoComplete="name" defaultValue="Budi Santoso" className="h-11 bg-surface" />
        </Field>
        <Field id="su-email" label="Email" hint="Alamat ini dari undangan dan tidak bisa diubah.">
          <Input type="email" readOnly defaultValue="budi.santoso@cempakaraya.co.id" className="h-11 bg-sunken" />
        </Field>
        <Field
          id="su-pass"
          label="Kata sandi"
          hint="Minimal 10 karakter. Anda juga bisa masuk lewat tautan email tanpa kata sandi."
          error={err ? "Kata sandi baru 6 karakter. Tambahkan minimal 4 karakter lagi." : undefined}
        >
          <Input type="password" autoComplete="new-password" defaultValue={err ? "cempak" : ""} className="h-11 bg-surface" />
        </Field>

        <PilotNotice />

        <div className="space-y-3">
          <CheckRow id="su-age" error={err ? "Pilot hanya untuk pengguna berusia 18 tahun ke atas." : undefined}>
            Saya berusia 18 tahun atau lebih.
          </CheckRow>
          <CheckRow id="su-terms" defaultChecked={!err} error={err ? "Centang ini untuk melanjutkan. Anda bisa membaca ketentuannya lewat tautan di kalimat ini." : undefined}>
            Saya sudah membaca dan menyetujui <TextLink>ketentuan pilot</TextLink>, <TextLink>kebijakan privasi</TextLink> dan pemberitahuan pilot di atas.
          </CheckRow>
        </div>

        <Button type="submit" className="h-11 w-full">
          Buat akun
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Sudah punya akun? <TextLink>Masuk</TextLink>
        </p>
      </form>
    </AuthShell>
  )
}

/* ---------------- Email verification ---------------- */

function VerifyEmail({ state }: { state: string }) {
  if (state === "expired") {
    return (
      <AuthShell>
        <StateBlock icon={Clock} title="Tautan verifikasi sudah tidak berlaku" action={<Button>Kirim tautan baru</Button>}>
          <p>Tautan verifikasi berlaku 24 jam. Kirim tautan baru ke budi.santoso@cempakaraya.co.id, lalu buka dari email terbaru.</p>
        </StateBlock>
      </AuthShell>
    )
  }
  if (state === "done") {
    return (
      <AuthShell>
        <StateBlock icon={MailCheck} title="Email Anda sudah terverifikasi" action={<Button>Lanjut memilih peran</Button>}>
          <p>Sekarang Anda bisa mengirim permintaan, membuat penawaran dan menerima pemesanan.</p>
        </StateBlock>
      </AuthShell>
    )
  }
  if (state === "provider") {
    return (
      <AuthShell>
        <h1 className="text-[22px] leading-tight font-bold tracking-tight">Cek email Anda</h1>
        <Notice tone="danger" className="mt-4" title="Email verifikasi belum bisa dikirim">
          Layanan pengiriman email kami sedang bermasalah. Akun Anda sudah tersimpan; coba kirim ulang dalam beberapa menit.
        </Notice>
        <Button className="mt-4 h-11 w-full">Coba kirim lagi</Button>
      </AuthShell>
    )
  }
  return (
    <AuthShell>
      <span className="grid size-12 place-items-center rounded-full bg-brand-soft text-brand">
        <Mail className="size-6" aria-hidden="true" />
      </span>
      <h1 className="mt-4 text-[22px] leading-tight font-bold tracking-tight">Cek email Anda untuk verifikasi</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
        Kami mengirim tautan ke <b className="text-ink">budi.santoso@cempakaraya.co.id</b>. Buka tautan itu untuk mengaktifkan akun. Sambil menunggu, Anda sudah bisa menyiapkan
        properti.
      </p>
      <Panel className="mt-5 text-sm">
        <p className="font-semibold">Email belum masuk?</p>
        <ul className="mt-1.5 list-disc space-y-1 pl-5 text-muted-foreground">
          <li>Periksa folder Spam atau Promosi.</li>
          <li>Cari email dari noreply@spot-in.id.</li>
        </ul>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {state === "resent" ? (
            <p role="status" className="text-sm font-medium text-brand">
              Tautan baru terkirim pukul 10.14. Anda bisa kirim lagi dalam 60 detik.
            </p>
          ) : (
            <Button variant="outline">Kirim ulang tautan</Button>
          )}
        </div>
      </Panel>
      <Button variant="ghost" className="mt-3 w-full text-brand">Siapkan properti dulu</Button>
    </AuthShell>
  )
}

/* ---------------- Login (password / magic link / Google) ---------------- */

function Login({ state }: { state: string }) {
  if (state === "magic-sent") {
    return (
      <AuthShell>
        <span className="grid size-12 place-items-center rounded-full bg-brand-soft text-brand">
          <MailCheck className="size-6" aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-[22px] font-bold tracking-tight">Tautan masuk sudah dikirim</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
          Buka email ke <b className="text-ink">rina@lintasacara.id</b> dan klik <i>Masuk ke Spot-In</i>. Tautan berlaku 15 menit dan hanya bisa dipakai sekali.
        </p>
        <Button variant="outline" className="mt-5 w-full">Masuk dengan kata sandi</Button>
      </AuthShell>
    )
  }
  const err = state === "error"
  const magic = state === "magic"
  return (
    <AuthShell>
      <h1 className="text-[22px] leading-tight font-bold tracking-tight">Masuk ke Spot-In</h1>
      <p className="mt-1.5 text-[15px] text-muted-foreground">Gunakan email yang terdaftar di undangan pilot.</p>
      <Button variant="outline" className="mt-5 h-11 w-full bg-surface">
        <GoogleMark />
        Masuk dengan Google
      </Button>
      <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
        <Separator className="flex-1" />
        atau
        <Separator className="flex-1" />
      </div>
      {err && (
        <Notice tone="danger" className="mb-4" live title="Email atau kata sandi tidak cocok">
          Periksa kembali keduanya, atau minta tautan masuk lewat email supaya tidak perlu kata sandi.
        </Notice>
      )}
      <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
        <Field id="li-email" label="Email">
          <Input type="email" autoComplete="email" defaultValue="rina@lintasacara.id" className="h-11 bg-surface" />
        </Field>
        {!magic && (
          <Field id="li-pass" label="Kata sandi">
            <Input type="password" autoComplete="current-password" defaultValue={err ? "••••••••" : ""} className="h-11 bg-surface" />
          </Field>
        )}
        <Button className="h-11 w-full">{magic ? "Kirim tautan masuk" : "Masuk"}</Button>
      </form>
      <div className="mt-4 flex flex-col items-center gap-2 text-sm">
        {magic ? <TextLink>Masuk dengan kata sandi</TextLink> : <TextLink>Kirim tautan masuk ke email saya</TextLink>}
        <TextLink>Lupa kata sandi?</TextLink>
      </div>
    </AuthShell>
  )
}

/* ---------------- Session expired mid-form (§12.7) ---------------- */

function SessionExpired() {
  return (
    <Shell pilot>
      <h1 className="text-[22px] font-bold">Buat penawaran</h1>
      <div className="mt-4 space-y-3 opacity-60" aria-hidden="true">
        <div className="h-10 rounded-md bg-surface" />
        <div className="h-24 rounded-md bg-surface" />
      </div>
      <Dialog open>
        <DialogContent showCloseButton={false} className="max-w-[340px]">
          <DialogHeader className="text-left">
            <DialogTitle>Sesi Anda sudah berakhir</DialogTitle>
            <DialogDescription>
              Masuk lagi untuk melanjutkan. Draf penawaran Anda tersimpan dan akan muncul kembali seperti sebelumnya.
            </DialogDescription>
          </DialogHeader>
          <Field id="se-pass" label="Kata sandi untuk budi.santoso@cempakaraya.co.id">
            <Input type="password" className="h-11" />
          </Field>
          <DialogFooter>
            <Button className="w-full">Masuk dan lanjutkan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  )
}

/* ---------------- Role chooser (FR-M1-06) ---------------- */

function RoleChooser({ state }: { state: string }) {
  const options = [
    { id: "find", icon: CalendarSearch, title: "Saya mencari ruang", body: "Untuk penyelenggara acara: cari ruang, minta penawaran dan kelola pemesanan.", checked: state !== "list" },
    { id: "list", icon: Store, title: "Saya menyewakan ruang", body: "Untuk pengelola mal atau pemilik tempat: tampilkan ruang, jawab permintaan dan kirim penawaran.", checked: state === "list" || state === "both" },
  ]
  return (
    <AuthShell>
      <h1 className="text-[22px] leading-tight font-bold tracking-tight">Apa yang ingin Anda lakukan di Spot-In?</h1>
      <p className="mt-1.5 text-[15px] text-muted-foreground">Pilih satu atau keduanya. Anda bisa menambah peran lain nanti di pengaturan.</p>
      <fieldset className="mt-5 space-y-3">
        <legend className="sr-only">Peran</legend>
        {options.map((o) => (
          <label
            key={o.id}
            htmlFor={`role-${o.id}`}
            className="flex cursor-pointer gap-3 rounded-lg border-2 border-line bg-surface p-4 has-[:checked]:border-brand has-[:checked]:bg-brand-soft/40 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand"
          >
            <input id={`role-${o.id}`} type="checkbox" defaultChecked={o.checked} className="mt-1 size-5 accent-[#0f5c4d]" />
            <span>
              <span className="flex items-center gap-2 font-semibold text-ink">
                <o.icon className="size-4 text-brand" aria-hidden="true" />
                {o.title}
              </span>
              <span className="mt-1 block text-sm leading-snug text-muted-foreground">{o.body}</span>
            </span>
          </label>
        ))}
      </fieldset>
      {state === "both" && (
        <p className="mt-3 text-sm text-muted-foreground">
          Dengan dua peran, Anda berpindah lewat tombol konteks di kiri atas. Anda tidak bisa mengirim permintaan ke ruang milik tempat Anda sendiri.
        </p>
      )}
      <Button className="mt-6 h-11 w-full">{state === "list" ? "Siapkan tempat saya" : state === "both" ? "Lanjutkan dengan dua peran" : "Mulai mencari ruang"}</Button>
    </AuthShell>
  )
}

export const authScreens: ScreenDef[] = [
  {
    id: "signup",
    title: "Daftar dari undangan",
    section: "6.1",
    fr: ["FR-M1-01", "FR-M1-09", "FR-M1-11", "FR-M38-02", "FR-M38-03", "FR-M38-09"],
    device: "mobile",
    role: "Pengelola / penyelenggara",
    summary: "Daftar dengan email atau Google, pemberitahuan pilot dan konfirmasi usia 18+.",
    states: [
      { id: "default", label: "Formulir" },
      { id: "errors", label: "Galat isian", ref: "§12.7" },
      { id: "uninvited", label: "Email tidak diundang", ref: "§12.6" },
      { id: "expired", label: "Undangan kedaluwarsa", ref: "§12.6" },
    ],
    render: (s) => <SignUp state={s} />,
  },
  {
    id: "verify-email",
    title: "Verifikasi email",
    section: "6.1",
    fr: ["FR-M1-02", "FR-M21-07"],
    device: "mobile",
    role: "Semua pengguna",
    summary: "Menunggu klik tautan, kirim ulang, tautan kedaluwarsa, layanan email bermasalah.",
    states: [
      { id: "default", label: "Menunggu" },
      { id: "resent", label: "Terkirim ulang" },
      { id: "done", label: "Berhasil" },
      { id: "expired", label: "Tautan kedaluwarsa" },
      { id: "provider", label: "Email bermasalah", ref: "§12.7" },
    ],
    render: (s) => <VerifyEmail state={s} />,
  },
  {
    id: "login",
    title: "Masuk",
    section: "6.1",
    fr: ["FR-M1-01", "FR-M1-04"],
    device: "mobile",
    role: "Semua pengguna",
    summary: "Kata sandi, tautan masuk lewat email, atau Google.",
    states: [
      { id: "default", label: "Kata sandi" },
      { id: "magic", label: "Tautan masuk" },
      { id: "magic-sent", label: "Tautan terkirim" },
      { id: "error", label: "Gagal masuk" },
    ],
    render: (s) => <Login state={s} />,
  },
  {
    id: "session-expired",
    title: "Sesi berakhir di tengah formulir",
    section: "x",
    fr: ["FR-M1-04", "§12.7"],
    device: "mobile",
    role: "Semua pengguna",
    summary: "Dialog masuk ulang; draf tetap tersimpan.",
    states: [{ id: "default", label: "Dialog masuk ulang", ref: "§12.7" }],
    render: () => <SessionExpired />,
  },
  {
    id: "role",
    title: "Pilih peran",
    section: "6.1",
    fr: ["FR-M1-06", "FR-M1-07"],
    device: "mobile",
    role: "Pengguna baru",
    summary: "Cari ruang, sewakan ruang, atau keduanya.",
    states: [
      { id: "find", label: "Cari ruang" },
      { id: "list", label: "Sewakan ruang" },
      { id: "both", label: "Keduanya" },
    ],
    render: (s) => <RoleChooser state={s} />,
  },
]
