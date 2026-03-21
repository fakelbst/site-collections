export type SiteCategory = string;
export type SiteFilter = 'All' | SiteCategory;

export interface Site {
  id: string;
  url: string;
  title: string;
  description: string;
  category: SiteCategory;
  screenshot: string;
  ogImage?: string;
  addedAt: string;
}

export interface AddSitePayload {
  url: string;
}

export interface AddSiteResponse {
  success: true;
  site: Site;
}
