import { TrustSafetyPanel, type TrustSafetySettings } from '../TrustSafetyPanel'
import { useState } from 'react'

export default function TrustSafetyPanelExample() {
  const [settings, setSettings] = useState<TrustSafetySettings>({
    safetyMode: true,
    rubric: 'balanced',
    proofVsOpinion: 'balanced',
    clarityLevel: 3,
    consentSafeMode: true,
    ethicalGuardrails: true,
    personaIntegrityTags: ['Respectful', 'Transparency-Focused'],
  })
  
  return (
    <TrustSafetyPanel
      mode="agent"
      settings={settings}
      onSettingsChange={setSettings}
      trustScore={85}
      trustBadgeEligible={true}
    />
  )
}
