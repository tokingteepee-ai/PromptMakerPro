import { ValidatorPanel, type ValidationResult } from '../ValidatorPanel'

export default function ValidatorPanelExample() {
  const sampleResults: ValidationResult[] = [
    { type: 'success', message: 'Prompt includes clear goal and context' },
    { type: 'success', message: 'Target audience is well-defined' },
    { type: 'warning', message: 'Consider adding more specific examples for better results' },
    { type: 'info', message: 'Prompt length is optimal for Claude 3.5 Sonnet' },
  ]
  
  return <ValidatorPanel results={sampleResults} />
}
