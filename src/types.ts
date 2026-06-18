export interface Video {
  id: string;
  title?: string;
  description?: string;
  posterUrl?: string;
  videoUrl: string; // Could be a direct link or iframe src
  isIframe: boolean;
  tags?: string[];
  categories: string[];
  createdAt: number;
  views?: number;
  likes?: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  order: number;
}

export interface MenuItem {
  id: string;
  label: string;
  link: string;
  order: number;
  parentId?: string; // For dropdowns
}

export interface SiteConfig {
  id: string;
  logoUrl?: string;
  logoText: string;
  logoLink: string;
  heroTitle?: string;
  heroSubtitle?: string;
  metaDescription?: string;
  headScripts?: string;
  // Ads Configuration
  adsEnabled?: boolean;
  adType?: 'image' | 'video';
  adImageUrl?: string;
  adVideoUrl?: string;
  adLink?: string;
  adDuration?: number;
  adSkipDelay?: number;
  // View & Like Configuration
  likesEnabled?: boolean;
  viewsEnabled?: boolean;
  viewsOnHomeEnabled?: boolean;
  viewsOnDetailEnabled?: boolean;
  favoritesEnabled?: boolean;
}

export const CATEGORIES: string[] = ['Action', 'Sports', 'Gaming', 'Lifestyle', 'Tech', 'Other'];
