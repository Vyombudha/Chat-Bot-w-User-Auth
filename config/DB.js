import mysql from 'mysql2/promise';
import 'dotenv/config';

const pool = mysql.createPool({
    host: process.env.HOST,
    user: process.env.USER,
    password: process.env.PASSWORD,
    database: process.env.DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});




async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log("✅ Database Connected SucessFully");
        connection.release();

    } catch (error) {
        console.error(`❌ Database Connection Failed! : ${error.message}`);
        process.exit(1);
    }
}


testConnection();

export default pool;

