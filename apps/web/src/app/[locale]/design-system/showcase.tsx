'use client';

import {
  AdminStatusBadge,
  Badge,
  Breadcrumb,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CategoryCard,
  CategoryGrid,
  Checkbox,
  CorporateCTA,
  CTASection,
  CurrencySwitcher,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  EmptyState,
  ErrorState,
  FAQSection,
  FileUploader,
  FormField,
  HeroSection,
  ImagePreview,
  Input,
  Label,
  LoadingState,
  LocaleSwitcher,
  OrderStatusBadge,
  Pagination,
  PriceDisplay,
  ProductBadge,
  ProductCard,
  ProductFilterSidebar,
  ProductGrid,
  ProductSortDropdown,
  QuantitySelector,
  RadioGroup,
  RadioGroupItem,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  TemplateGrid,
  TestimonialCard,
  Textarea,
  TrustBar,
} from '@custom-merch/ui';
import { Bot, Building2, Globe, Sparkles, Truck, Zap } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

const PLACEHOLDER = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 3"><rect width="4" height="3" fill="%23e5e7eb"/></svg>';

function Section({ title, children }: { title: string; children: React.ReactNode }): JSX.Element {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <div className="rounded-lg border bg-card p-6">{children}</div>
    </section>
  );
}

export function DesignSystemShowcase(): JSX.Element {
  const t = useTranslations('design-system');
  const tCommon = useTranslations('common');

  const [page, setPage] = React.useState(1);
  const [quantity, setQuantity] = React.useState(1);
  const [filters, setFilters] = React.useState<Set<string>>(new Set());
  const [sort, setSort] = React.useState('popular');
  const [locale, setLocale] = React.useState('en');
  const [currency, setCurrency] = React.useState('USD');

  return (
    <div className="space-y-12 pb-16">
      <Breadcrumb
        ariaLabel={tCommon('nav.home')}
        items={[
          { label: t('navigation.breadcrumbs.home'), href: '/' },
          { label: t('navigation.breadcrumbs.category'), href: '/products' },
          { label: t('title') },
        ]}
      />

      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{t('title')}</h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </header>

      <Section title={t('sections.buttons')}>
        <div className="flex flex-wrap gap-3">
          <Button>{t('buttons.primary')}</Button>
          <Button variant="secondary">{t('buttons.secondary')}</Button>
          <Button variant="outline">{t('buttons.outline')}</Button>
          <Button variant="ghost">{t('buttons.ghost')}</Button>
          <Button variant="destructive">{t('buttons.destructive')}</Button>
        </div>
      </Section>

      <Section title={t('sections.form')}>
        <div className="grid max-w-xl gap-4">
          <FormField
            id="ds-email"
            label={t('form.emailLabel')}
            description={t('form.emailDescription')}
            required
          >
            <Input type="email" placeholder={t('form.emailPlaceholder')} />
          </FormField>
          <FormField id="ds-message" label={t('form.messageLabel')}>
            <Textarea placeholder={t('form.messagePlaceholder')} rows={4} />
          </FormField>
          <div className="space-y-2">
            <Label>{t('form.rolesLabel')}</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder={t('form.rolesLabel')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="customer">customer</SelectItem>
                <SelectItem value="designer">designer</SelectItem>
                <SelectItem value="sales">sales</SelectItem>
                <SelectItem value="admin">admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Section>

      <Section title={t('sections.selection')}>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <p className="text-sm font-semibold">{t('form.marketingLabel')}</p>
            <RadioGroup defaultValue="yes">
              <div className="flex items-center gap-2">
                <RadioGroupItem id="rs-yes" value="yes" />
                <Label htmlFor="rs-yes">{t('form.subscribeYes')}</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem id="rs-no" value="no" />
                <Label htmlFor="rs-no">{t('form.subscribeNo')}</Label>
              </div>
            </RadioGroup>
          </div>
          <div className="flex items-start gap-2">
            <Checkbox id="ds-check" defaultChecked />
            <Label htmlFor="ds-check">{t('form.subscribeYes')}</Label>
          </div>
        </div>
      </Section>

      <Section title={t('sections.feedback')}>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-wrap gap-2">
            <Badge variant="success">{t('feedback.successBadge')}</Badge>
            <Badge variant="warning">{t('feedback.warningBadge')}</Badge>
            <Badge variant="info">info</Badge>
            <Badge variant="accent">accent</Badge>
            <Badge variant="destructive">destructive</Badge>
            <Badge variant="outline">outline</Badge>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </Section>

      <Section title={t('sections.overlay')}>
        <div className="flex flex-wrap gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button>{t('overlay.openDialog')}</Button>
            </DialogTrigger>
            <DialogContent closeLabel={t('overlay.dialogClose')}>
              <DialogHeader>
                <DialogTitle>{t('overlay.dialogTitle')}</DialogTitle>
                <DialogDescription>{t('overlay.dialogBody')}</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">{t('overlay.dialogCancel')}</Button>
                </DialogClose>
                <Button>{t('overlay.dialogConfirm')}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Drawer>
            <DrawerTrigger asChild>
              <Button variant="outline">{t('overlay.openDrawer')}</Button>
            </DrawerTrigger>
            <DrawerContent side="right" closeLabel={t('overlay.dialogClose')}>
              <DrawerHeader>
                <DrawerTitle>{t('overlay.drawerTitle')}</DrawerTitle>
                <DrawerDescription>{t('overlay.drawerBody')}</DrawerDescription>
              </DrawerHeader>
            </DrawerContent>
          </Drawer>
        </div>
      </Section>

      <Section title={t('sections.navigation')}>
        <div className="space-y-6">
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">{t('navigation.tabs.overview')}</TabsTrigger>
              <TabsTrigger value="details">{t('navigation.tabs.details')}</TabsTrigger>
              <TabsTrigger value="reviews">{t('navigation.tabs.reviews')}</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
              <p className="text-sm text-muted-foreground">{t('navigation.tabContent.overview')}</p>
            </TabsContent>
            <TabsContent value="details">
              <p className="text-sm text-muted-foreground">{t('navigation.tabContent.details')}</p>
            </TabsContent>
            <TabsContent value="reviews">
              <p className="text-sm text-muted-foreground">{t('navigation.tabContent.reviews')}</p>
            </TabsContent>
          </Tabs>

          <Pagination
            page={page}
            totalPages={8}
            onPageChange={setPage}
            labels={{
              nav: t('navigation.paginationLabels.nav'),
              previous: t('navigation.paginationLabels.previous'),
              next: t('navigation.paginationLabels.next'),
              page: (n) => `${t('navigation.paginationLabels.nav')} ${n}`,
            }}
          />
        </div>
      </Section>

      <Section title={t('sections.data')}>
        <Table>
          <TableCaption>{t('data.tableCaption')}</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>{t('data.tableHeaders.order')}</TableHead>
              <TableHead>{t('data.tableHeaders.customer')}</TableHead>
              <TableHead>{t('data.tableHeaders.status')}</TableHead>
              <TableHead className="text-end">{t('data.tableHeaders.total')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>ORD-20260426-A7BC92</TableCell>
              <TableCell>Maya Lin</TableCell>
              <TableCell>
                <OrderStatusBadge status="paid" label="paid" />
              </TableCell>
              <TableCell className="text-end">$129.00</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>ORD-20260425-Q3F8MT</TableCell>
              <TableCell>Jordan Reyes</TableCell>
              <TableCell>
                <OrderStatusBadge status="in_production" label="in production" />
              </TableCell>
              <TableCell className="text-end">$2,430.00</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>ORD-20260425-XB2N1A</TableCell>
              <TableCell>FreshLabs</TableCell>
              <TableCell>
                <AdminStatusBadge tone="warning" label="under review" />
              </TableCell>
              <TableCell className="text-end">$8,990.00</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Section>

      <Section title={t('sections.ecommerce')}>
        <div className="grid gap-6 md:grid-cols-[260px_1fr]">
          <ProductFilterSidebar
            groups={[
              {
                key: 'category',
                heading: t('navigation.breadcrumbs.category'),
                options: [
                  { value: 'tees', label: 't-shirts', count: 24 },
                  { value: 'hoodies', label: 'hoodies', count: 12 },
                  { value: 'mugs', label: 'mugs', count: 8 },
                ],
              },
            ]}
            selected={filters}
            onToggle={(key, value) => {
              const id = `${key}:${value}`;
              setFilters((prev) => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
              });
            }}
            resetLabel={t('ecommerce.filterReset')}
            onReset={() => setFilters(new Set())}
          />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <PriceDisplay
                amount="$19.99"
                compareAtAmount="$24.99"
                prefix={t('ecommerce.fromPrice')}
                size="lg"
              />
              <ProductSortDropdown
                value={sort}
                onChange={setSort}
                label={t('ecommerce.sortLabel')}
                options={[
                  { value: 'popular', label: t('ecommerce.sortOptions.popular') },
                  { value: 'priceAsc', label: t('ecommerce.sortOptions.priceAsc') },
                  { value: 'priceDesc', label: t('ecommerce.sortOptions.priceDesc') },
                  { value: 'newest', label: t('ecommerce.sortOptions.newest') },
                ]}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-[280px_1fr]">
              <ImagePreview
                images={[
                  { src: PLACEHOLDER, alt: t('states.imagesAlt') },
                  { src: PLACEHOLDER, alt: t('states.imagesAlt') },
                  { src: PLACEHOLDER, alt: t('states.imagesAlt') },
                ]}
                thumbnailListLabel={t('states.thumbnailListLabel')}
              />
              <Card>
                <CardHeader>
                  <CardTitle>{t('ecommerce.productName')}</CardTitle>
                  <CardDescription>{t('states.categoryDescription')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <PriceDisplay amount="$19.99" prefix={t('ecommerce.fromPrice')} size="md" />
                  <div className="flex items-center gap-3">
                    <span className="text-sm">{t('ecommerce.quantity')}</span>
                    <QuantitySelector
                      value={quantity}
                      onChange={setQuantity}
                      labels={{
                        decrement: t('ecommerce.decrement'),
                        increment: t('ecommerce.increment'),
                        input: t('ecommerce.quantity'),
                      }}
                    />
                  </div>
                  <Button>{t('ecommerce.addToCart')}</Button>
                </CardContent>
              </Card>
            </div>

            <ProductGrid>
              <ProductCard
                name={t('ecommerce.productName')}
                priceLabel="$19.99"
                pricePrefix={t('ecommerce.fromPrice')}
                imageSrc={PLACEHOLDER}
                imageAlt={t('states.imagesAlt')}
                badge={<ProductBadge label={t('badges.bestseller')} variant="accent" />}
                footer={<Button size="sm">{t('ecommerce.addToCart')}</Button>}
              />
              <ProductCard
                name={t('ecommerce.productName')}
                priceLabel="$24.99"
                pricePrefix={t('ecommerce.fromPrice')}
                imageSrc={PLACEHOLDER}
                imageAlt={t('states.imagesAlt')}
                badge={<ProductBadge label={t('badges.new')} />}
              />
              <ProductCard
                name={t('ecommerce.productName')}
                priceLabel="$32.99"
                pricePrefix={t('ecommerce.fromPrice')}
                imageSrc={PLACEHOLDER}
                imageAlt={t('states.imagesAlt')}
                badge={<ProductBadge label={t('badges.eco')} variant="success" />}
              />
            </ProductGrid>

            <CategoryGrid>
              {(['t-shirts', 'hoodies', 'mugs', 'hats', 'tote-bags', 'stickers'] as const).map(
                (key) => (
                  <CategoryCard
                    key={key}
                    title={key}
                    subtitle={t('states.categoryDescription')}
                    imageSrc={PLACEHOLDER}
                    imageAlt={t('states.imagesAlt')}
                  />
                ),
              )}
            </CategoryGrid>

            <FileUploader
              accept="image/*"
              onFiles={() => undefined}
              labels={{
                title: t('ecommerce.uploadTitle'),
                description: t('ecommerce.uploadDescription'),
                browse: t('ecommerce.uploadBrowse'),
                inputAriaLabel: t('ecommerce.uploadAria'),
              }}
            />
          </div>
        </div>
      </Section>

      <Section title={t('sections.marketing')}>
        <div className="space-y-8">
          <HeroSection
            eyebrow={t('marketing.heroEyebrow')}
            title={t('marketing.heroTitle')}
            description={t('marketing.heroBody')}
            primaryAction={<Button size="lg">{t('marketing.heroPrimary')}</Button>}
            secondaryAction={<Button variant="outline" size="lg">{t('marketing.heroSecondary')}</Button>}
            visual={
              <div className="grid h-64 w-full place-items-center rounded-2xl bg-gradient-to-br from-primary/10 via-accent/20 to-primary/5">
                <Sparkles className="h-12 w-12 text-accent" />
              </div>
            }
          />

          <TrustBar
            items={[
              { icon: <Globe className="h-5 w-5" />, title: t('marketing.trust.global') },
              { icon: <Truck className="h-5 w-5" />, title: t('marketing.trust.speed') },
              { icon: <Bot className="h-5 w-5" />, title: t('marketing.trust.quality') },
              { icon: <Zap className="h-5 w-5" />, title: t('marketing.trust.support') },
            ]}
          />

          <CorporateCTA
            eyebrow={t('marketing.corporateEyebrow')}
            title={t('marketing.corporateTitle')}
            description={t('marketing.corporateBody')}
            bullets={[
              { icon: <Building2 className="h-4 w-4" />, label: t('marketing.corporateBullets.rfq') },
              { icon: <Sparkles className="h-4 w-4" />, label: t('marketing.corporateBullets.templates') },
              { icon: <Truck className="h-4 w-4" />, label: t('marketing.corporateBullets.logistics') },
              { icon: <Zap className="h-4 w-4" />, label: t('marketing.corporateBullets.billing') },
            ]}
            primaryAction={<Button>{t('marketing.corporateCta')}</Button>}
            secondaryAction={
              <Button variant="outline" className="border-background/30 bg-transparent text-background">
                {t('marketing.corporateSecondary')}
              </Button>
            }
          />

          <CTASection
            eyebrow={t('marketing.ctaEyebrow')}
            title={t('marketing.ctaTitle')}
            description={t('marketing.ctaBody')}
            tone="accent"
            primaryAction={<Button>{t('marketing.ctaPrimary')}</Button>}
            secondaryAction={<Button variant="outline">{t('marketing.ctaSecondary')}</Button>}
          />

          <FAQSection
            heading={t('marketing.faqHeading')}
            items={[
              { question: t('marketing.faqItems.q1'), answer: t('marketing.faqItems.a1') },
              { question: t('marketing.faqItems.q2'), answer: t('marketing.faqItems.a2') },
              { question: t('marketing.faqItems.q3'), answer: t('marketing.faqItems.a3') },
            ]}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <TestimonialCard
              quote={t('marketing.testimonials.quote1')}
              authorName={t('marketing.testimonials.author1')}
              authorRole={t('marketing.testimonials.role1')}
            />
            <TestimonialCard
              quote={t('marketing.testimonials.quote2')}
              authorName={t('marketing.testimonials.author2')}
              authorRole={t('marketing.testimonials.role2')}
            />
          </div>

          <TemplateGrid
            items={[
              { id: '1', title: 'Corporate event', subtitle: 'Tech conference', imageSrc: PLACEHOLDER },
              { id: '2', title: 'Birthday gift', subtitle: 'Mug + tote', imageSrc: PLACEHOLDER },
              { id: '3', title: 'Team shirt', subtitle: 'Hackathon', imageSrc: PLACEHOLDER },
            ]}
          />
        </div>
      </Section>

      <Section title={t('sections.states')}>
        <div className="grid gap-4 md:grid-cols-3">
          <EmptyState
            title={t('feedback.emptyTitle')}
            description={t('feedback.emptyBody')}
            action={<Button size="sm">{t('feedback.emptyCta')}</Button>}
          />
          <LoadingState label={t('feedback.loadingLabel')} />
          <ErrorState title={t('feedback.errorTitle')} description={t('feedback.errorBody')} />
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <LocaleSwitcher
            label={t('switchers.localeLabel')}
            value={locale}
            onChange={setLocale}
            options={[
              { value: 'en', label: 'English' },
              { value: 'zh-CN', label: '简体中文' },
              { value: 'es', label: 'Español' },
              { value: 'ar', label: 'العربية' },
            ]}
          />
          <CurrencySwitcher
            label={t('switchers.currencyLabel')}
            value={currency}
            onChange={setCurrency}
            options={[
              { value: 'USD', label: 'USD' },
              { value: 'EUR', label: 'EUR' },
              { value: 'GBP', label: 'GBP' },
              { value: 'AED', label: 'AED' },
              { value: 'CNY', label: 'CNY' },
            ]}
          />
        </div>
      </Section>
    </div>
  );
}
