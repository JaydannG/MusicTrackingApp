import { NextRequest, NextResponse } from 'next/server';
import { getAlbum } from '@/src/lib/spotify';

export async function GET(request: NextRequest) {
    const id = request.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'No id provided' }, { status: 400 });

    const album = await getAlbum(id);
    return NextResponse.json(album);
}