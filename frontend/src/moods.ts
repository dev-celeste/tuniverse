// Mirrors MOOD_VISUAL_IDENTITY primary colors in backend/transformers/mood_visual_transformer.py.
// Planets carry their own color from the API; this is for mood rows and the nebula.
export const MOOD_COLORS: Record<string, string> = {
  Aggressive: '#E63946',
  Intense: '#8A2ECC',
  Upbeat: '#FFD166',
  Confident: '#30B8E6',
  Reflective: '#EF8DC1',
  Calm: '#80FFDB',
  Other: '#ADB5BD',
}

export const moodColor = (mood: string) => MOOD_COLORS[mood] ?? MOOD_COLORS.Other

/** Mood distribution as [mood, percent] rows, biggest first. */
export const moodRows = (distribution: Record<string, number>) =>
  Object.entries(distribution).sort((a, b) => b[1] - a[1])
