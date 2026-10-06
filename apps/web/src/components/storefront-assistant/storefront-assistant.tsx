'use client';

import { formatCurrency } from '@custom-merch/i18n';
import { ApiError } from '@custom-merch/sdk';
import { Button } from '@custom-merch/ui';
import {
  ArrowRight,
  Headset,
  ImageOff,
  Loader2,
  Paintbrush,
  RotateCcw,
  Send,
  ShoppingBag,
  X,
} from 'lucide-react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

import { Link, usePathname } from '@/i18n/navigation';
import { getClientApi } from '@/lib/client-api';

import { assistantCopy } from './copy';

import type {
  CartDto,
  Locale,
  StorefrontAssistantMode,
  StorefrontAssistantResponse,
  StorefrontAssistantAction,
  StorefrontAssistantProduct,
} from '@custom-merch/shared';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  response?: StorefrontAssistantResponse;
}
interface OpenEvent {
  productSlug?: string;
  mode?: StorefrontAssistantMode;
  draft?: string;
}
const welcomeKey = 'bloom:assistant:welcomed';
let messageSequence = 0;
function messageId() {
  return `bloom-${Date.now()}-${++messageSequence}`;
}
function historyKey(locale: string) {
  return `bloom:assistant:history:${locale}:${getClientApi().getCartSessionId() ?? 'visitor'}`;
}
const iconClass = 'h-9 w-9 shrink-0 p-0';

export function StorefrontAssistant() {
  const locale = useLocale() as Locale,
    t = assistantCopy[locale] ?? assistantCopy.en;
  const path = usePathname();
  const [mounted, setMounted] = useState(false),
    [open, setOpen] = useState(false);
  const [mode, setMode] = useState<StorefrontAssistantMode>('shop');
  const [messages, setMessages] = useState<Message[]>([]),
    [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false),
    [pending, setPending] = useState('');
  const [error, setError] = useState<'network' | 'limit' | null>(null);
  const [contextSlug, setContextSlug] = useState<string | undefined>();
  const input = useRef<HTMLTextAreaElement>(null),
    launcher = useRef<HTMLButtonElement>(null),
    scroll = useRef<HTMLDivElement>(null);
  const lock = useRef(false),
    abort = useRef<AbortController | null>(null);
  const quiet = path.startsWith('/checkout') || path.startsWith('/customize');
  const productSlug = /^\/(?:products|customize)\/([^/?]+)/.exec(path)?.[1] ?? contextSlug;
  const dismiss = () => {
    setOpen(false);
    requestAnimationFrame(() => launcher.current?.focus({ preventScroll: true }));
  };
  const cancelRequest = () => {
    abort.current?.abort();
    abort.current = null;
    lock.current = false;
    setBusy(false);
    setPending('');
  };
  const reveal = (focus = false) => {
    setOpen(true);
    if (focus) requestAnimationFrame(() => input.current?.focus({ preventScroll: true }));
  };
  useEffect(() => {
    cancelRequest();
    setDraft('');
    setError(null);
    setMessages([]);
    setMounted(true);
    try {
      const saved = JSON.parse(sessionStorage.getItem(historyKey(locale)) ?? '[]') as unknown;
      if (Array.isArray(saved))
        setMessages(
          saved
            .filter(
              (m) =>
                m &&
                (m.role === 'user' || m.role === 'assistant') &&
                typeof m.content === 'string' &&
                m.content.length <= 2400,
            )
            .slice(-20)
            .map((m) => ({ id: messageId(), role: m.role, content: m.content })),
        );
      if (!sessionStorage.getItem(welcomeKey) && !quiet) {
        sessionStorage.setItem(welcomeKey, '1');
        setOpen(true);
      }
    } catch {
      if (!quiet) setOpen(true);
    }
    return () => {
      abort.current?.abort();
      abort.current = null;
      lock.current = false;
    };
    // Locale changes load their own transcript; page navigation keeps the current conversation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);
  useEffect(() => {
    if (!mounted) return;
    try {
      sessionStorage.setItem(
        historyKey(locale),
        JSON.stringify(messages.slice(-20).map(({ role, content }) => ({ role, content }))),
      );
    } catch {
      /* Storage is optional. */
    }
  }, [messages, locale, mounted]);
  useEffect(() => {
    if (quiet) setOpen(false);
    setContextSlug(undefined);
  }, [path, quiet]);
  useEffect(() => {
    if (scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight;
  }, [messages, pending, busy, open]);
  useEffect(() => {
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<OpenEvent>).detail ?? {};
      if (detail.productSlug && /^[a-zA-Z0-9_-]{1,120}$/.test(detail.productSlug))
        setContextSlug(detail.productSlug);
      if (detail.mode && ['shop', 'design', 'support'].includes(detail.mode)) setMode(detail.mode);
      if (typeof detail.draft === 'string') setDraft(detail.draft.slice(0, 1800));
      reveal(true);
    };
    const signedIn = () => {
      cancelRequest();
      setMessages([]);
      setDraft('');
      setError(null);
      reveal();
    };
    window.addEventListener('bloom:assistant-open', onOpen);
    window.addEventListener('bloom:customer-signed-in', signedIn);
    return () => {
      window.removeEventListener('bloom:assistant-open', onOpen);
      window.removeEventListener('bloom:customer-signed-in', signedIn);
    };
  }, []);

  async function send(value = draft) {
    const text = value.trim();
    if (!text || text.length > 1800 || lock.current) return;
    lock.current = true;
    setBusy(true);
    setPending(text);
    setDraft('');
    setError(null);
    const controller = new AbortController();
    abort.current = controller;
    const timer = window.setTimeout(() => controller.abort(), 60000);
    try {
      const api = getClientApi();
      if (!api.getCartSessionId())
        await api.request<CartDto>('/cart', { method: 'GET', signal: controller.signal });
      const result = await api.storefrontAssistant.chat(
        {
          message: text,
          locale,
          mode,
          ...(productSlug ? { productSlug } : {}),
          history: messages.slice(-12).map(({ role, content }) => ({ role, content })),
        },
        controller.signal,
      );
      if (!controller.signal.aborted && abort.current === controller)
        setMessages((previous) =>
          [
            ...previous,
            { id: messageId(), role: 'user' as const, content: text },
            {
              id: messageId(),
              role: 'assistant' as const,
              content: result.reply,
              response: result,
            },
          ].slice(-20),
        );
    } catch (e) {
      if (abort.current === controller) {
        setDraft(text);
        setError(e instanceof ApiError && e.status === 429 ? 'limit' : 'network');
      }
    } finally {
      window.clearTimeout(timer);
      if (abort.current === controller) {
        setBusy(false);
        setPending('');
        lock.current = false;
        abort.current = null;
      }
    }
  }
  function actionHref(action: StorefrontAssistantAction, response: StorefrontAssistantResponse) {
    if (action === 'design')
      return response.products[0]
        ? `/customize/${encodeURIComponent(response.products[0].slug)}`
        : '/products';
    return {
      products: '/products',
      cart: '/cart',
      checkout: '/checkout',
      orders: '/account/orders',
      contact: '/rfq',
    }[action];
  }
  if (!mounted) return null;
  return (
    <aside
      className={`fixed end-3 z-40 sm:end-6 ${quiet ? 'bottom-24' : 'bottom-3 sm:bottom-6'}`}
      aria-label={t.subtitle}
    >
      {!open && (
        <button
          ref={launcher}
          type="button"
          title={t.launcher}
          aria-label={t.launcher}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls="bloom-assistant-panel"
          onClick={() => reveal(true)}
          className="group flex items-center gap-2 rounded-full border border-orange-200 bg-white p-1.5 text-slate-950 shadow-lg transition-transform hover:-translate-y-1 motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
        >
          <Image
            src="/bloom-assistant.png"
            alt=""
            width={64}
            height={64}
            className="h-16 w-16 object-contain"
          />
          <span className="hidden pe-3 text-sm font-semibold sm:block">{t.launcher}</span>
        </button>
      )}
      {open && (
        <section
          id="bloom-assistant-panel"
          role="dialog"
          aria-modal="false"
          aria-labelledby="bloom-assistant-title"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation();
              dismiss();
            }
          }}
          className="flex h-[min(680px,calc(100dvh-96px))] w-[min(410px,calc(100vw-24px))] max-w-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white text-slate-950 shadow-2xl [letter-spacing:0]"
        >
          <header className="flex min-h-[86px] shrink-0 items-center gap-3 border-b border-gray-200 px-4 py-3">
            <Image
              src="/bloom-assistant.png"
              alt=""
              width={60}
              height={60}
              className="h-14 w-14 shrink-0 object-contain"
            />
            <div className="min-w-0 flex-1">
              <h2 id="bloom-assistant-title" className="text-lg font-semibold">
                {t.title}
              </h2>
              <p className="text-xs leading-5 text-gray-600">{t.subtitle}</p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className={iconClass}
              title={t.reset}
              aria-label={t.reset}
              disabled={busy}
              onClick={() => {
                if (window.confirm(t.resetConfirm)) {
                  setMessages([]);
                  setDraft('');
                  setError(null);
                }
              }}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className={iconClass}
              title={t.close}
              aria-label={t.close}
              onClick={dismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </header>
          <div
            className="grid shrink-0 grid-cols-3 gap-1 border-b border-gray-200 bg-gray-50 px-3 py-2"
            aria-label={t.subtitle}
          >
            {(['shop', 'design', 'support'] as const).map((value, index) => {
              const Icon = [ShoppingBag, Paintbrush, Headset][index]!;
              return (
                <button
                  type="button"
                  key={value}
                  aria-pressed={mode === value}
                  disabled={busy}
                  onClick={() => {
                    setMode(value);
                    setError(null);
                  }}
                  className={`flex min-h-10 items-center justify-center gap-1 rounded-md px-1 text-xs font-medium transition-colors ${mode === value ? 'bg-white text-orange-700 shadow-sm ring-1 ring-gray-200' : 'text-gray-600 hover:bg-white'}`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{t.modes[value]}</span>
                </button>
              );
            })}
          </div>
          {productSlug && (
            <div className="flex shrink-0 items-center gap-2 border-b px-4 py-2 text-xs text-gray-600">
              <ShoppingBag className="h-3.5 w-3.5 shrink-0" />
              <span className="shrink-0">{t.context}</span>
              <span className="truncate">{productSlug}</span>
            </div>
          )}
          <div
            ref={scroll}
            role="log"
            aria-label={t.title}
            aria-live="polite"
            aria-relevant="additions"
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4"
          >
            <div className="mb-4 flex items-start gap-2">
              <Image
                src="/bloom-assistant.png"
                alt=""
                width={28}
                height={28}
                className="mt-1 h-7 w-7 shrink-0 object-contain"
              />
              <p className="min-w-0 rounded-lg bg-gray-100 px-3 py-2.5 text-sm leading-6">
                {t.welcome}
              </p>
            </div>
            {messages.length === 0 && (
              <div className="mb-4 ms-9 flex flex-col items-start gap-2">
                {t.prompts[mode].map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    disabled={busy}
                    onClick={() => void send(prompt)}
                    className="flex max-w-full items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-start text-xs text-gray-700 hover:border-orange-300 hover:bg-orange-50"
                  >
                    <span className="min-w-0 break-words">{prompt}</span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 rtl:rotate-180" />
                  </button>
                ))}
              </div>
            )}
            {messages.map((message) => (
              <div key={message.id} className="mb-4">
                <div
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <p
                    className={`max-w-[92%] whitespace-pre-wrap break-words rounded-lg px-3 py-2.5 text-sm leading-6 ${message.role === 'user' ? 'bg-orange-50 text-gray-900' : 'bg-gray-100 text-gray-900'}`}
                  >
                    {message.content}
                  </p>
                </div>
                {message.response?.source === 'fallback' && (
                  <p className="mt-1 text-[11px] text-gray-500">{t.fallback}</p>
                )}
                {message.response?.products.map((product) => (
                  <ProductResult
                    key={product.id}
                    product={product}
                    locale={locale}
                    onNavigate={() => setOpen(false)}
                  />
                ))}
                {message.response?.orders.map((order) => (
                  <Link
                    key={order.orderNumber}
                    href={`/account/orders/${encodeURIComponent(order.orderNumber)}`}
                    onClick={() => setOpen(false)}
                    className="mt-2 flex items-center justify-between gap-2 rounded-md border border-gray-200 p-3 text-xs hover:border-orange-300"
                  >
                    <span className="min-w-0">
                      <span className="block break-all font-medium">{order.orderNumber}</span>
                      <span className="mt-1 block text-gray-600">
                        {t.statuses[order.status] ?? order.status}
                      </span>
                    </span>
                    <span className="shrink-0">{formatCurrency(order.total, locale)}</span>
                  </Link>
                ))}
                {message.response && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {message.response.actions.map((action) => (
                      <Link
                        key={action}
                        href={actionHref(action, message.response!)}
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-2 text-xs font-medium hover:border-orange-300 hover:bg-orange-50"
                      >
                        <span>{t.actions[action]}</span>
                        <ArrowRight className="h-3 w-3 shrink-0 rtl:rotate-180" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {pending && (
              <p className="mb-3 ms-auto max-w-[92%] whitespace-pre-wrap break-words rounded-lg bg-orange-50 px-3 py-2.5 text-sm leading-6">
                {pending}
              </p>
            )}
            {busy && (
              <p role="status" className="flex items-center gap-2 text-xs text-gray-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t.thinking}
              </p>
            )}
          </div>
          {error && (
            <div
              role="alert"
              className="shrink-0 border-t border-red-100 bg-red-50 px-4 py-2 text-xs leading-5 text-red-800"
            >
              <p>{error === 'limit' ? t.rateError : t.error}</p>
              <button
                type="button"
                onClick={() => void send()}
                disabled={busy || !draft.trim()}
                className="mt-1 flex items-center gap-1 font-semibold underline"
              >
                <RotateCcw className="h-3 w-3" />
                {t.retry}
              </button>
            </div>
          )}
          <form
            className="shrink-0 border-t border-gray-200 px-3 pb-3 pt-2"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <div className="flex items-end gap-2 rounded-md border border-gray-300 bg-white p-2 focus-within:border-orange-500 focus-within:ring-1 focus-within:ring-orange-500">
              <textarea
                ref={input}
                rows={2}
                maxLength={1800}
                value={draft}
                aria-label={t.placeholder}
                placeholder={t.placeholder}
                disabled={busy}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    void send();
                  }
                }}
                className="min-w-0 flex-1 resize-none bg-transparent text-sm leading-5 outline-none placeholder:text-gray-400 disabled:opacity-60"
              />
              <Button
                type="submit"
                size="sm"
                disabled={busy || !draft.trim()}
                title={t.send}
                aria-label={t.send}
                className={`${iconClass} bg-orange-600 text-white hover:bg-orange-700`}
              >
                <Send className="h-4 w-4 rtl:rotate-180" />
              </Button>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-500">
              <span>{t.privacy}</span>
              <Link
                href="/rfq"
                onClick={() => setOpen(false)}
                className="flex items-center gap-1 text-gray-700 hover:text-orange-700"
              >
                <Headset className="h-3.5 w-3.5" />
                {t.contact}
              </Link>
            </div>
            <p className="mt-1 text-[10px] leading-4 text-gray-500">
              {t.disclaimer} {t.dataWarning}
            </p>
          </form>
        </section>
      )}
    </aside>
  );
}

function ProductResult({
  product,
  locale,
  onNavigate,
}: {
  product: StorefrontAssistantProduct;
  locale: Locale;
  onNavigate: () => void;
}) {
  const t = assistantCopy[locale];
  const productText = useTranslations('products');
  const [failed, setFailed] = useState(false);
  return (
    <article className="mt-3 overflow-hidden rounded-lg border border-gray-200 bg-white p-3">
      <div className="flex items-start gap-3">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-gray-100">
          {product.imageUrl && !failed ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              width={64}
              height={64}
              unoptimized
              onError={() => setFailed(true)}
              className="h-full w-full object-contain"
            />
          ) : (
            <ImageOff className="h-6 w-6 text-gray-400" aria-label={t.noImage} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="break-words text-sm font-semibold leading-5">{product.name}</h3>
          <p className="mt-1 text-xs text-gray-700">
            {t.from} <strong>{formatCurrency(product.basePrice, locale)}</strong>
          </p>
          <p className="mt-1 text-[11px] text-gray-500">
            {t.days}: {product.productionLeadDays}
          </p>
        </div>
      </div>
      <p className="mt-2 line-clamp-3 break-words text-xs leading-5 text-gray-600">
        {product.description}
      </p>
      <dl className="mt-2 space-y-1 text-[11px] leading-4 text-gray-600">
        <div>
          <dt className="inline font-medium">{t.print}: </dt>
          <dd className="inline break-words">
            {product.printMethods
              .map((method) => productText(`printMethods.${method}`))
              .join(' / ')}
          </dd>
        </div>
        {product.colors.length > 0 && (
          <div>
            <dt className="inline font-medium">{t.colors}: </dt>
            <dd className="inline break-words">{product.colors.join(' / ')}</dd>
          </div>
        )}
        {product.sizes.length > 0 && (
          <div>
            <dt className="inline font-medium">{t.sizes}: </dt>
            <dd className="inline break-words">{product.sizes.join(' / ')}</dd>
          </div>
        )}
      </dl>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Link
          href={`/products/${encodeURIComponent(product.slug)}`}
          onClick={onNavigate}
          className="flex min-h-9 items-center justify-center gap-1 rounded-md border px-1 text-xs hover:bg-gray-50"
        >
          {t.details}
          <ArrowRight className="h-3 w-3 rtl:rotate-180" />
        </Link>
        <Link
          href={`/customize/${encodeURIComponent(product.slug)}`}
          onClick={onNavigate}
          className="flex min-h-9 items-center justify-center gap-1 rounded-md bg-orange-600 px-1 text-xs font-medium text-white hover:bg-orange-700"
        >
          <Paintbrush className="h-3 w-3" />
          {t.customize}
        </Link>
      </div>
    </article>
  );
}
