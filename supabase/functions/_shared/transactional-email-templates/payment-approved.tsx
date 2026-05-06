/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { Brand, SITE_URL, styles, pickLang, type Lang } from './_brand.ts'

interface Props { amount?: number | string; currency?: string; paymentType?: string; linkPath?: string; lang?: Lang }

const copy = {
  en: {
    preview: 'Your payment has been approved',
    h1: 'Payment approved ✓',
    body: (t?: string, a?: string | number, cur?: string) => (
      <>Your{t ? <> {t.replace('_', ' ')}</> : ''} payment{a ? <> of <strong>{a} {cur}</strong></> : ''} has been approved.</>
    ),
    btn: 'View details',
    footer: 'Thank you for using ThweSone.',
    subject: 'Your payment has been approved',
  },
  my: {
    preview: 'သင့်ငွေပေးချေမှု အတည်ပြုပြီး',
    h1: 'ငွေပေးချေမှု အတည်ပြုပြီး ✓',
    body: (t?: string, a?: string | number, cur?: string) => (
      <>သင့်{t ? <> {t.replace('_', ' ')}</> : ''} ငွေပေးချေမှု{a ? <> <strong>{a} {cur}</strong></> : ''} ကို အတည်ပြုပြီးပါပြီ။</>
    ),
    btn: 'အသေးစိတ် ကြည့်မည်',
    footer: 'ThweSone ကို အသုံးပြုသည့်အတွက် ကျေးဇူးတင်ပါသည်။',
    subject: 'သင့်ငွေပေးချေမှု အတည်ပြုပြီး',
  },
}

const PaymentApproved = ({ amount, currency = 'MMK', paymentType, linkPath, lang }: Props) => {
  const c = copy[pickLang(lang)]
  return (
    <Html lang={pickLang(lang)} dir="ltr">
      <Head />
      <Preview>{c.preview}</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Brand />
          <div style={styles.card}>
            <Heading style={styles.h1}>{c.h1}</Heading>
            <Text style={styles.text}>{c.body(paymentType, amount, currency)}</Text>
            <Button style={styles.button} href={`${SITE_URL}${linkPath || '/wallet'}`}>{c.btn}</Button>
            <hr style={styles.divider} />
            <Text style={styles.footer}>{c.footer}</Text>
          </div>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: PaymentApproved,
  subject: (d: Props) => copy[pickLang(d?.lang)].subject,
  displayName: 'Payment approved',
  previewData: { amount: '50,000', currency: 'MMK', paymentType: 'placement_fee', linkPath: '/employer/finance', lang: 'en' },
} satisfies TemplateEntry
