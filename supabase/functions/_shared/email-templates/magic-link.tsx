/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'

interface MagicLinkEmailProps { siteName: string; confirmationUrl: string; lang?: 'en' | 'my' | 'both' }

export const MagicLinkEmail = ({ siteName, confirmationUrl, lang = 'both' }: MagicLinkEmailProps) => {
  const showEn = lang === 'en' || lang === 'both'
  const showMy = lang === 'my' || lang === 'both'
  return (
    <Html lang={lang === 'my' ? 'my' : 'en'} dir="ltr">
      <Head />
      <Preview>{lang === 'my' ? `${siteName} အတွက် login link` : `Your login link for ${siteName}`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={brand}>Thwe<span style={accent}>Sone</span></Text>
          <div style={card}>
            {showEn && (<>
              <Heading style={h1}>Your login link</Heading>
              <Text style={text}>Click below to log in to <strong>{siteName}</strong>. This link expires shortly.</Text>
              <Button style={button} href={confirmationUrl}>Log in</Button>
              <Text style={footer}>If you didn't request this link, you can safely ignore this email.</Text>
            </>)}
            {showEn && showMy && <hr style={divider} />}
            {showMy && (<>
              <Heading style={h1}>သင့် login link</Heading>
              <Text style={text}><strong>{siteName}</strong> သို့ ဝင်ရောက်ရန် အောက်ပါခလုတ်ကို နှိပ်ပါ။ ဤ link သည် မကြာမီ သက်တမ်းကုန်ဆုံးပါမည်။</Text>
              <Button style={button} href={confirmationUrl}>ဝင်ရောက်မည်</Button>
              <Text style={footer}>သင်ကိုယ်တိုင် မတောင်းဆိုခဲ့ပါက ဤအီးမေးလ်ကို လျစ်လျူရှုနိုင်ပါသည်။</Text>
            </>)}
          </div>
        </Container>
      </Body>
    </Html>
  )
}
export default MagicLinkEmail

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
