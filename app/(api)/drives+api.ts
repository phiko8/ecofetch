import { neon } from "@neondatabase/serverless";

/*
  Required DB table:

  CREATE TABLE drives (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    area VARCHAR(255) NOT NULL,
    date TIMESTAMP NOT NULL,
    vehicle_type VARCHAR(100),
    total_slots INTEGER DEFAULT 10,
    available_slots INTEGER DEFAULT 10,
    price DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'available',
    created_at TIMESTAMP DEFAULT NOW()
  );
*/

export async function GET(request: Request) {
  try {
    const sql = neon(`${process.env.DATABASE_URL}`);
    const response = await sql`
      SELECT * FROM drives
      ORDER BY date ASC
    `;
    return Response.json({ data: response });
  } catch (error) {
    console.error("Error fetching drives:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const sql = neon(`${process.env.DATABASE_URL}`);
    const { driveId } = await request.json();

    if (!driveId) {
      return Response.json({ error: "Missing driveId" }, { status: 400 });
    }

    const updated = await sql`
      UPDATE drives
      SET
        available_slots = available_slots - 1,
        status = CASE WHEN available_slots - 1 = 0 THEN 'full' ELSE status END
      WHERE id = ${driveId} AND available_slots > 0
      RETURNING *
    `;

    if (updated.length === 0) {
      return Response.json({ error: "Drive is full" }, { status: 409 });
    }

    return Response.json({ data: updated[0] });
  } catch (error) {
    console.error("Error registering for drive:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const sql = neon(`${process.env.DATABASE_URL}`);
    const { title, area, date, vehicle_type, total_slots, price } =
      await request.json();

    if (!title || !area || !date) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const slots = total_slots ?? 10;
    const response = await sql`
      INSERT INTO drives (title, area, date, vehicle_type, total_slots, available_slots, price, status)
      VALUES (${title}, ${area}, ${date}, ${vehicle_type ?? "Truck"}, ${slots}, ${slots}, ${price ?? 0}, 'available')
      RETURNING *
    `;
    return Response.json({ data: response[0] }, { status: 201 });
  } catch (error) {
    console.error("Error creating drive:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
