'use client';

import { MODEL_SCOPES } from '@custom-merch/shared';
import {
  Button,
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@custom-merch/ui';
import {
  BrainCircuit,
  Check,
  KeyRound,
  Loader2,
  Plus,
  PlugZap,
  RefreshCw,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { useLocale } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

import { adminFetch } from '@/lib/admin-fetch';

import type {
  ModelBinding,
  ModelConfigurationDto,
  ModelConnectionTestDto,
  ModelKind,
  ModelProfileDto,
  ModelScope,
  ModelVendor,
} from '@custom-merch/shared';

const scopes: Record<ModelScope, [string, string]> = {
  'design-text': ['设计建议与文案', 'Design ideas & copy'],
  'design-image': ['设计器生图', 'Designer image generation'],
  'listing-text': ['商品上品对话', 'Product listing conversation'],
  'listing-image': ['商品图片优化', 'Product photo enhancement'],
  assistant: ['智能销售与客服助手', 'Sales & support assistant'],
};
const providers: Record<ModelVendor, string> = {
  doubao: '豆包 / 火山方舟',
  'openai-compatible': 'OpenAI Compatible',
  anthropic: 'Anthropic Claude',
};
const endpoints: Record<ModelVendor, string> = {
  doubao: 'https://ark.cn-beijing.volces.com/api/v3',
  'openai-compatible': 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com/v1',
};
interface ProfileForm {
  id: string | null;
  name: string;
  kind: ModelKind;
  provider: ModelVendor;
  baseUrl: string;
  model: string;
  timeoutMs: number;
  enabled: boolean;
  apiKey: string;
  removeKey: boolean;
}
const empty = (): ProfileForm => ({
  id: null,
  name: '',
  kind: 'text',
  provider: 'doubao',
  baseUrl: endpoints.doubao,
  model: '',
  timeoutMs: 30000,
  enabled: false,
  apiKey: '',
  removeKey: false,
});
const fromProfile = (p: ModelProfileDto): ProfileForm => ({
  id: p.id,
  name: p.name,
  kind: p.kind,
  provider: p.provider,
  baseUrl: p.baseUrl,
  model: p.model,
  timeoutMs: p.timeoutMs,
  enabled: p.enabled,
  apiKey: '',
  removeKey: false,
});
const selectClass = 'h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm';

export function ModelConfigurationWorkspace({
  apiBaseUrl,
  canWrite,
}: {
  apiBaseUrl: string;
  canWrite: boolean;
}) {
  const cn = useLocale() === 'zh-CN';
  const t = (zh: string, en: string) => (cn ? zh : en);
  const [state, setState] = useState<ModelConfigurationDto | null>(null);
  const [form, setForm] = useState<ProfileForm>(empty);
  const [bindings, setBindings] = useState<ModelBinding[]>([]);
  const [tab, setTab] = useState<'models' | 'applications'>('models');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<'test' | 'delete' | null>(null);
  const [test, setTest] = useState<ModelConnectionTestDto | null>(null);
  const lock = useRef(false);
  const current = state?.profiles.find((p) => p.id === form.id);
  const dirty = JSON.stringify(form) !== JSON.stringify(current ? fromProfile(current) : empty());
  const bindingDirty = JSON.stringify(bindings) !== JSON.stringify(state?.bindings ?? []);
  const accept = (next: ModelConfigurationDto) => {
    setState(next);
    setBindings(next.bindings);
  };
  async function call<T>(path = '', method = 'GET', body?: unknown): Promise<T> {
    const res = await adminFetch(apiBaseUrl, `/admin/model-config${path}`, {
      method,
      cache: 'no-store',
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok)
      throw new Error(typeof data.message === 'string' ? data.message : `HTTP ${res.status}`);
    return data as T;
  }
  async function run(fn: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  useEffect(() => {
    let active = true;
    setBusy(true);
    call<ModelConfigurationDto>()
      .then((next) => {
        if (!active) return;
        accept(next);
        if (next.profiles[0]) setForm(fromProfile(next.profiles[0]));
      })
      .catch((e: Error) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
    // The API URL is fixed for the lifetime of this workspace.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBaseUrl]);
  const discard = () =>
    !(dirty || bindingDirty) || window.confirm(t('放弃未保存的修改？', 'Discard unsaved changes?'));
  const choose = (p?: ModelProfileDto) => {
    if (!discard()) return;
    setForm(p ? fromProfile(p) : empty());
    setBindings(state?.bindings ?? []);
    setTest(null);
    setError(null);
  };
  const refresh = () => {
    if (!discard()) return;
    void run(async () => {
      const next = await call<ModelConfigurationDto>();
      accept(next);
      const p = next.profiles.find((p) => p.id === form.id) ?? next.profiles[0];
      setForm(p ? fromProfile(p) : empty());
      setTest(null);
    });
  };
  const save = () =>
    void run(async () => {
      if (!state) return;
      const { id, apiKey, ...values } = form;
      const next = await call<ModelConfigurationDto>(
        id ? `/profiles/${id}` : '/profiles',
        id ? 'PATCH' : 'POST',
        {
          ...values,
          revision: state.revision,
          ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
        },
      );
      setState(next);
      if (!bindingDirty) setBindings(next.bindings);
      const p = id
        ? next.profiles.find((p) => p.id === id)
        : next.profiles[next.profiles.length - 1];
      if (p) setForm(fromProfile(p));
      setTest(null);
      setNotice(t('模型已保存', 'Model saved'));
    });
  const executeConfirmed = () => {
    const action = confirm;
    setConfirm(null);
    void run(async () => {
      if (!state || !form.id) return;
      if (action === 'delete') {
        const next = await call<ModelConfigurationDto>(`/profiles/${form.id}`, 'DELETE', {
          revision: state.revision,
        });
        setState(next);
        if (!bindingDirty) setBindings(next.bindings);
        setForm(empty());
        setTest(null);
        setNotice(t('模型已删除', 'Model deleted'));
      } else {
        const result = await call<ModelConnectionTestDto>(`/profiles/${form.id}/test`, 'POST');
        setTest(result);
      }
    });
  };
  const set = <K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setTest(null);
  };
  const status = (value: string) =>
    ({
      ready: t('已配置', 'Configured'),
      missing: t('未配置', 'Missing'),
      locked: t('密钥锁定', 'Key locked'),
      disabled: t('已停用', 'Disabled'),
      unconfigured: t('未配置', 'Unconfigured'),
    })[value] ?? value;
  return (
    <section className="min-w-0 space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b pb-5">
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <BrainCircuit className="h-6 w-6 text-accent" aria-hidden />
          {t('大模型配置', 'Model configuration')}
        </h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9 w-9 p-0"
            title={t('重新载入', 'Reload')}
            aria-label={t('重新载入', 'Reload')}
            disabled={busy}
            onClick={refresh}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          {canWrite && (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => {
                setTab('models');
                choose();
              }}
            >
              <Plus className="me-2 h-4 w-4" />
              {t('新增模型', 'Add model')}
            </Button>
          )}
        </div>
      </header>
      {error && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
        >
          <span className="break-words">{error}</span>
          <button
            title={t('关闭', 'Dismiss')}
            aria-label={t('关闭', 'Dismiss')}
            onClick={() => setError(null)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {notice && (
        <p role="status" className="flex items-center gap-2 text-sm text-green-700">
          <Check className="h-4 w-4" />
          {notice}
        </p>
      )}
      {state && (
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <span>
            {t('配置存储', 'Configuration storage')}:{' '}
            {state.persistence === 'database' ? 'PostgreSQL' : t('临时内存', 'Temporary memory')}
          </span>
          <span>
            {t('密钥加密', 'Key encryption')}:{' '}
            {state.encryptionReady
              ? 'AES-256-GCM'
              : t('未配置服务器加密密钥', 'Server encryption key missing')}
          </span>
          <span>
            {t('配置版本', 'Revision')}: {state.revision}
          </span>
        </div>
      )}
      {state && (!state.encryptionReady || state.persistence === 'memory') && (
        <p
          role="status"
          className="border-s-2 border-amber-400 bg-amber-50 px-3 py-2 text-sm text-amber-900"
        >
          {!state.encryptionReady
            ? t(
                '服务器缺少 MODEL_CONFIG_ENCRYPTION_KEY，无法保存 API Key。',
                'MODEL_CONFIG_ENCRYPTION_KEY is missing on the server; API keys cannot be saved.',
              )
            : t(
                '当前为本地临时配置，API 重启后将丢失。',
                'Local temporary configuration will be lost when the API restarts.',
              )}
        </p>
      )}
      <div
        role="tablist"
        aria-label={t('模型配置视图', 'Model configuration views')}
        className="flex gap-5 border-b"
      >
        {(['models', 'applications'] as const).map((value) => (
          <button
            key={value}
            role="tab"
            aria-selected={tab === value}
            aria-controls={`models-${value}`}
            className={`border-b-2 px-1 py-3 text-sm font-medium ${tab === value ? 'border-accent text-foreground' : 'border-transparent text-muted-foreground'}`}
            onClick={() => setTab(value)}
          >
            {value === 'models'
              ? t('模型连接', 'Model connections')
              : t('应用分配', 'Application routing')}
          </button>
        ))}
      </div>
      {busy && !state ? (
        <p role="status" className="flex items-center gap-2 py-8 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t('正在载入', 'Loading')}
        </p>
      ) : !state ? (
        <Button variant="outline" onClick={refresh}>
          <RefreshCw className="me-2 h-4 w-4" />
          {t('重试', 'Retry')}
        </Button>
      ) : tab === 'models' ? (
        <div
          id="models-models"
          role="tabpanel"
          className="grid min-w-0 gap-6 lg:grid-cols-[260px_minmax(0,1fr)]"
        >
          <nav aria-label={t('模型列表', 'Models')} className="min-w-0 lg:border-e lg:pe-5">
            {!state.profiles.length ? (
              <p className="py-4 text-sm text-muted-foreground">
                {t('暂无模型连接', 'No model connections')}
              </p>
            ) : (
              <ul className="divide-y">
                {state.profiles.map((p) => (
                  <li key={p.id}>
                    <button
                      disabled={busy}
                      onClick={() => choose(p)}
                      className={`w-full border-s-2 px-3 py-3 text-start ${form.id === p.id ? 'border-accent bg-accent/5' : 'border-transparent hover:bg-muted/40'}`}
                    >
                      <span className="block break-words text-sm font-medium">{p.name}</span>
                      <span className="mt-1 block break-all text-xs text-muted-foreground">
                        {p.model}
                      </span>
                      <span
                        className={`mt-2 block text-xs ${p.enabled && p.keyStatus === 'ready' ? 'text-green-700' : 'text-muted-foreground'}`}
                      >
                        {p.kind === 'image' ? t('生图', 'Image') : t('文本', 'Text')} ·{' '}
                        {p.enabled ? status(p.keyStatus) : t('已停用', 'Disabled')}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </nav>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
            className="min-w-0 space-y-5"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold">
                {form.id
                  ? t('模型连接详情', 'Connection details')
                  : t('新增模型连接', 'New connection')}
              </h2>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.enabled}
                  disabled={busy || !canWrite}
                  onChange={(e) => set('enabled', e.target.checked)}
                />
                {t('启用', 'Enabled')}
              </label>
            </div>
            <fieldset disabled={busy || !canWrite} className="grid min-w-0 gap-4 sm:grid-cols-2">
              <label className="space-y-1 text-sm sm:col-span-2">
                <span className="block">{t('连接名称', 'Connection name')}</span>
                <Input
                  value={form.name}
                  required
                  maxLength={80}
                  onChange={(e) => set('name', e.target.value)}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="block">{t('模型类型', 'Model type')}</span>
                <select
                  className={selectClass}
                  value={form.kind}
                  onChange={(e) => {
                    const kind = e.target.value as ModelKind;
                    setForm((f) => ({
                      ...f,
                      kind,
                      timeoutMs: kind === 'image' ? 120000 : 30000,
                      ...(kind === 'image' && f.provider !== 'doubao'
                        ? { provider: 'doubao', baseUrl: endpoints.doubao }
                        : {}),
                    }));
                    setTest(null);
                  }}
                >
                  <option value="text">{t('文本 / 对话', 'Text / conversation')}</option>
                  <option value="image">
                    {t('生图 / 图片优化', 'Image generation / editing')}
                  </option>
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="block">{t('API 协议', 'API protocol')}</span>
                <select
                  className={selectClass}
                  value={form.provider}
                  onChange={(e) => {
                    const provider = e.target.value as ModelVendor;
                    setForm((f) => ({ ...f, provider, baseUrl: endpoints[provider] }));
                    setTest(null);
                  }}
                >
                  {(Object.keys(providers) as ModelVendor[])
                    .filter((v) => form.kind === 'text' || v === 'doubao')
                    .map((v) => (
                      <option key={v} value={v}>
                        {v === 'doubao' && !cn ? 'Doubao / Ark' : providers[v]}
                      </option>
                    ))}
                </select>
              </label>
              <label className="space-y-1 text-sm sm:col-span-2">
                <span className="block">
                  {t('模型 ID / Endpoint ID', 'Model ID / Endpoint ID')}
                </span>
                <Input
                  required
                  maxLength={120}
                  value={form.model}
                  onChange={(e) => set('model', e.target.value)}
                />
              </label>
              <label className="space-y-1 text-sm sm:col-span-2">
                <span className="block">API Base URL</span>
                <Input
                  type="url"
                  required
                  maxLength={200}
                  value={form.baseUrl}
                  onChange={(e) => set('baseUrl', e.target.value)}
                />
              </label>
              <label className="space-y-1 text-sm sm:col-span-2">
                <span className="flex items-center justify-between gap-2">
                  <span>API Key</span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <KeyRound className="h-3 w-3" />
                    {current ? status(current.keyStatus) : t('未配置', 'Missing')}
                  </span>
                </span>
                <Input
                  type="password"
                  autoComplete="new-password"
                  spellCheck={false}
                  value={form.apiKey}
                  disabled={form.removeKey}
                  placeholder={current?.hasKey ? '********' : ''}
                  maxLength={4096}
                  onChange={(e) => set('apiKey', e.target.value)}
                />
              </label>
              {current?.hasKey && (
                <label className="flex items-center gap-2 text-sm sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={form.removeKey}
                    onChange={(e) => {
                      set('removeKey', e.target.checked);
                      set('apiKey', '');
                    }}
                  />
                  {t('移除已保存 Key', 'Remove saved key')}
                </label>
              )}
              <label className="space-y-1 text-sm">
                <span className="block">{t('请求超时', 'Request timeout')}</span>
                <select
                  className={selectClass}
                  value={form.timeoutMs}
                  onChange={(e) => set('timeoutMs', Number(e.target.value))}
                >
                  {[30000, 60000, 120000, 180000].map((v) => (
                    <option key={v} value={v}>
                      {v / 1000} {t('秒', 'seconds')}
                    </option>
                  ))}
                </select>
              </label>
            </fieldset>
            <div className="flex flex-wrap items-center gap-2 border-t pt-4">
              {canWrite && (
                <Button
                  type="submit"
                  disabled={busy || !dirty || (!state.encryptionReady && Boolean(form.apiKey))}
                >
                  <Save className="me-2 h-4 w-4" />
                  {t('保存连接', 'Save connection')}
                </Button>
              )}
              {canWrite && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy || dirty || !current?.hasKey || current.keyStatus !== 'ready'}
                  onClick={() => setConfirm('test')}
                >
                  <PlugZap className="me-2 h-4 w-4" />
                  {form.kind === 'image'
                    ? t('测试生图', 'Test image generation')
                    : t('测试连接', 'Test connection')}
                </Button>
              )}
              {canWrite && current && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 w-9 p-0"
                  title={t('删除模型', 'Delete model')}
                  aria-label={t('删除模型', 'Delete model')}
                  disabled={busy}
                  onClick={() => setConfirm('delete')}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              {busy && (
                <Loader2 className="h-4 w-4 animate-spin" aria-label={t('处理中', 'Working')} />
              )}
            </div>
            {test && (
              <div
                role="status"
                className={`border-s-2 p-3 text-sm ${test.ok ? 'border-green-500 bg-green-50 text-green-800' : 'border-destructive bg-destructive/5 text-destructive'}`}
              >
                <p className="font-medium">
                  {test.ok
                    ? t('模型调用通过', 'Model request passed')
                    : t(
                        '调用失败，请检查 Key、模型权限和 API 地址',
                        'Request failed: check key, model access and API endpoint',
                      )}
                </p>
                <p className="mt-1 break-all text-xs">
                  {test.model} · {test.latencyMs} ms
                </p>
              </div>
            )}
          </form>
        </div>
      ) : (
        <div id="models-applications" role="tabpanel" className="space-y-4">
          <div className="divide-y border-y">
            {MODEL_SCOPES.map((scope) => {
              const binding = bindings.find((b) => b.scope === scope)!;
              const runtime = state.runtime.find((r) => r.scope === scope)!;
              const image = scope.endsWith('-image');
              return (
                <div
                  key={scope}
                  className="grid min-w-0 items-center gap-3 py-4 md:grid-cols-[minmax(170px,1fr)_minmax(180px,1.2fr)_minmax(120px,1fr)]"
                >
                  <label htmlFor={`binding-${scope}`} className="text-sm font-medium">
                    {scopes[scope][cn ? 0 : 1]}
                  </label>
                  <select
                    id={`binding-${scope}`}
                    disabled={busy || !canWrite}
                    className={selectClass}
                    value={binding.mode === 'profile' ? (binding.profileId ?? '') : binding.mode}
                    onChange={(e) => {
                      const value = e.target.value;
                      setBindings((bs) =>
                        bs.map((b) =>
                          b.scope !== scope
                            ? b
                            : {
                                scope,
                                mode:
                                  value === 'environment' || value === 'disabled'
                                    ? value
                                    : 'profile',
                                profileId:
                                  value === 'environment' || value === 'disabled' ? null : value,
                              },
                        ),
                      );
                    }}
                  >
                    <option value="environment">{t('服务器环境变量', 'Server environment')}</option>
                    <option value="disabled">{t('停用', 'Disabled')}</option>
                    {state.profiles
                      .filter(
                        (p) =>
                          (p.kind === 'image') === image &&
                          ((p.enabled && p.keyStatus === 'ready') || p.id === binding.profileId),
                      )
                      .map((p) => (
                        <option
                          key={p.id}
                          value={p.id}
                          disabled={!p.enabled || p.keyStatus !== 'ready'}
                        >
                          {p.name}
                        </option>
                      ))}
                  </select>
                  <div className="min-w-0 text-xs">
                    <p
                      className={
                        runtime.status === 'ready' ? 'text-green-700' : 'text-muted-foreground'
                      }
                    >
                      {status(runtime.status)}
                    </p>
                    <p className="mt-1 break-all text-muted-foreground">{runtime.model ?? '-'}</p>
                  </div>
                </div>
              );
            })}
          </div>
          {canWrite && (
            <Button
              disabled={busy || !bindingDirty}
              onClick={() =>
                void run(async () => {
                  accept(
                    await call<ModelConfigurationDto>('/bindings', 'PATCH', {
                      revision: state.revision,
                      bindings,
                    }),
                  );
                  setNotice(t('应用分配已生效', 'Application routing is active'));
                })
              }
            >
              <Save className="me-2 h-4 w-4" />
              {t('保存应用分配', 'Save application routing')}
            </Button>
          )}
        </div>
      )}
      <Dialog
        open={Boolean(confirm)}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
      >
        <DialogContent closeLabel={t('关闭', 'Close')} className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {confirm === 'delete'
                ? t('删除模型连接', 'Delete model connection')
                : t('确认模型测试', 'Confirm model test')}
            </DialogTitle>
            <DialogDescription>
              {confirm === 'delete'
                ? t(
                    '删除后该连接和已保存 Key 将被移除。已分配的模型须先解除应用分配。',
                    'This removes the connection and stored key. Assigned models must be unassigned first.',
                  )
                : t(
                    '测试将真实调用服务商，可能产生费用。生图测试会生成一张 2048 × 2048 图片。',
                    'Testing makes a real provider request and may incur charges. An image test generates one 2048 × 2048 image.',
                  )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(null)}>
              {t('取消', 'Cancel')}
            </Button>
            <Button onClick={executeConfirmed}>
              <Check className="me-2 h-4 w-4" />
              {t('确认', 'Confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
