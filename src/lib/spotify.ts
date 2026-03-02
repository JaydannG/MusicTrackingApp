const clientId = process.env.SPOTIFY_CLIENT_ID!
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!

export async function getSpotifyToken() {
    const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
        },
        body: 'grant_type=client_credentials'
    });

    const data = await response.json();
    return data.access_token;
}

export async function searchAlbums(query: string) {
    const token = await getSpotifyToken();

    const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=album`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    const data = await response.json();
    return data.albums.items;
}

export async function getAlbum(spotifyId: string) {
    const token = await getSpotifyToken();

    const response = await fetch(`https://api.spotify.com/v1/albums/${spotifyId}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    return response.json();
}