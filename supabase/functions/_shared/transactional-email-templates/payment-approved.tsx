/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { Brand, SITE_URL, styles } from './_brand.ts'

interface Props {
  amount?: number | string
  currency?: string
  paymentType?: string
  linkPath?: string
}

const PaymentApproved = ({ amount, currency = 'MMK', paymentType, linkPath }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your payment has been approved</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Brand />
        <div style={styles.card}>
          <Heading style={styles.h1}>Payment approved ✓</Heading>
          <Text style={styles.text}>
            Your{paymentType ? <> {paymentType.replace('_', ' ')}</> : ''} payment
            {amount ? <> of <strong>{amount} {currency}</strong></> : ''} has been approved.
          </Text>
          <Button style={styles.button} href={`${SITE_URL}${linkPath || '/wallet'}`}>View details</Button>
          <hr style={styles.divider} />
          <Text style={styles.footer}>Thank you for using ThweSone.</Text>
        </div>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PaymentApproved,
  subject: 'Your payment has been approved',
  displayName: 'Payment approved',
  previewData: { amount: '50,000', currency: 'MMK', paymentType: 'placement_fee', linkPath: '/employer/finance' },
} satisfies TemplateEntry
