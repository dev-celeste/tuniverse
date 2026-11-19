import type { Playing } from '../spotify'

/**
 * Spotify's own embedded player for the chosen song, docked over the galaxy so it keeps playing
 * while you explore. Visitors get previews; anyone signed in to Spotify in this browser can hear
 * the full song. Nothing loads from Spotify until a song is picked.
 */
export default function NowPlaying({ playing, onClose }: { playing: Playing; onClose: () => void }) {
  return (
    <section className="now-playing glass" aria-label="Now playing">
      <div className="np-head">
        <p className="eyebrow">Now playing</p>
        <button type="button" className="np-close" aria-label="Close player" onClick={onClose}>
          ×
        </button>
      </div>
      <iframe
        // A new song gets a new player
        key={playing.spotifyId}
        title={`Spotify player: ${playing.title} by ${playing.artist}`}
        src={`https://open.spotify.com/embed/track/${playing.spotifyId}?utm_source=generator&theme=0`}
        height="80"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
      />
    </section>
  )
}
