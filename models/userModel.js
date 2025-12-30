import pool from "../config/DB.js";



// for DB  there will be only create, read , delete 
// We dont have updating for mail as, a  new Email means a new account and update userName/password resets will be impleted later on 


/**
 * Create a new User in the Database 
 * @param {string} email - email of the user
 * @param {string} userName  - name of the user
 * @param {string} password_hashed - password hased using bcrypt
 * @returns {object} {sucess : true , affectedRows : Number} 
 * @throws {error} - Insertion failed , User already Exists , generic DB error
 * @example create("vyombudha7@gmail.com" , "vyomGPT" , "qesgjng#OBNROGN_=##5Trfgreg");
 */
export async function create(email, userName, password_hashed) {
    const query = `insert into users_info (email,password_hash,user_name) values (?,?,?);`;
    try {
        const [result] = await pool.query(query, [email, password_hashed, userName]);
        if (result.affectedRows === 0) {
            throw new Error('Registeration Failed - no rows affected');
        }
        return {
            success: true,
            affectedRows: result.affectedRows
        };
    }
    catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            throw new Error(`User Already Exists`);
        }
        throw new Error(`Database Error : ${error.message}`);
    }
}



/**
 * 
 * @param {string} email - email of the user 
 * @returns {object} {success : true , email } - email of the user we just deleted from DB
 * @throws {error} User not found error, generic DB error
 * @example remove("vyombudha7@gmail.com");
 */
export async function remove(email) {
    const query = `delete from users_info where email=?;`;
    try {
        const [result] = await pool.query(query, [email]);
        if (result.affectedRows === 0) {
            throw new Error("User not found");
        }
        return {
            success: true,
            email
        };

    } catch (error) {
        throw new Error(`Database error : ${error.message}`);
    }
}

/**
 *  will return a object with  {email, password_hash, user_name} or null if nothing is found 
 * @param {string} email 
 * @returns {object|null} 
 * @throws generic database error
 * @example dataByMail("vyombudha7@gmail.com");
 */
export async function dataByMail(email) {
    const query = `select email,password_hash,user_name from users_info where email=?`;
    try {
        const [rows] = await pool.query(query, [email]);
        return rows[0] || null;
    } catch (error) {
        throw new Error(`database error : ${error.message}`);
    }
}




