import { useEffect, useRef, useState } from 'react'

import type { Playing } from '../spotify'
import { canAutoplay, type EmbedController, loadIframeApi } from '../spotifyEmbed'

/**
 * Spotify's own embedded player for the chosen song, docked over the galaxy so it keeps playing
 * while you explore. Visitors get previews; anyone signed in to Spotify in this browser can hear
 * the full song. Nothing loads from Spotify until a song is picked.
 *
 * On desktop the song starts by itself; phones block that, so there you press play in the player.
 */
export default function NowPlaying({ playing, onClose }: { playing: Playing; onClose: () => void }) {
  const [autoplay] = useState(canAutoplay)
  // If Spotify's controller script can't load, fall back to the plain player
  const [controllerFailed, setControllerFailed] = useState(false)
  const title = `Spotify player: ${playing.title} by ${playing.artist}`

  return (
    <section className="now-playing glass" aria-label="Now playing">
      <div className="np-head">
        <p className="eyebrow">Now playing</p>
        <button type="button" className="np-close" aria-label="Close player" onClick={onClose}>
          ×
        </button>
      </div>
      {autoplay && !controllerFailed ? (
        // A new song gets a new player
        <AutoplayEmbed key={playing.spotifyId} spotifyId={playing.spotifyId} title={title} onFail={setControllerFailed} />
      ) : (
        <iframe
          key={playing.spotifyId}
          title={title}
          src={`https://open.spotify.com/embed/track/${playing.spotifyId}?utm_source=generator&theme=0`}
          height="80"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
        />
      )}
    </section>
  )
}

/** The player through Spotify's controller, which starts the song as soon as it's ready. */
function AutoplayEmbed({ spotifyId, title, onFail }: { spotifyId: string; title: string; onFail: (failed: boolean) => void }) {
  const host = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = host.current
    if (!container) return
    // Spotify replaces the element it's given with its iframe, so give it one React doesn't own
    const slot = document.createElement('div')
    container.appendChild(slot)
    let controller: EmbedController | null = null
    let cancelled = false

    loadIframeApi().then(
      (api) => {
        if (cancelled) return
        api.createController(slot, { uri: `spotify:track:${spotifyId}`, width: '100%', height: 80, theme: 'dark' }, (c) => {
          if (cancelled) {
            c.destroy()
            return
          }
          controller = c
          container.querySelector('iframe')?.setAttribute('title', title)
          c.addListener('ready', () => c.play())
        })
      },
      () => {
        if (!cancelled) onFail(true)
      },
    )

    return () => {
      cancelled = true
      controller?.destroy()
      container.replaceChildren()
    }
  }, [spotifyId, title, onFail])

  return <div className="np-embed" ref={host} />
}
