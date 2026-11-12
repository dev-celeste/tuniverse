// Mirrors MOOD_VISUAL_IDENTITY primary colors in backend/transformers/mood_visual_transformer.py.
// Planets carry their own color from the API; this is for mood rows and the nebula.
export const MOOD_COLORS: Record<string, string> = {
  Aggressive: '#E63946',
  Fiery: '#FF8A3D',
  Upbeat: '#FFD166',
  Calm: '#80FFDB',
  Confident: '#30B8E6',
  Euphoric: '#6E6BFF',
  Intense: '#8A2ECC',
  Reflective: '#EF8DC1',
  // Genres Spotify hasn't mapped to a mood, or no genres at all
  Uncharted: '#C7D2E4',
}

export const UNCHARTED = 'Uncharted'

export const moodColor = (mood: string) => MOOD_COLORS[mood] ?? MOOD_COLORS[UNCHARTED]

/** Mood distribution as [mood, percent] rows, biggest first. */
export const moodRows = (distribution: Record<string, number>) =>
  Object.entries(distribution).sort((a, b) => b[1] - a[1])
