import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { normalize } from 'path'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function normalizeDate(date: string): string {
  if (!date) return date;
  if (/^\d{4}$/.test(date)) return `${date}-01-01`;
  if (/^\d{4}-\d{2}$/.test(date)) return `${date}-01`;
  return date;
}

export async function POST(req: NextRequest) {
    const body = await req.json()
    const {
        spotify_id, title, artist, cover_art_url,
        release_date, album_type, total_duration_ms,
        tracks, genres, rating, review, start_date, finish_date
    } = body

    // 1. Upsert album
    const { data: album, error: albumError } = await supabase
        .from('albums')
        .upsert(
            { spotify_id, title, artist, cover_art_url, release_date: normalizeDate(release_date), album_type, total_duration_ms },
            { onConflict: 'spotify_id' }
        )
        .select()
        .single()

    if (albumError) return NextResponse.json({ error: albumError.message }, { status: 500 })

    // 2. Insert tracks (replace existing)
    await supabase.from('tracks').delete().eq('album_id', album.id)
    await supabase.from('tracks').insert(
        tracks.map((t: any) => ({ album_id: album.id, ...t }))
    )

    // 3. Handle genres
    console.log("genres to save:", genres)
    for (const genreName of genres) {
        console.log("processing genre:", genreName)
        const normalized = genreName.toLowerCase()

        const { data: existingGenre } = await supabase
            .from('genres')
            .select()
            .eq('name', normalized)
            .maybeSingle()

        let genreId: number

        if (existingGenre) {
            genreId = existingGenre.id
            console.log("found existing genre:", genreId)
        } else {
            const { data: newGenre, error: genreError } = await supabase
                .from('genres')
                .insert({ name: normalized })
                .select()
                .single()
            if (genreError || !newGenre) {
                console.log("failed to insert genre:", genreError)
                continue
            }
            genreId = newGenre.id
            console.log("inserted new genre:", genreId)
        }

        const { error: linkError } = await supabase
            .from('album_genres')
            .insert({ album_id: album.id, genre_id: genreId })
        console.log("linked genre result:", linkError)
    }

    // 4. Create log entry
    const { error: logError } = await supabase
        .from('logs')
        .insert({ album_id: album.id, rating, review, start_date, finish_date })

    if (logError) return NextResponse.json({ error: logError.message }, { status: 500 })

    return NextResponse.json({ success: true })
}