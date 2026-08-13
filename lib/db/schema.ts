import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'

export const feedback = pgTable('feedback', {
  id: serial('id').primaryKey(),
  deviceId: text('device_id'),
  rating: integer('rating'),
  message: text('message').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const usageEvent = pgTable('usage_event', {
  id: serial('id').primaryKey(),
  deviceId: text('device_id').notNull(),
  eventType: text('event_type').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
