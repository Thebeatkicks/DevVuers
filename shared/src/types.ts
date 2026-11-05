export type Difficulty = 'lätt' | 'medel' | 'svår'

export interface Guide {
  id: number;
  slug: string;
  title: string;
  region: string;
  difficulty: Difficulty;
  length_km: number;
  body_html: string;
  hero_image: string | null;
  published: boolean;
  author_id: number | null;
  updated_at: string;
}

export interface Tour {
  id: number
  user_id: number
  guide_id: number | null
  title: string
  started_at: string
  distance_m: number
  notes: string | null
}

export interface User {
    id: number,
    email: string,
    password_hash: string, 
    display_name: string, 
    role: string, 
    createdAt: string, 
}

export interface LoginRequest {
  email: string
  password_hash: string
}

export interface RegisterRequest {
  email: string
  password_hash: string
  display_name: string
}

export interface LoginResponse {
  token: string
  user: User
}

export interface TourLog {
  id: number
  tour_id: number
  recorded_at: string
  lat: number
  lon: number
  elevation_m: number | null
  heart_rate: number | null
  note: string | null
}

export interface Photo {
  id: number
  tour_id: number
  filename: string
  width: number
  height: number
  created_at: string
}

/** POST /api/photos (M7) – klienten skickar bara mått och filnamn, inga bytes än */
export interface PhotoUploadRequest {
  tourId: number
  filename: string
  width: number
  height: number
}

/** En omskalad variant: bredd i pixlar och bildsignaturen (för att hitta dubbletter) */
export interface PhotoVariant {
  size: number
  signature: string
}

/** Svaret på POST /api/photos (M7): raden + det funktionen process-image räknade ut */
export interface PhotoUploadResponse extends Photo {
  variants: PhotoVariant[]
  /** funktionens tid för själva bildarbetet */
  processingMs: number
  /** true = första anropet i en ny funktionsprocess */
  coldStart: boolean
  /** vilken funktionsinstans som svarade */
  instance: string
  /** API:ets tid för hela anropet: databasen + funktionen + nätet */
  apiMs: number
}