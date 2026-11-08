import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import { authCodesTable, emailVerificationsTable, refreshTokensTable, usersTable } from "../../db/schema";
import { verifyPassword } from "../../utils/security";
import { AccountError } from "./account.errors";

const publicFields = {
  id: usersTable.id, firstName: usersTable.firstName, lastName: usersTable.lastName,
  email: usersTable.email, emailVerified: usersTable.emailVerified,
  picture: usersTable.profileImageURL, createdAt: usersTable.createdAt, updatedAt: usersTable.updatedAt,
};

function profile(user: {
  id: string; firstName: string | null; lastName: string | null; email: string;
  emailVerified: boolean; picture: string | null; createdAt: Date; updatedAt: Date | null;
}) {
  return {
    sub: user.id, given_name: user.firstName, family_name: user.lastName,
    name: [user.firstName, user.lastName].filter(Boolean).join(" "),
    email: user.email, email_verified: user.emailVerified, picture: user.picture,
    created_at: user.createdAt.toISOString(), updated_at: user.updatedAt?.toISOString() ?? null,
  };
}

export class AccountService {
  constructor(private database: Pick<typeof db, "select" | "update" | "transaction"> = db) {}

  async get(userId: string) {
    const [user] = await this.database.select(publicFields).from(usersTable)
      .where(and(eq(usersTable.id, userId), eq(usersTable.emailVerified, true)));
    if (!user) throw new AccountError(401, "Your account is no longer available. Please sign in again.");
    return profile(user);
  }

  async update(userId: string, details: { firstName: string; lastName: string }) {
    const [user] = await this.database.update(usersTable)
      .set({ firstName: details.firstName, lastName: details.lastName || null })
      .where(and(eq(usersTable.id, userId), eq(usersTable.emailVerified, true)))
      .returning(publicFields);
    if (!user) throw new AccountError(401, "Your account is no longer available. Please sign in again.");
    return profile(user);
  }

  async delete(userId: string, password: string, confirmationEmail: string) {
    await this.database.transaction(async (tx) => {
      const [user] = await tx.select().from(usersTable).where(eq(usersTable.id, userId)).for("update");
      if (!user || !user.emailVerified) throw new AccountError(401, "Your account is no longer available. Please sign in again.");
      if (user.email.toLowerCase() !== confirmationEmail.trim().toLowerCase()) {
        throw new AccountError(400, "The confirmation email does not match your account.");
      }
      if (!user.password || !(await verifyPassword(password, user.password, user.salt))) {
        throw new AccountError(403, "Your current password is incorrect.");
      }
      // Delete dependent credentials first. A failure rolls back the entire deletion.
      await tx.delete(authCodesTable).where(eq(authCodesTable.userId, userId));
      await tx.delete(refreshTokensTable).where(eq(refreshTokensTable.userId, userId));
      await tx.delete(emailVerificationsTable).where(eq(emailVerificationsTable.userId, userId));
      await tx.delete(usersTable).where(eq(usersTable.id, userId));
    });
  }
}

export const accountService = new AccountService();
