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

export interface User {
    id: number,
    email: string,
    password_hash: string, 
    display_name: string, 
    role: string, 
    createdAt: string, 
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
