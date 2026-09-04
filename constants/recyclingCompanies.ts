// Static recycling companies across all 9 South African provinces.
// Distance is calculated client-side — no server call needed.

export type RecyclingCompany = {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  city: string;
  province: string;
  materials_accepted: string;
  phone: string;
};

export const RECYCLING_COMPANIES: RecyclingCompany[] = [
  // ── Gauteng ──────────────────────────────────────────────────────────────
  { id: 1,  name: "Mpact Recycling Germiston",        address: "Primrose Rd, Germiston",               latitude: -26.2137, longitude: 28.1717, city: "Germiston",        province: "Gauteng",       materials_accepted: "Paper, Cardboard, Plastic",         phone: "011 871 3000" },
  { id: 2,  name: "Nampak Recycling Wadeville",       address: "Nampak Dr, Wadeville, Germiston",      latitude: -26.2500, longitude: 28.1667, city: "Germiston",        province: "Gauteng",       materials_accepted: "Metal, Aluminium, Steel",           phone: "011 719 6000" },
  { id: 3,  name: "Collect-a-Can Johannesburg",       address: "Staal St, Booysens, Johannesburg",     latitude: -26.2400, longitude: 28.0100, city: "Johannesburg",     province: "Gauteng",       materials_accepted: "Cans, Aluminium, Steel",            phone: "011 494 7013" },
  { id: 4,  name: "Reclam Johannesburg",              address: "Reclam Way, City Deep, Johannesburg",  latitude: -26.2167, longitude: 28.0500, city: "Johannesburg",     province: "Gauteng",       materials_accepted: "Paper, Cardboard, Plastic, Metal",  phone: "011 613 1400" },
  { id: 5,  name: "WastePlan Johannesburg",           address: "Stoneridge Dr, Greenstone, Edenvale",  latitude: -26.1333, longitude: 28.1500, city: "Edenvale",         province: "Gauteng",       materials_accepted: "General Recyclables, E-Waste",      phone: "010 900 0130" },
  { id: 6,  name: "Mondi Recycling Springs",          address: "Springs Rd, Springs, East Rand",       latitude: -26.2500, longitude: 28.4500, city: "Springs",          province: "Gauteng",       materials_accepted: "Paper, Cardboard",                  phone: "011 365 3000" },
  { id: 7,  name: "Interwaste Midvaal",               address: "Vereeniging Rd, Midvaal",              latitude: -26.6500, longitude: 27.8500, city: "Midvaal",          province: "Gauteng",       materials_accepted: "Hazardous, Industrial, General",    phone: "011 923 7500" },
  { id: 8,  name: "Glass Recycling Co. Johannesburg", address: "Waterfall Dr, Midrand",                latitude: -25.9667, longitude: 28.1500, city: "Midrand",          province: "Gauteng",       materials_accepted: "Glass",                             phone: "011 314 6228" },
  { id: 9,  name: "E-Waste Africa Johannesburg",      address: "Bramley Rd, Bramley, Johannesburg",    latitude: -26.1167, longitude: 28.0833, city: "Johannesburg",     province: "Gauteng",       materials_accepted: "E-Waste, Electronics",              phone: "011 440 3877" },
  { id: 10, name: "Recycle City Pretoria",            address: "Lynnwood Rd, Lynnwood, Pretoria",      latitude: -25.7833, longitude: 28.2833, city: "Pretoria",         province: "Gauteng",       materials_accepted: "Paper, Plastic, Glass, Metal",      phone: "012 361 3100" },
  // ── Western Cape ─────────────────────────────────────────────────────────
  { id: 11, name: "Mpact Recycling Epping",           address: "Epping Industria 1, Cape Town",        latitude: -33.9500, longitude: 18.5500, city: "Cape Town",        province: "Western Cape",  materials_accepted: "Paper, Cardboard, Plastic",         phone: "021 507 0000" },
  { id: 12, name: "PETCO Cape Town",                  address: "Parow Industria, Cape Town",           latitude: -33.9000, longitude: 18.6167, city: "Cape Town",        province: "Western Cape",  materials_accepted: "PET Plastic Bottles",               phone: "021 531 5228" },
  { id: 13, name: "Drizit Environmental Bellville",   address: "Bellville South, Cape Town",           latitude: -33.9167, longitude: 18.6333, city: "Cape Town",        province: "Western Cape",  materials_accepted: "General Recyclables, Hazardous",    phone: "021 951 0905" },
  { id: 14, name: "Cape Town Recyclers Brackenfell",  address: "Old Paarl Rd, Brackenfell",            latitude: -33.8667, longitude: 18.6833, city: "Brackenfell",      province: "Western Cape",  materials_accepted: "Paper, Plastic, Glass, Metal",      phone: "021 981 3040" },
  { id: 15, name: "George Recyclers",                 address: "Pacaltsdorp Rd, George",               latitude: -33.9833, longitude: 22.4500, city: "George",           province: "Western Cape",  materials_accepted: "Paper, Plastic, Glass, Metal",      phone: "044 873 4444" },
  { id: 16, name: "Paarl Recycling Centre",           address: "Jan van Riebeeck Dr, Paarl",           latitude: -33.7167, longitude: 18.9833, city: "Paarl",            province: "Western Cape",  materials_accepted: "General Recyclables",               phone: "021 863 2100" },
  { id: 17, name: "Stellenbosch Recycling",           address: "Adam Tas Rd, Stellenbosch",            latitude: -33.9333, longitude: 18.8500, city: "Stellenbosch",     province: "Western Cape",  materials_accepted: "Paper, Plastic, Glass, Metal",      phone: "021 883 9600" },
  // ── KwaZulu-Natal ────────────────────────────────────────────────────────
  { id: 18, name: "Ilanga Recyclers Durban",          address: "Prospecton Rd, Prospecton, Durban",    latitude: -29.9000, longitude: 30.9333, city: "Durban",           province: "KwaZulu-Natal", materials_accepted: "Paper, Plastic, Metal, Glass",      phone: "031 902 5555" },
  { id: 19, name: "Mpact Recycling Durban",           address: "Mobeni, Durban South",                 latitude: -29.9500, longitude: 30.9667, city: "Durban",           province: "KwaZulu-Natal", materials_accepted: "Paper, Cardboard, Plastic",         phone: "031 464 0050" },
  { id: 20, name: "Durban Metal Recyclers",           address: "Old Main Rd, Pinetown",                latitude: -29.8333, longitude: 30.8667, city: "Pinetown",         province: "KwaZulu-Natal", materials_accepted: "Metal, Aluminium, Steel, Copper",   phone: "031 709 1200" },
  { id: 21, name: "Pietermaritzburg Recyclers",       address: "Sobantu Rd, Pietermaritzburg",         latitude: -29.6167, longitude: 30.4000, city: "Pietermaritzburg", province: "KwaZulu-Natal", materials_accepted: "Paper, Plastic, Glass, Metal",      phone: "033 345 8800" },
  { id: 22, name: "Richards Bay Recycling",           address: "Alton, Richards Bay",                  latitude: -28.7833, longitude: 32.0667, city: "Richards Bay",     province: "KwaZulu-Natal", materials_accepted: "Metal, Plastic, Paper",             phone: "035 789 5500" },
  // ── Eastern Cape ─────────────────────────────────────────────────────────
  { id: 23, name: "ECW Recycling Gqeberha",           address: "Deal Party Rd, Gqeberha",              latitude: -33.9333, longitude: 25.5667, city: "Gqeberha",         province: "Eastern Cape",  materials_accepted: "Paper, Plastic, Metal, Glass",      phone: "041 451 2700" },
  { id: 24, name: "East London Recyclers",            address: "Braelyn Industrial, East London",      latitude: -32.9833, longitude: 27.8833, city: "East London",      province: "Eastern Cape",  materials_accepted: "Paper, Plastic, Metal, Glass",      phone: "043 722 3500" },
  { id: 25, name: "Buffalo City Recycling",           address: "King Williams Town Rd, East London",   latitude: -32.9667, longitude: 27.8667, city: "East London",      province: "Eastern Cape",  materials_accepted: "General Recyclables, E-Waste",      phone: "043 743 6600" },
  { id: 26, name: "Mthatha Recyclers",                address: "Mthatha Industrial Area, Mthatha",     latitude: -31.5833, longitude: 28.7833, city: "Mthatha",          province: "Eastern Cape",  materials_accepted: "Paper, Plastic, Metal",             phone: "047 532 1100" },
  // ── Free State ───────────────────────────────────────────────────────────
  { id: 27, name: "Bloemfontein Recyclers",           address: "Dan Pienaar Rd, Bloemfontein",         latitude: -29.0667, longitude: 26.2333, city: "Bloemfontein",     province: "Free State",    materials_accepted: "Paper, Plastic, Glass, Metal",      phone: "051 430 8800" },
  { id: 28, name: "Welkom Recycling Centre",          address: "Jan Smuts Ave, Welkom",                latitude: -27.9833, longitude: 26.7333, city: "Welkom",           province: "Free State",    materials_accepted: "Metal, Aluminium, Paper, Plastic",  phone: "057 352 1200" },
  { id: 29, name: "Bethlehem Recyclers",              address: "Industrial Rd, Bethlehem",             latitude: -28.2333, longitude: 28.3000, city: "Bethlehem",        province: "Free State",    materials_accepted: "Paper, Metal, Plastic",             phone: "058 303 5500" },
  // ── Limpopo ──────────────────────────────────────────────────────────────
  { id: 30, name: "Polokwane Recyclers",              address: "Annadale Rd, Polokwane",               latitude: -23.9000, longitude: 29.4667, city: "Polokwane",        province: "Limpopo",       materials_accepted: "Paper, Plastic, Glass, Metal",      phone: "015 297 3300" },
  { id: 31, name: "Tzaneen Recycling Centre",         address: "Tzaneen Industrial Area, Tzaneen",     latitude: -23.8333, longitude: 30.1667, city: "Tzaneen",          province: "Limpopo",       materials_accepted: "Metal, Plastic, Paper",             phone: "015 307 2500" },
  { id: 32, name: "Musina Recyclers",                 address: "N1 North Rd, Musina",                  latitude: -22.3500, longitude: 30.0500, city: "Musina",           province: "Limpopo",       materials_accepted: "Metal, Scrap, Plastic",             phone: "015 534 3300" },
  // ── Mpumalanga ───────────────────────────────────────────────────────────
  { id: 33, name: "Mbombela Recyclers",               address: "Riverside Park, Mbombela",             latitude: -25.5000, longitude: 30.9833, city: "Mbombela",         province: "Mpumalanga",    materials_accepted: "Paper, Plastic, Glass, Metal",      phone: "013 752 2200" },
  { id: 34, name: "eMalahleni Recycling",             address: "Witbank Industrial, eMalahleni",       latitude: -25.8833, longitude: 29.2167, city: "eMalahleni",       province: "Mpumalanga",    materials_accepted: "Metal, Coal Waste, Plastic",        phone: "013 656 5500" },
  { id: 35, name: "Secunda Recyclers",                address: "Trichardt Rd, Secunda",                latitude: -26.5167, longitude: 29.1500, city: "Secunda",          province: "Mpumalanga",    materials_accepted: "Metal, Plastic, Paper",             phone: "017 634 4400" },
  // ── North West ───────────────────────────────────────────────────────────
  { id: 36, name: "Rustenburg Recyclers",             address: "Waterfall Mall Rd, Rustenburg",        latitude: -25.6667, longitude: 27.2667, city: "Rustenburg",       province: "North West",    materials_accepted: "Paper, Plastic, Metal, Glass",      phone: "014 592 8800" },
  { id: 37, name: "Mahikeng Recycling Centre",        address: "Industrial Rd, Mahikeng",              latitude: -25.8500, longitude: 25.6667, city: "Mahikeng",         province: "North West",    materials_accepted: "Metal, Plastic, Paper",             phone: "018 381 2500" },
  { id: 38, name: "Klerksdorp Recyclers",             address: "Jouberton Rd, Klerksdorp",             latitude: -26.8667, longitude: 26.6500, city: "Klerksdorp",       province: "North West",    materials_accepted: "Paper, Metal, Plastic, Glass",      phone: "018 462 3300" },
  // ── Northern Cape ────────────────────────────────────────────────────────
  { id: 39, name: "Kimberley Recyclers",              address: "Long St, Kimberley",                   latitude: -28.7333, longitude: 24.7667, city: "Kimberley",        province: "Northern Cape", materials_accepted: "Metal, Plastic, Paper, Glass",      phone: "053 832 4400" },
  { id: 40, name: "Upington Recycling Centre",        address: "Scott St, Upington",                   latitude: -28.4500, longitude: 21.2500, city: "Upington",         province: "Northern Cape", materials_accepted: "Metal, Plastic, Paper",             phone: "054 337 1100" },
  { id: 41, name: "Springbok Recyclers",              address: "Van Riebeeck St, Springbok",           latitude: -29.6644, longitude: 17.8865, city: "Springbok",        province: "Northern Cape", materials_accepted: "Metal, Scrap, Plastic",             phone: "027 712 2200" },
];
