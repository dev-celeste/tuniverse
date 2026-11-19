import { Component, type ReactNode } from 'react'

type Props = { fallback: ReactNode; onError: () => void; children: ReactNode }

/**
 * Catches a 3D scene that fails to start (no GPU context, a lost context, a chunk that didn't
 * load) so the page around it keeps working, with the 2D fallback in its place.
 */
export default class SceneBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    console.warn('The 3D galaxy failed to start; showing the list view instead.', error)
    this.props.onError()
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}
