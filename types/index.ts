export interface NewsArticle {
  id: string
  title: string
  summary: string
  source_url: string
  source_name: string
  category: NewsCategory
  tags: string[]
  image_url?: string
  published_at: string
  created_at: string
  updated_at: string
  original_language: string
  is_translated: boolean
  source_country: string
  importance_score: number
}

export type NewsCategory = 'Tech' | 'Music' | 'Business' | 'AI' | 'Startup' | 'General' | 'Game' | 'World' | 'Sports' | 'Entertainment' | 'Conspiracy'

export interface UserPreferences {
  id: string
  user_id: string
  preferred_categories: NewsCategory[]
  excluded_keywords: string[]
  preferred_languages: string[]
  created_at: string
}

export interface CategoryTabProps {
  categories: NewsCategory[]
  activeCategory: NewsCategory | 'All'
  onCategoryChange: (category: NewsCategory | 'All') => void
}

export interface NewsCardProps {
  article: NewsArticle
  onRead?: (articleId: string) => void
  onHelpful?: (articleId: string) => void
}