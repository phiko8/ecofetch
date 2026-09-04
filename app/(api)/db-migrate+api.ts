import { neon } from "@neondatabase/serverless";

/**
 * POST /(api)/db-migrate
 * One-time schema migration endpoint. Run this once after deploying to a fresh database.
 * Protected by ADMIN_SECRET_KEY environment variable.
 *
 * Call with:
 *   fetch("/(api)/db-migrate", {
 *     method: "POST",
 *     headers: { "X-Admin-Secret": "<your ADMIN_SECRET_KEY>" }
 *   })
 */
export async function POST(request: Request) {
  const secret = request.headers.get("X-Admin-Secret");
  if (!secret || secret !== process.env.ADMIN_SECRET_KEY) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const sql = neon(`${process.env.DATABASE_URL}`);

    await sql`ALTER TABLE users      ADD COLUMN IF NOT EXISTS role      VARCHAR(50)  DEFAULT 'disposer'`;
    await sql`ALTER TABLE users      ADD COLUMN IF NOT EXISTS status    VARCHAR(50)  DEFAULT 'pending'`;
    await sql`ALTER TABLE users      ADD COLUMN IF NOT EXISTS id_number VARCHAR(100) DEFAULT ''`;
    await sql`ALTER TABLE users      ADD COLUMN IF NOT EXISTS phone     VARCHAR(20)`;
    await sql`ALTER TABLE drivers    ADD COLUMN IF NOT EXISTS push_token      TEXT`;
    await sql`ALTER TABLE drivers    ADD COLUMN IF NOT EXISTS area            TEXT    DEFAULT ''`;
    await sql`ALTER TABLE drivers    ADD COLUMN IF NOT EXISTS area_latitude   FLOAT`;
    await sql`ALTER TABLE drivers    ADD COLUMN IF NOT EXISTS area_longitude  FLOAT`;
    await sql`ALTER TABLE drivers    ADD COLUMN IF NOT EXISTS current_latitude    FLOAT`;
    await sql`ALTER TABLE drivers    ADD COLUMN IF NOT EXISTS current_longitude   FLOAT`;
    await sql`ALTER TABLE drivers    ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMPTZ`;
    await sql`ALTER TABLE drivers    ADD COLUMN IF NOT EXISTS passport_number     VARCHAR(50)`;
    await sql`ALTER TABLE rides      ADD COLUMN IF NOT EXISTS rating    INTEGER`;
    await sql`ALTER TABLE rides      ADD COLUMN IF NOT EXISTS user_name VARCHAR(255)`;

    // Recycling companies table
    await sql`
      CREATE TABLE IF NOT EXISTS recycling_companies (
        id                  SERIAL PRIMARY KEY,
        name                VARCHAR(255)  NOT NULL,
        address             TEXT          NOT NULL,
        latitude            DECIMAL(10, 7) NOT NULL,
        longitude           DECIMAL(10, 7) NOT NULL,
        city                VARCHAR(100),
        province            VARCHAR(100),
        materials_accepted  TEXT,
        phone               VARCHAR(30),
        is_active           BOOLEAN DEFAULT true,
        created_at          TIMESTAMP DEFAULT NOW()
      )
    `;

    return Response.json({ success: true, message: "All migrations applied." });
  } catch (error) {
    console.error("Migration error:", error);
    return Response.json({ error: "Migration failed" }, { status: 500 });
  }
}
