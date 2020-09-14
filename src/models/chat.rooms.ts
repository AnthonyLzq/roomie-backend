import { Document, model, Schema } from 'mongoose'
import { IMessages, IUsers } from '../dto-interfaces/chat.room.dto'

interface IChatRooms extends Document {
  isPublic: boolean
  maxUsers: number
  messages: IMessages[]
  name    : string
  password: string
  users   : IUsers[]
}

const Users = new Schema({
  _id: {
    required: true,
    type    : String
  },
  avatar: String,
  name  : {
    required: true,
    type    : String
  }
})

const Messages = new Schema({
  createdAt: {
    required: true,
    type    : Date
  },
  id: {
    required: true,
    type    : String
  },
  text: {
    required: true,
    type    : String
  },
  user: {
    required: true,
    type    : Users
  }
})

const ChatRooms = new Schema(
  {
    isPublic: {
      default: true,
      type   : Boolean
    },
    maxUsers: Number,
    messages: [Messages],
    name    : {
      required: true,
      type    : String
    },
    password: {
      required: false,
      type    : String
    },
    users: {
      required: true,
      type    : [Users]
    }
  },
  {
    collection: 'chatRooms'
  }
)

const ChatRoomsModel = model<IChatRooms>('chatRooms', ChatRooms)

export { ChatRoomsModel, IChatRooms }
