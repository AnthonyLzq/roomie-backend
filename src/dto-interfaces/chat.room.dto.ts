export interface IUsers {
  id  : string
  name: string
}

export interface IMessages {
  createdAt: Date
  id       : string
  text     : string
  user     : IUsers
}

export interface DtoChatRooms {
  id?      : string
  isPublic?: boolean
  messages?: IMessages[]
  name?    : string
  password?: string
  users?   : IUsers[]
}
