import {
  uuid,
  pgTable,
  varchar,
  text,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

//user table
export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),

  firstName: varchar("first_name", { length: 25 }),
  lastName: varchar("last_name", { length: 25 }),

  profileImageURL: text("profile_image_url"),

  email: varchar("email", { length: 322 }).notNull(),
  emailVerified: boolean("email_verified").default(false).notNull(),

  password: varchar("password", { length: 66 }),
  salt: text("salt"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
});

export const oauthClientsTable = pgTable("oauth_clients", {
  id: text("id").primaryKey(), // this IS the client_id
  secret: text("secret").notNull(), // hashed client_secret
  name: varchar("name", { length: 100 }).notNull(),
  redirectUris: text("redirect_uris").notNull(), // stored as JSON string array
  scopes: varchar("scopes", { length: 255 })
    .notNull()
    .default("openid email profile"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const authCodesTable = pgTable("auth_codes", {
  code: text("code").primaryKey(),
  clientId: text("client_id")
    .notNull()
    .references(() => oauthClientsTable.id),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id), // links to your existing users table
  redirectUri: text("redirect_uri").notNull(),
  scopes: varchar("scopes", { length: 255 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

//ref token schema
export const refreshTokensTable = pgTable("refresh_tokens", {
  token: text("token").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id),
  clientId: text("client_id").references(() => oauthClientsTable.id),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
