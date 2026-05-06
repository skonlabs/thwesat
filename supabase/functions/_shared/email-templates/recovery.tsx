/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'

interface RecoveryEmailProps { siteName: string; confirmationUrl: string }

export const RecoveryEmail = ({ siteName, confirmationUrl }: RecoveryEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Reset your password for {siteName} / စကားဝှက် ပြန်လည်သတ်မှတ်ပါ</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>Thwe<span style={accent}>Sone</span></Text>
        <div style={card}>
          <Heading style={h1}>Reset your password</Heading>
          <Text style={text}>We received a request to reset your password for <strong>{siteName}</strong>. Click below to choose a new one.</Text>
          <Button style={button} href={confirmationUrl}>Reset password</Button>
          <Text style={footer}>If you didn't request this, you can safely ignore this email — your password won't change.</Text>

          <hr style={divider} />

          <Heading style={h1}>စကားဝှက် ပြန်လည်သတ်မှတ်ပါ</Heading>
          <Text style={text}><strong>{siteName}</strong> အတွက် သင့်စကားဝှက် ပြန်လည်သတ်မှတ်ရန် တောင်းဆိုမှု ရရှိခဲ့ပါသည်။ စကားဝှက်အသစ် ရွေးချယ်ရန် အောက်တွင် နှိပ်ပါ။</Text>
          <Button style={button} href={confirmationUrl}>စကားဝှက် ပြောင်းမည်</Button>
          <Text style={footer}>သင်ကိုယ်တိုင် မတောင်းဆိုခဲ့ပါက ဤအီးမေးလ်ကို လျစ်လျူရှုနိုင်ပြီး စကားဝှက် ပြောင်းသွားမည် မဟုတ်ပါ။</Text>
        </div>
      </Container>
    </Body>
  </Html>
)
export default RecoveryEmail

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, "Padauk", "Noto Sans Myanmar", sans-serif', margin: 0, padding: 0 }
const container = { maxWidth: '560px', margin: '0 auto', padding: '32px 24px' }
const brand = { fontSize: '20px', fontWeight: 700 as const, color: '#1B1740', margin: '0 0 24px' }
const accent = { color: '#FFBE5C' }
const card = { border: '1px solid #ECEAF5', borderRadius: '12px', padding: '28px 24px', backgroundColor: '#ffffff' }
const h1 = { fontSize: '20px', fontWeight: 700 as const, color: '#1B1740', margin: '0 0 16px', lineHeight: 1.4 }
const text = { fontSize: '15px', color: '#3A3550', lineHeight: 1.7, margin: '0 0 20px' }
const button = { backgroundColor: '#1B1740', color: '#ffffff', fontSize: '15px', fontWeight: 600 as const, borderRadius: '8px', padding: '12px 22px', textDecoration: 'none', display: 'inline-block' }
const footer = { fontSize: '12px', color: '#9A95B0', margin: '20px 0 0', lineHeight: 1.6 }
const divider = { border: 'none', borderTop: '1px solid #ECEAF5', margin: '28px 0' }
