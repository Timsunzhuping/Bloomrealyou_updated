# AI-assisted product listing

## 给上品同事的操作说明

1. 登录后台，在左侧选择“AI 自动上品”，点击“新建商品”。
2. 在对话框输入真实资料。例如：`名称：经典棉质T恤；英文名称：Classic Cotton Tee；英文描述：Cotton T-shirt for everyday wear.；分类：T恤；材质：100%棉；颜色：白色；尺码：M, L；售价：26.04 USD；生产周期：5天`。默认币种为 USD，也可在右侧单独修改。
3. 上传商品实拍图。系统会追问缺失信息；价格、规格、材质和描述均可手动修正。没有配置豆包时，上述带标签的录入方式仍可用，但图片优化不可用。
4. 需要美化时，选择原图及“白底主图”或“光线与清晰度”，点击“优化图片”。检查优化前后是否保持商品实际颜色、Logo、文字、材质和细节；确认无误后勾选核对项，再选择优化图或设为主图。原图始终保留。AI 图片可能改变细节，不应未经核对直接发布。
5. 定制商品须选择实际支持的印花工艺，并提供经核实的正面印花区域尺寸及偏移；系统不会从照片猜测这些生产参数。非定制商品可以不选印花工艺。
6. 核对商品资料后，可“入库为草稿”或“确认上架”。上架还有一次价格、规格数量和图片数量确认。草稿不会出现在公开商品目录；已保存商品后续在原有商品管理页面编辑。

**当前范围：** 单商品对话上品、颜色与尺码组合、基础售价和图片优化。图片内容自动识别、批量 Excel 导入、不同规格差价和阶梯价的对话配置未包含；规格差价和阶梯价仍在原有编辑器处理。

## Entry and workflow

- Admin route: `/{locale}/product-listings`, sidebar: AI Product Listing / AI 自动上品.
- Requires `products.write`. Listing sessions are scoped to the creating administrator.
- Start a listing, supply details in conversation or the editable fields, and upload JPG/PNG/WebP photos (5MB each, up to 8 selected images).
- Decimal prices default to USD and are converted to minor units without floating-point rounding. Prices, lead times and print coordinates are never invented by a language model.
- Text extraction uses the existing server-only Ark key/model settings. With no model, explicit labels such as `名称：...；材质：...；颜色：...；尺码：...；售价：26.04 USD；生产周期：5天` continue to work. Missing fields are requested; all fields are editable.
- Images can be edited using Seedream image-to-image in white-background or lighting/clarity modes. Original images are retained. Results are not selected automatically and require a human color/logo/detail approval before use.
- Review, then save a draft or explicitly confirm publication. Publication requires names, category, slug, price, material, colors/options, lead time, description and approved photos. For decorated products, supply real front print dimensions/offsets and confirm them; additional print areas can be added in the existing product editor.
- A saved listing is immutable. Subsequent product edits use the existing product editor.

## Server configuration

Use the existing `ARK_API_KEY`, `ARK_BASE_URL`, `DOUBAO_TEXT_MODEL` and `DOUBAO_IMAGE_MODEL`. Set `AI_PROVIDER=doubao`. `LISTING_IMAGE_DAILY_LIMIT` defaults to 20 attempts per administrator per UTC day. The counter is process-local, resets on restart, and is not a billing-grade quota.

Production also requires `DATABASE_URL` and persistent S3/MinIO storage with a public image URL reachable by the browser and Seedream. No secrets belong in Git or browser configuration. The production compose example passes the Ark settings to the API. For an existing deployment, add those names to its API environment section as necessary; do not replace the live compose file blindly.

The endpoint body limit is 8MB. Configure the reverse proxy to accept at least 8MB and allow at least 150 seconds for image edits. Only the reverse proxy should be public; API, database and object storage control ports should remain private.

## Persistence and compatibility

Sessions use the existing PostgreSQL `entity_snapshots` table with kind `product_listing`. The product aggregate uses kind `admin_product`; no new relational migration is required. Confirmed creation/publication waits for an atomic transaction writing both rows. If the database is unavailable, it does not report success. Local development without a database is intentionally in-memory.

Catalogue, pricing, cart and order lookups now read the same active product store used by the admin. Drafts are excluded, and disabled variants cannot be purchased. Existing storefront caching may delay visibility by up to 60 seconds. Existing development catalogue fallback behavior is unchanged.

This follows the current single-API-process snapshot architecture. Do not run multiple API workers for this feature until database-backed live reads, cross-worker slug uniqueness, locks and quotas are added. Uploaded but unused images are retained for comparison; schedule an object-retention policy before large-volume use. Variant-specific prices and volume tiers remain editable in the existing product editor; the initial listing creates the color-by-size combinations at the confirmed base price.

## Verification and release

1. Build shared packages and run API/admin type checks.
2. Run the API tests, including `product-listing.spec.ts`.
3. Verify desktop/mobile listing, upload, missing-field guidance, saved-session reload, confirmation, catalogue visibility and cart creation.
4. Verify real Ark image editing in staging using a real product photo and check generated text/logo/color accuracy manually. A passing mocked test is not proof of real model availability.
5. Back up production snapshots, identify the currently running source revision and compose configuration, then deploy only the changed API/admin images. Keep the previous images for rollback.

Seedream integration reference: https://docs.volcengine.com/docs/ark/image-generation-api?lang=zh
