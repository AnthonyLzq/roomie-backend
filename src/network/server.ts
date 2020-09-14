/* eslint-disable max-len, class-methods-use-this, no-extra-parens, no-underscore-dangle */
import express from 'express'
import http from 'http'
import mongoose from 'mongoose'
import morgan from 'morgan'
import socketIO from 'socket.io'

import { applyRoutes } from './routes'
import {
  DtoChatRooms,
  IMessages,
  IUsers
} from '../dto-interfaces/chat.room.dto'
import {
  ChatRooms,
  ICustomFailResponses,
  ICustomSuccessResponses
} from '../controllers/chat.rooms'
import { IChatRooms } from '../models/chat.rooms'

class Server {
  private _app: express.Application
  private _botName = 'Roomie bot'
  private _connection: mongoose.Connection | undefined
  private _port: string

  constructor () {
    this._app = express()
    this._port = (process.env.PORT as string) || '3000'
    this._config()
  }

  private _config () {
    this._app.set('port', this._port)
    this._app.use(morgan('dev'))
    this._app.use(express.json())
    this._app.use(express.urlencoded({ extended: false }))
    this._app.use(
      (
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
      ) => {
        res.header('Access-Control-Allow-Origin', '*')
        res.header(
          'Access-Control-Allow-Headers',
          'Authorization, Content-Type'
        )
        next()
      }
    )
    applyRoutes(this._app)
  }

  private async _mongo (): Promise<void> {
    this._connection = mongoose.connection
    const connection = {
      keepAlive         : true,
      useCreateIndex    : true,
      useFindAndModify  : false,
      useNewUrlParser   : true,
      useUnifiedTopology: true
    }
    this._connection.on('connected', () => {
      console.log('Mongo connection established.')
    })
    this._connection.on('reconnected', () => {
      console.log('Mongo connection reestablished')
    })
    this._connection.on('disconnected', () => {
      console.log('Mongo connection disconnected')
      console.log('Trying to reconnected to Mongo...')
      setTimeout(() => {
        mongoose.connect(process.env.MONGO_URI as string, {
          ...connection,
          connectTimeoutMS: 3000,
          socketTimeoutMS : 3000
        })
      }, 3000)
    })
    this._connection.on('close', () => {
      console.log('Mongo connection closed')
    })
    this._connection.on('error', (error: Error) => {
      console.log('Mongo connection error:')
      console.error(error)
    })
    await mongoose.connect(process.env.MONGO_URI as string, connection)
  }

  private _socketConnection (io: socketIO.Server): void {
    // Run when a client connect
    io.on('connection', async (socket: socketIO.Socket): Promise<void> => {
      socket.emit(
        'initialLoadRooms',
        await new ChatRooms().process('initialLoadRooms')
      )

      socket.on('createChatRoom', async (room: DtoChatRooms): Promise<void> => {
        try {
          const createdRoom = await new ChatRooms(room).process('createChatRoom')

          if (createdRoom)
            if ((createdRoom as ICustomSuccessResponses | ICustomFailResponses).error)
              socket.emit(
                'createError',
                (createdRoom as ICustomSuccessResponses | ICustomFailResponses).message
              )
            else {
              const roomToReport = (createdRoom as ICustomSuccessResponses | ICustomFailResponses).message as IChatRooms
              const roomWithOutUselessInfo = {
                connectedUsers: roomToReport.users.length,
                isPublic      : roomToReport.isPublic,
                maxUsers      : roomToReport.maxUsers,
                name          : roomToReport.name
              }
              socket.emit('createSuccess', roomToReport)
              io.emit('addRoomToLobby', roomWithOutUselessInfo)
              socket.join(room.name as string)
            }
        } catch (error) {
          socket.emit('createError', `Internal server error: ${error.message}`)
        }

        // Listen for chat messages
        socket.on('chatMessage', async (message: IMessages): Promise<void> => {
          console.log('chatMessage')
          console.log(message)
          socket.broadcast.to(message.room as string).emit('message', {
            _id : message._id,
            text: message.text,
            user: message.user
          })
          try {
            await new ChatRooms({
              messages: [{
                _id      : message._id as string,
                createdAt: message.createdAt as Date,
                text     : message.text as string,
                user     : message.user as IUsers
              }] as IMessages[],
              name: message.room as string
            }).process('saveChatMessage')
          } catch (error) {
            socket.emit('saveMessageError', `Internal server error: ${error.message}`)
          }
        })

        // Broadcast when a user disconnects
        socket.on('leaveChatRoom', async (currentRoom: DtoChatRooms) => {
          console.log('currentRoom')
          console.log(currentRoom)
          try {
            const updatedRoom = await new ChatRooms(currentRoom).process('leaveChatRoom')
            console.log('leaveChatRoom')
            console.log(updatedRoom)

            if (updatedRoom)
              if ((updatedRoom as ICustomSuccessResponses | ICustomFailResponses).error) {
                socket.emit(
                  'leaveChatRoomError',
                  (updatedRoom as ICustomSuccessResponses | ICustomFailResponses).message
                )
                console.log('leaveChatRoom')
                console.log((updatedRoom as ICustomSuccessResponses | ICustomFailResponses).message)
              } else {
                const roomToReport = updatedRoom as ICustomSuccessResponses
                if (roomToReport.deletedChatRoom as boolean) {
                  io.emit('deletedChatRoom', (roomToReport.message as IChatRooms).name)
                  console.log('deletedChatRoom')
                  console.log((roomToReport.message as IChatRooms).name)
                } else {
                  const roomWithUpdatedInfo = {
                    connectedUsers: (roomToReport.message as IChatRooms).users.length,
                    name          : (roomToReport.message as IChatRooms).name
                  }
                  io.emit('updateConnectedUsersInRoom', roomWithUpdatedInfo)
                  console.log('updateConnectedUsersInRoom')
                  console.log(roomWithUpdatedInfo)
                }
              }
          } catch (error) {
            socket.emit('leaveError', `Internal server error: ${error.message}`)
          }
        })
      })

      socket.on('joinChatRoom', async (room: DtoChatRooms): Promise<void> => {
        try {
          const allowed = await new ChatRooms(room).process('joinChatRoom')

          if (allowed)
            if ((allowed as ICustomSuccessResponses | ICustomFailResponses).error)
              socket.emit(
                'joinError',
                (allowed as ICustomSuccessResponses | ICustomFailResponses).message
              )
            else {
              const roomToReport = (allowed as ICustomSuccessResponses | ICustomFailResponses).message as IChatRooms
              const roomWithUpdatedInfo = {
                connectedUsers: roomToReport.users.length,
                name          : roomToReport.name
              }
              socket.emit('joinSuccess', roomToReport)
              io.emit('updateConnectedUsersInRoom', roomWithUpdatedInfo)
              socket.join(room.name as string)
            }
        } catch (error) {
          socket.emit('joinError', `Internal server error: ${error.message}`)
        }

        // Listen for chat messages
        socket.on('chatMessage', async (message: IMessages): Promise<void> => {
          console.log('chatMessage')
          console.log(message)
          socket.broadcast.to(message.room as string).emit('message', {
            _id : message._id,
            text: message.text,
            user: message.user
          })
          try {
            await new ChatRooms({
              messages: [{
                _id      : message._id as string,
                createdAt: message.createdAt as Date,
                text     : message.text as string,
                user     : message.user as IUsers
              }] as IMessages[],
              name: message.room as string
            }).process('saveChatMessage')
          } catch (error) {
            socket.emit('saveMessageError', `Internal server error: ${error.message}`)
          }
        })

        // Broadcast when a user disconnects
        socket.on('leaveChatRoom', async (currentRoom: DtoChatRooms) => {
          console.log('currentRoom')
          console.log(currentRoom)
          try {
            const updatedRoom = await new ChatRooms(currentRoom).process('leaveChatRoom')
            console.log('leaveChatRoom')
            console.log(updatedRoom)

            if (updatedRoom)
              if ((updatedRoom as ICustomSuccessResponses | ICustomFailResponses).error) {
                socket.emit(
                  'leaveChatRoomError',
                  (updatedRoom as ICustomSuccessResponses | ICustomFailResponses).message
                )
                console.log('leaveChatRoom')
                console.log((updatedRoom as ICustomSuccessResponses | ICustomFailResponses).message)
              } else {
                const roomToReport = updatedRoom as ICustomSuccessResponses
                if (roomToReport.deletedChatRoom as boolean) {
                  io.emit('deletedChatRoom', (roomToReport.message as IChatRooms).name)
                  console.log('deletedChatRoom')
                  console.log((roomToReport.message as IChatRooms).name)
                } else {
                  const roomWithUpdatedInfo = {
                    connectedUsers: (roomToReport.message as IChatRooms).users.length,
                    name          : (roomToReport.message as IChatRooms).name
                  }
                  io.emit('updateConnectedUsersInRoom', roomWithUpdatedInfo)
                  console.log('updateConnectedUsersInRoom')
                  console.log(roomWithUpdatedInfo)
                }
              }
          } catch (error) {
            socket.emit('leaveError', `Internal server error: ${error.message}`)
          }
        })
      })
    })
  }

  public start (): void {
    const server = http.createServer(this._app)
    const io = socketIO(server)

    this._socketConnection(io)
    server.listen(this._port, () =>
      console.log(`Server running at port ${this._app.get('port')}`)
    )

    try {
      this._mongo()
    } catch (error) {
      console.error(error)
    }
  }
}

const server = new Server()

export { server as Server }
