import { neon } from "@neondatabase/serverless";

/*
  Required DB migration:
  ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'disposer';
*/

const ALLOWED_ROLES = ["disposer", "driver"] as const;

export async function POST(request: Request) {
  try {
    const sql = neon(`${process.env.DATABASE_URL}`);
    const { name, email, clerkId, role, phone } = await request.json();

    if (!name || !email || !clerkId) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Prevent privilege escalation — only 'disposer' and 'driver' allowed at registration
    const userRole = ALLOWED_ROLES.includes(role) ? role : "disposer";

    const response = await sql`
      INSERT INTO users (name, email, clerk_id, role, phone)
      VALUES (${name}, ${email}, ${clerkId}, ${userRole}, ${phone ?? null})
      ON CONFLICT (clerk_id) DO UPDATE SET
        name  = EXCLUDED.name,
        email = EXCLUDED.email,
        phone = COALESCE(EXCLUDED.phone, users.phone)
      RETURNING id, name, email, role, phone;
    `;

    return new Response(JSON.stringify({ data: response[0] }), {
      status: 201,
    });
  } catch (error) {
    console.error("Error creating user:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const sql = neon(`${process.env.DATABASE_URL}`);
    const url = new URL(request.url);
    const clerkId = url.searchParams.get("clerkId");

    if (!clerkId) {
      return Response.json({ error: "Missing clerkId" }, { status: 400 });
    }

    const response = await sql`
      SELECT
        u.id, u.name, u.email, u.role,
        COALESCE(u.status, 'pending')          AS status,
        COALESCE(u.phone, d.phone, '')         AS phone
      FROM users u
      LEFT JOIN drivers d ON d.clerk_id = u.clerk_id
      WHERE u.clerk_id = ${clerkId}
      LIMIT 1;
    `;

    if (!response.length) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    return Response.json({ data: response[0] });
  } catch (error) {
    console.error("Error fetching user:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
