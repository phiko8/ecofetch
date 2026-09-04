import { neon } from "@neondatabase/serverless";

export async function GET(request: Request) {
  try {
    const sql = neon(`${process.env.DATABASE_URL}`);
    const url = new URL(request.url);
    const lat = parseFloat(url.searchParams.get("lat") ?? "");
    const lng = parseFloat(url.searchParams.get("lng") ?? "");

    if (isNaN(lat) || isNaN(lng)) {
      return Response.json({ error: "Missing or invalid lat/lng" }, { status: 400 });
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return Response.json({ error: "Coordinates out of range" }, { status: 400 });
    }

    const sites = await sql`
      SELECT id, name, address, latitude, longitude, site_type, city, province, distance_km
      FROM (
        SELECT
          id, name, address, latitude, longitude, site_type, city, province,
          ROUND((6371 * acos(
            cos(radians(${lat})) * cos(radians(latitude)) *
            cos(radians(longitude) - radians(${lng})) +
            sin(radians(${lat})) * sin(radians(latitude))
          ))::numeric, 1) AS distance_km
        FROM waste_drop_off_sites
        WHERE is_active = true
      ) sub
      WHERE distance_km <= 150
      ORDER BY distance_km ASC
      LIMIT 10
    `;

    return Response.json({ data: sites });
  } catch (error) {
    console.error("Error fetching waste sites:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
