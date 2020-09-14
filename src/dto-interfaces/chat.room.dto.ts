export interface IUsers {
  _id  : string
  name: string
}

export interface IMessages {
  _id      : string
  createdAt: Date
  text     : string
  user     : IUsers
}

export interface DtoChatRooms {
  isPublic?: boolean
  maxUsers?: number
  messages?: IMessages[]
  name?    : string
  password?: string
  users?   : IUsers[]
}
