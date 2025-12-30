import jwt from 'jsonwebtoken';

const accessTokenKey = process.env.ACCESS_TOKEN_KEY;
const accessTokenExpire = process.env.ACCESS_TOKEN_TIME || '15m';
const refreshTokenKey = process.env.REFRESH_TOKEN_KEY;


export function isValidUser(req, res, next) {
    const accessToken = req.cookies.accessToken;
    const refreshToken = req.cookies.refreshToken;

    if (accessToken) {
        // verify the Access Token
        try {
            const decoded = jwt.verify(accessToken, accessTokenKey);
            req.email = decoded.email;
            return next();
        }
        catch (error) {
            if (error.name !== 'TokenExpiredError') {
                return res.status(403).json({ message: "Invalid Access Token" });
            }
        }
    }

    // check if refreshToken exits
    if (!refreshToken) {
        return res.status(401).json({ message: "Login Again" });
    }

    // verify refreshToken
    try {
        const decoded = jwt.verify(refreshToken, refreshTokenKey);
        req.email = decoded.email;

        const newAccessToken = jwt.sign({ email: req.email }, accessTokenKey, { expiresIn: accessTokenExpire });

        res.cookie('accessToken', newAccessToken, { maxAge: 15 * 60 * 1000, httpOnly: true });
        next();
    }
    catch (error) {
        console.error(`UserAuth Middleware Error : ${error.message}`);
        return res.status(403).json({ message: "Invalid Refresh Token" });
    }

}