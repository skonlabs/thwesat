/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export const SITE_NAME = 'ThweSone'
export const SITE_URL = 'https://thwesat.com'

export type Lang = 'en' | 'my'

export function pickLang(input: any): Lang {
  return input === 'my' ? 'my' : 'en'
}

export const styles = {
  main: {
    backgroundColor: '#ffffff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, "Padauk", "Noto Sans Myanmar", sans-serif',
    margin: 0,
    padding: 0,
  } as const,
  container: { maxWidth: '560px', margin: '0 auto', padding: '32px 24px' } as const,
  brand: { fontSize: '20px', fontWeight: 700 as const, color: '#1B1740', letterSpacing: '-0.01em', margin: '0 0 24px' } as const,
  brandAccent: { color: '#FFBE5C' } as const,
  card: { border: '1px solid #ECEAF5', borderRadius: '12px', padding: '28px 24px', backgroundColor: '#ffffff' } as const,
  h1: { fontSize: '22px', fontWeight: 700 as const, color: '#1B1740', margin: '0 0 16px', lineHeight: 1.4 } as const,
  text: { fontSize: '15px', color: '#3A3550', lineHeight: 1.7, margin: '0 0 18px' } as const,
  muted: { fontSize: '13px', color: '#7A7592', lineHeight: 1.6, margin: '0 0 14px' } as const,
  button: { backgroundColor: '#1B1740', color: '#ffffff', fontSize: '15px', fontWeight: 600 as const, borderRadius: '8px', padding: '12px 22px', textDecoration: 'none', display: 'inline-block' } as const,
  buttonGold: { backgroundColor: '#FFBE5C', color: '#1B1740', fontSize: '15px', fontWeight: 700 as const, borderRadius: '8px', padding: '12px 22px', textDecoration: 'none', display: 'inline-block' } as const,
  divider: { border: 'none', borderTop: '1px solid #ECEAF5', margin: '28px 0' } as const,
  footer: { fontSize: '12px', color: '#9A95B0', margin: '24px 0 0', lineHeight: 1.6 } as const,
  highlight: { backgroundColor: '#FFF6E5', border: '1px solid #FFE5B0', borderRadius: '8px', padding: '14px 16px', fontSize: '14px', color: '#1B1740', margin: '0 0 18px' } as const,
}

export const Brand = () =>
  React.createElement(
    'div',
    { style: styles.brand },
    'Thwe',
    React.createElement('span', { style: styles.brandAccent }, 'Sone'),
  )
