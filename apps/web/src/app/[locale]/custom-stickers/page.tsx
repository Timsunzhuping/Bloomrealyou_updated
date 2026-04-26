import {
  buildCategoryMetadata,
  buildCategoryPage,
} from '@/components/catalog/category-page-template';

export const generateMetadata = buildCategoryMetadata('stickers');
export default buildCategoryPage('stickers');
