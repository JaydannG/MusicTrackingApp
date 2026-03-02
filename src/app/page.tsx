"use client";

import { useState, useEffect } from "react";

// ---- Types ----
type Log = {
  id: number;
  listen_date: string;
  rating: number | null;
  review: string | null;
  albums: {
    id: number;
    title: string;
    artist: string;
    cover_art_url: string;
    album_type: string;
    release_date: string;
    total_duration_ms: number;
  };
};

type Stats = {
  total: number;
  avgRating: number | null;
  thisMonth: number;
};

// ---- Helpers ----
function formatDuration(ms: number) {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ---- Star Rating ----
function StarRating({ rating }: { rating: number | null }) {
  if (!rating) return <span style={{ color: "var(--muted)" }}>No rating</span>;
  return (
    <span style={{ color: "var(--accent)", letterSpacing: "2px" }}>
      {"★".repeat(rating)}
      <span style={{ color: "var(--muted-dark)" }}>{"★".repeat(5 - rating)}</span>
    </span>
  );
}

// ---- Log Modal ----
function LogModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [albumDetails, setAlbumDetails] = useState<any>(null);
  const [albumType, setAlbumType] = useState("album");
  const [genres, setGenres] = useState("");
  const [rating, setRating] = useState<number>(0);
  const [review, setReview] = useState("");
  const [listenDate, setListenDate] = useState(new Date().toISOString().split("T")[0]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hoveredStar, setHoveredStar] = useState(0);

  async function handleSearch() {
    if (!query.trim()) return;
    setSearching(true);
    const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    setResults(data);
    setSearching(false);
  }

  async function handleSelect(album: any) {
    setSelected(album);
    const res = await fetch(`/api/spotify/album?id=${album.id}`);
    const data = await res.json();
    setAlbumDetails(data);
    setAlbumType(data.album_type === "single" ? "single" : data.album_type);
  }

  async function handleSave() {
    if (!albumDetails) return;
    setSaving(true);

    const totalDuration = albumDetails.tracks.items.reduce(
      (sum: number, t: any) => sum + t.duration_ms,
      0
    );

    const res = await fetch("/api/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        spotify_id: albumDetails.id,
        title: albumDetails.name,
        artist: albumDetails.artists[0].name,
        cover_art_url: albumDetails.images[0]?.url,
        release_date: albumDetails.release_date,
        album_type: albumType,
        total_duration_ms: totalDuration,
        tracks: albumDetails.tracks.items.map((t: any, i: number) => ({
          title: t.name,
          duration_ms: t.duration_ms,
          track_number: i + 1,
        })),
        genres: genres.split(",").map((g) => g.trim()).filter(Boolean),
        rating: rating || null,
        review: review || null,
        listen_date: listenDate,
      }),
    });

    setSaving(false);
    if (res.ok) {
      onSave();
      onClose();
    }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 100, padding: "20px"
    }}>
      <div style={{
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: "4px", width: "100%", maxWidth: "560px",
        maxHeight: "90vh", overflowY: "auto", padding: "32px",
        boxShadow: "0 25px 80px rgba(0,0,0,0.8)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "22px", color: "var(--text)", margin: 0 }}>
            Log an Album
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "20px" }}>✕</button>
        </div>

        {!selected ? (
          <>
            <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Search for an album..."
                style={{
                  flex: 1, background: "var(--bg)", border: "1px solid var(--border)",
                  borderRadius: "3px", padding: "10px 14px", color: "var(--text)",
                  fontFamily: "var(--font-body)", fontSize: "14px", outline: "none"
                }}
              />
              <button onClick={handleSearch} style={{
                background: "var(--accent)", border: "none", borderRadius: "3px",
                padding: "10px 18px", color: "#000", fontFamily: "var(--font-body)",
                fontWeight: "700", cursor: "pointer", fontSize: "13px"
              }}>
                {searching ? "..." : "Search"}
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {results.map((album) => (
                <button key={album.id} onClick={() => handleSelect(album)} style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  background: "var(--bg)", border: "1px solid var(--border)",
                  borderRadius: "3px", padding: "10px 12px", cursor: "pointer",
                  textAlign: "left", transition: "border-color 0.15s"
                }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                >
                  <img src={album.images?.[2]?.url || album.images?.[0]?.url} alt=""
                    style={{ width: "44px", height: "44px", borderRadius: "2px", objectFit: "cover" }} />
                  <div>
                    <div style={{ color: "var(--text)", fontFamily: "var(--font-body)", fontSize: "14px", fontWeight: "600" }}>
                      {album.name}
                    </div>
                    <div style={{ color: "var(--muted)", fontFamily: "var(--font-body)", fontSize: "12px" }}>
                      {album.artists[0].name} · {album.release_date?.slice(0, 4)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            {/* Selected album header */}
            <div style={{ display: "flex", gap: "16px", marginBottom: "24px", alignItems: "center" }}>
              <img src={albumDetails?.images?.[1]?.url || selected.images?.[0]?.url} alt=""
                style={{ width: "72px", height: "72px", borderRadius: "3px", objectFit: "cover" }} />
              <div>
                <div style={{ color: "var(--text)", fontFamily: "var(--font-display)", fontSize: "18px" }}>
                  {selected.name}
                </div>
                <div style={{ color: "var(--muted)", fontFamily: "var(--font-body)", fontSize: "13px" }}>
                  {selected.artists[0].name}
                </div>
                <button onClick={() => { setSelected(null); setAlbumDetails(null); }}
                  style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: "12px", padding: 0, marginTop: "4px", fontFamily: "var(--font-body)" }}>
                  ← Change album
                </button>
              </div>
            </div>

            {/* Form fields */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

              <div>
                <label style={labelStyle}>Album Type</label>
                <select value={albumType} onChange={(e) => setAlbumType(e.target.value)} style={inputStyle}>
                  <option value="album">Album</option>
                  <option value="ep">EP</option>
                  <option value="single">Single</option>
                  <option value="compilation">Compilation</option>
                  <option value="live">Live Album</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Genres <span style={{ color: "var(--muted)", fontWeight: 400 }}>(comma separated)</span></label>
                <input
                  value={genres}
                  onChange={(e) => setGenres(e.target.value)}
                  placeholder="e.g. post-punk, shoegaze, indie rock"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Listen Date</label>
                <input type="date" value={listenDate} onChange={(e) => setListenDate(e.target.value)} style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Rating</label>
                <div style={{ display: "flex", gap: "4px" }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star}
                      onClick={() => setRating(star === rating ? 0 : star)}
                      onMouseEnter={() => setHoveredStar(star)}
                      onMouseLeave={() => setHoveredStar(0)}
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        fontSize: "26px", padding: "0 2px", lineHeight: 1,
                        color: star <= (hoveredStar || rating) ? "var(--accent)" : "var(--muted-dark)",
                        transition: "color 0.1s"
                      }}>★</button>
                  ))}
                </div>
              </div>

              <div>
                <label style={labelStyle}>Review <span style={{ color: "var(--muted)", fontWeight: 400 }}>(optional)</span></label>
                <textarea
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  placeholder="What did you think?"
                  rows={3}
                  style={{ ...inputStyle, resize: "vertical" as const }}
                />
              </div>

              <button onClick={handleSave} disabled={saving} style={{
                background: "var(--accent)", border: "none", borderRadius: "3px",
                padding: "12px", color: "#000", fontFamily: "var(--font-body)",
                fontWeight: "700", cursor: "pointer", fontSize: "14px",
                opacity: saving ? 0.7 : 1, marginTop: "8px"
              }}>
                {saving ? "Saving..." : "Log Album"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block", color: "var(--muted)", fontFamily: "var(--font-body)",
  fontSize: "11px", fontWeight: "700", textTransform: "uppercase",
  letterSpacing: "1px", marginBottom: "6px"
};

const inputStyle: React.CSSProperties = {
  width: "100%", background: "var(--bg)", border: "1px solid var(--border)",
  borderRadius: "3px", padding: "10px 14px", color: "var(--text)",
  fontFamily: "var(--font-body)", fontSize: "14px", outline: "none",
  boxSizing: "border-box"
};

// ---- Main Page ----
export default function Home() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, avgRating: null, thisMonth: 0 });
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  async function fetchLogs() {
    const res = await fetch("/api/logs");
    const data = await res.json();
    setLogs(data);

    const total = data.length;
    const rated = data.filter((l: Log) => l.rating);
    const avgRating = rated.length
      ? Math.round((rated.reduce((s: number, l: Log) => s + (l.rating || 0), 0) / rated.length) * 10) / 10
      : null;
    const now = new Date();
    const thisMonth = data.filter((l: Log) => {
      const d = new Date(l.listen_date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    setStats({ total, avgRating, thisMonth });
    setLoading(false);
  }

  useEffect(() => { fetchLogs(); }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Mono:wght@400;500&display=swap');

        :root {
          --bg: #0e0e0e;
          --surface: #161616;
          --border: #2a2a2a;
          --text: #e8e2d9;
          --muted: #6b6560;
          --muted-dark: #3a3530;
          --accent: #d4522a;
          --accent-soft: rgba(212,82,42,0.12);
          --font-display: 'Playfair Display', serif;
          --font-body: 'DM Mono', monospace;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: var(--bg);
          color: var(--text);
          font-family: var(--font-body);
          min-height: 100vh;
        }

        body::before {
          content: '';
          position: fixed;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E");
          opacity: 0.025;
          pointer-events: none;
          z-index: 0;
        }

        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: var(--bg); }
        ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

        select option { background: var(--surface); }
      `}</style>

      <div style={{ position: "relative", zIndex: 1, maxWidth: "760px", margin: "0 auto", padding: "48px 24px" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "40px" }}>
          <div>
            <div style={{ color: "var(--accent)", fontFamily: "var(--font-body)", fontSize: "11px", letterSpacing: "3px", textTransform: "uppercase", marginBottom: "6px" }}>
              ◆ Music Tracker
            </div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "42px", fontWeight: "900", lineHeight: 1, color: "var(--text)" }}>
              Your Listening<br />History
            </h1>
          </div>
          <button onClick={() => setShowModal(true)} style={{
            background: "var(--accent)", border: "none", borderRadius: "3px",
            padding: "12px 22px", color: "#000", fontFamily: "var(--font-body)",
            fontWeight: "700", cursor: "pointer", fontSize: "13px", letterSpacing: "0.5px",
            transition: "opacity 0.15s", whiteSpace: "nowrap"
          }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            + Log Album
          </button>
        </div>

        {/* Stats Bar */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
          border: "1px solid var(--border)", borderRadius: "4px",
          marginBottom: "40px", overflow: "hidden"
        }}>
          {[
            { label: "Albums Logged", value: stats.total },
            { label: "Avg Rating", value: stats.avgRating ? `${stats.avgRating} / 5` : "—" },
            { label: "This Month", value: stats.thisMonth },
          ].map((stat, i) => (
            <div key={i} style={{
              padding: "20px 24px",
              borderRight: i < 2 ? "1px solid var(--border)" : "none",
              background: "var(--surface)"
            }}>
              <div style={{ color: "var(--muted)", fontSize: "10px", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "8px" }}>
                {stat.label}
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "32px", fontWeight: "700", color: "var(--text)" }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* Recent Listens */}
        <div style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "20px", color: "var(--text)" }}>Recent Listens</h2>
          <span style={{ color: "var(--muted)", fontSize: "12px" }}>{logs.length} entries</span>
        </div>

        {loading ? (
          <div style={{ color: "var(--muted)", textAlign: "center", padding: "60px 0", fontSize: "13px" }}>Loading...</div>
        ) : logs.length === 0 ? (
          <div style={{
            border: "1px dashed var(--border)", borderRadius: "4px",
            padding: "60px", textAlign: "center"
          }}>
            <div style={{ color: "var(--muted)", fontSize: "13px", marginBottom: "16px" }}>No albums logged yet</div>
            <button onClick={() => setShowModal(true)} style={{
              background: "none", border: "1px solid var(--accent)", borderRadius: "3px",
              padding: "10px 20px", color: "var(--accent)", fontFamily: "var(--font-body)",
              cursor: "pointer", fontSize: "13px"
            }}>Log your first album</button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
            {logs.map((log, i) => (
              <div key={log.id} style={{
                display: "flex", alignItems: "center", gap: "16px",
                background: "var(--surface)", padding: "14px 16px",
                borderTop: i === 0 ? "1px solid var(--border)" : "none",
                borderBottom: "1px solid var(--border)",
                transition: "background 0.15s"
              }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#1c1c1c")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "var(--surface)")}
              >
                <span style={{ color: "var(--muted-dark)", fontSize: "11px", fontFamily: "var(--font-body)", width: "24px", textAlign: "right", flexShrink: 0 }}>
                  {i + 1}
                </span>
                <img src={log.albums.cover_art_url} alt=""
                  style={{ width: "48px", height: "48px", borderRadius: "2px", objectFit: "cover", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: "var(--text)", fontSize: "14px", fontWeight: "500", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {log.albums.title}
                  </div>
                  <div style={{ color: "var(--muted)", fontSize: "12px" }}>
                    {log.albums.artist} · <span style={{ textTransform: "capitalize" }}>{log.albums.album_type}</span> · {formatDuration(log.albums.total_duration_ms)}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ marginBottom: "2px" }}><StarRating rating={log.rating} /></div>
                  <div style={{ color: "var(--muted)", fontSize: "11px" }}>{formatDate(log.listen_date)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && <LogModal onClose={() => setShowModal(false)} onSave={fetchLogs} />}
    </>
  );
}