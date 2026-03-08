import ProtectedRoute from './ProtectedRoute'
import ProfileGate from './ProfileGate'
import BaseLayout from './BaseLayout'

export default function ProtectedLayout() {
  return (
    <ProtectedRoute>
      <ProfileGate>
        <BaseLayout />
      </ProfileGate>
    </ProtectedRoute>
  )
}
