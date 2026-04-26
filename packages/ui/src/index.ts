/** Public surface of @custom-merch/ui. */

export { cn } from './lib/cn';

// Base components
export { Button, buttonVariants, type ButtonProps } from './components/button';
export { Input, type InputProps } from './components/input';
export { Textarea, type TextareaProps } from './components/textarea';
export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from './components/select';
export { Checkbox } from './components/checkbox';
export { RadioGroup, RadioGroupItem } from './components/radio-group';
export {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './components/card';
export { Badge, badgeVariants, type BadgeProps } from './components/badge';
export { Label } from './components/label';
export { Skeleton } from './components/skeleton';
export { FormField, type FormFieldProps } from './components/form-field';

// Overlay + nav
export { Tabs, TabsContent, TabsList, TabsTrigger } from './components/tabs';
export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogTitle,
  DialogTrigger,
  type DialogContentProps,
} from './components/dialog';
export {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  type DrawerContentProps,
} from './components/drawer';
export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from './components/dropdown-menu';
export {
  Toast,
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  type ToastCloseProps,
} from './components/toast';
export { Pagination, type PaginationProps } from './components/pagination';
export {
  Breadcrumb,
  type BreadcrumbItem,
  type BreadcrumbProps,
} from './components/breadcrumb';
export {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from './components/table';

// State components
export { EmptyState, type EmptyStateProps } from './components/empty-state';
export { LoadingState, type LoadingStateProps } from './components/loading-state';
export { ErrorState, type ErrorStateProps } from './components/error-state';

// Business components
export { PriceDisplay, type PriceDisplayProps } from './components/price-display';
export { QuantitySelector, type QuantitySelectorProps } from './components/quantity-selector';
export { FileUploader, type FileUploaderProps } from './components/file-uploader';
export {
  ImagePreview,
  type ImagePreviewItem,
  type ImagePreviewProps,
} from './components/image-preview';
export {
  LocaleSwitcher,
  type LocaleOption,
  type LocaleSwitcherProps,
} from './components/locale-switcher';
export {
  CurrencySwitcher,
  type CurrencyOption,
  type CurrencySwitcherProps,
} from './components/currency-switcher';
export { TrustBar, type TrustBarItem, type TrustBarProps } from './components/trust-bar';
export { CTASection, type CTASectionProps } from './components/cta-section';
export { FAQSection, type FAQItem, type FAQSectionProps } from './components/faq-section';
export { TestimonialCard, type TestimonialCardProps } from './components/testimonial-card';
export { ProductBadge, type ProductBadgeProps } from './components/product-badge';
export {
  OrderStatusBadge,
  type OrderStatusBadgeProps,
  type OrderStatusKey,
} from './components/order-status-badge';
export {
  AdminStatusBadge,
  type AdminStatusBadgeProps,
  type StatusTone,
} from './components/admin-status-badge';
export { ProductCard, type ProductCardProps } from './components/product-card';
export { ProductGrid, type ProductGridProps } from './components/product-grid';
export { CategoryCard, type CategoryCardProps } from './components/category-card';
export { CategoryGrid, type CategoryGridProps } from './components/category-grid';

// Page-level layout
export { Header, type HeaderProps } from './components/header';
export { Footer, type FooterProps, type FooterColumn } from './components/footer';
export {
  MegaMenu,
  type MegaMenuColumn,
  type MegaMenuLink,
  type MegaMenuProps,
} from './components/mega-menu';
export { HeroSection, type HeroSectionProps } from './components/hero-section';
export { CorporateCTA, type CorporateCTAProps } from './components/corporate-cta';
export {
  TemplateGrid,
  type TemplateGridItem,
  type TemplateGridProps,
} from './components/template-grid';
export {
  ProductFilterSidebar,
  type FilterGroup,
  type FilterOption,
  type ProductFilterSidebarProps,
} from './components/product-filter-sidebar';
export {
  ProductSortDropdown,
  type ProductSortDropdownProps,
  type SortOption,
} from './components/product-sort-dropdown';
