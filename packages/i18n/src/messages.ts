/**
 * Static message catalogues for every supported locale.
 *
 * Messages are imported statically so bundlers (esbuild / webpack) can inline
 * the JSON content. The cost is small (~few KB total) and avoids the brittle
 * dynamic-import pattern.
 */
import { DEFAULT_LOCALE, type Locale } from '@custom-merch/shared';

import enAccount from '../messages/en/account.json';
import enAdmin from '../messages/en/admin.json';
import enCart from '../messages/en/cart.json';
import enCheckout from '../messages/en/checkout.json';
import enCommon from '../messages/en/common.json';
import enCustomizer from '../messages/en/customizer.json';
import enErrors from '../messages/en/errors.json';
import enHome from '../messages/en/home.json';
import enProducts from '../messages/en/products.json';
import enRfq from '../messages/en/rfq.json';

import esAccount from '../messages/es/account.json';
import esAdmin from '../messages/es/admin.json';
import esCart from '../messages/es/cart.json';
import esCheckout from '../messages/es/checkout.json';
import esCommon from '../messages/es/common.json';
import esCustomizer from '../messages/es/customizer.json';
import esErrors from '../messages/es/errors.json';
import esHome from '../messages/es/home.json';
import esProducts from '../messages/es/products.json';
import esRfq from '../messages/es/rfq.json';

import arAccount from '../messages/ar/account.json';
import arAdmin from '../messages/ar/admin.json';
import arCart from '../messages/ar/cart.json';
import arCheckout from '../messages/ar/checkout.json';
import arCommon from '../messages/ar/common.json';
import arCustomizer from '../messages/ar/customizer.json';
import arErrors from '../messages/ar/errors.json';
import arHome from '../messages/ar/home.json';
import arProducts from '../messages/ar/products.json';
import arRfq from '../messages/ar/rfq.json';

import zhAccount from '../messages/zh-CN/account.json';
import zhAdmin from '../messages/zh-CN/admin.json';
import zhCart from '../messages/zh-CN/cart.json';
import zhCheckout from '../messages/zh-CN/checkout.json';
import zhCommon from '../messages/zh-CN/common.json';
import zhCustomizer from '../messages/zh-CN/customizer.json';
import zhErrors from '../messages/zh-CN/errors.json';
import zhHome from '../messages/zh-CN/home.json';
import zhProducts from '../messages/zh-CN/products.json';
import zhRfq from '../messages/zh-CN/rfq.json';

/** Logical message namespaces. Matches the directory layout under messages/. */
export const NAMESPACES = [
  'common',
  'home',
  'products',
  'customizer',
  'cart',
  'checkout',
  'account',
  'rfq',
  'admin',
  'errors',
] as const;

export type Namespace = (typeof NAMESPACES)[number];

/** Shape of the merged message bag. Keys are namespaces. */
export interface Messages {
  common: typeof enCommon;
  home: typeof enHome;
  products: typeof enProducts;
  customizer: typeof enCustomizer;
  cart: typeof enCart;
  checkout: typeof enCheckout;
  account: typeof enAccount;
  rfq: typeof enRfq;
  admin: typeof enAdmin;
  errors: typeof enErrors;
}

const ALL_MESSAGES: Record<Locale, Messages> = {
  en: {
    common: enCommon,
    home: enHome,
    products: enProducts,
    customizer: enCustomizer,
    cart: enCart,
    checkout: enCheckout,
    account: enAccount,
    rfq: enRfq,
    admin: enAdmin,
    errors: enErrors,
  },
  'zh-CN': {
    common: zhCommon,
    home: zhHome,
    products: zhProducts,
    customizer: zhCustomizer,
    cart: zhCart,
    checkout: zhCheckout,
    account: zhAccount,
    rfq: zhRfq,
    admin: zhAdmin,
    errors: zhErrors,
  },
  es: {
    common: esCommon,
    home: esHome,
    products: esProducts,
    customizer: esCustomizer,
    cart: esCart,
    checkout: esCheckout,
    account: esAccount,
    rfq: esRfq,
    admin: esAdmin,
    errors: esErrors,
  },
  ar: {
    common: arCommon,
    home: arHome,
    products: arProducts,
    customizer: arCustomizer,
    cart: arCart,
    checkout: arCheckout,
    account: arAccount,
    rfq: arRfq,
    admin: arAdmin,
    errors: arErrors,
  },
};

/** Returns the full namespaced message bag for the given locale. */
export function getMessages(locale: Locale): Messages {
  return ALL_MESSAGES[locale] ?? ALL_MESSAGES[DEFAULT_LOCALE];
}

/** Returns one namespace from the message bag (typed). */
export function getNamespaceMessages<N extends Namespace>(
  locale: Locale,
  namespace: N,
): Messages[N] {
  return getMessages(locale)[namespace];
}
