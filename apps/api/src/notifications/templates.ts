import type { Locale } from '@custom-merch/shared';

export interface NotificationTemplate {
  subject: string;
  /** Plain-text body. Variables use `{{variable}}` syntax. */
  text: string;
  /** Optional HTML body. Variables use `{{variable}}` syntax. */
  html?: string;
}

const T = (subject: string, text: string, html?: string): NotificationTemplate => ({
  subject,
  text,
  html,
});

/**
 * In-repo i18n template registry.
 *
 * Used as the *fallback* template body when the active provider has no
 * vendor-side template (e.g. SendGrid `template_id`, SES `TemplateName`)
 * configured for the requested key. The shape is intentionally flat so we
 * can ship rich HTML emails later without a schema change.
 *
 * Variables follow the {{variable}} mustache style so the same template can
 * be rendered locally or by a vendor that supports the same syntax.
 *
 * Templates we support today (driven by {@link OrderProgressService}):
 *   - order.design_approved   — design cleared review
 *   - order.in_production     — supplier started the run
 *   - order.qc_passed         — QC clean
 *   - order.qc_failed         — QC failed; failureReason provided
 *   - order.shipped           — first carrier scan
 *   - order.delivered         — carrier confirmed delivery
 *   - supplier.job_assigned   — sales-ops assigned the job
 *   - test.echo               — admin "Send a test email" sandbox key
 */
type Registry = Record<string, Record<Locale, NotificationTemplate>>;

export const NOTIFICATION_TEMPLATES: Registry = {
  'order.design_approved': {
    en: T(
      'Your design for {{orderNumber}} was approved',
      `Hi,\n\nYour design for order {{orderNumber}} has been approved by our team. We're moving it to production now.\n\nTrack progress: {{trackingPagePath}}\n\n— Bloomrealyou`,
    ),
    'zh-CN': T(
      '您的订单 {{orderNumber}} 设计已通过审核',
      `您好,\n\n订单 {{orderNumber}} 的设计已通过审核,我们即将进入生产环节。\n\n查看进度:{{trackingPagePath}}\n\n— Bloomrealyou`,
    ),
    es: T(
      'Tu diseño para {{orderNumber}} fue aprobado',
      `Hola,\n\nEl diseño de tu pedido {{orderNumber}} ha sido aprobado. Pasamos a producción ahora.\n\nSigue el progreso: {{trackingPagePath}}\n\n— Bloomrealyou`,
    ),
    ar: T(
      'تمت الموافقة على تصميم طلبك {{orderNumber}}',
      `مرحبًا،\n\nتمت الموافقة على تصميم طلبك {{orderNumber}}، وسننتقل الآن إلى مرحلة الإنتاج.\n\nتتبع التقدم: {{trackingPagePath}}\n\n— Bloomrealyou`,
    ),
  },
  'order.in_production': {
    en: T(
      '{{orderNumber}} is now in production',
      `Hi,\n\nYour order {{orderNumber}} is in production with our partner {{supplierName}}.\nWe'll email you again when it ships.\n\nTrack progress: {{trackingPagePath}}\n\n— Bloomrealyou`,
    ),
    'zh-CN': T(
      '订单 {{orderNumber}} 已进入生产',
      `您好,\n\n订单 {{orderNumber}} 已交由合作伙伴 {{supplierName}} 生产,发货时我们会再次通知您。\n\n查看进度:{{trackingPagePath}}\n\n— Bloomrealyou`,
    ),
    es: T(
      '{{orderNumber}} ya está en producción',
      `Hola,\n\nTu pedido {{orderNumber}} está en producción con nuestro socio {{supplierName}}.\nTe escribiremos de nuevo cuando se envíe.\n\nSigue el progreso: {{trackingPagePath}}\n\n— Bloomrealyou`,
    ),
    ar: T(
      'طلبك {{orderNumber}} في الإنتاج الآن',
      `مرحبًا،\n\nطلبك {{orderNumber}} قيد الإنتاج لدى شريكنا {{supplierName}}. سنراسلك مجددًا عند الشحن.\n\nتتبع التقدم: {{trackingPagePath}}\n\n— Bloomrealyou`,
    ),
  },
  'order.qc_passed': {
    en: T(
      '{{orderNumber}} cleared quality control',
      `Hi,\n\nGood news — order {{orderNumber}} passed quality control. We're packaging it for shipment.\n\nTrack progress: {{trackingPagePath}}\n\n— Bloomrealyou`,
    ),
    'zh-CN': T(
      '订单 {{orderNumber}} 通过质检',
      `您好,\n\n好消息 — 订单 {{orderNumber}} 已通过质检,正在打包准备发货。\n\n查看进度:{{trackingPagePath}}\n\n— Bloomrealyou`,
    ),
    es: T(
      '{{orderNumber}} pasó el control de calidad',
      `Hola,\n\nBuenas noticias — el pedido {{orderNumber}} pasó el control de calidad. Estamos empaquetándolo para enviarlo.\n\nSigue el progreso: {{trackingPagePath}}\n\n— Bloomrealyou`,
    ),
    ar: T(
      'طلب {{orderNumber}} اجتاز فحص الجودة',
      `مرحبًا،\n\nخبر جيد — اجتاز طلبك {{orderNumber}} فحص الجودة، ونقوم الآن بتعبئته للشحن.\n\nتتبع التقدم: {{trackingPagePath}}\n\n— Bloomrealyou`,
    ),
  },
  'order.qc_failed': {
    en: T(
      '{{orderNumber}} needs your attention',
      `Hi,\n\nWe found an issue during quality control on order {{orderNumber}}: {{failureReason}}.\nOur team is reaching out shortly with next steps.\n\nTrack progress: {{trackingPagePath}}\n\n— Bloomrealyou`,
    ),
    'zh-CN': T(
      '订单 {{orderNumber}} 需要您的关注',
      `您好,\n\n我们在订单 {{orderNumber}} 的质检中发现了问题:{{failureReason}}。\n稍后我们的团队会与您联系并提供后续方案。\n\n查看进度:{{trackingPagePath}}\n\n— Bloomrealyou`,
    ),
    es: T(
      '{{orderNumber}} necesita tu atención',
      `Hola,\n\nDetectamos un problema en el control de calidad del pedido {{orderNumber}}: {{failureReason}}.\nNuestro equipo te contactará pronto con los siguientes pasos.\n\nSigue el progreso: {{trackingPagePath}}\n\n— Bloomrealyou`,
    ),
    ar: T(
      'طلب {{orderNumber}} يحتاج إلى انتباهك',
      `مرحبًا،\n\nرصدنا مشكلة أثناء فحص الجودة للطلب {{orderNumber}}: {{failureReason}}.\nسيتواصل معك فريقنا قريبًا لتحديد الخطوات التالية.\n\nتتبع التقدم: {{trackingPagePath}}\n\n— Bloomrealyou`,
    ),
  },
  'order.shipped': {
    en: T(
      '{{orderNumber}} is on its way',
      `Hi,\n\nOrder {{orderNumber}} just shipped via {{carrier}} ({{trackingNumber}}).\nTrack it: {{trackingUrl}}\n\n— Bloomrealyou`,
    ),
    'zh-CN': T(
      '订单 {{orderNumber}} 已发货',
      `您好,\n\n订单 {{orderNumber}} 已通过 {{carrier}} 发出(运单号 {{trackingNumber}})。\n追踪链接:{{trackingUrl}}\n\n— Bloomrealyou`,
    ),
    es: T(
      '{{orderNumber}} ya está en camino',
      `Hola,\n\nEl pedido {{orderNumber}} acaba de enviarse vía {{carrier}} ({{trackingNumber}}).\nSíguelo: {{trackingUrl}}\n\n— Bloomrealyou`,
    ),
    ar: T(
      'طلب {{orderNumber}} في طريقه إليك',
      `مرحبًا،\n\nتم شحن الطلب {{orderNumber}} عبر {{carrier}} (رقم التتبع {{trackingNumber}}).\nرابط التتبع: {{trackingUrl}}\n\n— Bloomrealyou`,
    ),
  },
  'order.delivered': {
    en: T(
      '{{orderNumber}} was delivered',
      `Hi,\n\nGreat news — your order {{orderNumber}} just arrived. We hope you love it!\n\n— Bloomrealyou`,
    ),
    'zh-CN': T(
      '订单 {{orderNumber}} 已送达',
      `您好,\n\n您的订单 {{orderNumber}} 已签收,希望您喜欢!\n\n— Bloomrealyou`,
    ),
    es: T(
      '{{orderNumber}} fue entregado',
      `Hola,\n\nBuenas noticias — tu pedido {{orderNumber}} acaba de llegar. ¡Esperamos que te encante!\n\n— Bloomrealyou`,
    ),
    ar: T(
      'تم تسليم طلب {{orderNumber}}',
      `مرحبًا،\n\nوصل طلبك {{orderNumber}}. نأمل أن ينال إعجابك!\n\n— Bloomrealyou`,
    ),
  },
  'supplier.job_assigned': {
    en: T(
      'New production job {{jobNumber}}',
      `Hi {{supplierName}},\n\nA new production job {{jobNumber}} (order {{orderNumber}}) has been assigned to you.\nPlease confirm the assignment in the supplier portal at your earliest convenience.\n\n— Bloomrealyou Operations`,
    ),
    'zh-CN': T(
      '新生产任务 {{jobNumber}}',
      `{{supplierName}} 您好,\n\n您收到一个新的生产任务 {{jobNumber}}(对应订单 {{orderNumber}})。\n请尽快在供应商门户中确认接单。\n\n— Bloomrealyou 运营`,
    ),
    es: T(
      'Nuevo trabajo de producción {{jobNumber}}',
      `Hola {{supplierName}},\n\nSe te asignó un nuevo trabajo de producción {{jobNumber}} (pedido {{orderNumber}}).\nPor favor, confirma la asignación en el portal del proveedor lo antes posible.\n\n— Bloomrealyou Operations`,
    ),
    ar: T(
      'مهمة إنتاج جديدة {{jobNumber}}',
      `مرحبًا {{supplierName}}،\n\nتم إسناد مهمة إنتاج جديدة {{jobNumber}} (الطلب {{orderNumber}}) إليك.\nيرجى تأكيد الإسناد عبر بوّابة المورد في أقرب وقت.\n\n— Bloomrealyou Operations`,
    ),
  },
  'user.welcome': {
    en: T(
      'Welcome to Bloomrealyou, {{firstName}}',
      `Hi {{firstName}},\n\nWelcome to Bloomrealyou! Your account is ready and you can start designing custom merch right away.\n\nIf you ever need help, just reply to this email.\n\n— Bloomrealyou`,
    ),
    'zh-CN': T(
      '{{firstName}},欢迎加入 Bloomrealyou',
      `您好 {{firstName}},\n\n欢迎加入 Bloomrealyou!您的账户已经就绪,现在就可以开始定制属于自己的商品。\n\n有任何问题,直接回复这封邮件即可。\n\n— Bloomrealyou`,
    ),
    es: T(
      'Bienvenido a Bloomrealyou, {{firstName}}',
      `Hola {{firstName}},\n\n¡Bienvenido a Bloomrealyou! Tu cuenta está lista y ya puedes empezar a diseñar productos personalizados.\n\nSi necesitas ayuda, responde a este correo.\n\n— Bloomrealyou`,
    ),
    ar: T(
      'مرحبًا بك في Bloomrealyou يا {{firstName}}',
      `مرحبًا {{firstName}}،\n\nأهلًا بك في Bloomrealyou! حسابك جاهز ويمكنك البدء في تصميم منتجاتك المخصّصة الآن.\n\nإذا احتجت أي مساعدة فقط رد على هذه الرسالة.\n\n— Bloomrealyou`,
    ),
  },
  'order.confirmation': {
    en: T(
      'We received your order {{orderNumber}}',
      `Hi,\n\nThanks for your order! We received {{orderNumber}} and are preparing it for production.\n\nTotal: {{totalFormatted}}\nItems: {{itemCount}}\n\nTrack progress: {{trackingPagePath}}\n\n— Bloomrealyou`,
    ),
    'zh-CN': T(
      '订单 {{orderNumber}} 已收到',
      `您好,\n\n感谢下单!我们已收到订单 {{orderNumber}},正在为您准备生产。\n\n总计:{{totalFormatted}}\n商品数量:{{itemCount}}\n\n查看进度:{{trackingPagePath}}\n\n— Bloomrealyou`,
    ),
    es: T(
      'Recibimos tu pedido {{orderNumber}}',
      `Hola,\n\n¡Gracias por tu pedido! Recibimos {{orderNumber}} y lo estamos preparando para producción.\n\nTotal: {{totalFormatted}}\nArtículos: {{itemCount}}\n\nSigue el progreso: {{trackingPagePath}}\n\n— Bloomrealyou`,
    ),
    ar: T(
      'تم استلام طلبك {{orderNumber}}',
      `مرحبًا،\n\nشكرًا لطلبك! استلمنا {{orderNumber}} ونقوم بتجهيزه للإنتاج.\n\nالإجمالي: {{totalFormatted}}\nعدد المنتجات: {{itemCount}}\n\nتتبع التقدم: {{trackingPagePath}}\n\n— Bloomrealyou`,
    ),
  },
  'order.payment_confirmation': {
    en: T(
      'Payment received for {{orderNumber}}',
      `Hi,\n\nWe've received your payment of {{totalFormatted}} for order {{orderNumber}}. A receipt is attached for your records.\n\nWe'll email you again the moment your order ships.\n\n— Bloomrealyou`,
    ),
    'zh-CN': T(
      '已收到订单 {{orderNumber}} 的付款',
      `您好,\n\n我们已收到订单 {{orderNumber}} 的付款 {{totalFormatted}}。收据已附在邮件中以备查阅。\n\n商品发货时我们会再次通知您。\n\n— Bloomrealyou`,
    ),
    es: T(
      'Pago recibido para {{orderNumber}}',
      `Hola,\n\nHemos recibido tu pago de {{totalFormatted}} por el pedido {{orderNumber}}. Adjuntamos el recibo para tus registros.\n\nTe escribiremos en cuanto el pedido se envíe.\n\n— Bloomrealyou`,
    ),
    ar: T(
      'تم استلام الدفعة الخاصة بالطلب {{orderNumber}}',
      `مرحبًا،\n\nاستلمنا دفعتك بمبلغ {{totalFormatted}} للطلب {{orderNumber}}. الإيصال مرفق لسجلاتك.\n\nسنبلغك حالما يتم شحن الطلب.\n\n— Bloomrealyou`,
    ),
  },
  'order.design_revision_required': {
    en: T(
      'We need a small change to your design for {{orderNumber}}',
      `Hi,\n\nOur design team reviewed your artwork for {{orderNumber}} and asked for a small revision before we move it to production.\n\nReviewer note: {{revisionMessage}}\n\nUpload a new version: {{trackingPagePath}}\n\n— Bloomrealyou`,
    ),
    'zh-CN': T(
      '订单 {{orderNumber}} 的设计需要调整',
      `您好,\n\n我们的设计团队审核了订单 {{orderNumber}} 的稿件,需要您先修改后再进入生产。\n\n审核备注:{{revisionMessage}}\n\n上传新版本:{{trackingPagePath}}\n\n— Bloomrealyou`,
    ),
    es: T(
      'Necesitamos un cambio en el diseño de {{orderNumber}}',
      `Hola,\n\nNuestro equipo de diseño revisó el arte para {{orderNumber}} y pide una pequeña corrección antes de pasarlo a producción.\n\nNota del revisor: {{revisionMessage}}\n\nSube una nueva versión: {{trackingPagePath}}\n\n— Bloomrealyou`,
    ),
    ar: T(
      'نحتاج تعديلًا بسيطًا على تصميم الطلب {{orderNumber}}',
      `مرحبًا،\n\nراجع فريق التصميم لدينا تصميمك لطلب {{orderNumber}} ويطلب تعديلًا بسيطًا قبل بدء الإنتاج.\n\nملاحظة المراجع: {{revisionMessage}}\n\nارفع نسخة جديدة: {{trackingPagePath}}\n\n— Bloomrealyou`,
    ),
  },
  'rfq.confirmation': {
    en: T(
      'We received your RFQ {{rfqNumber}}',
      `Hi {{contactName}},\n\nThanks for your interest! We received your request for quote {{rfqNumber}} and our team will get back to you with pricing within {{slaHours}} business hours.\n\n— Bloomrealyou`,
    ),
    'zh-CN': T(
      '我们已收到您的询价 {{rfqNumber}}',
      `您好 {{contactName}},\n\n感谢您的关注!我们已收到询价单 {{rfqNumber}},团队将在 {{slaHours}} 个工作小时内回复价格方案。\n\n— Bloomrealyou`,
    ),
    es: T(
      'Recibimos tu solicitud de presupuesto {{rfqNumber}}',
      `Hola {{contactName}},\n\n¡Gracias por tu interés! Recibimos la RFQ {{rfqNumber}} y nuestro equipo te enviará una cotización dentro de {{slaHours}} horas hábiles.\n\n— Bloomrealyou`,
    ),
    ar: T(
      'استلمنا طلب عرض السعر {{rfqNumber}}',
      `مرحبًا {{contactName}}،\n\nشكرًا لاهتمامك! استلمنا طلب عرض السعر {{rfqNumber}}، وسيقوم فريقنا بالرد عليك بالتسعير خلال {{slaHours}} ساعة عمل.\n\n— Bloomrealyou`,
    ),
  },
  'quote.ready': {
    en: T(
      'Your quote {{quoteNumber}} is ready',
      `Hi {{contactName}},\n\nGood news — quote {{quoteNumber}} for RFQ {{rfqNumber}} is ready.\nTotal: {{totalFormatted}}\nValid until: {{validUntil}}\n\nView the full quote: {{quoteUrl}}\n\n— Bloomrealyou Sales`,
    ),
    'zh-CN': T(
      '报价 {{quoteNumber}} 已生成',
      `您好 {{contactName}},\n\n好消息 — 询价单 {{rfqNumber}} 对应的报价 {{quoteNumber}} 已生成。\n总价:{{totalFormatted}}\n有效期至:{{validUntil}}\n\n查看完整报价:{{quoteUrl}}\n\n— Bloomrealyou 销售`,
    ),
    es: T(
      'Tu cotización {{quoteNumber}} está lista',
      `Hola {{contactName}},\n\n¡Buenas noticias! La cotización {{quoteNumber}} para la RFQ {{rfqNumber}} ya está lista.\nTotal: {{totalFormatted}}\nVálida hasta: {{validUntil}}\n\nVer cotización completa: {{quoteUrl}}\n\n— Equipo Comercial Bloomrealyou`,
    ),
    ar: T(
      'عرض الأسعار {{quoteNumber}} جاهز',
      `مرحبًا {{contactName}}،\n\nأخبار سارة — عرض الأسعار {{quoteNumber}} الخاص بطلب {{rfqNumber}} جاهز.\nالإجمالي: {{totalFormatted}}\nصالح حتى: {{validUntil}}\n\nاطلع على العرض الكامل: {{quoteUrl}}\n\n— فريق المبيعات في Bloomrealyou`,
    ),
  },
  'test.echo': {
    en: T(
      'Test message ({{templateKey}})',
      `This is a test of the notification pipeline.\nProvider: {{providerName}}\nLocale: {{locale}}\nSent at: {{sentAt}}`,
    ),
    'zh-CN': T(
      '测试通知 ({{templateKey}})',
      `这是通知系统的测试邮件。\nProvider: {{providerName}}\nLocale: {{locale}}\nSent at: {{sentAt}}`,
    ),
    es: T(
      'Mensaje de prueba ({{templateKey}})',
      `Este es un mensaje de prueba del sistema de notificaciones.\nProvider: {{providerName}}\nLocale: {{locale}}\nSent at: {{sentAt}}`,
    ),
    ar: T(
      'رسالة اختبار ({{templateKey}})',
      `هذه رسالة اختبار من نظام الإشعارات.\nProvider: {{providerName}}\nLocale: {{locale}}\nSent at: {{sentAt}}`,
    ),
  },
};

/** Resolve a template by key + locale with `en` as the fallback. */
export function resolveTemplate(
  templateKey: string,
  locale: Locale | undefined,
): NotificationTemplate | null {
  const entry = NOTIFICATION_TEMPLATES[templateKey];
  if (!entry) return null;
  return entry[locale ?? 'en'] ?? entry.en;
}

/** Naive `{{var}}` replacement. Missing variables become empty strings. */
export function renderTemplate(
  template: NotificationTemplate,
  data: Record<string, unknown>,
): NotificationTemplate {
  const apply = (s: string): string =>
    s.replace(/{{\s*([\w.]+)\s*}}/g, (_, key) => {
      const value = data[key as keyof typeof data];
      if (value === undefined || value === null) return '';
      return String(value);
    });
  return {
    subject: apply(template.subject),
    text: apply(template.text),
    html: template.html ? apply(template.html) : undefined,
  };
}
