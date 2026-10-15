import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'

import { api } from './api/client'
import { clearSignedIn } from './session'

export function useLogout() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return async () => {
    try {
      await api.logout()
    } catch {
      // the session may already be gone; leaving is what matters
    }
    clearSignedIn()
    queryClient.clear()
    navigate('/', { replace: true })
  }
}
