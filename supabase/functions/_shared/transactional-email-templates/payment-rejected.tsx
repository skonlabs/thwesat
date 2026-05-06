/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { Brand, SITE_URL, styles, pickLang, type Lang } from './_brand.ts'

interface Props { reason?: string; paymentType?: string; linkPath?: string; lang?: Lang }

const copy = {
  en: {
    preview: 'Your payment was rejected',
    h1: 'Payment rejected',
    body: (t?: string) => <>Your{t ? <> {t.replace('_', ' ')}</> : ''} payment was rejected.</>,
    reasonLabel: 'Reason',
    cta: 'Please review the details and re-submit, or contact support if you believe this was a mistake.',
    btn: 'Review payment',
    footer: 'Need help? Reply to this email.',
    subject: 'Your payment was rejected',
  },
  my: {
    preview: 'သင့်ငွေပေးချေမှု ပယ်ချခံရပါသည်',
    h1: 'ငွေပေးချေမှု ပယ်ချခံရပါသည်',
    body: (t?: string) => <>သင့်{t ? <> {t.replace('_', ' ')}</> : ''} ငွေပေးချေမှုကို ပယ်ချခံရပါသည်။</>,
    reasonLabel: 'အကြောင်းရင်း',
    cta: 'အသေးစိတ်ကို ပြန်စစ်ပြီး ပြန်တင်ပေးပါ။ မှားယွင်းနေသည်ဟု ထင်ပါက support သို့ ဆက်သွယ်ပါ။',
    btn: 'ငွေပေးချေမှု ပြန်ကြည့်ရန်',
    footer: 'အကူအညီလိုပါက ဤအီးမေးလ်ကို ပြန်ဖြေပေးပါ။',
    subject: 'သင့်ငွေပေးချေမှု ပယ်ချခံရပါသည်',
  },
}

const PaymentRejected = ({ reason, paymentType, linkPath, lang }: Props) => {
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
            <Text style={styles.text}>{c.body(paymentType)}</Text>
            {reason ? <div style={styles.highlight}><strong>{c.reasonLabel}:</strong> {reason}</div> : null}
            <Text style={styles.text}>{c.cta}</Text>
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
  component: PaymentRejected,
  subject: (d: Props) => copy[pickLang(d?.lang)].subject,
  displayName: 'Payment rejected',
  previewData: { reason: 'Payment proof unclear', paymentType: 'topup', linkPath: '/wallet', lang: 'en' },
} satisfies TemplateEntry
