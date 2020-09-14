/* eslint-disable class-methods-use-this, no-extra-parens, max-len, no-underscore-dangle */
import { DtoChatRooms, IMessages, IUsers } from '../dto-interfaces/chat.room.dto'
import { IChatRooms, ChatRoomsModel } from '../models/chat.rooms'
import { ErrorMessagesForChatRooms as ECR } from './errors/error.messages'

interface ICustomResponses {
  error: boolean
}

interface ICustomFailResponses extends ICustomResponses {
  message: string[]
}
interface ICustomSuccessResponses extends ICustomResponses {
  deletedChatRoom?: boolean
  message?: IChatRooms
}

class ChatRooms {
  private _args: DtoChatRooms | null

  constructor (args: DtoChatRooms | null = null) {
    this._args = args
  }

  public process (
    type: string
  ):
    | Promise<void>
    | Promise<ICustomSuccessResponses | ICustomFailResponses>
    | Promise<IChatRooms>
    | Promise<IChatRooms[]>
    | undefined {
    switch (type) {
      case 'createChatRoom':
        return this._createChatRoom()
      case 'initialLoadRooms':
        return this._initialLoadRooms()
      case 'joinChatRoom':
        return this._joinChatRoom()
      case 'leaveChatRoom':
        return this._leaveChatRoom()
      case 'saveChatMessage':
        return this._saveChatMessage()
      default:
        return undefined
    }
  }

  private async _createChatRoom (): Promise<
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

  private async _joinChatRoom (): Promise<
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

  private async _leaveChatRoom (): Promise<
    ICustomSuccessResponses | ICustomFailResponses
  > {
    const { name, users } = this._args as DtoChatRooms

    const userToRemove = (users as IUsers[])[0]
    console.log('userToRemove')
    console.log(userToRemove)
    const errors: string[] = []
    try {
      const updatedChatRoom = await ChatRoomsModel.findOneAndUpdate(
        { name: name as string },
        { $pull: { users: userToRemove } },
        { new: true }
      )

      console.log('updatedChatRoom')
      console.log(updatedChatRoom)

      if (updatedChatRoom) {
        if (updatedChatRoom.users.length === 0) {
          await ChatRoomsModel.findOneAndRemove({ name: name as string })

          return {
            deletedChatRoom: true,
            error          : false,
            message        : updatedChatRoom
          }
        }

        return {
          deletedChatRoom: false,
          error          : false,
          message        : updatedChatRoom
        }
      }

      errors.push(ECR.problemRemovingUserFromChat)

      return { error: true, message: errors }
    } catch (error) {
      console.error(error)
      throw new Error(ECR.problemRemovingUserFromChat)
    }
  }

  private async _saveChatMessage (): Promise<void> {
    const { messages, name } = this._args as DtoChatRooms
    try {
      await ChatRoomsModel.findOneAndUpdate(
        { name: name as string },
        {
          $push: {
            messages: {
              _id      : (messages as IMessages[])[0]._id,
              createdAt: (messages as IMessages[])[0].createdAt,
              text     : (messages as IMessages[])[0].text,
              user     : (messages as IMessages[])[0].user
            }
          }
        }
      )
    } catch (error) {
      console.error(ECR.problemWhileSavingMessage)
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
