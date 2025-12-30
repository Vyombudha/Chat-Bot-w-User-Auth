import e from 'express';
import * as Chat from '../models/chatModel.js';
import { messageInsert } from '../models/messageModel.js';
import * as Ollama from '../services/ollamaServices.js';




export async function newChat(req, res) {
    const email = req.email;
    const { chatName } = req.body;
    try {
        const chat = await Chat.create(email, chatName);
        const uuid = chat.uuid;

        return res.status(201).json({
            message: "New Chat Created Successfully ",
            chatName,
            uuid
        });
    }

    catch (error) {
        console.error(`New Chat error : ${error.message}`);
        if (error.message.includes("User not Found")) {
            return res.status(400).json({
                message: "User was not Found, Try Again"
            });
        }
        return res.status(500).json({
            message: "DataBase Error, Try Again"
        });
    }

}



export async function updateChat(req, res) {

    const email = req.email;

    // get message validated by middleware, it is in form of { role : 'user' , content : 'hello, I am user, how are you chatBot?'};
    const { message } = req.body;
    const { uuid } = req.params;


    // this wil be our entire conversation object array !
    let messages;
    // this will be the reply
    let assistantReply;


    // 1. store Message into the DB 
    try {
        await messageInsert(uuid, message.role, message.content);
    } catch (error) {
        console.error(`Server Error: ${error.message}`);

        if (error.message.includes('chat UUID not Found')) {
            return res.status(404).json({
                message: `Error : chat UUID:${uuid} doesnt exist`
            });
        }
        return res.status(500).json({
            message: 'Database error, Try Again'
        })
    }

    // 2. get messages from DB
    try {
        const response = await Chat.getMessagesByChat(email, uuid);

        const unformattedMessages = response.messages;

        // actually format the message and store
        messages = unformattedMessages.map((msg) => {
            return { role: msg.role, content: msg.content };
        });

    } catch (error) {

        console.error(`Error : ${error.message}`);

        if (error.message.includes("Chat not Found or Access Denied")) {
            return res.status(400).json({
                message: "Undefined chat uuid / Access Error, Try again"
            });
        }
        return res.status(500).json({
            message: "DataBase Error, Try again"
        });
    }

    // 3. Run the Messages through Ollama API and Collect the reply

    try {
        assistantReply = await Ollama.sendMessages(messages);

        if (!assistantReply) {
            console.error(`Ollama API Error: ${null} Reply`);
            return res.status(500).json({
                message: "Empty Response From OLLAMA Server"
            });
        }

    } catch (error) {
        console.error(`Ollama Server  Error: ${error.message}`);
        // we failed to get a reply from ollama now what??? 
        return res.status(500).json({
            message: "Server Error, Try Again"
        })
    }



    // 4 we wil insert reply into the DB 

    try {

        // await 
        messageInsert(uuid, assistantReply.role, assistantReply.content);

        // 5. send the reply back to the user
        return res.status(200).json({
            reply: assistantReply.content,
            uuid
        })

    } catch (error) {
        console.error(`Server Error: ${error.message}`);
        if (error.message.includes('chat UUID not Found')) {
            return res.status(404).json({
                message: `Error : chat UUID:${uuid} doesnt exist`
            });
        }
        return res.status(500).json({
            message: 'Database error, Try Again'
        })
    }


}

export async function getChatMessage(req, res) {

    const email = req.email;
    const { uuid } = req.params;




    // 1. get messages from DB
    try {
        const response = await Chat.getMessagesByChat(email, uuid);

        const unformattedMessages = response.messages;
        const chatName = response.chatName;

        // actually format the message and store
        const messages = unformattedMessages.map((msg) => {
            return { role: msg.role, content: msg.content };
        });

        return res.status(200).json({
            chatName,
            messages
        })

    } catch (error) {

        console.error(`Error : ${error.message}`);

        if (error.message.includes("Chat not Found or Access Denied")) {
            return res.status(400).json({
                message: "Undefined chat uuid / Access Error, Try again"
            });
        }
        return res.status(500).json({
            message: "DataBase Error, Try again"
        });
    }
}


export async function getAllChats(req, res) {
    const email = req.email;
    try {
        const response = await Chat.getAllByUser(email);

        // format the chats with name and uuid, removing excess  data
        const chats = response.map((chat) => {
            return { chatName: chat.chat_name, uuid: chat.uuid };
        })

        return res.status(200).json({
            chats
        });
    }
    catch (error) {
        console.error(`Database Error on retreiving All Chat  : ${error.message}`);
        return res.status(500).json({
            message: `Database Error, Try Again`
        });
    }

}




export async function deleteChat(req, res) {

    const email = req.email;
    const { uuid } = req.params;


    try {
        await Chat.remove(email, uuid);
        return res.status(204).end();
    }
    catch (error) {
        console.error(`Error : ${error.message}`);

        if (error.message.includes("Chat not found")) {
            return res.status(404).json({
                message: "Chat doesnt Exist"
            });
        }

        return res.status(500).json({
            message: "Server Error, Deletion Failed"
        })
    }

}