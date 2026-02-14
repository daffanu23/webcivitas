import { defineDb, defineTable, column } from 'astro:db';

// 1. Membuat Tabel 'Berita'
const Berita = defineTable({
  columns: {
    // ID: Angka unik otomatis (Primary Key)
    id: column.number({ primaryKey: true }),
    
    // Data Berita
    judul: column.text(),
    pesan: column.text(),
    waktu: column.text(), // Kita simpan tanggal sebagai teks dulu biar simpel
  }
});

// 2. Export Database
export default defineDb({
  tables: { Berita },
});