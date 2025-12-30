import * as User from "../models/userModel.js";
import bcrypt from 'bcrypt';
import 'dotenv/config';
import jwt from 'jsonwebtoken';

const accessTokenKey = process.env.ACCESS_TOKEN_KEY;
const accessTokenExpire = process.env.ACCESS_TOKEN_TIME || '15m';

const refreshTokenKey = process.env.REFRESH_TOKEN_KEY;
const refreshTokenExpire = process.env.REFRESH_TOKEN_TIME || '1d';

const saltRounds = parseInt(process.env.SALT_ROUNDS) || 10;



export async function registerUser(req, res) {

    const { password, email, userName } = req.body;
    const hasedPass = await bcrypt.hash(password, saltRounds);

    // we will try to insert the user into the DB;
    try {
        const result = await User.create(email, userName, hasedPass);

        return res.status(200).json({
            message: `Successful in Registering new User:${email}`
        });
    } catch (error) {

        console.error({ error: `Error in Registration User:${email} error : ${error}` });
        if (error.message.includes("User already Exists")) {
            return res.status(409).json({ message: `User Already Exists` });
        }
        return res.status(500).json({ message: `Server Error: Can't Register User:${email}` });
    }
}


export async function logIn(req, res) {
    const { password, email } = req.body;
    try {

        const userData = await User.dataByMail(email);
        if (!userData) {
            console.error(`User not found for mail:${email}`);
            return res.status(401).json({
                message: "Login Failed, Try Again"
            })
        }

        // check password
        const isPasswordMatch = await bcrypt.compare(password, userData.password_hash);
        if (!isPasswordMatch) {
            console.error(`Wrong Password for email:${email}`);
            return res.status(401).json({
                message: "Login Failed!, Try Again"
            });
        }


        // return JWT , refresh & accessTokens
        const accessToken = jwt.sign({ email: email }, accessTokenKey, { expiresIn: accessTokenExpire });
        const refreshToken = jwt.sign({ email: email }, refreshTokenKey, { expiresIn: refreshTokenExpire });

        console.log(`Logged on : user:${email}`);
        res.cookie('accessToken', accessToken, { maxAge: 15 * 1000 * 60, httpOnly: true });
        res.cookie('refreshToken', refreshToken, { maxAge: 1000 * 60 * 60 * 24, httpOnly: true, secure: false, sameSite: 'strict' });
        return res.status(200).json("Login SuccessFull");
    }
    catch (error) {
        console.error(error.message);
        return res.status(500).json({
            message: "server error, Try again"
        });

    }

    ``
}


// very basic Logging out as we don't have a full on store refresh token in DB yet as it is out of scope for the project as of yet, will be proper later on!
export async function logOut(req, res) {
    const email = req.email;
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    console.log(`logged Our user: ${email}`);
    return res.status(200).json({ message: "Logged out SuccessFully" })
}


export async function removeUser(req, res) {
    const email = req.email;

    try {
        await User.remove(email);
        return res.status(204).end();
    }
    catch (error) {
        console.error(`Error : ${error.message}`);
        return res.status(400).json({ message: "User not Deleted, Try Again" });
    }
}
