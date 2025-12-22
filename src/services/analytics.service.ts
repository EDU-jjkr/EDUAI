import { query } from '../config/database'

export const logEvent = async (
  userId: string,
  schoolId: string | null | undefined,
  eventType: string,
  eventData?: any
) => {
  try {
    await query(
      'INSERT INTO analytics_events (user_id, school_id, event_type, event_data) VALUES ($1, $2, $3, $4)',
      [userId, schoolId || null, eventType, eventData ? JSON.stringify(eventData) : null]
    )
  } catch (error) {
  }
}
