import { useLocation } from 'react-router-dom'

export type NavPage = 'home' | 'lab' | 'docs'

export function useNavPage(): NavPage {
  const { pathname } = useLocation()

  if (pathname.startsWith('/lab')) {
    return 'lab'
  }

  if (pathname.startsWith('/docs')) {
    return 'docs'
  }

  return 'home'
}
