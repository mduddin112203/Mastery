import ProtectedRoute from './ProtectedRoute'
import BaseLayout from './BaseLayout'

export default function ProtectedLayout() {
  return (
    <ProtectedRoute>
      <BaseLayout />
    </ProtectedRoute>
  )
}
