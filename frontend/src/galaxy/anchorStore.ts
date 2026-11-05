import { useMemo } from 'react'
import type { Object3D } from 'three'

type Entry = { anchor: Object3D | null; element: HTMLElement | null }

/**
 * Pairs each planet's mesh (inside the Canvas) with its label element (in an overlay outside
 * it). LabelProjector moves every label in one pass per frame, and the camera follows a
 * focused planet through its mesh. Lighter than a React root per label, and safe under
 * React 19 StrictMode.
 */
export class AnchorStore {
  private entries = new Map<string, Entry>()

  private entry(id: string): Entry {
    let e = this.entries.get(id)
    if (!e) {
      e = { anchor: null, element: null }
      this.entries.set(id, e)
    }
    return e
  }

  setAnchor(id: string, anchor: Object3D | null) {
    this.entry(id).anchor = anchor
  }

  setElement(id: string, element: HTMLElement | null) {
    this.entry(id).element = element
  }

  getAnchor(id: string): Object3D | null {
    return this.entries.get(id)?.anchor ?? null
  }

  all() {
    return this.entries.values()
  }
}

export function useAnchorStore() {
  return useMemo(() => new AnchorStore(), [])
}
