import { neon } from "@neondatabase/serverless";

// PATCH — update driver online/offline status, push token, and/or operating area
export async function PATCH(request: Request) {
  try {
    const sql = neon(`${process.env.DATABASE_URL}`);
    const {
      clerkId, isAvailable, pushToken,
      area, areaLatitude, areaLongitude,
      currentLatitude, currentLongitude,
      serviceType,
    } = await request.json();

    if (!clerkId) {
      return Response.json({ error: "Missing clerkId" }, { status: 400 });
    }

    if (typeof isAvailable === "boolean") {
      await sql`
        UPDATE drivers SET is_available = ${isAvailable} WHERE clerk_id = ${clerkId}
      `;
    }

    if (pushToken) {
      await sql`
        UPDATE drivers SET push_token = ${pushToken} WHERE clerk_id = ${clerkId}
      `;
    }

    // Area update — driver must be physically within 30 km of the new area
    if (area !== undefined) {
      if (areaLatitude == null || areaLongitude == null) {
        return Response.json({ error: "Area coordinates are required" }, { status: 400 });
      }
      const newLat = Number(areaLatitude);
      const newLng = Number(areaLongitude);
      if (isNaN(newLat) || newLat < -90 || newLat > 90) {
        return Response.json({ error: "Invalid area latitude" }, { status: 400 });
      }
      if (isNaN(newLng) || newLng < -180 || newLng > 180) {
        return Response.json({ error: "Invalid area longitude" }, { status: 400 });
      }

      if (currentLatitude == null || currentLongitude == null) {
        return Response.json(
          { error: "Your current location is required to change the operating area" },
          { status: 400 }
        );
      }
      const curLat = Number(currentLatitude);
      const curLng = Number(currentLongitude);
      if (isNaN(curLat) || curLat < -90 || curLat > 90) {
        return Response.json({ error: "Invalid current latitude" }, { status: 400 });
      }
      if (isNaN(curLng) || curLng < -180 || curLng > 180) {
        return Response.json({ error: "Invalid current longitude" }, { status: 400 });
      }

      // Haversine distance between driver's current position and the new area centre
      const toRad = (deg: number) => (deg * Math.PI) / 180;
      const R = 6371;
      const dLat = toRad(newLat - curLat);
      const dLng = toRad(newLng - curLng);
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(curLat)) * Math.cos(toRad(newLat)) * Math.sin(dLng / 2) ** 2;
      const distanceKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      const MAX_KM = 30;
      if (distanceKm > MAX_KM) {
        return Response.json(
          {
            error: `You must be within ${MAX_KM} km of the selected area. You are currently ${Math.round(distanceKm)} km away.`,
          },
          { status: 403 }
        );
      }

      await sql`
        UPDATE drivers
        SET area = ${area}, area_latitude = ${newLat}, area_longitude = ${newLng}
        WHERE clerk_id = ${clerkId}
      `;
    }

    // Service type update — no location check needed
    if (serviceType !== undefined) {
      const VALID_SERVICE_TYPES = ["collector", "bin_cleaner", "both"];
      if (!VALID_SERVICE_TYPES.includes(serviceType)) {
        return Response.json({ error: "Invalid service type" }, { status: 400 });
      }
      await sql`
        UPDATE drivers SET service_type = ${serviceType} WHERE clerk_id = ${clerkId}
      `;
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error updating driver:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const sql = neon(`${process.env.DATABASE_URL}`);

    // Ensure service_type column exists (idempotent)
    await sql`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS service_type VARCHAR(50) DEFAULT 'collector'`;

    const url = new URL(request.url);
    const clerkId = url.searchParams.get("clerkId");

    // Single driver self-lookup (driver profile screen — full data for own profile)
    if (clerkId) {
      const [driver] = await sql`
        SELECT id, name, email, phone, vehicle_type, license_number, number_plate, id_number, is_available,
               area, area_latitude, area_longitude, service_type
        FROM drivers
        WHERE clerk_id = ${clerkId}
        LIMIT 1
      `;
      return Response.json({ data: driver ?? null });
    }

    const lat     = url.searchParams.get("lat");
    const lng     = url.searchParams.get("lng");
    const purpose = url.searchParams.get("purpose") ?? "dispose";
    const pickupLat = lat ? parseFloat(lat) : null;
    const pickupLng = lng ? parseFloat(lng) : null;

    // Validate coordinate ranges to prevent bad data in SQL trig functions
    if (pickupLat !== null && (isNaN(pickupLat) || pickupLat < -90 || pickupLat > 90)) {
      return Response.json({ error: "Invalid latitude" }, { status: 400 });
    }
    if (pickupLng !== null && (isNaN(pickupLng) || pickupLng < -180 || pickupLng > 180)) {
      return Response.json({ error: "Invalid longitude" }, { status: 400 });
    }

    // service_type filter:
    //   bin_cleaning → 'bin_cleaner' or 'both'
    //   dispose/recycle → 'collector' or 'both'
    const isBinCleaning = purpose === "bin_cleaning";

    // Public list — only drivers within 30 km of the pickup point (by live GPS)
    const response =
      pickupLat && pickupLng
        ? await sql`
            SELECT
              d.id, d.name, d.vehicle_type,
              d.number_plate, d.phone, d.is_available,
              ROUND((6371 * acos(
                LEAST(1, GREATEST(-1,
                  cos(radians(${pickupLat})) * cos(radians(d.current_latitude)) *
                  cos(radians(d.current_longitude) - radians(${pickupLng})) +
                  sin(radians(${pickupLat})) * sin(radians(d.current_latitude))
                ))
              ))::numeric, 1) AS distance_km
            FROM drivers d
            JOIN users u ON u.clerk_id = d.clerk_id
            WHERE u.status = 'approved'
              AND d.is_available = true
              AND d.current_latitude IS NOT NULL
              AND d.current_longitude IS NOT NULL
              AND (
                CASE WHEN ${isBinCleaning}
                  THEN COALESCE(d.service_type, 'collector') != 'collector'
                  ELSE COALESCE(d.service_type, 'collector') != 'bin_cleaner'
                END
              )
              AND (6371 * acos(
                LEAST(1, GREATEST(-1,
                  cos(radians(${pickupLat})) * cos(radians(d.current_latitude)) *
                  cos(radians(d.current_longitude) - radians(${pickupLng})) +
                  sin(radians(${pickupLat})) * sin(radians(d.current_latitude))
                ))
              )) <= 30
            ORDER BY distance_km ASC
          `
        : await sql`
            SELECT
              d.id, d.name, d.vehicle_type,
              d.number_plate, d.phone, d.is_available,
              NULL::numeric AS distance_km
            FROM drivers d
            JOIN users u ON u.clerk_id = d.clerk_id
            WHERE u.status = 'approved'
              AND d.is_available = true
              AND (
                CASE WHEN ${isBinCleaning}
                  THEN COALESCE(d.service_type, 'collector') != 'collector'
                  ELSE COALESCE(d.service_type, 'collector') != 'bin_cleaner'
                END
              )
            ORDER BY d.created_at DESC
          `;

    return Response.json({ data: response });
  } catch (error) {
    console.error("Error fetching drivers:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
