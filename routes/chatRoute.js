import express from 'express';
import { isValidUser } from '../middleware/userAuth.js';
import { deleteChat, getAllChats, newChat, updateChat, sendChatReply, getChatName, getChatMessage } from '../controllers/chatController.js';


const router = express.Router();



// make a new chat 
router.post('/new', isValidUser, newChat);

// get the chat  name from the Ollama BOT
router.post('/new/:uuid', isValidUser, getChatName);

// update the chat by sending prompt objects
router.put('/:uuid', isValidUser, updateChat);


// SSE on sending the chat message
router.get('/:uuid', isValidUser, sendChatReply);

// get all the messages within  that chat uuid
router.get('/chat/:uuid', isValidUser, getChatMessage);

// get all chats from the user
router.get('/', isValidUser, getAllChats);

// delete the chat uuid
router.delete('/:uuid', isValidUser, deleteChat);

export default router;