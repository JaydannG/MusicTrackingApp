import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  const body = await req.json()
  const {
    spotify_id, title, artist, cover_art_url,
    release_date, album_type, total_duration_ms,
    tracks, genres, rating, review, listen_date
  } = body

  // 1. Upsert album (insert or update if spotify_id already exists)
  const { data: album, error: albumError } = await supabase
    .from('albums')
    .upsert({ spotify_id, title, artist, cover_art_url, release_date, album_type, total_duration_ms },
      { onConflict: 'spotify_id' })
    .select()
    .single()

  if (albumError) return NextResponse.json({ error: albumError.message }, { status: 500 })

  // 2. Insert tracks (delete existing first to avoid duplicates)
  await supabase.from('tracks').delete().eq('album_id', album.id)
  const trackRows = tracks.map((t: any) => ({ album_id: album.id, ...t }))
  await supabase.from('tracks').insert(trackRows)

  // 3. Handle genres
  for (const genreName of genres) {
    // Get or create genre
    let { data: genre } = await supabase
      .from('genres')
      .select()
      .eq('name', genreName.toLowerCase())
      .single()

    if (!genre) {
      const { data: newGenre } = await supabase
        .from('genres')
        .insert({ name: genreName.toLowerCase() })
        .select()
        .single()
      genre = newGenre
    }

    // Link genre to album if not already linked
    if (genre) {
      await supabase
        .from('album_genres')
        .upsert({ album_id: album.id, genre_id: genre.id },
          { onConflict: 'album_id,genre_id' })
    }
  }

  // 4. Create log entry
  const { error: logError } = await supabase
    .from('logs')
    .insert({ album_id: album.id, rating, review, listen_date })

  if (logError) return NextResponse.json({ error: logError.message }, { status: 500 })

  return NextResponse.json({ success: true })
}