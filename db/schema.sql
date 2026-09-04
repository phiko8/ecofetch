-- =============================================================
-- Ecko Fetch — Full Database Schema
-- Run this in your Neon DB SQL console.
-- Safe to re-run: uses IF NOT EXISTS and ADD COLUMN IF NOT EXISTS.
-- =============================================================


-- ─────────────────────────────────────────────────────────────
-- 1. USERS TABLE  (Clerk handles auth; we store role & status)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(255)  NOT NULL,
    email       VARCHAR(255)  UNIQUE NOT NULL,
    clerk_id    VARCHAR(255)  UNIQUE NOT NULL,
    role        VARCHAR(50)   DEFAULT 'disposer',   -- 'disposer' | 'driver'
    id_number   VARCHAR(50),                         -- SA ID number (drivers only)
    status      VARCHAR(50)   DEFAULT 'pending',     -- 'pending' | 'approved' | 'rejected'
    created_at  TIMESTAMP     DEFAULT NOW()
);

-- Add missing columns if table already exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS role       VARCHAR(50)  DEFAULT 'disposer';
ALTER TABLE users ADD COLUMN IF NOT EXISTS id_number  VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS status     VARCHAR(50)  DEFAULT 'pending';
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone      VARCHAR(20);


-- ─────────────────────────────────────────────────────────────
-- 2. DRIVERS (COLLECTORS) TABLE
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS drivers (
    id                  SERIAL PRIMARY KEY,
    clerk_id            VARCHAR(255) UNIQUE,
    first_name          VARCHAR(100),
    last_name           VARCHAR(100),
    profile_image_url   TEXT,
    car_image_url       TEXT,
    car_type            VARCHAR(100),          -- e.g. Bakkie, Truck, Van, Sedan
    car_seats           INTEGER       DEFAULT 4,
    rating              DECIMAL(3,2)  DEFAULT 5.0,
    is_available        BOOLEAN       DEFAULT true,  -- true = visible to disposers
    phone               VARCHAR(20),
    area                VARCHAR(255),          -- service area, e.g. "Johannesburg North"
    id_number           VARCHAR(50)   UNIQUE,  -- SA ID number
    passport_number     VARCHAR(50)   UNIQUE,  -- Passport number (alternative to ID)
    created_at          TIMESTAMP     DEFAULT NOW()
);

-- Add missing columns if table already exists
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS clerk_id            VARCHAR(255);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS phone               VARCHAR(20);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS area                VARCHAR(255);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS is_available        BOOLEAN DEFAULT true;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS id_number           VARCHAR(50);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS passport_number     VARCHAR(50);
CREATE UNIQUE INDEX IF NOT EXISTS drivers_id_number_unique      ON drivers (id_number)      WHERE id_number IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS drivers_passport_number_unique ON drivers (passport_number) WHERE passport_number IS NOT NULL;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS current_latitude    DECIMAL(10, 7);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS current_longitude   DECIMAL(10, 7);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMP;
-- Service type: 'collector' (waste), 'bin_cleaner', or 'both'
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS service_type VARCHAR(50) DEFAULT 'collector';
-- Push notification token (Expo push token)
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS push_token   TEXT;
-- Display name (used for job notifications)
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS name         VARCHAR(255);

-- Allow nulls on name columns (set during registration flow)
ALTER TABLE drivers ALTER COLUMN first_name DROP NOT NULL;
ALTER TABLE drivers ALTER COLUMN last_name  DROP NOT NULL;

-- Prevent duplicate clerk accounts
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'drivers_clerk_id_unique'
    ) THEN
        ALTER TABLE drivers ADD CONSTRAINT drivers_clerk_id_unique UNIQUE (clerk_id);
    END IF;
END$$;


-- ─────────────────────────────────────────────────────────────
-- 3. RIDES (WASTE COLLECTION REQUESTS) TABLE
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rides (
    id                      SERIAL PRIMARY KEY,
    driver_id               INTEGER       REFERENCES drivers(id),
    user_id                 VARCHAR(255),              -- Clerk ID of the disposer
    origin_address          TEXT,
    destination_address     TEXT,
    origin_latitude         DECIMAL(10, 7),
    origin_longitude        DECIMAL(10, 7),
    destination_latitude    DECIMAL(10, 7),
    destination_longitude   DECIMAL(10, 7),
    ride_time               INTEGER,                   -- estimated minutes
    fare_price              DECIMAL(10, 2) DEFAULT 0,
    payment_status          VARCHAR(50)    DEFAULT 'unpaid',   -- 'unpaid' | 'paid'
    status                  VARCHAR(50)    DEFAULT 'pending',  -- 'pending' | 'accepted' | 'completed' | 'cancelled'
    created_at              TIMESTAMP      DEFAULT NOW()
);

-- Add missing columns if table already exists
ALTER TABLE rides ADD COLUMN IF NOT EXISTS status    VARCHAR(50) DEFAULT 'pending';
ALTER TABLE rides ADD COLUMN IF NOT EXISTS driver_id INTEGER REFERENCES drivers(id);
ALTER TABLE rides ADD COLUMN IF NOT EXISTS user_name VARCHAR(255);
-- Job purpose: 'dispose' | 'recycle' | 'bin_cleaning'
ALTER TABLE rides ADD COLUMN IF NOT EXISTS purpose             VARCHAR(50)    DEFAULT 'dispose';
-- Negotiation & timeout
ALTER TABLE rides ADD COLUMN IF NOT EXISTS offered_price       DECIMAL(10,2); -- user's current offer
ALTER TABLE rides ADD COLUMN IF NOT EXISTS floor_price         DECIMAL(10,2); -- minimum (neither party can go below)
ALTER TABLE rides ADD COLUMN IF NOT EXISTS counter_price       DECIMAL(10,2); -- driver's counter-offer
ALTER TABLE rides ADD COLUMN IF NOT EXISTS negotiation_status  VARCHAR(50)    DEFAULT 'open';
  -- 'open' | 'driver_countered' | 'user_countered' | 'agreed'
ALTER TABLE rides ADD COLUMN IF NOT EXISTS offer_expires_at    TIMESTAMP;     -- 3-min window for driver to respond


-- ─────────────────────────────────────────────────────────────
-- 4. COLLECTION DRIVES TABLE  (community/scheduled drives)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS drives (
    id               SERIAL PRIMARY KEY,
    title            VARCHAR(255)   NOT NULL,
    area             VARCHAR(255)   NOT NULL,
    date             TIMESTAMP      NOT NULL,
    vehicle_type     VARCHAR(100),
    total_slots      INTEGER        DEFAULT 10,
    available_slots  INTEGER        DEFAULT 10,
    price            DECIMAL(10,2)  DEFAULT 0,
    status           VARCHAR(50)    DEFAULT 'available',  -- 'available' | 'full' | 'completed' | 'cancelled'
    created_at       TIMESTAMP      DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────
-- 5. CHAT MESSAGES TABLE
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_messages (
    id           SERIAL PRIMARY KEY,
    sender_id    VARCHAR(255) NOT NULL,
    sender_name  VARCHAR(255) NOT NULL,
    message      TEXT         NOT NULL,
    created_at   TIMESTAMP    DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────
-- 6. WASTE DROP-OFF SITES TABLE  (government / municipal sites)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS waste_drop_off_sites (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    address     TEXT         NOT NULL,
    latitude    DECIMAL(10, 7) NOT NULL,
    longitude   DECIMAL(10, 7) NOT NULL,
    site_type   VARCHAR(100)  DEFAULT 'municipal',
    city        VARCHAR(100),
    province    VARCHAR(100),
    is_active   BOOLEAN       DEFAULT true,
    created_at  TIMESTAMP     DEFAULT NOW()
);

-- Seed known SA government waste drop-off sites (safe to re-run)
INSERT INTO waste_drop_off_sites (name, address, latitude, longitude, site_type, city, province)
SELECT name, address, latitude, longitude, site_type, city, province
FROM (VALUES
  ('Robinson Deep Landfill',     'Maraisburg Rd, Johannesburg',          -26.2408, 27.9788, 'landfill',  'Johannesburg',  'Gauteng'),
  ('Goudkoppies Landfill',       'Goudkoppies, Soweto',                  -26.2873, 27.8671, 'landfill',  'Soweto',        'Gauteng'),
  ('Randburg Transfer Station',  'Malibongwe Dr, Randburg',              -26.0921, 27.9994, 'transfer',  'Johannesburg',  'Gauteng'),
  ('Hatherley Landfill',         'Hatherley, Pretoria East',             -25.6883, 28.4110, 'landfill',  'Pretoria',      'Gauteng'),
  ('Rooiwal Landfill',           'Rooiwal, Pretoria North',              -25.5423, 28.2893, 'landfill',  'Pretoria',      'Gauteng'),
  ('Vissershok Waste Facility',  'Vissershok Rd, Durbanville',           -33.8158, 18.5264, 'landfill',  'Cape Town',     'Western Cape'),
  ('Coastal Park Landfill',      'Strandfontein Rd, Cape Town',          -34.0789, 18.5248, 'landfill',  'Cape Town',     'Western Cape'),
  ('Bisasar Road Landfill',      'Bisasar Rd, Springfield, Durban',      -29.8320, 30.9678, 'landfill',  'Durban',        'KwaZulu-Natal'),
  ('Marianhill Landfill',        'Marianhill, Pinetown',                 -29.8013, 30.8224, 'landfill',  'Pinetown',      'KwaZulu-Natal'),
  ('Koedoeskloof Landfill',      'Koedoeskloof Rd, Gqeberha',           -33.8756, 25.4522, 'landfill',  'Gqeberha',      'Eastern Cape'),
  ('Rooikraal Landfill',         'Rooikraal, Benoni',                    -26.3437, 28.2673, 'landfill',  'Benoni',           'Gauteng'),
  -- Western Cape extras
  ('Athlone Transfer Station',   'Klipfontein Rd, Athlone, Cape Town',   -33.9667, 18.5167, 'transfer',  'Cape Town',        'Western Cape'),
  ('Kraaifontein Waste Disposal','Langverwacht Rd, Kraaifontein',        -33.8472, 18.7194, 'landfill',  'Kraaifontein',     'Western Cape'),
  ('Helderberg Waste Disposal',  'Vergenoegd Rd, Somerset West',         -34.0556, 18.8528, 'landfill',  'Somerset West',    'Western Cape'),
  ('Atlantis Waste Disposal',    'Wesfleur Circle, Atlantis',            -33.5708, 18.4833, 'landfill',  'Atlantis',         'Western Cape'),
  ('Swartland Waste Disposal',   'R315, Malmesbury',                     -33.4589, 18.7267, 'landfill',  'Malmesbury',       'Western Cape'),
  ('George Landfill',            'Old Outeniqua Pass Rd, George',        -33.9731, 22.4617, 'landfill',  'George',           'Western Cape'),
  -- Gauteng extras
  ('Ennerdale Landfill',         'Main Reef Rd, Ennerdale, Johannesburg',-26.4019, 27.8608, 'landfill',  'Johannesburg',     'Gauteng'),
  ('Vlakfontein Landfill',       'Vlakfontein, Johannesburg South',      -26.4339, 27.9517, 'landfill',  'Johannesburg',     'Gauteng'),
  ('Zandfontein Landfill',       'Zandfontein, Tshwane',                 -25.7406, 28.3144, 'landfill',  'Pretoria',         'Gauteng'),
  -- KwaZulu-Natal extras
  ('Buffelsdraai Landfill',      'Buffelsdraai Rd, Verulam',             -29.6394, 31.0436, 'landfill',  'Verulam',          'KwaZulu-Natal'),
  ('Shongweni Landfill',         'Shongweni Rd, Pinetown',               -29.8833, 30.7333, 'landfill',  'Pinetown',         'KwaZulu-Natal'),
  -- Eastern Cape extras
  ('Arlington Landfill',         'Arlington Dr, Gqeberha',               -33.9481, 25.5697, 'landfill',  'Gqeberha',          'Eastern Cape'),
  ('East London Landfill',       'Braelyn, East London',                 -32.9958, 27.8847, 'landfill',  'East London',       'Eastern Cape'),
  ('Mthatha Landfill',           'Mthatha, Eastern Cape',                -31.5833, 28.7833, 'landfill',  'Mthatha',           'Eastern Cape'),
  ('Bhisho Landfill',            'Bhisho, Eastern Cape',                 -32.8500, 27.4333, 'landfill',  'Bhisho',            'Eastern Cape'),
  -- Free State
  ('Bloemspruit Landfill',       'Bloemspruit, Bloemfontein',            -29.0833, 26.2833, 'landfill',  'Bloemfontein',      'Free State'),
  ('Welkom Waste Disposal',      'Welkom, Free State',                   -27.9833, 26.7333, 'landfill',  'Welkom',            'Free State'),
  ('Phuthaditjhaba Landfill',    'Phuthaditjhaba, QwaQwa',               -28.5167, 28.8000, 'landfill',  'Phuthaditjhaba',    'Free State'),
  -- Limpopo
  ('Seshego Landfill',           'Seshego, Polokwane',                   -23.8833, 29.4167, 'landfill',  'Polokwane',         'Limpopo'),
  ('Mokopane Landfill',          'Mokopane (Potgietersrus), Limpopo',    -24.1833, 28.9833, 'landfill',  'Mokopane',          'Limpopo'),
  ('Tzaneen Waste Disposal',     'Tzaneen, Limpopo',                     -23.8333, 30.1667, 'landfill',  'Tzaneen',           'Limpopo'),
  -- Mpumalanga
  ('Nelspruit Landfill',         'Mbombela (Nelspruit), Mpumalanga',     -25.4833, 30.9833, 'landfill',  'Mbombela',          'Mpumalanga'),
  ('eMalahleni Landfill',        'eMalahleni (Witbank), Mpumalanga',     -25.8667, 29.2333, 'landfill',  'eMalahleni',        'Mpumalanga'),
  ('Secunda Waste Disposal',     'Secunda, Mpumalanga',                  -26.5167, 29.1500, 'landfill',  'Secunda',           'Mpumalanga'),
  -- North West
  ('Rustenburg Landfill',        'Rustenburg, North West',               -25.6667, 27.2333, 'landfill',  'Rustenburg',        'North West'),
  ('Mahikeng Waste Disposal',    'Mahikeng (Mafikeng), North West',      -25.8667, 25.6500, 'landfill',  'Mahikeng',          'North West'),
  ('Klerksdorp Landfill',        'Klerksdorp, North West',               -26.8667, 26.6667, 'landfill',  'Klerksdorp',        'North West'),
  -- Northern Cape
  ('Kimberley Landfill',         'Kimberley, Northern Cape',             -28.7333, 24.7667, 'landfill',  'Kimberley',         'Northern Cape'),
  ('Upington Waste Disposal',    'Upington, Northern Cape',              -28.4500, 21.2500, 'landfill',  'Upington',          'Northern Cape'),
  ('Springbok Landfill',         'Springbok, Northern Cape',             -29.6644, 17.8865, 'landfill',  'Springbok',         'Northern Cape'),
  -- KwaZulu-Natal extras
  ('Pietermaritzburg Landfill',  'New England Rd, Pietermaritzburg',     -29.6167, 30.3833, 'landfill',  'Pietermaritzburg',  'KwaZulu-Natal'),
  ('Richards Bay Landfill',      'Richards Bay, KwaZulu-Natal',          -28.7833, 32.0500, 'landfill',  'Richards Bay',      'KwaZulu-Natal')
) AS v(name, address, latitude, longitude, site_type, city, province)
WHERE NOT EXISTS (
    SELECT 1 FROM waste_drop_off_sites WHERE waste_drop_off_sites.name = v.name
);


-- ─────────────────────────────────────────────────────────────
-- 7. RECYCLING COMPANIES TABLE
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recycling_companies (
    id                  SERIAL PRIMARY KEY,
    name                VARCHAR(255)  NOT NULL,
    address             TEXT          NOT NULL,
    latitude            DECIMAL(10, 7) NOT NULL,
    longitude           DECIMAL(10, 7) NOT NULL,
    city                VARCHAR(100),
    province            VARCHAR(100),
    materials_accepted  TEXT,           -- e.g. "Paper, Plastic, Glass, Metal, E-Waste"
    phone               VARCHAR(30),
    is_active           BOOLEAN       DEFAULT true,
    created_at          TIMESTAMP     DEFAULT NOW()
);

-- Seed South African recycling companies across all 9 provinces (safe to re-run)
INSERT INTO recycling_companies (name, address, latitude, longitude, city, province, materials_accepted, phone)
SELECT name, address, latitude, longitude, city, province, materials_accepted, phone
FROM (VALUES
  -- ── Gauteng ────────────────────────────────────────────────────────────────
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
  -- ── Western Cape ────────────────────────────────────────────────────────────
  ('Mpact Recycling Epping',            'Epping Industria 1, Cape Town',          -33.9500, 18.5500, 'Cape Town',         'Western Cape',  'Paper, Cardboard, Plastic',              '021 507 0000'),
  ('PETCO Cape Town',                   'Parow Industria, Cape Town',             -33.9000, 18.6167, 'Cape Town',         'Western Cape',  'PET Plastic Bottles',                    '021 531 5228'),
  ('Drizit Environmental Bellville',    'Bellville South, Cape Town',             -33.9167, 18.6333, 'Cape Town',         'Western Cape',  'General Recyclables, Hazardous',         '021 951 0905'),
  ('Cape Town Recyclers Brackenfell',   'Old Paarl Rd, Brackenfell',              -33.8667, 18.6833, 'Brackenfell',       'Western Cape',  'Paper, Plastic, Glass, Metal',           '021 981 3040'),
  ('George Recyclers',                  'Pacaltsdorp Rd, George',                 -33.9833, 22.4500, 'George',            'Western Cape',  'Paper, Plastic, Glass, Metal',           '044 873 4444'),
  ('Paarl Recycling Centre',            'Jan van Riebeeck Dr, Paarl',             -33.7167, 18.9833, 'Paarl',             'Western Cape',  'General Recyclables',                    '021 863 2100'),
  ('Stellenbosch Recycling',            'Adam Tas Rd, Stellenbosch',              -33.9333, 18.8500, 'Stellenbosch',      'Western Cape',  'Paper, Plastic, Glass, Metal',           '021 883 9600'),
  -- ── KwaZulu-Natal ────────────────────────────────────────────────────────────
  ('Ilanga Recyclers Durban',           'Prospecton Rd, Prospecton, Durban',      -29.9000, 30.9333, 'Durban',            'KwaZulu-Natal', 'Paper, Plastic, Metal, Glass',           '031 902 5555'),
  ('Mpact Recycling Durban',            'Mobeni, Durban South',                   -29.9500, 30.9667, 'Durban',            'KwaZulu-Natal', 'Paper, Cardboard, Plastic',              '031 464 0050'),
  ('Durban Metal Recyclers',            'Old Main Rd, Pinetown',                  -29.8333, 30.8667, 'Pinetown',          'KwaZulu-Natal', 'Metal, Aluminium, Steel, Copper',        '031 709 1200'),
  ('Pietermaritzburg Recyclers',        'Sobantu Rd, Pietermaritzburg',           -29.6167, 30.4000, 'Pietermaritzburg',  'KwaZulu-Natal', 'Paper, Plastic, Glass, Metal',           '033 345 8800'),
  ('Richards Bay Recycling',            'Alton, Richards Bay',                    -28.7833, 32.0667, 'Richards Bay',      'KwaZulu-Natal', 'Metal, Plastic, Paper',                  '035 789 5500'),
  -- ── Eastern Cape ────────────────────────────────────────────────────────────
  ('ECW Recycling Gqeberha',            'Deal Party Rd, Gqeberha',                -33.9333, 25.5667, 'Gqeberha',          'Eastern Cape',  'Paper, Plastic, Metal, Glass',           '041 451 2700'),
  ('East London Recyclers',             'Braelyn Industrial, East London',         -32.9833, 27.8833, 'East London',       'Eastern Cape',  'Paper, Plastic, Metal, Glass',           '043 722 3500'),
  ('Buffalo City Recycling',            'King William's Town Rd, East London',     -32.9667, 27.8667, 'East London',       'Eastern Cape',  'General Recyclables, E-Waste',           '043 743 6600'),
  ('Mthatha Recyclers',                 'Mthatha Industrial Area, Mthatha',        -31.5833, 28.7833, 'Mthatha',           'Eastern Cape',  'Paper, Plastic, Metal',                  '047 532 1100'),
  -- ── Free State ────────────────────────────────────────────────────────────
  ('Bloemfontein Recyclers',            'Dan Pienaar Rd, Bloemfontein',           -29.0667, 26.2333, 'Bloemfontein',      'Free State',    'Paper, Plastic, Glass, Metal',           '051 430 8800'),
  ('Welkom Recycling Centre',           'Jan Smuts Ave, Welkom',                  -27.9833, 26.7333, 'Welkom',            'Free State',    'Metal, Aluminium, Paper, Plastic',       '057 352 1200'),
  ('Bethlehem Recyclers',               'Industrial Rd, Bethlehem',               -28.2333, 28.3000, 'Bethlehem',         'Free State',    'Paper, Metal, Plastic',                  '058 303 5500'),
  -- ── Limpopo ────────────────────────────────────────────────────────────────
  ('Polokwane Recyclers',               'Annadale Rd, Polokwane',                 -23.9000, 29.4667, 'Polokwane',         'Limpopo',       'Paper, Plastic, Glass, Metal',           '015 297 3300'),
  ('Tzaneen Recycling Centre',          'Tzaneen Industrial Area, Tzaneen',       -23.8333, 30.1667, 'Tzaneen',           'Limpopo',       'Metal, Plastic, Paper',                  '015 307 2500'),
  ('Musina Recyclers',                  'N1 North Rd, Musina',                    -22.3500, 30.0500, 'Musina',            'Limpopo',       'Metal, Scrap, Plastic',                  '015 534 3300'),
  -- ── Mpumalanga ────────────────────────────────────────────────────────────
  ('Mbombela Recyclers',                'Riverside Park, Mbombela',               -25.5000, 30.9833, 'Mbombela',          'Mpumalanga',    'Paper, Plastic, Glass, Metal',           '013 752 2200'),
  ('eMalahleni Recycling',              'Witbank Industrial, eMalahleni',         -25.8833, 29.2167, 'eMalahleni',        'Mpumalanga',    'Metal, Coal Waste, Plastic',             '013 656 5500'),
  ('Secunda Recyclers',                 'Trichardt Rd, Secunda',                  -26.5167, 29.1500, 'Secunda',           'Mpumalanga',    'Metal, Plastic, Paper',                  '017 634 4400'),
  -- ── North West ────────────────────────────────────────────────────────────
  ('Rustenburg Recyclers',              'Waterfall Mall Rd, Rustenburg',          -25.6667, 27.2667, 'Rustenburg',        'North West',    'Paper, Plastic, Metal, Glass',           '014 592 8800'),
  ('Mahikeng Recycling Centre',         'Industrial Rd, Mahikeng',                -25.8500, 25.6667, 'Mahikeng',          'North West',    'Metal, Plastic, Paper',                  '018 381 2500'),
  ('Klerksdorp Recyclers',              'Jouberton Rd, Klerksdorp',               -26.8667, 26.6500, 'Klerksdorp',        'North West',    'Paper, Metal, Plastic, Glass',           '018 462 3300'),
  -- ── Northern Cape ────────────────────────────────────────────────────────────
  ('Kimberley Recyclers',               'Long St, Kimberley',                     -28.7333, 24.7667, 'Kimberley',         'Northern Cape', 'Metal, Plastic, Paper, Glass',           '053 832 4400'),
  ('Upington Recycling Centre',         'Scott St, Upington',                     -28.4500, 21.2500, 'Upington',          'Northern Cape', 'Metal, Plastic, Paper',                  '054 337 1100'),
  ('Springbok Recyclers',               'Van Riebeeck St, Springbok',             -29.6644, 17.8865, 'Springbok',         'Northern Cape', 'Metal, Scrap, Plastic',                  '027 712 2200')
) AS v(name, address, latitude, longitude, city, province, materials_accepted, phone)
WHERE NOT EXISTS (
    SELECT 1 FROM recycling_companies WHERE recycling_companies.name = v.name
);


-- =============================================================
-- QUICK VERIFICATION — run after setup to check tables exist:
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
-- ORDER BY table_name;
-- =============================================================
