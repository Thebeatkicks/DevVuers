export interface Guide {
  id: number;
  slug: string;
  title: string;
  region: string;
  difficulty: string;
  length_km: number;
  body_html: string;
  hero_image: string | null;
  published: boolean;
  author_id: number | null;
  updated_at: string;
}