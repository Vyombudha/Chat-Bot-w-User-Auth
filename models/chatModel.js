import pool from "../config/DB.js";
import { v4 as uuidV4 } from "uuid";
import { getMessages } from "./messageModel.js";



/**
 * Takes email and chatName to create new chats in the database returns uuid
 * @param {string} email - email of the user creating the chat
 * @param {string} chatName - name of the chat set by user or "New Chat" by default
 * @returns {object} {sucess : true , uuid  - uuid of the chat just created}
 * @throws creation failed ,User not found , generic database error
 * @example create("vyombudha7@gmail.com", "some physics Questions");
 */
export async function create(email, chatName = "New Chat") {
    const uuid = uuidV4();
    const query = `insert into chats (uuid,email,chat_name) values (?,?,?);`;
    try {
        const [result] = await pool.query(query, [uuid, email, chatName]);
        if (result.affectedRows === 0) {
            throw new Error(`Creation failed - 0 rows affected!`);
        }

        return {
            success: true,
            uuid
        }

    } catch (error) {
        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            throw new Error(`User not Found`);
        }
        throw new Error(`Database Error : ${error}`);
    }
}

/**
 * Returns the chatName and messages by using chat UUID
 * @param {string} email 
 * @param {string} uuid 
 * @returns {object} {chatName , messages }
 * @throws chat not found error, generic DB error
 * @example getMessagesByChat('vyombudha7@gmail.com','3r3t#34thingwi');
 */
export async function getMessagesByChat(email, uuid) {
    // this first query makes sure the chat belongs to the email
    const query = `select uuid, chat_name, created_at from chats where uuid=? and email=?;`;
    try {
        const [chatRows] = await pool.query(query, [uuid, email]);

        if (chatRows.length === 0) {
            throw new Error(`Chat not Found or Access Denied`);
        }

        // we will now retrieve messages fromm the message table
        const messages = await getMessages(uuid);


        // send raw messages array;
        return {
            chatName: chatRows[0].chat_name,
            messages
        }


    }
    catch (error) {
        throw new Error(`DataBase Error: ${error.message}`);
    }
}



/**
 * 
 * @param {string} email 
 * @returns {Array<object>} array of chat objects
 * @example getAllByUser('vyombudha7@gmail.com');
 * @throws generic DB error
 */
export async function getAllByUser(email) {
    const query = `select uuid, chat_name, created_at from chats where email=? order by created_at desc;`;

    try {
        const [chats] = await pool.query(query, [email]);
        return chats;
    } catch (error) {
        throw new Error(`DataBase Error: ${error.message}`);
    }
}


/**
 * 
 * @param {string} email 
 * @param {string} uuid 
 * @returns {object} {sucess : true, uuid }
 */
export async function remove(email, uuid) {
    const query = `delete from chats where email=? and uuid=?;`;

    try {
        const [result] = await pool.query(query, [email, uuid]);
        if (result.affectedRows === 0) {
            throw new Error(`Chat not found`);
        }

        return {
            success: true,
            uuid
        };
    } catch (error) {
        throw new Error(`DataBase Error : ${error.message}`);
    }

}
