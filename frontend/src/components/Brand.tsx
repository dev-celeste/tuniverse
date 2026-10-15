import { Link } from 'react-router'

export default function Brand({ caption }: { caption: string }) {
  return (
    <Link to="/" className="brand" aria-label="Tuniverse, back to the start screen">
      <span className="wordmark">
        Tun<em>i</em>verse
      </span>
      <span className="eyebrow">{caption}</span>
    </Link>
  )
}
