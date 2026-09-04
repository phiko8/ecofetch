import { neon } from "@neondatabase/serverless";

/**
 * POST /(api)/add-rating
 * Adds the rating column to the rides table if it doesn't already exist.
 * Safe to call multiple times (IF NOT EXISTS).
 */
export async function POST(_request: Request) {
  try {
    const sql = neon(`${process.env.DATABASE_URL}`);
    await sql`ALTER TABLE rides ADD COLUMN IF NOT EXISTS rating INTEGER`;
    return Response.json({ success: true, message: "Rating column ready." });
  } catch (error) {
    console.error("Migration error:", error);
    return Response.json({ error: "Migration failed" }, { status: 500 });
  }
}
