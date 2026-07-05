import { BadRequestException } from '@nestjs/common';

import { CustomizationsService } from './customizations.service';

const readyDesign = {
  canvas: {
    width: 800,
    height: 800,
    objects: [
      {
        id: 'layer_1',
        type: 'text',
        text: 'Ready',
        x: 240,
        y: 220,
        width: 200,
        height: 60,
        fontSize: 36,
      },
    ],
  },
  printAreaRect: { x: 200, y: 160, width: 400, height: 480 },
  safeAreaRect: { x: 220, y: 180, width: 360, height: 440 },
};

function makeService(designJson: Record<string, unknown>) {
  const design = {
    id: 'design_1',
    ownerUserId: 'user_1',
    organizationId: null,
    productId: 'prod_1',
    variantId: null,
    templateId: null,
    name: 'Design',
    status: 'draft' as const,
    designJson,
    previewImageUrl: '/files/preview.png',
    productionFileUrl: null,
    validationResult: null,
    metadata: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
  const repo = {
    get: jest.fn().mockReturnValue(design),
    setValidation: jest.fn(),
    setProductionUrl: jest.fn(),
  };
  const files = {
    generateProduction: jest.fn().mockResolvedValue([
      { format: 'png', url: '/files/production.png', size: 10 },
      { format: 'pdf', url: '/files/production.pdf', size: 20 },
      { format: 'json', url: '/files/source.json', size: 30 },
    ]),
  };
  return {
    service: new CustomizationsService(repo as never, files as never),
    repo,
    files,
  };
}

describe('CustomizationsService production exports', () => {
  it('validates and stores the primary production file URL', async () => {
    const { service, repo, files } = makeService(readyDesign);

    const result = await service.generateProductionFile(
      'design_1',
      ['png', 'pdf', 'json'],
      'data:image/png;base64,abc',
    );

    expect(files.generateProduction).toHaveBeenCalledWith(
      'design_1',
      readyDesign,
      'data:image/png;base64,abc',
      ['png', 'pdf', 'json'],
    );
    expect(repo.setValidation).toHaveBeenCalledWith(
      'design_1',
      expect.objectContaining({ ok: true }),
    );
    expect(repo.setProductionUrl).toHaveBeenCalledWith('design_1', '/files/production.pdf');
    expect(result.productionFileUrl).toBe('/files/production.pdf');
  });

  it('rejects invalid designs before generating files', async () => {
    const { service, files } = makeService({ canvas: { width: 800, height: 800, objects: [] } });

    await expect(service.generateProductionFile('design_1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(files.generateProduction).not.toHaveBeenCalled();
  });
});
