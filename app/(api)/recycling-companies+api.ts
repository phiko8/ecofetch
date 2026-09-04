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

    // ── Auto-provision table + seed on first run ────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS recycling_companies (
        id                  SERIAL PRIMARY KEY,
        name                VARCHAR(255)  NOT NULL,
        address             TEXT          NOT NULL,
        latitude            DECIMAL(10, 7) NOT NULL,
        longitude           DECIMAL(10, 7) NOT NULL,
        city                VARCHAR(100),
        province            VARCHAR(100),
        materials_accepted  TEXT,
        phone               VARCHAR(30),
        is_active           BOOLEAN DEFAULT true,
        created_at          TIMESTAMP DEFAULT NOW()
      )
    `;

    // Seed only if the table is empty
    const countResult = await sql`SELECT COUNT(*) AS n FROM recycling_companies`;
    if (Number(countResult[0].n) === 0) {
      await sql`
        INSERT INTO recycling_companies (name, address, latitude, longitude, city, province, materials_accepted, phone) VALUES
        -- Gauteng
        ('Mpact Recycling Germiston',         'Primrose Rd, Germiston',                 -26.2137, 28.1717, 'Germiston',         'Gauteng',       'Paper, Cardboard, Plastic',              '011 871 3000'),
        ('Nampak Recycling Wadeville',        'Nampak Dr, Wadeville, Germiston',        -26.2500, 28.1667, 'Germiston',         'Gauteng',       'Metal, Aluminium, Steel',                '011 719 6000'),
        ('Collect-a-Can Johannesburg',        'Staal St, Booysens, Johannesburg',       -26.2400, 28.0100, 'Johannesburg',      'Gauteng',       'Cans, Aluminium, Steel',                 '011 494 7013'),
        ('Reclam Johannesburg',               'Reclam Way, City Deep, Johannesburg',    -26.2167, 28.0500, 'Johannesburg',      'Gauteng',       'Paper, Cardboard, Plastic, Metal',       '011 613 1400'),
        ('WastePlan Johannesburg',            'Stoneridge Dr, Greenstone, Edenvale',    -26.1333, 28.1500, 'Edenvale',          'Gauteng',       'General Recyclables, E-Waste',           '010 900 0130'),
        ('Mondi Recycling Springs',           'Springs Rd, Springs, East Rand',         -26.2500, 28.4500, 'Springs',           'Gauteng',       'Paper, Cardboard',                       '011 365 3000'),
        ('Interwaste Midvaal',                'Vereeniging Rd, Midvaal',                -26.6500, 27.8500, 'Midvaal',           'Gauteng',       'Hazardous, Industrial, General',         '011 923 7500'),
        ('Glass Recycling Co. Johannesburg',  'Waterfall Dr, Midrand',                  -25.9667, 28.1500, 'Midrand',           'Gauteng',       'Glass',                                  '011 314 6228'),
        ('E-Waste Africa Johannesburg',       'Bramley Rd, Bramley, Johannesburg',      -26.1167, 28.0833, 'Johannesburg',      'Gauteng',       'E-Waste, Electronics',                   '011 440 3877'),
        ('Recycle City Pretoria',             'Lynnwood Rd, Lynnwood, Pretoria',        -25.7833, 28.2833, 'Pretoria',          'Gauteng',       'Paper, Plastic, Glass, Metal',           '012 361 3100'),
        -- Western Cape
        ('Mpact Recycling Epping',            'Epping Industria 1, Cape Town',          -33.9500, 18.5500, 'Cape Town',         'Western Cape',  'Paper, Cardboard, Plastic',              '021 507 0000'),
        ('PETCO Cape Town',                   'Parow Industria, Cape Town',             -33.9000, 18.6167, 'Cape Town',         'Western Cape',  'PET Plastic Bottles',                    '021 531 5228'),
        ('Drizit Environmental Bellville',    'Bellville South, Cape Town',             -33.9167, 18.6333, 'Cape Town',         'Western Cape',  'General Recyclables, Hazardous',         '021 951 0905'),
        ('Cape Town Recyclers Brackenfell',   'Old Paarl Rd, Brackenfell',              -33.8667, 18.6833, 'Brackenfell',       'Western Cape',  'Paper, Plastic, Glass, Metal',           '021 981 3040'),
        ('George Recyclers',                  'Pacaltsdorp Rd, George',                 -33.9833, 22.4500, 'George',            'Western Cape',  'Paper, Plastic, Glass, Metal',           '044 873 4444'),
        ('Paarl Recycling Centre',            'Jan van Riebeeck Dr, Paarl',             -33.7167, 18.9833, 'Paarl',             'Western Cape',  'General Recyclables',                    '021 863 2100'),
        ('Stellenbosch Recycling',            'Adam Tas Rd, Stellenbosch',              -33.9333, 18.8500, 'Stellenbosch',      'Western Cape',  'Paper, Plastic, Glass, Metal',           '021 883 9600'),
        -- KwaZulu-Natal
        ('Ilanga Recyclers Durban',           'Prospecton Rd, Prospecton, Durban',      -29.9000, 30.9333, 'Durban',            'KwaZulu-Natal', 'Paper, Plastic, Metal, Glass',           '031 902 5555'),
        ('Mpact Recycling Durban',            'Mobeni, Durban South',                   -29.9500, 30.9667, 'Durban',            'KwaZulu-Natal', 'Paper, Cardboard, Plastic',              '031 464 0050'),
        ('Durban Metal Recyclers',            'Old Main Rd, Pinetown',                  -29.8333, 30.8667, 'Pinetown',          'KwaZulu-Natal', 'Metal, Aluminium, Steel, Copper',        '031 709 1200'),
        ('Pietermaritzburg Recyclers',        'Sobantu Rd, Pietermaritzburg',           -29.6167, 30.4000, 'Pietermaritzburg',  'KwaZulu-Natal', 'Paper, Plastic, Glass, Metal',           '033 345 8800'),
        ('Richards Bay Recycling',            'Alton, Richards Bay',                    -28.7833, 32.0667, 'Richards Bay',      'KwaZulu-Natal', 'Metal, Plastic, Paper',                  '035 789 5500'),
        -- Eastern Cape
        ('ECW Recycling Gqeberha',            'Deal Party Rd, Gqeberha',                -33.9333, 25.5667, 'Gqeberha',          'Eastern Cape',  'Paper, Plastic, Metal, Glass',           '041 451 2700'),
        ('East London Recyclers',             'Braelyn Industrial, East London',         -32.9833, 27.8833, 'East London',       'Eastern Cape',  'Paper, Plastic, Metal, Glass',           '043 722 3500'),
        ('Buffalo City Recycling',            'King Williams Town Rd, East London',      -32.9667, 27.8667, 'East London',       'Eastern Cape',  'General Recyclables, E-Waste',           '043 743 6600'),
        ('Mthatha Recyclers',                 'Mthatha Industrial Area, Mthatha',        -31.5833, 28.7833, 'Mthatha',           'Eastern Cape',  'Paper, Plastic, Metal',                  '047 532 1100'),
        -- Free State
        ('Bloemfontein Recyclers',            'Dan Pienaar Rd, Bloemfontein',           -29.0667, 26.2333, 'Bloemfontein',      'Free State',    'Paper, Plastic, Glass, Metal',           '051 430 8800'),
        ('Welkom Recycling Centre',           'Jan Smuts Ave, Welkom',                  -27.9833, 26.7333, 'Welkom',            'Free State',    'Metal, Aluminium, Paper, Plastic',       '057 352 1200'),
        ('Bethlehem Recyclers',               'Industrial Rd, Bethlehem',               -28.2333, 28.3000, 'Bethlehem',         'Free State',    'Paper, Metal, Plastic',                  '058 303 5500'),
        -- Limpopo
        ('Polokwane Recyclers',               'Annadale Rd, Polokwane',                 -23.9000, 29.4667, 'Polokwane',         'Limpopo',       'Paper, Plastic, Glass, Metal',           '015 297 3300'),
        ('Tzaneen Recycling Centre',          'Tzaneen Industrial Area, Tzaneen',       -23.8333, 30.1667, 'Tzaneen',           'Limpopo',       'Metal, Plastic, Paper',                  '015 307 2500'),
        ('Musina Recyclers',                  'N1 North Rd, Musina',                    -22.3500, 30.0500, 'Musina',            'Limpopo',       'Metal, Scrap, Plastic',                  '015 534 3300'),
        -- Mpumalanga
        ('Mbombela Recyclers',                'Riverside Park, Mbombela',               -25.5000, 30.9833, 'Mbombela',          'Mpumalanga',    'Paper, Plastic, Glass, Metal',           '013 752 2200'),
        ('eMalahleni Recycling',              'Witbank Industrial, eMalahleni',         -25.8833, 29.2167, 'eMalahleni',        'Mpumalanga',    'Metal, Coal Waste, Plastic',             '013 656 5500'),
        ('Secunda Recyclers',                 'Trichardt Rd, Secunda',                  -26.5167, 29.1500, 'Secunda',           'Mpumalanga',    'Metal, Plastic, Paper',                  '017 634 4400'),
        -- North West
        ('Rustenburg Recyclers',              'Waterfall Mall Rd, Rustenburg',          -25.6667, 27.2667, 'Rustenburg',        'North West',    'Paper, Plastic, Metal, Glass',           '014 592 8800'),
        ('Mahikeng Recycling Centre',         'Industrial Rd, Mahikeng',                -25.8500, 25.6667, 'Mahikeng',          'North West',    'Metal, Plastic, Paper',                  '018 381 2500'),
        ('Klerksdorp Recyclers',              'Jouberton Rd, Klerksdorp',               -26.8667, 26.6500, 'Klerksdorp',        'North West',    'Paper, Metal, Plastic, Glass',           '018 462 3300'),
        -- Northern Cape
        ('Kimberley Recyclers',               'Long St, Kimberley',                     -28.7333, 24.7667, 'Kimberley',         'Northern Cape', 'Metal, Plastic, Paper, Glass',           '053 832 4400'),
        ('Upington Recycling Centre',         'Scott St, Upington',                     -28.4500, 21.2500, 'Upington',          'Northern Cape', 'Metal, Plastic, Paper',                  '054 337 1100'),
        ('Springbok Recyclers',               'Van Riebeeck St, Springbok',             -29.6644, 17.8865, 'Springbok',         'Northern Cape', 'Metal, Scrap, Plastic',                  '027 712 2200')
      `;
    }

    // ── Query nearest companies ─────────────────────────────────────────────
    const companies = await sql`
      SELECT id, name, address, latitude, longitude, city, province, materials_accepted, phone, distance_km
      FROM (
        SELECT
          id, name, address, latitude, longitude, city, province, materials_accepted, phone,
          ROUND((6371 * acos(
            LEAST(1.0, cos(radians(${lat})) * cos(radians(CAST(latitude AS FLOAT))) *
            cos(radians(CAST(longitude AS FLOAT)) - radians(${lng})) +
            sin(radians(${lat})) * sin(radians(CAST(latitude AS FLOAT))))
          ))::numeric, 1) AS distance_km
        FROM recycling_companies
        WHERE is_active = true
      ) sub
      WHERE distance_km <= 150
      ORDER BY distance_km ASC
      LIMIT 10
    `;

    return Response.json({ data: companies });
  } catch (error: any) {
    console.error("Error fetching recycling companies:", error);
    return Response.json(
      { error: "Internal Server Error", detail: error?.message ?? String(error) },
      { status: 500 }
    );
  }
}
