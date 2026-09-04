import { neon } from "@neondatabase/serverless";

export async function GET(request: Request, { id }: { id: string }) {
  if (!id)
    return Response.json({ error: "Missing required fields" }, { status: 400 });

  const url = new URL(request.url);
  const limitParam = parseInt(url.searchParams.get("limit") ?? "10", 10);
  const offsetParam = parseInt(url.searchParams.get("offset") ?? "0", 10);

  // Sanitize pagination params
  const limit = Math.min(Math.max(1, isNaN(limitParam) ? 10 : limitParam), 50);
  const offset = Math.max(0, isNaN(offsetParam) ? 0 : offsetParam);

  try {
    const sql = neon(`${process.env.DATABASE_URL}`);
    const response = await sql`
        SELECT
            rides.ride_id,
            rides.origin_address,
            rides.destination_address,
            rides.origin_latitude,
            rides.origin_longitude,
            rides.destination_latitude,
            rides.destination_longitude,
            rides.fare_price,
            rides.ride_time,
            rides.status AS payment_status,
            rides.created_at,
            json_build_object(
                'driver_id', drivers.id,
                'first_name', SPLIT_PART(drivers.name, ' ', 1),
                'last_name', NULLIF(TRIM(SUBSTRING(drivers.name FROM POSITION(' ' IN drivers.name))), ''),
                'image_url', NULL,
                'car_type', drivers.vehicle_type,
                'number_plate', drivers.number_plate,
                'phone', drivers.phone
            ) AS driver
        FROM
            rides
        INNER JOIN
            drivers ON rides.driver_id = drivers.id
        WHERE
            rides.user_id = ${id}
        ORDER BY
            rides.created_at DESC
        LIMIT ${limit} OFFSET ${offset};
    `;

    return Response.json({ data: response, hasMore: response.length === limit });
  } catch (error) {
    console.error("Error fetching recent rides:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
