import { neon } from "@neondatabase/serverless";

function isValidLat(v: unknown): boolean {
  const n = Number(v);
  return v != null && !isNaN(n) && n >= -90 && n <= 90;
}
function isValidLng(v: unknown): boolean {
  const n = Number(v);
  return v != null && !isNaN(n) && n >= -180 && n <= 180;
}

// POST — register a new driver/collector
export async function POST(request: Request) {
  try {
    const sql = neon(`${process.env.DATABASE_URL}`);
    const {
      name, idNumber, passportNumber, email, phone, vehicleType,
      licenseNumber, numberPlate, clerkId, area,
      areaLatitude, areaLongitude,
    } = await request.json();

    const docNumber = idNumber || passportNumber;
    if (!name || !docNumber || !email || !phone || !vehicleType || !licenseNumber || !numberPlate || !clerkId) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate area coordinates if provided
    if (areaLatitude != null && !isValidLat(areaLatitude)) {
      return Response.json({ error: "Invalid area latitude" }, { status: 400 });
    }
    if (areaLongitude != null && !isValidLng(areaLongitude)) {
      return Response.json({ error: "Invalid area longitude" }, { status: 400 });
    }

    // Reject if document number is already taken
    if (idNumber) {
      const existing = await sql`SELECT id FROM users WHERE id_number = ${idNumber} LIMIT 1`;
      if (existing.length > 0) {
        return Response.json({ error: "This ID number is already registered." }, { status: 409 });
      }
    }
    if (passportNumber) {
      const existing = await sql`SELECT id FROM drivers WHERE passport_number = ${passportNumber} LIMIT 1`;
      if (existing.length > 0) {
        return Response.json({ error: "This passport number is already registered." }, { status: 409 });
      }
    }

    // Save to users table with role = 'driver'
    const [user] = await sql`
      INSERT INTO users (name, email, clerk_id, role, id_number, phone)
      VALUES (${name}, ${email}, ${clerkId}, 'driver', ${idNumber ?? null}, ${phone})
      ON CONFLICT (clerk_id)
        DO UPDATE SET role = 'driver', id_number = EXCLUDED.id_number, phone = EXCLUDED.phone
      RETURNING id, name, email, role, id_number
    `;

    // Save to drivers table
    await sql`
      INSERT INTO drivers (clerk_id, name, email, phone, vehicle_type, license_number, number_plate, is_available, id_number, passport_number, area, area_latitude, area_longitude)
      VALUES (${clerkId}, ${name}, ${email}, ${phone}, ${vehicleType}, ${licenseNumber}, ${numberPlate}, false, ${idNumber ?? null}, ${passportNumber ?? null}, ${area ?? ""}, ${areaLatitude ?? null}, ${areaLongitude ?? null})
      ON CONFLICT (clerk_id)
        DO UPDATE SET
          name            = EXCLUDED.name,
          email           = EXCLUDED.email,
          phone           = EXCLUDED.phone,
          vehicle_type    = EXCLUDED.vehicle_type,
          license_number  = EXCLUDED.license_number,
          number_plate    = EXCLUDED.number_plate,
          id_number       = EXCLUDED.id_number,
          passport_number = EXCLUDED.passport_number,
          area            = EXCLUDED.area,
          area_latitude   = EXCLUDED.area_latitude,
          area_longitude  = EXCLUDED.area_longitude
    `;

    return Response.json({ data: user }, { status: 201 });
  } catch (error) {
    console.error("Driver registration error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// PATCH — update profile for Google-authenticated drivers (self-update only)
export async function PATCH(request: Request) {
  try {
    const sql = neon(`${process.env.DATABASE_URL}`);
    const { clerkId, idNumber, vehicleType, name } = await request.json();

    if (!clerkId || !idNumber || !vehicleType) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify the clerkId actually has a driver record (ownership check)
    const [existing] = await sql`
      SELECT id FROM drivers WHERE clerk_id = ${clerkId} LIMIT 1
    `;
    if (!existing) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check ID number isn't taken by someone else
    const conflict = await sql`
      SELECT id FROM users WHERE id_number = ${idNumber} AND clerk_id != ${clerkId} LIMIT 1
    `;
    if (conflict.length > 0) {
      return Response.json({ error: "This ID number is already registered." }, { status: 409 });
    }

    // Update users table
    await sql`
      UPDATE users SET id_number = ${idNumber}, role = 'driver'
      WHERE clerk_id = ${clerkId}
    `;

    // Upsert drivers table
    await sql`
      INSERT INTO drivers (clerk_id, name, vehicle_type, is_available, id_number)
      VALUES (${clerkId}, ${name ?? "Driver"}, ${vehicleType}, false, ${idNumber})
      ON CONFLICT (clerk_id)
        DO UPDATE SET
          name         = EXCLUDED.name,
          vehicle_type = EXCLUDED.vehicle_type,
          id_number    = EXCLUDED.id_number
    `;

    return Response.json({ success: true });
  } catch (error) {
    console.error("Driver profile update error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// GET — look up a driver's email by ID number (used during password reset flow)
export async function GET(request: Request) {
  try {
    const sql = neon(`${process.env.DATABASE_URL}`);
    const url = new URL(request.url);
    const idNumber = url.searchParams.get("idNumber");

    if (!idNumber) {
      return Response.json({ error: "Missing idNumber" }, { status: 400 });
    }

    const [driver] = await sql`
      SELECT id, name, email, role
      FROM users
      WHERE id_number = ${idNumber} AND role = 'driver'
      LIMIT 1
    `;

    if (!driver) {
      return Response.json({ error: "No collector account found for this ID number." }, { status: 404 });
    }

    return Response.json({ data: driver });
  } catch (error) {
    console.error("Driver lookup error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
