interface IUsers {
  id? : string
  name: string
}

const users: IUsers[] = []

// Join user to chat room
// const userJoin = (
//   id  : string,
//   room: string,
//   name: string
// ): IUsers => {
//   const user = { id, name, room }
//   users.push(user)

//   return user
// }

// // User leaves the chat
// const userLeave = (id: string): IUsers | undefined => {
//   const index = users.findIndex(user => user.id === id)

//   if (index !== -1)
//     return users.splice(index, 1)[0]

//   return undefined
// }

// // Get room users
// const getRoomUsers = (room: string): IUsers[] => {
//   return users.filter(user => user.room === room)
// }

// // Get current user
// const getCurrentUser = (id: string): IUsers | undefined => {
//   return users.find(user => user.id === id)
// }

// export { getCurrentUser, getRoomUsers, IUsers, userJoin, userLeave }

export { IUsers }
