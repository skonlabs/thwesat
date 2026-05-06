/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { Brand, SITE_URL, styles, pickLang, type Lang } from './_brand.ts'

interface Props { name?: string; lang?: Lang }

const copy = {
  en: {
    preview: 'You earned 1,000 free credits 🎁',
    h1: (n?: string) => `${n ? `Nice work, ${n}!` : 'Welcome bonus unlocked!'} 🎁`,
    body1: <>You completed your profile and applied for your first job. As a thank-you, we've added <strong>1,000 free credits</strong> to your wallet.</>,
    body2: 'Use them to unlock contacts, book mentor sessions, or boost your visibility.',
    btn: 'Open wallet',
    footer: 'Refer 5 friends who apply for a job and earn 5,000 more.',
    subject: '🎁 You earned 1,000 free credits',
  },
  my: {
    preview: '၁,၀၀၀ credits အခမဲ့ ရရှိပါပြီ 🎁',
    h1: (n?: string) => `${n ? `${n}၊ ဂုဏ်ယူပါတယ်!` : 'Welcome bonus ရရှိပါပြီ!'} 🎁`,
    body1: <>သင့် profile ပြည့်စုံစေပြီး ပထမဆုံးအလုပ်ကို လျှောက်ထားပြီးဖြစ်သည့်အတွက် ကျေးဇူးအမှတ်အသားအဖြစ် သင့် wallet ထဲသို့ <strong>၁,၀၀၀ credits အခမဲ့</strong> ထည့်ပေးထားပါသည်။</>,
    body2: 'Credits ဖြင့် ဆက်သွယ်ရန်အချက်အလက်များ ဖွင့်ခြင်း၊ mentor session ဘွတ်ကင်လုပ်ခြင်း သို့မဟုတ် profile ကို မြှင့်တင်ခြင်းတို့ ပြုလုပ်နိုင်ပါသည်။',
    btn: 'Wallet ဖွင့်မည်',
    footer: 'အလုပ်လျှောက်ထားသည့် သူငယ်ချင်း ၅ ဦးကို ဖိတ်ခေါ်ပါ၊ ၅,၀၀၀ credits ထပ်ရရှိပါမည်။',
    subject: '🎁 ၁,၀၀၀ credits အခမဲ့ ရရှိပါပြီ',
  },
}

const WelcomeBonus = ({ name, lang }: Props) => {
  const c = copy[pickLang(lang)]
  return (
    <Html lang={pickLang(lang)} dir="ltr">
      <Head />
      <Preview>{c.preview}</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Brand />
          <div style={styles.card}>
            <Heading style={styles.h1}>{c.h1(name)}</Heading>
            <Text style={styles.text}>{c.body1}</Text>
            <Text style={styles.text}>{c.body2}</Text>
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
  component: WelcomeBonus,
  subject: (d: Props) => copy[pickLang(d?.lang)].subject,
  displayName: 'Welcome bonus',
  previewData: { name: 'Ko Min', lang: 'en' },
} satisfies TemplateEntry
