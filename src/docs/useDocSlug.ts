import { useParams } from 'react-router-dom'
import { resolveDocSlug } from './docModules'

export function useDocSlug(): string {
  const { '*': splat = '' } = useParams()
  const segment = splat.split('/').filter(Boolean)[0]
  return resolveDocSlug(segment || undefined)
}
