import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import jwt from "jsonwebtoken";

import { buildApp } from "../src/app";
import { db } from "../src/db/database";
import { env } from "../src/config/env";

const SUPER_ADMIN_ID = "b6a3f12d-73d5-4d5a-94fb-5fce84ac8d51";
const PENDING_ADMIN_ID = "c7d4d49f-8cd4-4f0f-b6dc-de1759c5a0aa";

let app: Awaited<ReturnType<typeof buildApp>>;

function token(userId: string, role: string): string {
  return jwt.sign({ sub: userId, role }, env.JWT_SECRET);
}

function auth(userId: string, role: string) {
  return {
    authorization: `Bearer ${token(userId, role)}`
  };
}

before(async () => {
  await db.query(
    `
      INSERT INTO public.users (
        id,
        email,
        password_hash,
        role,
        is_active,
        first_name,
        last_name,
        admin_approved,
        approved_by,
        approved_at
      )
      VALUES ($1, $2, $3, 'ADMIN', TRUE, 'Main', 'Admin', TRUE, NULL, NOW())
      ON CONFLICT (id) DO UPDATE SET
        role = 'ADMIN',
        is_active = TRUE,
        admin_approved = TRUE,
        approved_by = NULL,
        approved_at = NOW(),
        updated_at = NOW()
    `,
    [SUPER_ADMIN_ID, 'contact.squadlink@gmail.com', 'hashed-super-admin']
  );

  await db.query(
    `
      INSERT INTO public.users (
        id,
        email,
        password_hash,
        role,
        is_active,
        first_name,
        last_name,
        admin_approved,
        approved_by,
        approved_at
      )
      VALUES ($1, $2, $3, 'ADMIN', TRUE, 'Pending', 'Admin', FALSE, NULL, NULL)
      ON CONFLICT (id) DO UPDATE SET
        role = 'ADMIN',
        is_active = TRUE,
        admin_approved = FALSE,
        approved_by = NULL,
        approved_at = NULL,
        updated_at = NOW()
    `,
    [PENDING_ADMIN_ID, 'pending.admin@squadlink.test', 'hashed-pending-admin']
  );

  app = await buildApp();
});

after(async () => {
  await app.close();
  await db.end();
});

describe("admin access approvals", () => {
  it("blocks login for unapproved admin accounts", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        identifier: "pending.admin@squadlink.test",
        password: "secret-password"
      }
    });

    assert.equal(response.statusCode, 403);
    assert.equal(response.json().error.code, "ADMIN_ACCOUNT_PENDING_APPROVAL");
  });

  it("allows the platform owner to list pending admin access requests", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/admin/access-requests",
      headers: auth(SUPER_ADMIN_ID, "ADMIN")
    });

    assert.equal(response.statusCode, 200);
    assert.ok(Array.isArray(response.json().data));
  });
});
