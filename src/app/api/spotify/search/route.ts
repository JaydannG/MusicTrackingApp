import { NextRequest, NextResponse } from 'next/server';
import { searchAlbums } from '@/src/lib/spotify';

export async function GET(request: NextRequest) {
    const query = request.nextUrl.searchParams.get('q');
    if (!query) return NextResponse.json({ error: 'No query provided' }, { status: 400 });

    const albums = await searchAlbums(query);
    return NextResponse.json(albums);
}