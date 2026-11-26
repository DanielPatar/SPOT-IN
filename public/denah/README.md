# Denah (floor plans) for the open-space catalog

Put one file per venue here, named after the venue's slug, e.g.

    grand-indonesia-fountain-atrium.webp
    jakarta-convention-center-main-hall.pdf

Accepted: .webp .png .jpg .jpeg .svg .pdf. Then run `npm run catalog:import` again —
the importer links every file it finds. Run `npm run catalog:import -- --slugs` to list
the expected file names. Only add floor plans you are allowed to republish, and keep the
source link in the CSV (`Link_Sumber`) so the page credits it.
