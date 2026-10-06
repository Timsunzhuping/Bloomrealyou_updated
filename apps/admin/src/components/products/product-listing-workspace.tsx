'use client';

import { PRINT_METHODS, PRODUCT_CATEGORIES, SUPPORTED_CURRENCIES } from '@custom-merch/shared';
import { Dialog, DialogContent, DialogTitle } from '@custom-merch/ui';
import {
  Check,
  CheckCircle2,
  ImagePlus,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Send,
  Sparkles,
  Star,
  Upload,
  X,
} from 'lucide-react';
import { useLocale } from 'next-intl';
import * as React from 'react';


import { Link } from '@/i18n/navigation';
import { adminFetch } from '@/lib/admin-fetch';
import { getApiBaseUrl } from '@/lib/api-base';

import type { ListingDraft, ProductListingSession } from '@custom-merch/shared';

type HistoryItem = { id: string; name: string; state: string };
const inputClass =
  'w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring';
const buttonClass =
  'inline-flex min-h-9 items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50';

export function ProductListingWorkspace(): JSX.Element {
  const locale = useLocale();
  const zh = locale === 'zh-CN';
  const L = (cn: string, en: string) => (zh ? cn : en);
  const [session, setSession] = React.useState<ProductListingSession | null>(null);
  const [draft, setDraft] = React.useState<ListingDraft | null>(null);
  const [colors, setColors] = React.useState('');
  const [sizes, setSizes] = React.useState('');
  const [history, setHistory] = React.useState<HistoryItem[]>([]);
  const [message, setMessage] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [focusImageId, setFocusImageId] = React.useState<string | null>(null);
  const [mode, setMode] = React.useState<'studio' | 'clean'>('studio');
  const [imageConfirmed, setImageConfirmed] = React.useState(false);
  const [confirmed, setConfirmed] = React.useState(false);
  const [commitStatus, setCommitStatus] = React.useState<'draft' | 'active' | null>(null);
  const fileInput = React.useRef<HTMLInputElement>(null);
  const acting = React.useRef(false);
  const chatEnd = React.useRef<HTMLDivElement>(null);
  const locked = busy || session?.state !== 'collecting';

  async function request<T>(path: string, body?: unknown, method = 'POST'): Promise<T> {
    const res = await adminFetch(getApiBaseUrl(), `/admin/product-listings${path}`, {
      method,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok)
      throw new Error(
        typeof json.message === 'string'
          ? json.message
          : Array.isArray(json.message)
            ? json.message.join('; ')
            : `HTTP ${res.status}`,
      );
    return json as T;
  }

  function apply(s: ProductListingSession) {
    setSession(s);
    setDraft(s.draft);
    setColors(s.draft.colors.join(', '));
    setSizes(s.draft.sizes.join(', '));
    setConfirmed(false);
    setImageConfirmed(false);
    setHistory((items) => [
      { id: s.id, name: s.draft.nameZh || s.draft.nameEn || s.id.slice(0, 8), state: s.state },
      ...items.filter((h) => h.id !== s.id),
    ]);
    window.localStorage.setItem('bloom-listing-session', s.id);
  }

  React.useEffect(() => {
    let cancelled = false;
    void request<HistoryItem[]>('', undefined, 'GET')
      .then(async (items) => {
        if (cancelled) return;
        setHistory(items);
        const previous = window.localStorage.getItem('bloom-listing-session');
        const id =
          items.find((h) => h.id === previous)?.id ??
          items.find((h) => h.state === 'collecting')?.id;
        if (id) {
          const s = await request<ProductListingSession>(`/${id}`, undefined, 'GET');
          if (!cancelled) apply(s);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
    // Locale routes remount the workspace.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    chatEnd.current?.scrollIntoView({ block: 'nearest' });
  }, [session?.messages.length]);

  async function action(fn: () => Promise<void>) {
    if (acting.current) return;
    acting.current = true;
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      acting.current = false;
    }
  }

  async function flush(): Promise<ProductListingSession> {
    if (!session || !draft) throw new Error('No listing selected');
    const split = (value: string) => [
      ...new Set(
        value
          .split(/[,，、/]/)
          .map((v) => v.trim())
          .filter(Boolean),
      ),
    ];
    const patch = { ...draft, colors: split(colors), sizes: split(sizes) };
    if (JSON.stringify(patch) === JSON.stringify(session.draft)) return session;
    const next = await request<ProductListingSession>(
      `/${session.id}`,
      { revision: session.revision, patch },
      'PATCH',
    );
    apply(next);
    return next;
  }

  function field<K extends keyof ListingDraft>(key: K, value: ListingDraft[K]) {
    setDraft((d) =>
      d
        ? {
            ...d,
            [key]: value,
            ...(['widthPx', 'heightPx', 'offsetXPx', 'offsetYPx', 'printMethods'].includes(key)
              ? { printAreaConfirmed: false }
              : {}),
          }
        : d,
    );
    setConfirmed(false);
  }

  async function upload(files: FileList | File[]) {
    const pending = Array.from(files);
    await action(async () => {
      let s = await flush();
      for (const file of pending) {
        if (
          !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
          file.size > 5 * 1024 * 1024
        )
          throw new Error(
            L('仅支持 5MB 以内的 JPG、PNG、WebP 图片。', 'Use JPG, PNG or WebP images up to 5MB.'),
          );
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error('Image read failed'));
          reader.readAsDataURL(file);
        });
        s = await request<ProductListingSession>(`/${s.id}/images`, {
          revision: s.revision,
          name: file.name,
          dataUrl,
        });
        apply(s);
        setFocusImageId(s.images[s.images.length - 1]!.id);
      }
    });
  }

  const focus =
    session?.images.find((im) => im.id === focusImageId) ??
    session?.images.find((im) => im.id === session.mainImageId) ??
    session?.images[0];
  const original = focus?.originalId
    ? session?.images.find((im) => im.id === focus.originalId)
    : focus;
  const candidate = focus?.originalId
    ? focus
    : session?.images.filter((im) => im.originalId === original?.id).at(-1);
  const categoryNames: Record<string, string> = {
    't-shirts': 'T恤',
    hoodies: '卫衣',
    mugs: '马克杯',
    hats: '帽子',
    'tote-bags': '帆布袋',
    stickers: '贴纸',
  };
  const methodNames: Record<string, string> = {
    dtg: '数码直喷',
    screen_printing: '丝网印刷',
    embroidery: '刺绣',
    heat_transfer: '热转印',
    uv_printing: 'UV印刷',
    sublimation: '热升华',
  };

  async function chooseImage(imageId: string, makeMain = false, approve = false) {
    await action(async () => {
      const s = await flush();
      const ids = s.selectedImageIds.includes(imageId)
        ? makeMain || approve
          ? s.selectedImageIds
          : s.selectedImageIds.filter((id) => id !== imageId)
        : [...s.selectedImageIds, imageId];
      const mainImageId = makeMain
        ? imageId
        : ids.includes(s.mainImageId ?? '')
          ? s.mainImageId
          : (ids[0] ?? null);
      apply(
        await request<ProductListingSession>(`/${s.id}/image-selection`, {
          revision: s.revision,
          selectedImageIds: ids,
          mainImageId,
          ...(approve ? { approveImageId: imageId } : {}),
        }),
      );
    });
  }

  return (
    <section className="min-w-0 space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <Sparkles className="h-5 w-5 text-orange-600" />
          {L('AI 自动上品', 'AI Product Listing')}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          {session && (
            <button
              className={`${buttonClass} w-9 p-0`}
              disabled={busy}
              title={L('重新载入已保存资料', 'Reload Saved Details')}
              aria-label={L('重新载入已保存资料', 'Reload Saved Details')}
              onClick={() =>
                void action(async () => {
                  if (
                    window.confirm(
                      L(
                        '重新载入将放弃尚未保存的修改，继续吗？',
                        'Discard unsaved edits and reload?',
                      ),
                    )
                  )
                    apply(await request<ProductListingSession>(`/${session.id}`, undefined, 'GET'));
                })
              }
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          )}
          <select
            aria-label={L('上品记录', 'Listing history')}
            className={`${inputClass} max-w-52`}
            value={session?.id ?? ''}
            disabled={busy}
            onChange={(e) => {
              const id = e.target.value;
              if (id)
                void action(async () => {
                  if (session?.state === 'collecting') await flush();
                  apply(await request<ProductListingSession>(`/${id}`, undefined, 'GET'));
                  setFocusImageId(null);
                });
            }}
          >
            <option value="">{L('上品记录', 'Listing history')}</option>
            {history.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
          <button
            className={buttonClass}
            disabled={busy}
            onClick={() =>
              void action(async () => {
                if (session?.state === 'collecting') await flush();
                apply(await request<ProductListingSession>('', { locale }));
                setFocusImageId(null);
              })
            }
          >
            <Plus className="h-4 w-4" />
            {L('新建商品', 'New Product')}
          </button>
        </div>
      </header>
      {error && (
        <div
          role="alert"
          className="flex items-start justify-between gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          <span className="break-words">{error}</span>
          <button aria-label={L('关闭', 'Dismiss')} onClick={() => setError('')}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {!session ? (
        <div className="flex min-h-80 flex-col items-center justify-center gap-5 border-b">
          <ImagePlus className="h-10 w-10 text-muted-foreground" />
          <button
            className={`${buttonClass} bg-foreground text-background`}
            disabled={busy}
            onClick={() =>
              void action(async () => apply(await request<ProductListingSession>('', { locale })))
            }
          >
            <Plus className="h-4 w-4" />
            {L('开始上品', 'Start Listing')}
          </button>
        </div>
      ) : (
        <>
          <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
            <div className="min-w-0 space-y-5">
              <section className="border-b pb-5">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-base font-semibold">
                    {L('上品对话', 'Listing Conversation')}
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    {session.source !== 'guided'
                      ? L('模型辅助', 'Model-assisted')
                      : L('引导模式', 'Guided Mode')}
                  </span>
                </div>
                <div
                  aria-live="polite"
                  className="max-h-80 min-h-44 space-y-4 overflow-y-auto pr-2"
                >
                  {session.messages.map((m, index) => (
                    <div
                      key={index}
                      className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
                    >
                      <span
                        className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs ${m.role === 'assistant' ? 'bg-orange-100 text-orange-700' : 'bg-muted'}`}
                      >
                        {m.role === 'assistant' ? <Sparkles className="h-4 w-4" /> : L('我', 'Me')}
                      </span>
                      <p
                        className={`min-w-0 whitespace-pre-wrap break-words rounded-md px-3 py-2 text-sm leading-6 ${m.role === 'user' ? 'bg-muted' : ''}`}
                      >
                        {m.text}
                      </p>
                    </div>
                  ))}
                  <div ref={chatEnd} />
                </div>
                <form
                  className="mt-4 flex items-end gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!message.trim()) return;
                    void action(async () => {
                      const s = await flush();
                      apply(
                        await request<ProductListingSession>(`/${s.id}/messages`, {
                          revision: s.revision,
                          message,
                        }),
                      );
                      setMessage('');
                    });
                  }}
                >
                  <textarea
                    aria-label={L('商品资料', 'Product details')}
                    className={`${inputClass} min-h-24 resize-y`}
                    maxLength={3000}
                    disabled={locked}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={L(
                      '名称：经典棉质T恤；材质：100%棉；颜色：白色；尺码：M, L；售价：26.04 USD；生产周期：5天',
                      'Name: Classic Cotton T-Shirt; material: 100% cotton; colors: White; sizes: M, L; price: 26.04 USD; lead time: 5 days',
                    )}
                  />
                  <button
                    title={L('发送', 'Send')}
                    aria-label={L('发送', 'Send')}
                    type="submit"
                    className={`${buttonClass} h-10 w-10 shrink-0 bg-foreground p-0 text-background`}
                    disabled={locked || !message.trim()}
                  >
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </form>
              </section>
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold">{L('商品图片', 'Product Images')}</h2>
                  <span className="text-xs text-muted-foreground">
                    {session.selectedImageIds.length}/8
                  </span>
                </div>
                <input
                  ref={fileInput}
                  hidden
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={(e) => {
                    if (e.target.files?.length) void upload(e.target.files);
                    e.target.value = '';
                  }}
                />
                <button
                  className={`${buttonClass} w-full border-dashed py-5`}
                  disabled={locked}
                  onClick={() => fileInput.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (!locked && e.dataTransfer.files.length) void upload(e.dataTransfer.files);
                  }}
                >
                  <Upload className="h-4 w-4" />
                  {L('上传商品图片', 'Upload Product Photos')}
                </button>
                {original && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { image: original, label: L('原图', 'Original') },
                        { image: candidate, label: L('优化图', 'Enhanced') },
                      ].map(({ image, label }) => (
                        <figure key={label} className="min-w-0">
                          <div className="flex aspect-square items-center justify-center overflow-hidden rounded-md border bg-white">
                            {image ? (
                              <img
                                src={image.url}
                                alt={label}
                                className="h-full w-full object-contain"
                              />
                            ) : (
                              <ImagePlus className="h-8 w-8 text-gray-300" />
                            )}
                          </div>
                          <figcaption className="mt-2 text-center text-xs text-muted-foreground">
                            {label}
                          </figcaption>
                        </figure>
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex rounded-md border p-1">
                        {(['studio', 'clean'] as const).map((m) => (
                          <button
                            type="button"
                            aria-pressed={mode === m}
                            key={m}
                            className={`rounded px-3 py-1.5 text-sm ${mode === m ? 'bg-muted font-medium' : ''}`}
                            disabled={locked}
                            onClick={() => setMode(m)}
                          >
                            {m === 'studio'
                              ? L('白底主图', 'White Background')
                              : L('光线与清晰度', 'Light & Clarity')}
                          </button>
                        ))}
                      </div>
                      <button
                        className={buttonClass}
                        disabled={locked}
                        onClick={() =>
                          void action(async () => {
                            const s = await flush();
                            const next = await request<ProductListingSession>(`/${s.id}/enhance`, {
                              revision: s.revision,
                              imageId: original.id,
                              mode,
                            });
                            apply(next);
                            setFocusImageId(next.images[next.images.length - 1]!.id);
                          })
                        }
                      >
                        <Sparkles className="h-4 w-4" />
                        {L('优化图片', 'Enhance Image')}
                      </button>
                    </div>
                    {candidate && !candidate.approved && (
                      <div className="space-y-3 border-l-2 border-orange-500 pl-3">
                        <label className="flex items-start gap-2 text-sm">
                          <input
                            type="checkbox"
                            className="mt-1"
                            disabled={locked}
                            checked={imageConfirmed}
                            onChange={(e) => setImageConfirmed(e.target.checked)}
                          />
                          {L(
                            '已核对优化图，商品颜色、Logo 和细节与实物一致',
                            'I verified that the enhanced image matches the real product color, logo and details',
                          )}
                        </label>
                        <button
                          className={buttonClass}
                          disabled={locked || !imageConfirmed}
                          onClick={() => void chooseImage(candidate.id, true, true)}
                        >
                          <Check className="h-4 w-4" />
                          {L('确认并设为主图', 'Approve & Set as Main')}
                        </button>
                      </div>
                    )}
                  </>
                )}
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                  {session.images.map((im) => (
                    <div key={im.id} className="min-w-0">
                      <button
                        className={`relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-md border bg-white ${focus?.id === im.id ? 'ring-2 ring-orange-500' : ''}`}
                        aria-label={`${L('查看', 'View')} ${im.name}`}
                        onClick={() => {
                          setFocusImageId(im.id);
                          setImageConfirmed(false);
                        }}
                      >
                        <img src={im.url} alt={im.name} className="h-full w-full object-contain" />
                        {session.mainImageId === im.id && (
                          <Star className="absolute right-1 top-1 h-4 w-4 fill-orange-500 text-orange-500" />
                        )}
                      </button>
                      <div className="mt-2 flex items-center justify-between gap-1">
                        <label className="flex min-w-0 items-center gap-1 text-xs">
                          <input
                            type="checkbox"
                            disabled={locked || !im.approved}
                            checked={session.selectedImageIds.includes(im.id)}
                            onChange={() => void chooseImage(im.id)}
                          />
                          {im.originalId ? L('优化', 'Enhanced') : L('原图', 'Original')}
                        </label>
                        <button
                          disabled={locked || !im.approved}
                          title={L('设为主图', 'Set as Main')}
                          aria-label={L('设为主图', 'Set as Main')}
                          onClick={() => void chooseImage(im.id, true)}
                        >
                          <Star className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
            <div className="min-w-0 space-y-5 xl:border-l xl:pl-6">
              <section className="space-y-4">
                <h2 className="text-base font-semibold">{L('商品资料', 'Product Details')}</h2>
                {draft && (
                  <fieldset disabled={locked} className="grid min-w-0 grid-cols-2 gap-3">
                    {(
                      [
                        ['nameZh', L('中文名称', 'Chinese Name')],
                        ['nameEn', L('英文名称', 'English Name')],
                        ['slug', L('链接标识', 'Slug')],
                        ['material', L('材质', 'Material')],
                      ] as const
                    ).map(([key, label]) => (
                      <label key={key} className="min-w-0 space-y-1 text-sm">
                        <span>{label}</span>
                        <input
                          className={inputClass}
                          value={draft[key]}
                          maxLength={200}
                          onChange={(e) => field(key, e.target.value)}
                        />
                      </label>
                    ))}
                    <label className="space-y-1 text-sm">
                      <span>{L('分类', 'Category')}</span>
                      <select
                        className={inputClass}
                        value={draft.category}
                        onChange={(e) =>
                          field('category', e.target.value as ListingDraft['category'])
                        }
                      >
                        <option value="">{L('待选择', 'Select')}</option>
                        {PRODUCT_CATEGORIES.map((c) => (
                          <option value={c} key={c}>
                            {zh ? categoryNames[c] : c}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-1 text-sm">
                      <span>{L('生产周期（天）', 'Lead Time (Days)')}</span>
                      <input
                        className={inputClass}
                        type="number"
                        min={0}
                        max={365}
                        value={draft.productionLeadDays ?? ''}
                        onChange={(e) =>
                          field(
                            'productionLeadDays',
                            e.target.value === '' ? null : Number(e.target.value),
                          )
                        }
                      />
                    </label>
                    <label className="space-y-1 text-sm">
                      <span>{L('售价', 'Price')}</span>
                      <input
                        className={inputClass}
                        inputMode="decimal"
                        value={draft.price}
                        onChange={(e) => field('price', e.target.value)}
                      />
                    </label>
                    <label className="space-y-1 text-sm">
                      <span>{L('币种', 'Currency')}</span>
                      <select
                        className={inputClass}
                        value={draft.currency}
                        onChange={(e) =>
                          field('currency', e.target.value as ListingDraft['currency'])
                        }
                      >
                        {SUPPORTED_CURRENCIES.map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-1 text-sm">
                      <span>{L('颜色', 'Colors')}</span>
                      <input
                        className={inputClass}
                        value={colors}
                        onChange={(e) => {
                          setColors(e.target.value);
                          setConfirmed(false);
                        }}
                      />
                    </label>
                    <label className="space-y-1 text-sm">
                      <span>{L('尺码 / 规格', 'Sizes / Options')}</span>
                      <input
                        className={inputClass}
                        value={sizes}
                        onChange={(e) => {
                          setSizes(e.target.value);
                          setConfirmed(false);
                        }}
                      />
                    </label>
                    {(
                      [
                        ['descriptionZh', L('中文描述', 'Chinese Description')],
                        ['descriptionEn', L('英文描述', 'English Description')],
                      ] as const
                    ).map(([key, label]) => (
                      <label key={key} className="col-span-2 space-y-1 text-sm">
                        <span>{label}</span>
                        <textarea
                          className={`${inputClass} min-h-20`}
                          maxLength={500}
                          value={draft[key]}
                          onChange={(e) => field(key, e.target.value)}
                        />
                      </label>
                    ))}
                    <div className="col-span-2 space-y-2 border-t pt-3">
                      <span className="text-sm">{L('印花工艺', 'Print Methods')}</span>
                      <div className="grid grid-cols-2 gap-2">
                        {PRINT_METHODS.map((m) => (
                          <label key={m} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={draft.printMethods.includes(m)}
                              onChange={(e) =>
                                field(
                                  'printMethods',
                                  e.target.checked
                                    ? [...draft.printMethods, m]
                                    : draft.printMethods.filter((v) => v !== m),
                                )
                              }
                            />
                            {zh ? methodNames[m] : m.replaceAll('_', ' ')}
                          </label>
                        ))}
                      </div>
                    </div>
                    {!!draft.printMethods.length && (
                      <>
                        <h3 className="col-span-2 pt-2 text-sm font-medium">
                          {L('正面印花区域', 'Front Print Area')}
                        </h3>
                        {(
                          [
                            ['widthPx', L('宽度（px）', 'Width (px)')],
                            ['heightPx', L('高度（px）', 'Height (px)')],
                            ['offsetXPx', L('X偏移（px）', 'X Offset (px)')],
                            ['offsetYPx', L('Y偏移（px）', 'Y Offset (px)')],
                          ] as const
                        ).map(([key, label]) => (
                          <label className="space-y-1 text-sm" key={key}>
                            <span>{label}</span>
                            <input
                              className={inputClass}
                              type="number"
                              min={key.startsWith('offset') ? 0 : 1}
                              max={20000}
                              value={draft[key] ?? ''}
                              onChange={(e) =>
                                field(key, e.target.value === '' ? null : Number(e.target.value))
                              }
                            />
                          </label>
                        ))}
                        <label className="col-span-2 flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={draft.printAreaConfirmed}
                            onChange={(e) => field('printAreaConfirmed', e.target.checked)}
                          />
                          {L(
                            '已核对真实印花区域与样机坐标',
                            'Print area and mockup coordinates verified',
                          )}
                        </label>
                      </>
                    )}
                  </fieldset>
                )}
                <button
                  className={buttonClass}
                  disabled={locked}
                  onClick={() =>
                    void action(async () => {
                      const s = await flush();
                      apply(s);
                    })
                  }
                >
                  <Save className="h-4 w-4" />
                  {L('保存资料', 'Save Details')}
                </button>
              </section>
              {session.state !== 'collecting' && (
                <section role="status" className="border-t pt-4">
                  <p className="flex items-center gap-2 font-medium text-green-700">
                    <CheckCircle2 className="h-5 w-5" />
                    {session.state === 'published'
                      ? L('已上架', 'Published')
                      : L('草稿已入库', 'Draft Saved')}
                  </p>
                  <Link
                    className="mt-2 inline-block text-sm underline"
                    href={`/products/${session.productId}`}
                  >
                    {L('查看商品', 'View Product')}
                  </Link>
                </section>
              )}
            </div>
          </div>
          {session.state === 'collecting' && (
            <footer className="flex flex-wrap items-center justify-between gap-3 border-t bg-background py-4">
              <label className="flex max-w-full items-start gap-2 text-sm">
                <input
                  className="mt-1"
                  type="checkbox"
                  checked={confirmed}
                  disabled={busy}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
                {L(
                  '已核对价格、规格、生产参数和图片',
                  'Price, variants, production details and photos verified',
                )}
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  className={buttonClass}
                  disabled={busy || !confirmed}
                  onClick={() => setCommitStatus('draft')}
                >
                  <Save className="h-4 w-4" />
                  {L('入库为草稿', 'Save as Draft')}
                </button>
                <button
                  className={`${buttonClass} bg-foreground text-background`}
                  disabled={busy || !confirmed}
                  onClick={() => setCommitStatus('active')}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {L('确认上架', 'Publish Product')}
                </button>
              </div>
            </footer>
          )}
        </>
      )}
      {commitStatus && session && draft && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open && !busy) setCommitStatus(null);
          }}
        >
          <DialogContent
            closeLabel={L('关闭', 'Close')}
            aria-describedby={undefined}
            onEscapeKeyDown={(e) => {
              if (busy) e.preventDefault();
            }}
            onPointerDownOutside={(e) => {
              if (busy) e.preventDefault();
            }}
            className="max-w-[calc(100%-2rem)] space-y-3 rounded-lg sm:max-w-md"
          >
            <DialogTitle className="pr-6 text-lg font-semibold tracking-normal">
              {commitStatus === 'active'
                ? L('确认上架商品', 'Confirm Publication')
                : L('确认保存商品草稿', 'Confirm Draft')}
            </DialogTitle>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <dt>{L('商品', 'Product')}</dt>
              <dd className="break-words">{draft.nameZh || draft.nameEn || '—'}</dd>
              <dt>{L('售价', 'Price')}</dt>
              <dd>
                {draft.price || '—'} {draft.currency}
              </dd>
              <dt>{L('规格数量', 'Variants')}</dt>
              <dd>
                {Math.max(1, colors.split(/[,，、/]/).filter((v) => v.trim()).length) *
                  Math.max(1, sizes.split(/[,，、/]/).filter((v) => v.trim()).length)}
              </dd>
              <dt>{L('图片数量', 'Images')}</dt>
              <dd>{session.selectedImageIds.length}</dd>
            </dl>
            <div className="flex justify-end gap-2">
              <button className={buttonClass} disabled={busy} onClick={() => setCommitStatus(null)}>
                {L('取消', 'Cancel')}
              </button>
              <button
                className={`${buttonClass} bg-foreground text-background`}
                disabled={busy}
                onClick={() =>
                  void action(async () => {
                    const status = commitStatus;
                    const s = await flush();
                    apply(
                      await request<ProductListingSession>(`/${s.id}/commit`, {
                        revision: s.revision,
                        status,
                        confirmed: true,
                      }),
                    );
                    setCommitStatus(null);
                  })
                }
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                {L('确认', 'Confirm')}
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </section>
  );
}
