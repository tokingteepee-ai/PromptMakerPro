import { ModeSelector, type OutputMode } from '../ModeSelector'
import { useState } from 'react'

export default function ModeSelectorExample() {
  const [mode, setMode] = useState<OutputMode>('template')
  
  return <ModeSelector selectedMode={mode} onModeChange={setMode} />
}
