const clientId = process.env.SPOTIFY_CLIENT_ID!
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!

let cachedToken: string | null = null
let tokenExpiry: number = 0

export async function getSpotifyToken(): Promise<string> {
    if (cachedToken && Date.now() < tokenExpiry) {
        return cachedToken
    }

    const res = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
        },
        body: 'grant_type=client_credentials'
    })

    const data = await res.json()
    cachedToken = data.access_token
    tokenExpiry = Date.now() + (data.expires_in - 60) * 1000 // expire 1 min early to be safe
    return cachedToken!
}

export async function searchAlbums(query: string) {
    const token = await getSpotifyToken()
    const res = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=album&limit=8`,
        { headers: { Authorization: `Bearer ${token}` } }
    )
    const data = await res.json()
    return data.albums.items
}

export async function getAlbum(spotifyId: string) {
    const token = await getSpotifyToken()
    const res = await fetch(
        `https://api.spotify.com/v1/albums/${spotifyId}`,
        { headers: { Authorization: `Bearer ${token}` } }
    )
    return res.json()
}