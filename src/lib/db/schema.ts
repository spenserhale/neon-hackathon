// import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { usersSync as usersTable } from "drizzle-orm/neon";

export { usersTable };

// Add your database tables here
// export const postsTable = pgTable('posts_table', {
//   id: serial('id').primaryKey(),
//   title: text('title').notNull(),
//   content: text('content').notNull(),
//   userId: integer('user_id')
//     .notNull()
//     .references(() => usersTable.id, { onDelete: 'cascade' }),
//   createdAt: timestamp('created_at').notNull().defaultNow(),
//   updatedAt: timestamp('updated_at')
//     .notNull()
//     .$onUpdate(() => new Date()),
// });

import { pgTable, text, integer, jsonb, timestamp, uuid, index } from 'drizzle-orm/pg-core';
import { sql, relations } from 'drizzle-orm';

export const audits = pgTable('audits', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  url: text('url').notNull(),
  score_who: integer('score_who').notNull(),
  score_what: integer('score_what').notNull(),
  score_where: integer('score_where').notNull(),
  entity_score: integer('entity_score').notNull(),
  summary: text('summary'),
  issues: jsonb('issues').notNull().default(sql`'[]'::jsonb`),
  created_at: timestamp('created_at').defaultNow(),
});

export const recommendations = pgTable(
  'recommendations',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    audit_id: uuid('audit_id').notNull().references(() => audits.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),
    priority: integer('priority').notNull().default(3),
    sentence: text('sentence').notNull(),
  },
  (t) => [
    index('idx_recommendations_audit_priority').on(t.audit_id, t.priority),
  ],
);

export const entities = pgTable(
  'entities',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    audit_id: uuid('audit_id').notNull().references(() => audits.id, { onDelete: 'cascade' }),
    etype: text('etype').notNull(),
    value: text('value').notNull(),
  },
  (t) => [
    index('idx_entities_audit_etype').on(t.audit_id, t.etype),
  ],
);

// Relations

export const auditsRelations = relations(audits, ({ many }) => ({
  recommendations: many(recommendations),
  entities: many(entities),
}));

export const recommendationsRelations = relations(recommendations, ({ one }) => ({
  audit: one(audits, {
    fields: [recommendations.audit_id],
    references: [audits.id],
  }),
}));

export const entitiesRelations = relations(entities, ({ one }) => ({
  audit: one(audits, {
    fields: [entities.audit_id],
    references: [audits.id],
  }),
}));

// Export inferred types
export type InsertAudit = typeof audits.$inferInsert;
export type SelectAudit = typeof audits.$inferSelect;
export type InsertRecommendation = typeof recommendations.$inferInsert;
export type SelectRecommendation = typeof recommendations.$inferSelect;
export type InsertEntity = typeof entities.$inferInsert;
export type SelectEntity = typeof entities.$inferSelect;
