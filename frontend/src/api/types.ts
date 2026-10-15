// Friendly names for the response models generated from the backend's OpenAPI schema.
// Regenerate schema.d.ts with `npm run gen:api` after changing backend/models.
import type { components } from './schema'

type Schemas = components['schemas']

export type SpotifyUser = Schemas['SpotifyUser']
export type GalaxyResponse = Schemas['GalaxyResponse']
export type Planet = Schemas['Planet']
export type Moon = Schemas['Moon']
export type MoodResponse = Schemas['MoodResponse']
export type TopTracksResponse = Schemas['TopTracksResponse']
export type TopArtistsResponse = Schemas['TopArtistsResponse']
export type Track = Schemas['Track']
export type TimeRange = GalaxyResponse['time_range']
