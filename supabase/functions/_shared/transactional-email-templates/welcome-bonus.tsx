/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { Brand, SITE_URL, styles } from './_brand.ts'

interface Props {
  name?: string
}

const WelcomeBonus = ({ name }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You earned 1,000 free credits 🎁</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Brand />
        <div style={styles.card}>
          <Heading style={styles.h1}>{name ? `Nice work, ${name}!` : 'Welcome bonus unlocked!'} 🎁</Heading>
          <Text style={styles.text}>
            You completed your profile and applied for your first job. As a thank-you, we've added <strong>1,000 free credits</strong> to your wallet.
          </Text>
          <Text style={styles.text}>
            Use them to unlock contacts, book mentor sessions, or boost your visibility.
          </Text>
          <Button style={styles.buttonGold} href={`${SITE_URL}/wallet`}>Open wallet</Button>
          <hr style={styles.divider} />
          <Text style={styles.footer}>Refer 5 friends who apply for a job and earn 5,000 more.</Text>
        </div>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WelcomeBonus,
  subject: '🎁 You earned 1,000 free credits',
  displayName: 'Welcome bonus',
  previewData: { name: 'Ko Min' },
} satisfies TemplateEntry
