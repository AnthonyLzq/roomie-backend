import { Document, model, Schema } from 'mongoose'
import { IMessages, IUsers } from '../dto-interfaces/chat.room.dto'

interface IChatRooms extends Document {
  messages       : IMessages[]
  name           : string
  password       : string
  peopleConnected: number
  type           : boolean
  users          : IUsers[]
}

const Users = new Schema({
  avatar: String,
  id    : {
    required: true,
    type    : String
  },
  name: {
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

const ChatRooms = new Schema({
  messages: [Messages],
  name    : {
    required: true,
    type    : String
  },
  password: {
    required: false,
    type    : String
  },
  peopleConnected: {
    default: 1,
    type   : Number
  },
  type: {
    default: true,
    type   : Boolean
  },
  users: {
    required: true,
    type    : [Users]
  }
})

const ChatRoomsModel = model<IChatRooms>('chatRooms', ChatRooms)

export { ChatRoomsModel, IChatRooms }
