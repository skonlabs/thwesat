/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { Brand, SITE_URL, styles, pickLang, type Lang } from './_brand.ts'

interface Props { credits?: number | string; mmkAmount?: number | string; lang?: Lang }

const copy = {
  en: {
    preview: 'Your wallet top-up was approved',
    h1: 'Top-up approved 💰',
    body: (cr?: string | number, mmk?: string | number) => (
      <><strong>{cr || ''} credits</strong> have been added to your ThweSone wallet{mmk ? <> for {mmk} MMK</> : null}.</>
    ),
    btn: 'Open wallet',
    footer: 'Use credits to unlock contacts, post jobs, and book mentor sessions.',
    subject: 'Your wallet top-up was approved',
  },
  my: {
    preview: 'သင့်ပိုက်ဆံအိတ် ထပ်ဖြည့်မှု အတည်ပြုပြီး',
    h1: 'Top-up အတည်ပြုပြီး 💰',
    body: (cr?: string | number, mmk?: string | number) => (
      <>သင့် ThweSone wallet သို့ <strong>{cr || ''} credits</strong> ထည့်ပေးပြီးပါပြီ{mmk ? <> ({mmk} MMK)</> : null}။</>
    ),
    btn: 'Wallet ဖွင့်မည်',
    footer: 'Credits ဖြင့် ဆက်သွယ်ရန်အချက်အလက်များ ဖွင့်ခြင်း၊ အလုပ်တင်ခြင်းနှင့် mentor session ဘွတ်ကင်လုပ်ခြင်းတို့ ပြုလုပ်နိုင်ပါသည်။',
    subject: 'သင့်ပိုက်ဆံအိတ် ထပ်ဖြည့်မှု အတည်ပြုပြီး',
  },
}

const TopupApproved = ({ credits, mmkAmount, lang }: Props) => {
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
            <Text style={styles.text}>{c.body(credits, mmkAmount)}</Text>
            <Button style={styles.buttonGold} href={`${SITE_URL}/wallet`}>{c.btn}</Button>
            <hr style={styles.divider} />
            <Text style={styles.footer}>{c.footer}</Text>
          </div>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: TopupApproved,
  subject: (d: Props) => copy[pickLang(d?.lang)].subject,
  displayName: 'Top-up approved',
  previewData: { credits: '5,000', mmkAmount: '5,000', lang: 'en' },
} satisfies TemplateEntry
