import { IUsers } from './users'

interface IChatRooms {
  name     : string
  password?: string
  type     : boolean
  users    : IUsers[]
}

// Join user to chat room
const userJoin = (
  id  : string,
  room: IChatRooms,
  name: string
): IUsers => {
  const user = { id, name } as IUsers
  room.users.push(user)

  return user
}

export { IChatRooms, userJoin }
