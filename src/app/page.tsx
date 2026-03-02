"use client";

import { useState, useEffect } from "react";

// ---- Types ----
type Genre = { id: number; name: string };
type Log = {
    id: number;
    start_date: string | null;
    finish_date: string;
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
        album_genres: { genres: Genre }[];
    };
};

// ---- Helpers ----
function formatDate(dateStr: string | null) {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short", day: "numeric", year: "numeric",
    });
}

// ---- Navbar ----
function Navbar({ page, setPage }: { page: string; setPage: (p: string) => void }) {
    return (
        <nav style={{
            position: "sticky", top: 0, zIndex: 50,
            background: "rgba(14,14,14,0.92)", backdropFilter: "blur(12px)",
            borderBottom: "1px solid var(--border)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "0 32px", height: "56px"
        }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ color: "var(--accent)", fontSize: "14px" }}>◆</span>
                <span style={{ fontFamily: "var(--font-display)", fontSize: "18px", fontWeight: "700", color: "var(--text)" }}>
                    Music Tracker
                </span>
            </div>
            <div style={{ display: "flex", gap: "4px" }}>
                {["History", "Stats"].map((label) => {
                    const key = label.toLowerCase();
                    const active = page === key;
                    return (
                        <button key={key} onClick={() => setPage(key)} style={{
                            background: active ? "var(--accent-soft)" : "none",
                            border: active ? "1px solid var(--accent)" : "1px solid transparent",
                            borderRadius: "3px", padding: "6px 16px",
                            color: active ? "var(--accent)" : "var(--muted)",
                            fontFamily: "var(--font-body)", fontSize: "12px",
                            fontWeight: "600", letterSpacing: "1px", textTransform: "uppercase",
                            cursor: "pointer", transition: "all 0.15s"
                        }}
                            onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = "var(--text)"; }}
                            onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = "var(--muted)"; }}
                        >
                            {label}
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}

// ---- Genre Tag ----
function GenreTag({ name }: { name: string }) {
    return (
        <span style={{
            display: "inline-block",
            background: "var(--accent-soft)",
            border: "1px solid rgba(212,82,42,0.25)",
            borderRadius: "2px",
            padding: "2px 7px",
            fontSize: "10px",
            fontFamily: "var(--font-body)",
            color: "var(--accent)",
            letterSpacing: "0.5px",
            whiteSpace: "nowrap"
        }}>
            {name}
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
    const [rating, setRating] = useState<string>("");
    const [review, setReview] = useState("");
    const [startDate, setStartDate] = useState("");
    const [finishDate, setFinishDate] = useState(new Date().toISOString().split("T")[0]);
    const [searching, setSearching] = useState(false);
    const [saving, setSaving] = useState(false);

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
            (sum: number, t: any) => sum + t.duration_ms, 0
        );

        const parsedRating = rating === "" ? null : parseFloat(rating);

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
                    title: t.name, duration_ms: t.duration_ms, track_number: i + 1,
                })),
                genres: genres.split(",").map((g) => g.trim()).filter(Boolean),
                rating: parsedRating,
                review: review || null,
                start_date: startDate || null,
                finish_date: finishDate,
            }),
        });

        setSaving(false);
        if (res.ok) {
            onSave();
            onClose();
        } else {
            const errorData = await res.json();
            console.error("Failed to save:", errorData);
            alert("Error: " + JSON.stringify(errorData));
        }
    }

    const ratingNum = rating === "" ? null : parseFloat(rating);
    const ratingValid = rating === "" || (!isNaN(ratingNum!) && ratingNum! >= 0 && ratingNum! <= 10 && (ratingNum! * 2) % 1 === 0);

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
                                style={inputStyle}
                            />
                            <button onClick={handleSearch} style={accentBtnStyle}>
                                {searching ? "..." : "Search"}
                            </button>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            {results.map((album) => (
                                <button key={album.id} onClick={() => handleSelect(album)} style={{
                                    display: "flex", alignItems: "center", gap: "12px",
                                    background: "var(--bg)", border: "1px solid var(--border)",
                                    borderRadius: "3px", padding: "10px 12px", cursor: "pointer",
                                    textAlign: "left", transition: "border-color 0.15s", width: "100%"
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
                        <div style={{ display: "flex", gap: "16px", marginBottom: "24px", alignItems: "center" }}>
                            <img src={albumDetails?.images?.[1]?.url || selected.images?.[0]?.url} alt=""
                                style={{ width: "72px", height: "72px", borderRadius: "3px", objectFit: "cover" }} />
                            <div>
                                <div style={{ color: "var(--text)", fontFamily: "var(--font-display)", fontSize: "18px" }}>{selected.name}</div>
                                <div style={{ color: "var(--muted)", fontFamily: "var(--font-body)", fontSize: "13px" }}>{selected.artists[0].name}</div>
                                <button onClick={() => { setSelected(null); setAlbumDetails(null); }}
                                    style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: "12px", padding: 0, marginTop: "4px", fontFamily: "var(--font-body)" }}>
                                    ← Change album
                                </button>
                            </div>
                        </div>

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
                                <input value={genres} onChange={(e) => setGenres(e.target.value)}
                                    placeholder="e.g. post-punk, shoegaze, indie rock" style={inputStyle} />
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                                <div>
                                    <label style={labelStyle}>Start Date <span style={{ color: "var(--muted)", fontWeight: 400 }}>(optional)</span></label>
                                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Finish Date</label>
                                    <input type="date" value={finishDate} onChange={(e) => setFinishDate(e.target.value)} style={inputStyle} />
                                </div>
                            </div>

                            <div>
                                <label style={labelStyle}>Rating <span style={{ color: "var(--muted)", fontWeight: 400 }}>(0 – 10, steps of 0.5)</span></label>
                                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                    <input
                                        type="number" min="0" max="10" step="0.5"
                                        value={rating}
                                        onChange={(e) => setRating(e.target.value)}
                                        placeholder="e.g. 8.5"
                                        style={{ ...inputStyle, width: "120px" }}
                                    />
                                    {ratingNum !== null && ratingValid && (
                                        <span style={{ fontFamily: "var(--font-display)", fontSize: "24px", color: "var(--accent)" }}>
                                            {ratingNum} <span style={{ color: "var(--muted)", fontSize: "14px" }}>/ 10</span>
                                        </span>
                                    )}
                                </div>
                                {!ratingValid && (
                                    <div style={{ color: "#e05555", fontSize: "11px", marginTop: "4px", fontFamily: "var(--font-body)" }}>
                                        Must be between 0 and 10 in steps of 0.5
                                    </div>
                                )}
                            </div>

                            <div>
                                <label style={labelStyle}>Review <span style={{ color: "var(--muted)", fontWeight: 400 }}>(optional)</span></label>
                                <textarea value={review} onChange={(e) => setReview(e.target.value)}
                                    placeholder="What did you think?" rows={3}
                                    style={{ ...inputStyle, resize: "vertical" as const }} />
                            </div>

                            <button onClick={handleSave} disabled={saving || !ratingValid} style={{
                                ...accentBtnStyle, width: "100%", padding: "12px",
                                fontSize: "14px", opacity: (saving || !ratingValid) ? 0.6 : 1,
                                marginTop: "8px"
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

const accentBtnStyle: React.CSSProperties = {
    background: "var(--accent)", border: "none", borderRadius: "3px",
    padding: "10px 18px", color: "#000", fontFamily: "var(--font-body)",
    fontWeight: "700", cursor: "pointer", fontSize: "13px"
};

// ---- History Page ----
function HistoryPage({ logs, loading, onLogClick }: {
    logs: Log[]; loading: boolean; onLogClick: () => void;
}) {
    console.log("album_genres sample:", JSON.stringify(logs[0]?.albums?.album_genres));
    return (
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "32px" }}>
                <div>
                    <div style={{ color: "var(--accent)", fontSize: "11px", letterSpacing: "3px", textTransform: "uppercase", marginBottom: "6px" }}>
                        Listening History
                    </div>
                    <h1 style={{ fontFamily: "var(--font-display)", fontSize: "36px", fontWeight: "900", color: "var(--text)", lineHeight: 1 }}>
                        {logs.length} Albums Logged
                    </h1>
                </div>
                <button onClick={onLogClick} style={{ ...accentBtnStyle, padding: "12px 22px", fontSize: "13px", letterSpacing: "0.5px" }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                >
                    + Log Album
                </button>
            </div>

            {loading ? (
                <div style={{ color: "var(--muted)", textAlign: "center", padding: "80px 0", fontSize: "13px" }}>Loading...</div>
            ) : logs.length === 0 ? (
                <div style={{ border: "1px dashed var(--border)", borderRadius: "4px", padding: "80px", textAlign: "center" }}>
                    <div style={{ color: "var(--muted)", fontSize: "13px", marginBottom: "16px" }}>No albums logged yet</div>
                    <button onClick={onLogClick} style={{ background: "none", border: "1px solid var(--accent)", borderRadius: "3px", padding: "10px 20px", color: "var(--accent)", fontFamily: "var(--font-body)", cursor: "pointer", fontSize: "13px" }}>
                        Log your first album
                    </button>
                </div>
            ) : (
                <div style={{ border: "1px solid var(--border)", borderRadius: "4px", overflow: "hidden" }}>
                    {/* Table Header */}
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "32px 56px 1fr 1fr 1fr 140px 80px 200px",
                        gap: "0 16px",
                        padding: "10px 16px",
                        background: "var(--surface)",
                        borderBottom: "1px solid var(--border)"
                    }}>
                        {["#", "", "Album", "Artist", "Genres", "Dates", "Rating", "Review"].map((h, i) => (
                            <div key={i} style={{ color: "var(--muted)", fontSize: "10px", fontWeight: "700", letterSpacing: "1.5px", textTransform: "uppercase", alignSelf: "center" }}>
                                {h}
                            </div>
                        ))}
                    </div>

                    {/* Table Rows */}
                    {logs.map((log, i) => {
                        const genreList = log.albums.album_genres;
                        const genres = Array.isArray(genreList)
                            ? genreList.map((ag: any) => ag.genres)
                            : genreList && typeof genreList === 'object'
                                ? [(genreList as any).genres]
                                : [];
                        return (
                            <div key={log.id} style={{
                                display: "grid",
                                gridTemplateColumns: "32px 56px 1fr 1fr 1fr 140px 80px 200px",
                                gap: "0 16px",
                                padding: "12px 16px",
                                borderBottom: i < logs.length - 1 ? "1px solid var(--border)" : "none",
                                alignItems: "center",
                                transition: "background 0.12s"
                            }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = "#1a1a1a")}
                                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                            >
                                <div style={{ color: "var(--muted-dark)", fontSize: "11px", textAlign: "right" }}>{i + 1}</div>

                                <img src={log.albums.cover_art_url} alt=""
                                    style={{ width: "48px", height: "48px", borderRadius: "2px", objectFit: "cover", display: "block" }} />

                                <div style={{ minWidth: 0 }}>
                                    <div style={{ color: "var(--text)", fontSize: "14px", fontWeight: "500", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                        {log.albums.title}
                                    </div>
                                    <div style={{ color: "var(--muted)", fontSize: "11px", textTransform: "capitalize", marginTop: "2px" }}>
                                        {log.albums.album_type}
                                    </div>
                                </div>

                                <div style={{ color: "var(--muted)", fontSize: "13px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {log.albums.artist}
                                </div>

                                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                                    {genres.length > 0
                                        ? genres.map((g) => <GenreTag key={g.id} name={g.name} />)
                                        : <span style={{ color: "var(--muted-dark)", fontSize: "12px" }}>—</span>
                                    }
                                </div>

                                <div style={{ fontSize: "11px", color: "var(--muted)", lineHeight: 1.8 }}>
                                    {log.start_date && (
                                        <div>Start: <span style={{ color: "var(--text)" }}>{formatDate(log.start_date)}</span></div>
                                    )}
                                    <div>End: <span style={{ color: "var(--text)" }}>{formatDate(log.finish_date)}</span></div>
                                </div>

                                <div style={{ textAlign: "left" }}>
                                    {log.rating !== null
                                        ? <span style={{ fontFamily: "var(--font-display)", fontSize: "20px", color: "var(--accent)" }}>
                                            {log.rating}<span style={{ color: "var(--muted)", fontSize: "11px" }}>/10</span>
                                        </span>
                                        : <span style={{ color: "var(--muted-dark)", fontSize: "12px" }}>—</span>
                                    }
                                </div>

                                <div>
                                    {log.review
                                        ? <div style={{
                                            color: "var(--text)", fontSize: "11px", lineHeight: "1.5",
                                            display: "-webkit-box", WebkitLineClamp: 5,
                                            WebkitBoxOrient: "vertical" as const, overflow: "hidden"
                                        }}>
                                            {log.review}
                                        </div>
                                        : <span style={{ color: "var(--muted-dark)", fontSize: "12px" }}>—</span>
                                    }
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ---- Stats Page (placeholder) ----
function StatsPage() {
    return (
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 24px" }}>
            <div style={{ color: "var(--accent)", fontSize: "11px", letterSpacing: "3px", textTransform: "uppercase", marginBottom: "6px" }}>Coming Soon</div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "36px", fontWeight: "900", color: "var(--text)" }}>Stats</h1>
            <p style={{ color: "var(--muted)", fontFamily: "var(--font-body)", fontSize: "14px", marginTop: "16px" }}>
                Your listening stats will live here.
            </p>
        </div>
    );
}

// ---- Main App ----
export default function Home() {
    const [page, setPage] = useState("history");
    const [logs, setLogs] = useState<Log[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    async function fetchLogs() {
        const res = await fetch("/api/logs");
        const data = await res.json();
        setLogs(data);
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
        body { background: var(--bg); color: var(--text); font-family: var(--font-body); min-height: 100vh; }
        body::before {
          content: '';
          position: fixed; inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E");
          opacity: 0.025; pointer-events: none; z-index: 0;
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: var(--bg); }
        ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }
        select option { background: var(--surface); }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.4); }
        input[type="number"]::-webkit-inner-spin-button { opacity: 0.3; }
      `}</style>

            <div style={{ position: "relative", zIndex: 1 }}>
                <Navbar page={page} setPage={setPage} />
                {page === "history" && (
                    <HistoryPage logs={logs} loading={loading} onLogClick={() => setShowModal(true)} />
                )}
                {page === "stats" && <StatsPage />}
            </div>

            {showModal && <LogModal onClose={() => setShowModal(false)} onSave={fetchLogs} />}
        </>
    );
}