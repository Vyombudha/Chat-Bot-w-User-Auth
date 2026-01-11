import * as Chat from '../models/chatModel.js';
import { messageInsert } from '../models/messageModel.js';



export async function newChat(req, res) {

    const email = req.email;
    try {
        const chat = await Chat.create(email);
        const uuid = chat.uuid;

        return res.status(201).json({
            message: "New Chat Created Successfully ",
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


export async function getChatName(req, res) {


    const email = req.email;
    const { uuid } = req.params;
    const { USER_FIRST_MESSAGE } = req.body;
    console.log(`Attempting to Create a new Chat with UUID:${uuid} w/ prompt : ${USER_FIRST_MESSAGE}`);

    const TITLE_GENERATION_PROMPT = `
You are a chat title generator. For each input, output a concise title of maximum 5 words. ONLY output the title. No explanations.

Rules:
- Title Case.
- No punctuation/emojis/numbers unless meaningful (e.g., "GPT-4", "HTTP").
- Avoid generic words like "Chat", "Help", "Question" unless necessary.
- Prefer specific nouns/keywords.
- Fallback: "New Chat" for empty/ambiguous inputs.

Examples:
Input: "Summarize the paper on attention is all you need"
Output: "Transformer Paper Summary"

Input: "Compare Postgres and MySQL indexing strategies"
Output: "Postgres vs MySQL Indexing"

Input: "How to deploy on Vercel with Next.js?"
Output: "Deploy Next.js on Vercel"

Input: "I want a meal plan for cutting weight"
Output: "Cutting Meal Plan"

Input: "     "
Output: "New Chat"

`.trim();

const PROMPT = `
Ok, send the title for this "${USER_FIRST_MESSAGE}" 
`;

    const messages = [
        { role: "system", content: TITLE_GENERATION_PROMPT },
        { role: "user", content: PROMPT }
    ]
    try {
        // call Ollama
        const response = await fetch("http://localhost:11434/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "llama2:latest",
                messages,
                stream: false
            })
        }
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error("Ollama Erorr : " + error.message);
        }

        const data = await response.json();
        // For testing Purposes
        let chatName = data.message.content || "Can't Find the Ollama Response";


        // store this in DB
        await Chat.insertName(email, uuid, chatName);

        // send the chatName back to the user
        return res.status(201).json({
            chatName
        });


    } catch (error) {
        console.error(`New Chat error : ${error.message}`);
        if (error.message.includes("User not Found")) {
            return res.status(400).json({
                message: "User was not Found, Try Again"
            });
        }
        return res.status(500).json({
            message: "Server Error, Try Again"
        });
    }




}



export async function updateChat(req, res) {

    const email = req.email;

    // get message validated by middleware, it is in form of { role : 'user' , content : 'hello, I am user, how are you chatBot?'};
    const { message } = req.body;
    const { uuid } = req.params;

    // 1. store Message into the DB 
    try {
        await messageInsert(uuid, message.role, message.content);
        return res.status(204).end();
    } catch (error) {
        console.error(`Server Error: ${error.message}`);

        if (error.message.includes('chat UUID not Found')) {
            return res.status(404).json({
                message: `Error : chat UUID:${uuid} doesnt exist`
            });
        }
        return res.status(500).json({
            message: 'Database error, Try Again'
        });
    }
}


export async function sendChatReply(req, res) {
    const email = req.email;

    const controller = new AbortController();
    const { uuid } = req.params;


    // 1. Set SSE Headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let clientDisconnected = false;
    let assistantReplySaved = false;
    // make sure if the user stop the stream/eventSource from their end, we'll stop the stream from our end too
    res.on('close', async () => {
        controller.abort(); //  Tell Ollama to stop to
        console.log(`Client disconnected from chat ${uuid}`);
        clientDisconnected = true;
        if (!assistantReplySaved) {
            try {
                console.log(`Rolling back interrupted prompt for chat: ${uuid}`);
                await Chat.deleteLatestPrompt(email, uuid);
            } catch (err) {
                console.error("Rollback failed:", err.message);
            }
        }
    });

    // get the messages from the DB;

    try {
        // get the messages in 
        const reply = await Chat.getMessagesByChat(email, uuid);


        if (!reply || !reply.messages) {
            throw new Error("No messages found for this chat UUID");
        }
        // format the messages into Ollama Readable form
        const messages = reply.messages.map((msg) => {
            return {
                role: msg.role,
                content: msg.content
            };
        })

        // send it to ollama 
        const ollamaRes = await fetch("http://localhost:11434/api/chat", {
            method: "POST",
            signal: controller.signal, // ✅ Add this
            body: JSON.stringify({
                model: "llama2:latest",
                messages,
                stream: true
            })
        });

        let fullAssistantReply = '';

        // now Loop the chunks of the ollamaRes
        for await (const chunk of ollamaRes.body) {

            if (clientDisconnected) {
                console.log(`Stopped streaming for ${uuid} - client gone`);
                break; // Exit the loop immediately
            }


            // get the raw string  from encoded chunk
            const rawString = new TextDecoder().decode(chunk);

            const lines = rawString.split('\n');


            for (const line of lines) {
                // if the line doesn't exist continue
                if (!line.trim()) continue;

                const json = JSON.parse(line);

                const content = json.message?.content || "";

                fullAssistantReply += content;

                // relay to the frontend only if the client is connected
                if (!clientDisconnected) {
                    res.write(`data: ${JSON.stringify({ content })}\n\n`);
                }
            }

        }



        // only save and close the res if the client is connected

        if (!clientDisconnected) {
            await messageInsert(uuid, "assistant", fullAssistantReply);
            assistantReplySaved = true; //  MARK AS SAVED
            // 6. CLOSING: Tell frontend we are done
            res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
            res.end();
        }

    } catch (error) {
        console.error(`Streaming Error: ${error}`);

        if (!clientDisconnected) {

            res.write(`data: ${JSON.stringify({ error: "Stream interrupted" })}\n\n`);
            res.end();
        }

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