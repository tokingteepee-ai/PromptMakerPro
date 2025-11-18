import { DynamicForm } from '../DynamicForm'

export default function DynamicFormExample() {
  const handleGenerate = (data: Record<string, string>) => {
    console.log('Generate triggered with data:', data)
  }
  
  return <DynamicForm mode="template" onGenerate={handleGenerate} />
}
