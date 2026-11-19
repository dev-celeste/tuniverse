/** "https://open.spotify.com/track/<id>" → "<id>"; null for anything that isn't a track link. */
export function spotifyTrackId(url: string | null | undefined): string | null {
  const match = url?.match(/^https:\/\/open\.spotify\.com\/track\/([A-Za-z0-9]+)/)
  return match ? match[1] : null
}

/** A song loaded in the Now playing dock. trackId is the API's id (moons and stars use it too). */
export type Playing = { trackId: string; spotifyId: string; title: string; artist: string }
