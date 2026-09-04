import { neon } from "@neondatabase/serverless";

/** Verify caller is an admin by checking the X-Clerk-User-Id header against the DB */
async function requireAdmin(request: Request): Promise<Response | null> {
  const sql = neon(`${process.env.DATABASE_URL}`);
  const callerClerkId = request.headers.get("X-Clerk-User-Id");

  if (!callerClerkId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [caller] = await sql`
    SELECT role FROM users WHERE clerk_id = ${callerClerkId} LIMIT 1
  `;

  if (!caller || caller.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  return null; // authorized
}

export async function GET(request: Request) {
  try {
    const sql = neon(`${process.env.DATABASE_URL}`);

    const authError = await requireAdmin(request);
    if (authError) return authError;

    const response = await sql`
      SELECT
        u.id,
        u.name,
        u.email,
        u.clerk_id,
        COALESCE(u.role, 'disposer')        AS role,
        COALESCE(u.status, 'pending')       AS status,
        COALESCE(u.id_number, '')           AS id_number,
        NOW()::text                         AS created_at,
        COALESCE(d.phone, '')               AS phone,
        COALESCE(d.vehicle_type, '')        AS vehicle_type,
        COALESCE(d.license_number, '')      AS license_number,
        COALESCE(d.number_plate, '')        AS number_plate
      FROM users u
      LEFT JOIN drivers d ON d.clerk_id = u.clerk_id
      WHERE u.role = 'driver'
      ORDER BY u.id DESC
    `;

    return Response.json({ data: response });
  } catch (error) {
    console.error("Error fetching users:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const sql = neon(`${process.env.DATABASE_URL}`);

    const authError = await requireAdmin(request);
    if (authError) return authError;

    const { id, status } = await request.json();

    if (!id || !status) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!["pending", "approved", "rejected", "banned"].includes(status)) {
      return Response.json({ error: "Invalid status value" }, { status: 400 });
    }

    const response = await sql`
      UPDATE users SET status = ${status}
      WHERE id = ${id}
      RETURNING id, name, email, status
    `;

    return Response.json({ data: response[0] });
  } catch (error) {
    console.error("Error updating user status:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
