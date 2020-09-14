/* eslint-disable no-extra-parens */
import express from 'express'
import http from 'http'
import mongoose from 'mongoose'
import morgan from 'morgan'
import socketIO from 'socket.io'

import { applyRoutes } from './routes'
// import { formatMessage } from '../utils/messages'
import { IUsers } from '../utils/users'
import { IChatRooms, userJoin } from '../utils/chat.room'

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
    io.on('connection', (socket: socketIO.Socket): void => {
      let i = 0
      const id = setInterval(() => {
        if (i === 3) clearInterval(id)
        socket.emit('message', {
          message: 'Hello World from socket.io using connection!',
          user   : 'Anthony'
        })
        i++
      }, 3000)
      // socket.on('createRoom', (obj: IChatRooms) => {

      // })

      // socket.on('joinRoom', (obj: IUsers) => {
      //   const user = userJoin(socket.id, obj.room, obj.username)

      //   socket.join(user.room)

      //   // Welcome to current user
      //   socket.emit(
      //     'message',
      //     formatMessage({ text: 'Welcome to Roomie!', username: this._botName })
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
      // })
    })
  }

  public start (): void {
    const server = http.createServer(this._app)
    const io = socketIO(server)

    this._socketConnection(io)
    server.listen(this._port, () =>
      console.log(`Server running at port ${this._app.get('port')}`)
    )

    // try {
    //   this._mongo()
    // } catch (error) {
    //   console.error(error)
    // }
  }
}

const server = new Server()

export { server as Server }
