import {
  buildCategoryMetadata,
  buildCategoryPage,
} from '@/components/catalog/category-page-template';

export const generateMetadata = buildCategoryMetadata('hats');
export default buildCategoryPage('hats');
