/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Link, Preview, Text } from 'npm:@react-email/components@0.0.22'

interface InviteEmailProps { siteName: string; siteUrl: string; confirmationUrl: string }

export const InviteEmail = ({ siteName, siteUrl, confirmationUrl }: InviteEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You've been invited to {siteName} / ဖိတ်ခေါ်ခံရပါသည်</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>Thwe<span style={accent}>Sone</span></Text>
        <div style={card}>
          <Heading style={h1}>You've been invited</Heading>
          <Text style={text}>You've been invited to join <Link href={siteUrl} style={link}><strong>{siteName}</strong></Link>. Click below to accept and create your account.</Text>
          <Button style={button} href={confirmationUrl}>Accept invitation</Button>
          <Text style={footer}>If you weren't expecting this, you can safely ignore this email.</Text>

          <hr style={divider} />

          <Heading style={h1}>ဖိတ်ခေါ်ခံရပါသည်</Heading>
          <Text style={text}><strong>{siteName}</strong> သို့ ဝင်ရောက်ရန် သင့်ကို ဖိတ်ခေါ်ထားပါသည်။ လက်ခံပြီး အကောင့်ဖန်တီးရန် အောက်တွင် နှိပ်ပါ။</Text>
          <Button style={button} href={confirmationUrl}>ဖိတ်ကြားခြင်း လက်ခံမည်</Button>
          <Text style={footer}>သင် မမျှော်လင့်ခဲ့ပါက ဤအီးမေးလ်ကို လျစ်လျူရှုနိုင်ပါသည်။</Text>
        </div>
      </Container>
    </Body>
  </Html>
)
export default InviteEmail

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, "Padauk", "Noto Sans Myanmar", sans-serif', margin: 0, padding: 0 }
const container = { maxWidth: '560px', margin: '0 auto', padding: '32px 24px' }
const brand = { fontSize: '20px', fontWeight: 700 as const, color: '#1B1740', margin: '0 0 24px' }
const accent = { color: '#FFBE5C' }
const card = { border: '1px solid #ECEAF5', borderRadius: '12px', padding: '28px 24px', backgroundColor: '#ffffff' }
const h1 = { fontSize: '20px', fontWeight: 700 as const, color: '#1B1740', margin: '0 0 16px', lineHeight: 1.4 }
const text = { fontSize: '15px', color: '#3A3550', lineHeight: 1.7, margin: '0 0 20px' }
const link = { color: '#1B1740', textDecoration: 'underline' }
const button = { backgroundColor: '#1B1740', color: '#ffffff', fontSize: '15px', fontWeight: 600 as const, borderRadius: '8px', padding: '12px 22px', textDecoration: 'none', display: 'inline-block' }
const footer = { fontSize: '12px', color: '#9A95B0', margin: '20px 0 0', lineHeight: 1.6 }
const divider = { border: 'none', borderTop: '1px solid #ECEAF5', margin: '28px 0' }
