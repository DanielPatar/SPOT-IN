/**
 * Seed data for the mock-ups. All people, venues and companies are fictional.
 * Money follows PRD §11.2 (worked example) — integer Rupiah, half-up per line.
 */

export function rp(n: number): string {
  return "Rp " + Math.round(n).toLocaleString("id-ID")
}

export const people = {
  rina: { name: "Rina Wulandari", first: "Rina", org: "PT Lintas Acara Kreatif", role: "Pemilik" },
  rinaMember: { name: "Yoga Pratama", first: "Yoga", org: "PT Lintas Acara Kreatif", role: "Anggota" },
  budi: { name: "Budi Santoso", first: "Budi", org: "Mal Cempaka Raya", role: "Staf" },
  lestari: { name: "Lestari Hadiwijaya", first: "Lestari", org: "Mal Cempaka Raya", role: "Pemilik" },
  sari: { name: "Sari Purnamasari", first: "Sari", org: "Komunitas Pasar Kriya", role: "Pemilik" },
  maya: { name: "Maya Anggraini", first: "Maya", email: "maya.anggraini@surel.id" },
  hendra: { name: "Hendra Gunawan", first: "Hendra", org: "Aula Griya Hendra", role: "Pemilik" },
  admin: { name: "Dimas Ardiansyah", first: "Dimas", org: "Tim Spot-In (Group4)", role: "Admin Spot-In" },
}

export const event = {
  name: "Pekan Kopi Nusantara 2026",
  type: "Pameran dan bazar",
  brand: "Rasa Kopi Indonesia",
  dates: "12–14 Des 2026",
  days: ["Sab, 12 Des 2026", "Min, 13 Des 2026", "Sen, 14 Des 2026"],
  hours: "10.00–22.00 WIB",
  attendance: 300,
  budget: "Rp 60.000.000 – Rp 100.000.000",
}

export const space = {
  name: "Atrium Utama",
  property: "Mal Cempaka Raya",
  area: "Jakarta Selatan",
  city: "DKI Jakarta",
  address: "Jl. Cempaka Raya No. 18, Tebet, Jakarta Selatan",
  level: "Lantai GF, zona tengah",
  size: 420,
  ceiling: 14,
  capacity: { berdiri: 600, teater: 350, kelas: 180, banquet: 240, booth: 24 },
  power: 40,
  fromPrice: 20_000_000,
  tz: "WIB",
}

/** PRD §11.2 worked example — quote version 2 (the one that is accepted). */
export const q2 = {
  rentalPerDay: 25_000_000,
  days: 3,
  rental: 75_000_000,
  electricity: 6_000_000,
  subtotal: 81_000_000,
  ppn: 8_910_000,
  venueTotal: 89_910_000,
  fee: 2_430_000,
  total: 92_340_000,
  depositVenue: 44_955_000,
  deposit: 47_385_000,
  balance: 44_955_000,
  commission: 8_100_000,
  venuePayable: 81_810_000,
  spotinRevenue: 10_530_000,
}

/** Version 1 (before revision): rental Rp 27 jt/day and a cleaning line. */
export const q1 = {
  rentalPerDay: 27_000_000,
  rental: 81_000_000,
  electricity: 6_000_000,
  cleaning: 1_500_000,
  subtotal: 88_500_000,
  ppn: 9_735_000,
  venueTotal: 98_235_000,
  fee: 2_500_000, // 3% = 2.655.000, capped at Rp 2.500.000 (§11.1)
  total: 100_735_000,
}

export const compareQuotes = [
  {
    venue: "Mal Cempaka Raya, Atrium Utama",
    version: "Versi 2",
    total: 92_340_000,
    perDay: 30_780_000,
    inclusions: "Listrik 40 kVA, keamanan area, kebersihan",
    deposit: "50% (Rp 47.385.000), jatuh tempo 3 hari setelah diterima",
    balance: "28 Nov 2026",
    policy: "Sedang: 100% kembali jika batal ≥ 30 hari sebelum acara",
    response: "5 jam kerja",
    ppn: true,
  },
  {
    venue: "Teras Langit Kemang, Rooftop Barat",
    version: "Versi 1",
    total: 80_370_000,
    perDay: 26_790_000,
    inclusions: "Listrik 30 kVA, kebersihan. Keamanan tidak termasuk",
    deposit: "50% (Rp 41.242.500), jatuh tempo 3 hari setelah diterima",
    balance: "28 Nov 2026",
    policy: "Ketat: 50% kembali jika batal ≥ 30 hari sebelum acara",
    response: "1 hari kerja",
    ppn: true,
  },
  {
    venue: "Aula Griya Hendra, Aula Utama",
    version: "Versi 1",
    total: 50_985_000,
    perDay: 16_995_000,
    inclusions: "Sound system dasar. Listrik di atas 15 kVA tidak tersedia",
    deposit: "30% (Rp 16.335.000), jatuh tempo 3 hari setelah diterima",
    balance: "28 Nov 2026",
    policy: "Fleksibel: 100% kembali jika batal ≥ 14 hari sebelum acara",
    response: "2 jam kerja",
    ppn: false,
  },
]

export const searchResults = [
  {
    id: "atrium",
    name: "Atrium Utama",
    property: "Mal Cempaka Raya",
    area: "Tebet, Jakarta Selatan",
    type: "Atrium",
    capacity: 600,
    power: 40,
    from: 20_000_000,
    unit: "per hari",
    verified: true,
    availability: "available" as const,
    km: 3.2,
    art: "atrium" as const,
  },
  {
    id: "rooftop",
    name: "Rooftop Barat",
    property: "Teras Langit Kemang",
    area: "Kemang, Jakarta Selatan",
    type: "Area luar ruang",
    capacity: 400,
    power: 30,
    from: 18_000_000,
    unit: "per hari",
    verified: true,
    availability: "limited" as const,
    km: 5.8,
    art: "rooftop" as const,
  },
  {
    id: "aula",
    name: "Aula Utama",
    property: "Aula Griya Hendra",
    area: "Pasar Minggu, Jakarta Selatan",
    type: "Aula/ballroom",
    capacity: 350,
    power: 15,
    from: 12_500_000,
    unit: "per hari",
    verified: true,
    availability: "available" as const,
    km: 7.1,
    art: "hall" as const,
  },
  {
    id: "promo",
    name: "Promo Spot Lobi Selatan",
    property: "Mal Cempaka Raya",
    area: "Tebet, Jakarta Selatan",
    type: "Booth/promo spot",
    capacity: 60,
    power: 10,
    from: 3_500_000,
    unit: "per hari",
    verified: true,
    availability: "available" as const,
    km: 3.2,
    art: "booth" as const,
  },
]

export const attendees = [
  { name: "Maya Anggraini", email: "maya.a•••@surel.id", at: "20 Nov, 19.12", status: "checked" as const, by: "Rina", time: "10.42" },
  { name: "Andi Saputra", email: "andi.s•••@surel.id", at: "20 Nov, 19.30", status: "issued" as const },
  { name: "Clara Siregar", email: "clara•••@surel.id", at: "21 Nov, 08.05", status: "issued" as const },
  { name: "Dewa Ketut Arsana", email: "dewa.k•••@surel.id", at: "21 Nov, 10.47", status: "checked" as const, by: "Yoga", time: "10.51" },
  { name: "Fitri Handayani", email: "fitri•••@surel.id", at: "22 Nov, 13.20", status: "cancelled" as const },
  { name: "Gilang Ramadhan", email: "gilang•••@surel.id", at: "23 Nov, 16.02", status: "issued" as const },
]
