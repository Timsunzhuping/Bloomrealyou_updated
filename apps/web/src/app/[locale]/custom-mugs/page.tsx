import {
  buildCategoryMetadata,
  buildCategoryPage,
} from '@/components/catalog/category-page-template';

export const generateMetadata = buildCategoryMetadata('mugs');
export default buildCategoryPage('mugs');
