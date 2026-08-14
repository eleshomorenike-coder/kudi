import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'

export const feedback = pgTable('feedback', {
  id: serial('id').primaryKey(),
  deviceId: text('device_id'),
  rating: integer('rating'),
  message: text('message').notNull(),
  /** 'new' until the owner acts on it, then 'resolved'. */
  status: text('status').notNull().default('new'),
  /** Private note / reply the owner writes when acting on the feedback. */
  adminReply: text('admin_reply'),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const usageEvent = pgTable('usage_event', {
  id: serial('id').primaryKey(),
  deviceId: text('device_id').notNull(),
  eventType: text('event_type').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
