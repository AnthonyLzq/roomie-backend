/* eslint-disable class-methods-use-this, no-extra-parens, max-len */
import { DtoChatRooms, IUsers } from '../dto-interfaces/chat.room.dto'
import { IChatRooms, ChatRoomsModel } from '../models/chat.rooms'
import { ErrorMessagesForChatRooms as ECR } from './errors/error.messages'

interface ICustomResponses {
  error: boolean
}

interface ICustomFailResponses extends ICustomResponses {
  message: string[]
}
interface ICustomSuccessResponses extends ICustomResponses {
  message: IChatRooms
}

class ChatRooms {
  private _args: DtoChatRooms | null

  constructor (args: DtoChatRooms | null = null) {
    this._args = args
  }

  public process (
    type: string
  ):
    | Promise<ICustomSuccessResponses | ICustomFailResponses>
    | Promise<IChatRooms>
    | Promise<IChatRooms[]>
    | undefined {
    switch (type) {
      case 'createChatRoom':
        return this._createChat()
      case 'initialLoadRooms':
        return this._initialLoadRooms()
      case 'joinChatRoom':
        return this._joinAChat()
      default:
        return undefined
    }
  }

  private async _createChat (): Promise<
    ICustomSuccessResponses | ICustomFailResponses
  > {
    const { isPublic, maxUsers, name, password, users } = this._args as DtoChatRooms

    try {
      const chatRoom = await ChatRoomsModel.findOne({ name: name as string })

      if (!chatRoom) {
        let newChatRoom: IChatRooms
        if (isPublic as boolean)
          newChatRoom = new ChatRoomsModel({
            isPublic: isPublic as boolean,
            maxUsers: maxUsers as number,
            name    : name as string,
            users   : users as IUsers[]
          })
        else
          newChatRoom = new ChatRoomsModel({
            isPublic: isPublic as boolean,
            maxUsers: maxUsers as number,
            name    : name as string,
            password: password as string,
            users   : users as IUsers[]
          })
        const result = await newChatRoom.save()

        return { error: false, message: result }
      }

      return { error: true, message: [ECR.duplicatedChatRoom] }
    } catch (error) {
      console.error(error)
      throw new Error(ECR.problemCreatingAChatRoom)
    }
  }

  private async _initialLoadRooms (): Promise<IChatRooms[]> {
    try {
      const chatRooms = await ChatRoomsModel.aggregate([
        {
          $project: {
            connectedUsers: {
              $size: '$users'
            },
            isPublic: true,
            maxUsers: true,
            name    : true
          }
        }
      ])

      return chatRooms
    } catch (error) {
      console.error(error)
      throw new Error(ECR.problemGettingAllTheChatsInTheInitialLoad)
    }
  }

  private async _joinAChat (): Promise<
    ICustomSuccessResponses | ICustomFailResponses
  > {
    const { name, password, users } = this._args as DtoChatRooms
    const errors: string[] = []

    try {
      const requestedChatRoom = await ChatRoomsModel.findOne({
        name: name as string
      })

      if (requestedChatRoom) {
        const names = requestedChatRoom.users.map((user: IUsers) => user.name)
        const userExists = names.includes((users as IUsers[])[0].name)

        if (userExists) errors.push(ECR.duplicatedUser)

        if (
          !userExists &&
          requestedChatRoom.isPublic &&
          requestedChatRoom.maxUsers >= requestedChatRoom.users.length + 1
        ) {
          const updatedRoom = await this._updateChatAndReturnItWithSortedMessages(
            name as string,
            (users as IUsers[])[0]
          )

          return { error: false, message: updatedRoom[0] }
        }
        if (
          !userExists &&
          requestedChatRoom.maxUsers >= requestedChatRoom.users.length + 1
        ) {
          if (password === requestedChatRoom.password) {
            const updatedRoom = await this._updateChatAndReturnItWithSortedMessages(
              name as string,
              (users as IUsers[])[0]
            )

            return { error: false, message: updatedRoom[0] }
          }
          errors.push(ECR.incorrectPassword)
        }
        errors.push(ECR.chatIsFull)
      } else errors.push(ECR.chatRoomNotFound)

      return { error: true, message: errors }
    } catch (error) {
      console.error(error)
      throw new Error(ECR.problemValidatingIfTheUserCanEnter)
    }
  }

  private async _updateChatAndReturnItWithSortedMessages (
    name: string,
    user: IUsers
  ): Promise<IChatRooms[]> {
    await ChatRoomsModel.findOneAndUpdate({ name }, { $push: { users: user } })

    const updatedChatRoom = await ChatRoomsModel.aggregate([
      {
        $unwind: {
          path                      : '$messages',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $sort: {
          'messages.createdAt': -1
        }
      },
      {
        $group: {
          _id: {
            _id     : '$_id',
            isPublic: '$isPublic',
            maxUsers: '$maxUsers',
            name    : '$name',
            password: '$password',
            users   : '$users'
          },
          sortedMessages: {
            $push: '$messages'
          }
        }
      },
      {
        $project: {
          _id     : '$_id._id',
          isPublic: '$_id.isPublic',
          maxUsers: '$_id.maxUsers',
          messages: '$sortedMessages',
          name    : '$_id.name',
          password: '$_id.password',
          users   : '$_id.users'
        }
      },
      {
        $match: {
          name: `${name}`
        }
      }
    ])

    return (updatedChatRoom as unknown) as IChatRooms[]
  }
}

export { ChatRooms, ICustomFailResponses, ICustomSuccessResponses }
