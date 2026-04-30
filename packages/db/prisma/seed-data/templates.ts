export interface SeedTemplateSpec {
  slug: string;
  name: string;
  description: string;
  /** Slug of the base product the template targets. */
  productSlug: string;
  applicablePrintAreaKeys: string[];
  previewImageUrl: string;
  tags: string[];
  /**
   * Hand-crafted DesignJson seed payload. Stored as JSONB; only the layers
   * are interesting — the rest is filled in by the seeder using the chosen
   * product's print-area dimensions.
   */
  designJson: {
    schemaVersion: '1.0';
    productSlugRef: string;
    areas: Array<{
      printAreaKey: string;
      printMethod: string;
      canvas: { widthPx: number; heightPx: number; backgroundColor?: string };
      layers: Array<Record<string, unknown>>;
    }>;
  };
}

export const SEED_TEMPLATES: SeedTemplateSpec[] = [
  {
    slug: 'corporate-event',
    name: 'Corporate Event Template',
    description: 'Clean layout pairing logo + slogan, suitable for company off-sites.',
    productSlug: 'premium-cotton-tee',
    applicablePrintAreaKeys: ['front'],
    previewImageUrl: 'https://placehold.co/600x600?text=Corporate+Event',
    tags: ['corporate', 'b2b'],
    designJson: {
      schemaVersion: '1.0',
      productSlugRef: 'premium-cotton-tee',
      areas: [
        {
          printAreaKey: 'front',
          printMethod: 'dtg',
          canvas: { widthPx: 3000, heightPx: 3600 },
          layers: [
            {
              id: 'logo',
              type: 'image',
              zIndex: 1,
              position: { x: 1000, y: 1000 },
              size: { width: 1000, height: 1000 },
              rotationDegrees: 0,
              opacity: 1,
              visible: true,
              src: 'https://placehold.co/1000x1000?text=YOUR+LOGO',
            },
            {
              id: 'slogan',
              type: 'text',
              zIndex: 2,
              position: { x: 700, y: 2200 },
              size: { width: 1600, height: 240 },
              rotationDegrees: 0,
              opacity: 1,
              visible: true,
              text: 'TEAM ALPHA — 2026 OFFSITE',
              fontFamily: 'Inter',
              fontSize: 120,
              fontWeight: 700,
              color: '#111111',
              textAlign: 'center',
            },
          ],
        },
      ],
    },
  },
  {
    slug: 'birthday-gift',
    name: 'Birthday Gift Template',
    description: 'Cheerful layout for personalized birthday mugs.',
    productSlug: 'classic-ceramic-mug',
    applicablePrintAreaKeys: ['wrap'],
    previewImageUrl: 'https://placehold.co/600x600?text=Birthday+Gift',
    tags: ['gift', 'personal'],
    designJson: {
      schemaVersion: '1.0',
      productSlugRef: 'classic-ceramic-mug',
      areas: [
        {
          printAreaKey: 'wrap',
          printMethod: 'sublimation',
          canvas: { widthPx: 3000, heightPx: 1200, backgroundColor: '#fff7ed' },
          layers: [
            {
              id: 'headline',
              type: 'text',
              zIndex: 1,
              position: { x: 200, y: 300 },
              size: { width: 2600, height: 250 },
              rotationDegrees: 0,
              opacity: 1,
              visible: true,
              text: 'Happy Birthday, Friend!',
              fontFamily: 'Pacifico',
              fontSize: 160,
              fontWeight: 400,
              color: '#c2410c',
              textAlign: 'center',
            },
            {
              id: 'sub',
              type: 'text',
              zIndex: 2,
              position: { x: 200, y: 700 },
              size: { width: 2600, height: 200 },
              rotationDegrees: 0,
              opacity: 1,
              visible: true,
              text: 'Keep being awesome ✨',
              fontFamily: 'Inter',
              fontSize: 90,
              fontWeight: 500,
              color: '#1f2937',
              textAlign: 'center',
            },
          ],
        },
      ],
    },
  },
  {
    slug: 'team-shirt',
    name: 'Team Shirt Template',
    description: 'Bold name + number layout for team / squad shirts.',
    productSlug: 'performance-tee',
    applicablePrintAreaKeys: ['back'],
    previewImageUrl: 'https://placehold.co/600x600?text=Team+Shirt',
    tags: ['sports', 'team'],
    designJson: {
      schemaVersion: '1.0',
      productSlugRef: 'performance-tee',
      areas: [
        {
          printAreaKey: 'back',
          printMethod: 'sublimation',
          canvas: { widthPx: 3000, heightPx: 3600 },
          layers: [
            {
              id: 'name',
              type: 'text',
              zIndex: 1,
              position: { x: 200, y: 1000 },
              size: { width: 2600, height: 360 },
              rotationDegrees: 0,
              opacity: 1,
              visible: true,
              text: 'CHEN',
              fontFamily: 'Bebas Neue',
              fontSize: 360,
              fontWeight: 700,
              color: '#ffffff',
              textAlign: 'center',
            },
            {
              id: 'number',
              type: 'text',
              zIndex: 2,
              position: { x: 1000, y: 1500 },
              size: { width: 1000, height: 1500 },
              rotationDegrees: 0,
              opacity: 1,
              visible: true,
              text: '07',
              fontFamily: 'Bebas Neue',
              fontSize: 720,
              fontWeight: 700,
              color: '#ffffff',
              textAlign: 'center',
            },
          ],
        },
      ],
    },
  },
  {
    slug: 'tech-conference',
    name: 'Tech Conference Template',
    description: 'Minimal black-and-white layout for tech meetups + conferences.',
    productSlug: 'pullover-hoodie',
    applicablePrintAreaKeys: ['front', 'left_sleeve'],
    previewImageUrl: 'https://placehold.co/600x600?text=Tech+Conference',
    tags: ['tech', 'conference', 'b2b'],
    designJson: {
      schemaVersion: '1.0',
      productSlugRef: 'pullover-hoodie',
      areas: [
        {
          printAreaKey: 'front',
          printMethod: 'screen_printing',
          canvas: { widthPx: 3000, heightPx: 3600 },
          layers: [
            {
              id: 'event',
              type: 'text',
              zIndex: 1,
              position: { x: 600, y: 1500 },
              size: { width: 1800, height: 200 },
              rotationDegrees: 0,
              opacity: 1,
              visible: true,
              text: 'devsummit_2026',
              fontFamily: 'JetBrains Mono',
              fontSize: 140,
              fontWeight: 700,
              color: '#ffffff',
              textAlign: 'center',
            },
          ],
        },
        {
          printAreaKey: 'left_sleeve',
          printMethod: 'embroidery',
          canvas: { widthPx: 1200, heightPx: 2400 },
          layers: [
            {
              id: 'tag',
              type: 'text',
              zIndex: 1,
              position: { x: 200, y: 1000 },
              size: { width: 800, height: 200 },
              rotationDegrees: 90,
              opacity: 1,
              visible: true,
              text: 'EST. 2026',
              fontFamily: 'Inter',
              fontSize: 90,
              fontWeight: 600,
              color: '#ffffff',
              textAlign: 'center',
            },
          ],
        },
      ],
    },
  },
  {
    slug: 'holiday-gift',
    name: 'Holiday Gift Template',
    description: 'Warm holiday theme for tote-bag corporate gifting.',
    productSlug: 'eco-tote',
    applicablePrintAreaKeys: ['front'],
    previewImageUrl: 'https://placehold.co/600x600?text=Holiday+Gift',
    tags: ['holiday', 'gift', 'b2b'],
    designJson: {
      schemaVersion: '1.0',
      productSlugRef: 'eco-tote',
      areas: [
        {
          printAreaKey: 'front',
          printMethod: 'screen_printing',
          canvas: { widthPx: 2400, heightPx: 2400 },
          layers: [
            {
              id: 'shape',
              type: 'shape',
              zIndex: 1,
              position: { x: 200, y: 200 },
              size: { width: 2000, height: 2000 },
              rotationDegrees: 0,
              opacity: 0.15,
              visible: true,
              shape: 'circle',
              fill: '#16a34a',
            },
            {
              id: 'msg',
              type: 'text',
              zIndex: 2,
              position: { x: 300, y: 1000 },
              size: { width: 1800, height: 400 },
              rotationDegrees: 0,
              opacity: 1,
              visible: true,
              text: 'happy holidays\nfrom acme corp',
              fontFamily: 'Playfair Display',
              fontSize: 160,
              fontWeight: 600,
              color: '#14532d',
              textAlign: 'center',
            },
          ],
        },
      ],
    },
  },
];
