enum ErrorMessagesForChatRooms {
  chatIsFull = 'The requested chat is full',
  chatRoomNotFound = 'Chat room not found',
  duplicatedChatRoom = 'Duplicated chat room',
  duplicatedUser = 'Duplicated user',
  incorrectPassword = 'Incorrect password',
  problemCreatingAChatRoom = 'There was a problem trying to create the chat',
  problemGettingAllTheChatsInTheInitialLoad = 'There was a problem trying to get all the chats in the initial load',
  problemRemovingUserFromChat = 'There was a problem trying to remove the user from the chat room',
  problemValidatingIfTheUserCanEnter = 'There was a problem trying to verify werther the user can join the chat or not',
  problemWhileSavingMessage = 'There was a problem trying to save the message.'
}

export { ErrorMessagesForChatRooms }
