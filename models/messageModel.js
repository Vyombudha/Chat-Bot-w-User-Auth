import pool from "../config/DB.js";


// create() works as both the create and update messages function
// getMessages() is for getting all messages within the table relating to that UUID
// we dont need delete as deleting a chat will automatically delete all messages relating to that UUID in this table too
// updating from a new message and creating a new branch after deleting older ones is out of my scope

/**
 * Inserts a new Messages into the table for UUID
 * @param {string} uuid - uuid of the chat we want to create a new message from
 * @param {string} role ('user', 'assistant', 'system')  
 * @param {string} content - the content of that message
 * @returns {object} {success : true , uuid - uuid of the chat }
 * @throws message insertion failed,chat UUID not found, generic database error 
 * @example messageInsert('erogonrhWr#4nr' , 'system' , 'you are a good maths teacher');
 */
export async function messageInsert(uuid, role, content) {
    const query = `insert into messages (uuid,role,content) values (?,?,?);`; // is this query ok?

    try {
        const [result] = await pool.query(query, [uuid, role, content]);
        if (result.affectedRows === 0) {
            throw new Error(`Message insertion Failed - 0 rows affected`);
        }
        return {
            success: true,
            uuid
        }
    } catch (error) {
        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            throw new Error(`chat UUID not Found`);
        }
        throw new Error(`DataBase Error: ${error.message} `);
    }
}


/**
 * Gets all Messages for that UUID
 * @param {string} uuid - UUID of the chat you want to all messages for 
 * @returns {Array} messages in the char for UUID 
 * @throws chat UUID not found error, generic DataBase Errors
 * @example getMessages('roujgnrnggnog@Tgwq2r13');
 */
export async function getMessages(uuid) {
    const query = `select role, content, created_at from messages where uuid=? order by created_at asc;`; // I think Im missing something??
    try {
        const [messages] = await pool.query(query, [uuid]);
        return messages;
    } catch (error) {
        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            throw new Error(`chat UUID not Found`);
        }
        throw new Error(`Database Error : ${error.message}`);
    }
}