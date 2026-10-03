import { iniciales } from '../lib/format'
import type { Usuario } from '../lib/types'

export function Avatar({ user, size }: { user?: Pick<Usuario, 'nombre' | 'avatar_color'>; size?: 'sm' | 'lg' }) {
  if (!user) return null
  return (
    <span className={`avatar ${size ?? ''}`} style={{ background: user.avatar_color }} title={user.nombre}>
      {iniciales(user.nombre)}
    </span>
  )
}

export function AvatarStack({ users }: { users: Usuario[] }) {
  return (
    <div className="avatar-stack">
      {users.map((u) => (
        <Avatar key={u.id} user={u} />
      ))}
    </div>
  )
}
