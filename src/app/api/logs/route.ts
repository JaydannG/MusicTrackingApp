import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET() {
    const { data, error } = await supabase
        .from('logs')
        .select(`
    id,
    start_date,
    finish_date,
    rating,
    review,
    albums (
      id,
      title,
      artist,
      cover_art_url,
      album_type,
      release_date,
      total_duration_ms,
      album_genres (
        genres (
          id,
          name
        )
      )
    )
  `)
        .order('finish_date', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
}