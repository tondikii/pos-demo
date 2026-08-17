import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  numeric,
  index,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  phone: varchar('phone', { length: 20 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  businessName: varchar('business_name', { length: 100 }).notNull(),
  role: varchar('role', { length: 20 }).notNull().default('owner'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  plan: varchar('plan', { length: 20 }).notNull().default('starter'),
  status: varchar('status', { length: 20 }).notNull().default('trialing'),
  maxOutlets: integer('max_outlets').notNull().default(1),
  trialEndsAt: timestamp('trial_ends_at'),
  currentPeriodEnd: timestamp('current_period_end'),
  midtransSubscriptionId: varchar('midtrans_subscription_id', { length: 100 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const subscriptionHistory = pgTable(
  'subscription_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    plan: varchar('plan', { length: 20 }).notNull(),
    status: varchar('status', { length: 20 }).notNull(),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    midtransOrderId: varchar('midtrans_order_id', { length: 100 }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [index('idx_sub_hist_owner').on(t.ownerId)],
)

export const outlets = pgTable(
  'outlets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    address: text('address').notNull(),
    phone: varchar('phone', { length: 20 }),
    taxPercent: numeric('tax_percent', { precision: 5, scale: 2 }).notNull().default('0'),
    servicePercent: numeric('service_percent', { precision: 5, scale: 2 }).notNull().default('0'),
    receiptHeader: varchar('receipt_header', { length: 200 }),
    receiptFooter: varchar('receipt_footer', { length: 300 }),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [index('idx_outlet_owner').on(t.ownerId)],
)

export const staff = pgTable(
  'staff',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    outletId: uuid('outlet_id')
      .notNull()
      .references(() => outlets.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    pinHash: varchar('pin_hash', { length: 255 }).notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [index('idx_staff_outlet').on(t.outletId), index('idx_staff_owner').on(t.ownerId)],
)

export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    outletId: uuid('outlet_id')
      .notNull()
      .references(() => outlets.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 150 }).notNull(),
    category: varchar('category', { length: 50 }).notNull().default('Umum'),
    costPrice: numeric('cost_price', { precision: 12, scale: 2 }).notNull().default('0'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [index('idx_product_outlet').on(t.outletId)],
)

export const productVariants = pgTable(
  'product_variants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    sellPrice: numeric('sell_price', { precision: 12, scale: 2 }).notNull(),
    stock: integer('stock').notNull().default(0),
    lowStockThreshold: integer('low_stock_threshold').notNull().default(5),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [index('idx_variant_product').on(t.productId)],
)

export const paymentMethods = pgTable(
  'payment_methods',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    outletId: uuid('outlet_id')
      .notNull()
      .references(() => outlets.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 50 }).notNull(),
    type: varchar('type', { length: 20 }).notNull(),
    instruction: varchar('instruction', { length: 300 }),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [index('idx_pm_outlet').on(t.outletId)],
)

export const shifts = pgTable(
  'shifts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    outletId: uuid('outlet_id')
      .notNull()
      .references(() => outlets.id, { onDelete: 'cascade' }),
    staffId: uuid('staff_id')
      .notNull()
      .references(() => staff.id),
    openingCash: numeric('opening_cash', { precision: 12, scale: 2 }).notNull(),
    expectedCash: numeric('expected_cash', { precision: 12, scale: 2 }),
    actualCash: numeric('actual_cash', { precision: 12, scale: 2 }),
    difference: numeric('difference', { precision: 12, scale: 2 }),
    status: varchar('status', { length: 20 }).notNull().default('open'),
    openedAt: timestamp('opened_at').notNull().defaultNow(),
    closedAt: timestamp('closed_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [index('idx_shift_outlet').on(t.outletId), index('idx_shift_staff').on(t.staffId)],
)

export const transactions = pgTable(
  'transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    outletId: uuid('outlet_id')
      .notNull()
      .references(() => outlets.id),
    staffId: uuid('staff_id')
      .notNull()
      .references(() => staff.id),
    shiftId: uuid('shift_id').references(() => shifts.id),
    paymentMethodId: uuid('payment_method_id')
      .notNull()
      .references(() => paymentMethods.id),
    subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull(),
    taxAmount: numeric('tax_amount', { precision: 12, scale: 2 }).notNull().default('0'),
    serviceAmount: numeric('service_amount', { precision: 12, scale: 2 }).notNull().default('0'),
    total: numeric('total', { precision: 12, scale: 2 }).notNull(),
    cashReceived: numeric('cash_received', { precision: 12, scale: 2 }),
    change: numeric('change', { precision: 12, scale: 2 }),
    status: varchar('status', { length: 20 }).notNull().default('completed'),
    voidReason: text('void_reason'),
    offlineId: varchar('offline_id', { length: 36 }).unique(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    index('idx_tx_outlet_created').on(t.outletId, t.createdAt),
    index('idx_tx_offline').on(t.offlineId),
    index('idx_tx_shift').on(t.shiftId),
  ],
)

export const transactionItems = pgTable(
  'transaction_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    transactionId: uuid('transaction_id')
      .notNull()
      .references(() => transactions.id, { onDelete: 'cascade' }),
    productVariantId: uuid('product_variant_id')
      .notNull()
      .references(() => productVariants.id),
    productName: varchar('product_name', { length: 150 }).notNull(),
    variantName: varchar('variant_name', { length: 100 }).notNull(),
    sellPrice: numeric('sell_price', { precision: 12, scale: 2 }).notNull(),
    costPrice: numeric('cost_price', { precision: 12, scale: 2 }).notNull(),
    qty: integer('qty').notNull(),
    lineTotal: numeric('line_total', { precision: 12, scale: 2 }).notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [index('idx_ti_transaction').on(t.transactionId)],
)

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  outlets: many(outlets),
  staff: many(staff),
  subscriptions: many(subscriptions),
}))

export const outletsRelations = relations(outlets, ({ one, many }) => ({
  owner: one(users, { fields: [outlets.ownerId], references: [users.id] }),
  products: many(products),
  paymentMethods: many(paymentMethods),
  shifts: many(shifts),
  transactions: many(transactions),
}))

export const productsRelations = relations(products, ({ one, many }) => ({
  outlet: one(outlets, { fields: [products.outletId], references: [outlets.id] }),
  variants: many(productVariants),
}))

export const productVariantsRelations = relations(productVariants, ({ one }) => ({
  product: one(products, { fields: [productVariants.productId], references: [products.id] }),
}))

export const transactionsRelations = relations(transactions, ({ one, many }) => ({
  outlet: one(outlets, { fields: [transactions.outletId], references: [outlets.id] }),
  items: many(transactionItems),
}))
