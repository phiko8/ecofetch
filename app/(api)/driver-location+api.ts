import { neon } from "@neondatabase/serverless";

// PATCH — driver pushes their current GPS location
// body: { driverClerkId, latitude, longitude }
export async function PATCH(request: Request) {
  try {
    const sql = neon(`${process.env.DATABASE_URL}`);
    const { driverClerkId, latitude, longitude } = await request.json();

    if (!driverClerkId || latitude == null || longitude == null) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    const lat = Number(latitude);
    const lng = Number(longitude);

    // Validate coordinate ranges
    if (isNaN(lat) || lat < -90 || lat > 90) {
      return Response.json({ error: "Invalid latitude" }, { status: 400 });
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      return Response.json({ error: "Invalid longitude" }, { status: 400 });
    }

    await sql`
      UPDATE drivers
      SET
        current_latitude     = ${lat},
        current_longitude    = ${lng},
        location_updated_at  = NOW()
      WHERE clerk_id = ${driverClerkId}
    `;

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error updating driver location:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// GET — disposer polls driver location for a specific ride
// query: rideId
export async function GET(request: Request) {
  try {
    const sql = neon(`${process.env.DATABASE_URL}`);
    const url = new URL(request.url);
    const rideId = url.searchParams.get("rideId");

    if (!rideId) {
      return Response.json({ error: "Missing rideId" }, { status: 400 });
    }

    const rideIdNum = parseInt(rideId, 10);
    if (isNaN(rideIdNum) || rideIdNum <= 0) {
      return Response.json({ error: "Invalid rideId" }, { status: 400 });
    }

    const [row] = await sql`
      SELECT
        drivers.current_latitude                              AS latitude,
        drivers.current_longitude                             AS longitude,
        drivers.location_updated_at                          AS updated_at,
        drivers.name                                         AS driver_name,
        drivers.vehicle_type,
        rides.status,
        COALESCE(rides.negotiation_status, 'open')           AS negotiation_status,
        rides.counter_price,
        rides.floor_price,
        COALESCE(rides.offered_price, rides.fare_price)      AS offered_price,
        rides.offer_expires_at
      FROM rides
      LEFT JOIN drivers ON rides.driver_id = drivers.id
      WHERE rides.ride_id = ${rideIdNum}
    `;

    if (!row) {
      return Response.json({ error: "Ride not found" }, { status: 404 });
    }

    const STALE_MINUTES = 120;
    const updatedAt = row.updated_at ? new Date(row.updated_at) : null;
    const isStale =
      !updatedAt ||
      Date.now() - updatedAt.getTime() > STALE_MINUTES * 60 * 1000;

    return Response.json({
      data: {
        ...row,
        latitude:  isStale ? null : row.latitude,
        longitude: isStale ? null : row.longitude,
        counter_price:       row.counter_price       ? Number(row.counter_price)  : null,
        floor_price:         row.floor_price         ? Number(row.floor_price)    : null,
        offered_price:       row.offered_price       ? Number(row.offered_price)  : null,
        offer_expires_at:    row.offer_expires_at    ?? null,
      },
    });
  } catch (error) {
    console.error("Error fetching driver location:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
