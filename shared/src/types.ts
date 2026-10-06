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
