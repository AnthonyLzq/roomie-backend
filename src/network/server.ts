/* eslint-disable max-len */
/* eslint-disable no-extra-parens */
import express from 'express'
import http from 'http'
import mongoose from 'mongoose'
import morgan from 'morgan'
import socketIO from 'socket.io'

import { applyRoutes } from './routes'
import {
  DtoChatRooms
  // IMessages,
  // IUsers
} from '../dto-interfaces/chat.room.dto'
import {
  ChatRooms,
  ICustomFailResponses,
  ICustomSuccessResponses
} from '../controllers/chat.rooms'

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

  // eslint-disable-next-line class-methods-use-this
  private _socketConnection (io: socketIO.Server): void {
    // Run when a client connect
    io.on('connection', async (socket: socketIO.Socket): Promise<void> => {
      socket.emit(
        'initialLoadRooms',
        await new ChatRooms().process('initialLoadRooms')
      )

      socket.on('joinRoom', async (room: DtoChatRooms): Promise<void> => {
        try {
          const allowed = await new ChatRooms(room).process('joinAChat')

          if (
            allowed &&
            (allowed as ICustomSuccessResponses | ICustomFailResponses).error
          )
            socket.emit(
              'joinError',
              (allowed as ICustomSuccessResponses | ICustomFailResponses).message
            )
          else if (
            allowed &&
            !(allowed as ICustomSuccessResponses | ICustomFailResponses).error) {
            socket.emit(
              'joinSuccess',
              (allowed as ICustomSuccessResponses | ICustomFailResponses).message
            )
            socket.join(room.name as string)
          }
        } catch (error) {
          console.error(error)
        }

        //   // Welcome to current user
        //   socket.emit(
        //     'message',
        //     formatMessage({
        //       text    : 'Welcome to Roomie!',
        //       username: this._botName
        //     })
        //   )

        //   // Broadcast when a user connects to the chat room
        //   socket.broadcast.to(user.room).emit(
        //     'message',
        //     formatMessage({
        //       text    : `${user.username} has joined the chat`,
        //       username: this._botName
        //     })
        //   )

        //   // Send users and room info
        //   io.to(user.room).emit('roomUsers', {
        //     room : user.room,
        //     users: getRoomUsers(user.room)
        //   })
        // })

        // // Listen for chat messages
        // socket.on('chatMessage', (message: string) => {
        //   const { room, username } = getCurrentUser(socket.id) as IUsers

        //   io.to(room as string).emit(
        //     'message',
        //     formatMessage({ text: message, username: username as string })
        //   )
        // })

        // // Broadcast when a user disconnects
        // socket.on('disconnect', () => {
        //   const user = userLeave(socket.id)

        //   if (user) {
        //     io.to(user.room).emit(
        //       'message',
        //       formatMessage({
        //         text    : `${user.username} has left the chat`,
        //         username: this._botName
        //       })
        //     )

        //     // Send users and room info
        //     io.to(user.room).emit('roomUsers', {
        //       room : user.room,
        //       users: getRoomUsers(user.room)
        //     })
        //   }
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
