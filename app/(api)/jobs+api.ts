import { neon } from "@neondatabase/serverless";

const ALLOWED_FILTERS = ["pending", "accepted", "completed", "rejected", "cancelled"] as const;
const ALLOWED_ACTIONS = ["accept", "reject", "complete", "pay", "rate", "cancel", "counter", "accept_counter", "user_counter"] as const;

// ── Negotiation floor price ────────────────────────────────────────────────
const FLOOR_RATE          = 0.70;
const FLOOR_MIN_DISPOSE   = 200;
const FLOOR_MIN_RECYCLE   = 150;
const FLOOR_MIN_BIN_CLEAN = 100;
const OFFER_TIMEOUT_MINUTES = 3;

function calcFloorPrice(fare: number, jobPurpose: string): number {
  const hardMin =
    jobPurpose === "bin_cleaning"
      ? FLOOR_MIN_BIN_CLEAN
      : jobPurpose === "recycle"
      ? FLOOR_MIN_RECYCLE
      : FLOOR_MIN_DISPOSE;
  return Math.max(Math.round(fare * FLOOR_RATE * 100) / 100, hardMin);
}

// ── Fare calculators (mirror find-collector.tsx) ───────────────────────────
const WASTE_COST_PER_TON: Record<string, number> = {
  garden:    556.1,
  rubble:     23.0,
  special:   556.1,
  garage:    556.1,
  hazardous: 737.0,
};
const FUEL_PRICE    = 19.35;
const FUEL_EFFIC    = 15;
const LABOUR_BASE   = 120;
const LABOUR_PER_KM = 3.50;
const SVC_FEE       = 100;
const WASTE_MGMT    = 0.12;

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calcFare(wasteType: string, weightTons: number, distanceKm: number): number {
  const costPerTon = WASTE_COST_PER_TON[wasteType];
  if (!costPerTon || weightTons <= 0 || distanceKm <= 0) return 0;
  const landfill = costPerTon * weightTons;
  const fuelCost = (distanceKm / 100) * FUEL_EFFIC * FUEL_PRICE;
  const labour   = LABOUR_BASE + distanceKm * LABOUR_PER_KM;
  const base     = landfill + fuelCost + labour + SVC_FEE;
  return Math.round((base + base * WASTE_MGMT) * 100) / 100;
}

const BIN_CLEAN_AGENTS_BASE  = 50;
const BIN_CLEAN_AGENTS_EXTRA = 8;
const BIN_CLEAN_LABOUR_BASE  = 90;
const BIN_CLEAN_LABOUR_EXTRA = 20;
const BIN_CLEAN_SERVICE_FEE  = 80;

function calcBinCleaningFare(binCount: number): number {
  if (binCount <= 0) return 0;
  const ratePerBin = binCount >= 6 ? 95 : binCount >= 3 ? 108 : 120;
  const cleanCost  = ratePerBin * binCount;
  const agents     = BIN_CLEAN_AGENTS_BASE + Math.max(0, binCount - 1) * BIN_CLEAN_AGENTS_EXTRA;
  const labour     = BIN_CLEAN_LABOUR_BASE + Math.max(0, binCount - 1) * BIN_CLEAN_LABOUR_EXTRA;
  return Math.round((cleanCost + agents + labour + BIN_CLEAN_SERVICE_FEE) * 100) / 100;
}

// ── Idempotent schema migrations ───────────────────────────────────────────
// Each statement is individually wrapped so a single failure never blocks the request.
async function ensureSchema(sql: any) {
  const run = async (q: Promise<any>) => { try { await q; } catch { /* already exists or no-op */ } };

  // rides columns
  await run(sql`ALTER TABLE rides ADD COLUMN IF NOT EXISTS user_name         VARCHAR(255)`);
  await run(sql`ALTER TABLE rides ADD COLUMN IF NOT EXISTS waste_photo        TEXT`);
  await run(sql`ALTER TABLE rides ADD COLUMN IF NOT EXISTS purpose            VARCHAR(50) DEFAULT 'dispose'`);
  await run(sql`ALTER TABLE rides ADD COLUMN IF NOT EXISTS offered_price      DECIMAL(10,2)`);
  await run(sql`ALTER TABLE rides ADD COLUMN IF NOT EXISTS floor_price        DECIMAL(10,2)`);
  await run(sql`ALTER TABLE rides ADD COLUMN IF NOT EXISTS counter_price      DECIMAL(10,2)`);
  await run(sql`ALTER TABLE rides ADD COLUMN IF NOT EXISTS negotiation_status VARCHAR(50) DEFAULT 'open'`);
  await run(sql`ALTER TABLE rides ADD COLUMN IF NOT EXISTS offer_expires_at   TIMESTAMP`);
  await run(sql`ALTER TABLE rides ADD COLUMN IF NOT EXISTS payment_status     VARCHAR(50) DEFAULT 'unpaid'`);
  // Allow NULL driver_id for broadcast rides
  await run(sql`ALTER TABLE rides ALTER COLUMN driver_id DROP NOT NULL`);

  // drivers columns
  await run(sql`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS service_type VARCHAR(50) DEFAULT 'collector'`);
  await run(sql`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS push_token   TEXT`);
  await run(sql`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS name         VARCHAR(255)`);
}

// GET — jobs for a driver.
// For filter=pending: returns both unassigned broadcast rides AND driver's own pending rides.
// For other statuses: returns only this driver's rides.
export async function GET(request: Request) {
  try {
    const sql = neon(`${process.env.DATABASE_URL}`);
    await ensureSchema(sql);

    const url           = new URL(request.url);
    const filterParam   = url.searchParams.get("filter") ?? "pending";
    const driverClerkId = url.searchParams.get("driverClerkId");
    const limitParam    = parseInt(url.searchParams.get("limit") ?? "50", 10);

    if (!driverClerkId) {
      return Response.json({ error: "Missing driverClerkId" }, { status: 400 });
    }
    if (!ALLOWED_FILTERS.includes(filterParam as any)) {
      return Response.json({ error: "Invalid filter value" }, { status: 400 });
    }
    const filter = filterParam as typeof ALLOWED_FILTERS[number];
    const limit  = Math.min(Math.max(1, isNaN(limitParam) ? 50 : limitParam), 200);

    const response = await sql`
      SELECT
        rides.ride_id,
        rides.driver_id,
        rides.origin_address,
        rides.destination_address,
        rides.origin_latitude,
        rides.origin_longitude,
        rides.fare_price,
        rides.status,
        rides.created_at,
        rides.rating,
        rides.waste_photo,
        COALESCE(rides.purpose, 'dispose')              AS purpose,
        COALESCE(rides.offered_price, rides.fare_price)  AS offered_price,
        rides.floor_price,
        rides.counter_price,
        COALESCE(rides.negotiation_status, 'open')       AS negotiation_status,
        rides.offer_expires_at,
        COALESCE(rides.user_name, users.name)            AS user_name,
        users.clerk_id                                   AS user_id
      FROM rides
      LEFT JOIN drivers ON rides.driver_id = drivers.id
      LEFT JOIN users   ON rides.user_id   = users.clerk_id
      WHERE rides.status = ${filter}
        AND (
          rides.driver_id IS NULL
          OR drivers.clerk_id = ${driverClerkId}
        )
      ORDER BY rides.created_at DESC
      LIMIT ${limit}
    `;

    return Response.json({ data: response });
  } catch (error) {
    console.error("Error fetching jobs:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST — create a broadcast ride (no driver assigned; all available collectors are notified)
export async function POST(request: Request) {
  try {
    const sql = neon(`${process.env.DATABASE_URL}`);
    await ensureSchema(sql);

    let body: Record<string, any>;
    try {
      const text = await request.text();
      body = text ? JSON.parse(text) : {};
    } catch {
      return Response.json({ error: "Invalid request body" }, { status: 400 });
    }

    const {
      userClerkId,
      userName,
      originAddress,
      destinationAddress,
      originLatitude,
      originLongitude,
      destinationLatitude,
      destinationLongitude,
      wasteType,
      weightTons,
      binsCount,
      purpose,
      offeredPrice: offeredPriceParam,
      paymentMethod,
      wastePhoto,
    } = body;

    // Log exactly what was received so Vercel Function Logs can show the diagnosis
    console.log("[jobs POST] body keys:", Object.keys(body));
    console.log("[jobs POST] userClerkId:", userClerkId, "| purpose:", purpose, "| wasteType:", wasteType, "| offeredPrice:", offeredPriceParam, "| paymentMethod:", paymentMethod);

    if (!userClerkId) {
      console.error("[jobs POST] BLOCKED — userClerkId missing. body.userClerkId =", body.userClerkId);
      return Response.json({ error: "Missing user session — please sign in again" }, { status: 400 });
    }
    // originAddress is optional — client sends GPS coords as fallback text, so we never hard-block here
    if (paymentMethod && !["cash", "card"].includes(paymentMethod)) {
      return Response.json({ error: "Invalid payment method" }, { status: 400 });
    }

    const isBinCleaning = purpose === "bin_cleaning" || wasteType === "bin_cleaning";

    if (!isBinCleaning && wasteType && !WASTE_COST_PER_TON[wasteType]) {
      return Response.json({ error: "Invalid waste type" }, { status: 400 });
    }
    const wTons = Number(weightTons);
    if (!isBinCleaning && wasteType && (isNaN(wTons) || wTons <= 0 || wTons > 20)) {
      return Response.json({ error: "Invalid weight" }, { status: 400 });
    }

    // Calculate fare server-side
    const distanceKm =
      originLatitude && originLongitude && destinationLatitude && destinationLongitude
        ? haversineKm(
            Number(originLatitude),  Number(originLongitude),
            Number(destinationLatitude), Number(destinationLongitude),
          )
        : 0;

    const fare = isBinCleaning
      ? calcBinCleaningFare(Number(binsCount) || 0)
      : wasteType
      ? calcFare(wasteType, wTons, distanceKm)
      : 0;

    const jobPurpose = purpose ?? (isBinCleaning ? "bin_cleaning" : "dispose");
    const floorPrice = calcFloorPrice(fare, jobPurpose);

    const rawOffered = offeredPriceParam != null ? Number(offeredPriceParam) : null;
    const offeredPrice =
      rawOffered != null && rawOffered > 0
        ? Math.round(rawOffered * 100) / 100
        : fare > 0
        ? fare
        : 0;

    // Log fare details for diagnostics
    console.log("[jobs POST] fare:", fare, "| floorPrice:", floorPrice, "| offeredPrice:", offeredPrice, "| rawOffered:", rawOffered);

    // Find all available drivers for this service type
    const serviceType = jobPurpose === "bin_cleaning" ? "bin_cleaner" : "collector";
    const availableDrivers = await sql`
      SELECT id, push_token, name
      FROM drivers
      WHERE is_available = true
        AND (
          service_type = ${serviceType}
          OR service_type = 'both'
          OR (service_type IS NULL AND ${serviceType} = 'collector')
        )
      LIMIT 50
    `;

    // Create broadcast ride — driver_id is NULL until a collector claims it
    const [ride] = await sql`
      INSERT INTO rides (
        driver_id,
        user_id,
        user_name,
        origin_address,
        destination_address,
        origin_latitude,
        origin_longitude,
        destination_latitude,
        destination_longitude,
        fare_price,
        purpose,
        offered_price,
        floor_price,
        negotiation_status,
        offer_expires_at,
        status,
        payment_status,
        waste_photo
      )
      VALUES (
        NULL,
        ${userClerkId},
        ${userName ?? null},
        ${originAddress || (originLatitude && originLongitude ? `${Number(originLatitude).toFixed(5)}, ${Number(originLongitude).toFixed(5)}` : "Unknown")},
        ${destinationAddress ?? null},
        ${originLatitude ?? null},
        ${originLongitude ?? null},
        ${destinationLatitude ?? null},
        ${destinationLongitude ?? null},
        ${offeredPrice},
        ${jobPurpose},
        ${offeredPrice},
        ${floorPrice},
        'open',
        NOW() + (${OFFER_TIMEOUT_MINUTES} * INTERVAL '1 minute'),
        'pending',
        'unpaid',
        ${wastePhoto ?? null}
      )
      RETURNING ride_id, floor_price, offered_price, offer_expires_at
    `;

    // Broadcast push notification to all available drivers (fire-and-forget)
    const notifyTitle = isBinCleaning ? "New Bin Cleaning Job!" : "New Collection Request!";
    const notifyBody  = `Pickup: ${originAddress} · Offer: R${offeredPrice.toFixed(2)}`;
    for (const driver of availableDrivers) {
      if (driver.push_token) {
        fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            to:        driver.push_token,
            title:     notifyTitle,
            body:      notifyBody,
            data:      { rideId: ride.ride_id, screen: "dashboard" },
            sound:     "ringtone.mp3",
            priority:  "high",
            channelId: "job-alerts",
          }),
        }).catch(() => { /* non-critical */ });
      }
    }

    return Response.json({
      data: {
        ...ride,
        calculated_fare:   fare,
        floor_price:       floorPrice,
        drivers_notified:  availableDrivers.length,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating ride:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// PATCH — accept, reject, complete, pay, rate, cancel, counter, accept_counter, user_counter
export async function PATCH(request: Request) {
  try {
    const sql = neon(`${process.env.DATABASE_URL}`);
    const { rideId, driverClerkId, action, paymentMethod, rating, counterPrice, userOfferPrice } =
      await request.json();

    if (!rideId || !action) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (!ALLOWED_ACTIONS.includes(action)) {
      return Response.json({ error: "Invalid action" }, { status: 400 });
    }

    // ── Driver-owned actions ───────────────────────────────────────────────
    if (
      action === "accept" ||
      action === "reject" ||
      action === "complete" ||
      action === "counter"
    ) {
      if (!driverClerkId) {
        return Response.json({ error: "Missing driverClerkId" }, { status: 400 });
      }

      // Resolve driver's DB id
      const [driverRow] = await sql`
        SELECT id FROM drivers WHERE clerk_id = ${driverClerkId} LIMIT 1
      `;
      if (!driverRow) {
        return Response.json({ error: "Forbidden" }, { status: 403 });
      }
      const driverDbId = driverRow.id;

      // Driver can act if they own the ride OR it's an unassigned broadcast ride
      const [ownership] = await sql`
        SELECT ride_id, offered_price, floor_price, driver_id, status
        FROM rides
        WHERE ride_id = ${rideId}
          AND (driver_id IS NULL OR driver_id = ${driverDbId})
        LIMIT 1
      `;
      if (!ownership) {
        return Response.json({ error: "Forbidden" }, { status: 403 });
      }

      if (action === "accept") {
        // Atomically claim unassigned ride and accept at offered price
        await sql`
          UPDATE rides
          SET status             = 'accepted',
              fare_price         = offered_price,
              negotiation_status = 'agreed',
              driver_id          = CASE WHEN driver_id IS NULL THEN ${driverDbId} ELSE driver_id END
          WHERE ride_id = ${rideId}
            AND (driver_id IS NULL OR driver_id = ${driverDbId})
            AND status = 'pending'
        `;
      } else if (action === "reject") {
        // Only mark rejected if driver already owns it; for broadcast rides, just ignore
        if (ownership.driver_id != null) {
          await sql`
            UPDATE rides SET status = 'rejected'
            WHERE ride_id = ${rideId} AND driver_id = ${driverDbId}
          `;
        }
      } else if (action === "complete") {
        await sql`
          UPDATE rides SET status = 'completed'
          WHERE ride_id = ${rideId} AND driver_id = ${driverDbId}
        `;
      } else if (action === "counter") {
        const cp    = Math.round(Number(counterPrice) * 100) / 100;
        const floor = Number(ownership.floor_price ?? 0);
        if (!cp || cp < floor) {
          return Response.json(
            { error: `Counter price must be at least R${floor.toFixed(2)}` },
            { status: 400 }
          );
        }
        // Atomically claim unassigned ride and set counter price
        await sql`
          UPDATE rides
          SET counter_price      = ${cp},
              negotiation_status = 'driver_countered',
              driver_id          = CASE WHEN driver_id IS NULL THEN ${driverDbId} ELSE driver_id END
          WHERE ride_id = ${rideId}
            AND (driver_id IS NULL OR driver_id = ${driverDbId})
            AND status = 'pending'
        `;
      }

    // ── Cancel ─────────────────────────────────────────────────────────────
    } else if (action === "cancel") {
      await sql`
        UPDATE rides SET status = 'cancelled'
        WHERE ride_id = ${rideId} AND status = 'pending'
      `;

    // ── accept_counter — user accepts driver's counter price ───────────────
    } else if (action === "accept_counter") {
      const [ride] = await sql`
        SELECT counter_price, floor_price FROM rides WHERE ride_id = ${rideId} LIMIT 1
      `;
      if (!ride?.counter_price) {
        return Response.json({ error: "No counter price to accept" }, { status: 400 });
      }
      await sql`
        UPDATE rides
        SET fare_price = counter_price, status = 'accepted', negotiation_status = 'agreed'
        WHERE ride_id = ${rideId}
      `;

    // ── user_counter — user proposes a new price back ─────────────────────
    } else if (action === "user_counter") {
      const [ride] = await sql`
        SELECT floor_price FROM rides WHERE ride_id = ${rideId} LIMIT 1
      `;
      const up    = Math.round(Number(userOfferPrice) * 100) / 100;
      const floor = Number(ride?.floor_price ?? 0);
      if (!up || up < floor) {
        return Response.json(
          { error: `Offer must be at least R${floor.toFixed(2)}` },
          { status: 400 }
        );
      }
      await sql`
        UPDATE rides
        SET offered_price = ${up}, negotiation_status = 'user_countered'
        WHERE ride_id = ${rideId}
      `;

    // ── pay / rate ──────────────────────────────────────────────────────────
    } else if (action === "pay") {
      if (!["cash", "card"].includes(paymentMethod)) {
        return Response.json({ error: "Invalid payment method" }, { status: 400 });
      }
      const status = paymentMethod === "cash" ? "paid_cash" : "paid_card";
      await sql`UPDATE rides SET payment_status = ${status} WHERE ride_id = ${rideId}`;
    } else if (action === "rate") {
      await sql`ALTER TABLE rides ADD COLUMN IF NOT EXISTS rating INTEGER`;
      const stars = Number(rating);
      if (!stars || stars < 1 || stars > 5 || !Number.isInteger(stars)) {
        return Response.json(
          { error: "Rating must be an integer between 1 and 5" },
          { status: 400 }
        );
      }
      await sql`
        UPDATE rides SET rating = ${stars}
        WHERE ride_id = ${rideId} AND rating IS NULL
      `;
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error updating job:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
