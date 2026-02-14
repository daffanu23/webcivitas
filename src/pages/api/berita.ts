import type { APIRoute } from "astro";
import { db, Berita } from 'astro:db'; // Import database kita

// GET: Ambil semua data dari file database lokal
export const GET: APIRoute = async () => {
  // Select * from Berita
  const data = await db.select().from(Berita);
  
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" }
  });
};

// POST: Masukkan data baru ke file database lokal
export const POST: APIRoute = async ({ request }) => {
  const dataBaru = await request.json();

  if (!dataBaru.judul || !dataBaru.pesan) {
    return new Response(JSON.stringify({ error: "Data tidak lengkap" }), { status: 400 });
  }

  // Insert into Berita ...
  const hasil = await db.insert(Berita).values({
    judul: dataBaru.judul,
    pesan: dataBaru.pesan,
    waktu: new Date().toLocaleString() // Simpan waktu sekarang
  });

  return new Response(JSON.stringify({ 
    message: "Berhasil disimpan ke SQLite!",
    data: hasil 
  }), { status: 201 });
};