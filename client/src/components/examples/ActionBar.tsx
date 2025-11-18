import { ActionBar } from '../ActionBar'

export default function ActionBarExample() {
  return (
    <ActionBar
      onCopy={() => console.log('Copy triggered')}
      onEdit={() => console.log('Edit triggered')}
      onRemix={() => console.log('Remix triggered')}
    />
  )
}
