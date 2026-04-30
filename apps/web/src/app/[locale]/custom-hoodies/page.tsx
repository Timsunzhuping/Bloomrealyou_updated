import {
  buildCategoryMetadata,
  buildCategoryPage,
} from '@/components/catalog/category-page-template';

export const generateMetadata = buildCategoryMetadata('hoodies');
export default buildCategoryPage('hoodies');
