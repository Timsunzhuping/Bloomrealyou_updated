import {
  buildCategoryMetadata,
  buildCategoryPage,
} from '@/components/catalog/category-page-template';

export const generateMetadata = buildCategoryMetadata('t-shirts');
export default buildCategoryPage('t-shirts');
