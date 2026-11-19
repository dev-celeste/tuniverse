/**
 * Spotify's iFrame API (https://developer.spotify.com/documentation/embeds/references/iframe-api):
 * the same embedded player, plus a controller that can start playback. Used on desktop, where
 * browsers let a player start right after a click; phones keep the plain embed.
 */
export type EmbedController = {
  addListener: (event: 'ready' | 'playback_update', callback: (e: unknown) => void) => void
  play: () => void
  destroy: () => void
}

export type IFrameAPI = {
  createController: (
    element: HTMLElement,
    // theme 'dark' isn't in Spotify's docs, but the script supports it (it adds the embed's theme=0)
    options: { uri: string; width?: string | number; height?: string | number; theme?: 'dark' },
    callback: (controller: EmbedController) => void,
  ) => void
}

declare global {
  interface Window {
    onSpotifyIframeApiReady?: (api: IFrameAPI) => void
  }
}

const SCRIPT_URL = 'https://open.spotify.com/embed/iframe-api/v1'
let api: Promise<IFrameAPI> | null = null

/** Loads the script once (on the first song played, never before) and resolves with the API. */
export function loadIframeApi(): Promise<IFrameAPI> {
  api ??= new Promise<IFrameAPI>((resolve, reject) => {
    window.onSpotifyIframeApiReady = resolve
    const script = document.createElement('script')
    script.src = SCRIPT_URL
    script.async = true
    script.onerror = () => {
      api = null
      script.remove()
      reject(new Error("Spotify's player script didn't load"))
    }
    document.body.appendChild(script)
  })
  return api
}

/** A mouse or trackpad: desktop browsers allow playback to start right after a click. */
export const canAutoplay = () => window.matchMedia?.('(hover: hover) and (pointer: fine)').matches ?? false
