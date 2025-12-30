import express from 'express';

import { registerUser, logIn, logOut, removeUser } from '../controllers/userController.js';
import { isValidUser } from '../middleware/userAuth.js';
const router = express.Router();


// auth routes
router.post('/register', registerUser);
router.post('/login', logIn);

// protected routes
router.post('/logout', isValidUser, logOut);
router.delete('/delete', isValidUser, removeUser);


export default router;