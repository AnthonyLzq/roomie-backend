import { DtoChatRooms } from '../dto-interfaces/chat.room.dto'
import { IChatRooms, ChatRoomsModel } from '../models/chat.rooms'
import { ErrorMessagesForChatRooms as ECR } from './errors/error.messages'

class ChatRooms {
  private _args: DtoChatRooms | null

  constructor (args: DtoChatRooms | null = null) {
    this._args = args
  }

  public process (
    type: string
  ): Promise<IChatRooms> | Promise<IChatRooms[]> | undefined {
    switch (type) {
      case 'createChat':
        return this._createChat()
      case 'initialLoadRooms':
        return this._initialLoadRooms()
      // case 'joinAChat':
      //   return this._joinAChat()
      default:
        return undefined
    }
  }

  private async _createChat (): Promise<IChatRooms> {
    const { isPublic, name, password, users } = this._args as DtoChatRooms
    let chatRoom: IChatRooms
    if (isPublic) chatRoom = new ChatRoomsModel({ isPublic, name, users })
    else chatRoom = new ChatRoomsModel({ isPublic, name, password, users })

    try {
      const newChatRoom = await chatRoom.save()

      return newChatRoom
    } catch (error) {
      console.error(error)
      throw new Error(ECR.problemCreatingAChatRoom)
    }
  }

  // eslint-disable-next-line class-methods-use-this
  private async _initialLoadRooms (): Promise<IChatRooms[]> {
    try {
      const chatRooms = await ChatRoomsModel.aggregate([
        {
          '$project': {
            'connectedUsers': {
              '$size': '$users'
            },
            'isPublic': true,
            'maxUsers': true,
            'name'    : true
          }
        }
      ])

      return chatRooms
    } catch (error) {
      console.error(error)
      throw new Error(ECR.problemGettingAllTheChatsInTheInitialLoad)
    }
  }

  // private async _joinAChat (): Promise<{ allowed: boolean }> {
  //   const { id, isPublic, password, users } = this._args as DtoChatRooms

  //   try {
  //     if (isPublic) {
  //       await ChatRoomsModel.findByIdAndUpdate(id, { $push: { users } })

  //       return { allowed: true }
  //     }

  //     const requestedChat = await ChatRoomsModel.findById(id)
  //     if (requestedChat.password === password) {
  //       await ChatRoomsModel.findByIdAndUpdate(id, { $push: { users } })

  //       return { allowed: true }
  //     }

  //     return { allowed: false }
  //   } catch (error) {
  //     console.error(error)
  //     throw new Error(ECR.problemValidatingIfTheUserCanEnter)
  //   }
  // }
}

export { ChatRooms }
