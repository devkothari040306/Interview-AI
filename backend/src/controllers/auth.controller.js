const userModel = require("../models/user.model")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const tokenBlacklistModel = require("../models/blacklist.model")
const { z } = require("zod")

const registerSchema = z.object({
    username: z.string().trim().min(3).max(30),
    email: z.string().trim().email().max(254),
    password: z.string().min(8).max(72).refine(password => Buffer.byteLength(password, "utf8") <= 72)
})
const loginSchema = z.object({
    email: z.string().trim().email().max(254),
    password: z.string().min(1).max(72).refine(password => Buffer.byteLength(password, "utf8") <= 72)
})
const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" || process.env.COOKIE_SAME_SITE?.toLowerCase() === "none",
    sameSite: (process.env.COOKIE_SAME_SITE || (process.env.NODE_ENV === "production" ? "none" : "lax")).toLowerCase(),
    path: "/",
    maxAge: 24 * 60 * 60 * 1000,
    ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {})
}

/**
 * @name registerUserController
 * @description register a new user, expects username, email and password in the request body
 * @access Public
 */
async function registerUserController(req, res) {

    const parsedBody = registerSchema.safeParse(req.body)
    if (!parsedBody.success) {
        return res.status(400).json({
            message: "Username must be 3-30 characters, email must be valid, and password must be 8-72 characters."
        })
    }
    const { username, password } = parsedBody.data
    const { email } = parsedBody.data

    const isUserAlreadyExists = await userModel.findOne({
        $or: [ { username }, { email } ]
    })

    if (isUserAlreadyExists) {
        return res.status(400).json({
            message: "Account already exists with this email address or username"
        })
    }

    const hash = await bcrypt.hash(password, 10)

    const user = await userModel.create({
        username,
        email,
        password: hash
    })

    const token = jwt.sign(
        { id: user._id, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
    )

    res.cookie("token", token, cookieOptions)


    res.status(201).json({
        message: "User registered successfully",
        user: {
            id: user._id,
            username: user.username,
            email: user.email
        }
    })

}


/**
 * @name loginUserController
 * @description login a user, expects email and password in the request body
 * @access Public
 */
async function loginUserController(req, res) {

    const parsedBody = loginSchema.safeParse(req.body)
    if (!parsedBody.success) {
        return res.status(400).json({
            message: "A valid email and password are required."
        })
    }
    const { email } = parsedBody.data
    const { password } = parsedBody.data

    const user = await userModel.findOne({ email })

    if (!user) {
        return res.status(400).json({
            message: "Invalid email or password"
        })
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
        return res.status(400).json({
            message: "Invalid email or password"
        })
    }

    const token = jwt.sign(
        { id: user._id, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
    )

    res.cookie("token", token, cookieOptions)
    res.status(200).json({
        message: "User loggedIn successfully.",
        user: {
            id: user._id,
            username: user.username,
            email: user.email
        }
    })
}


/**
 * @name logoutUserController
 * @description clear token from user cookie and add the token in blacklist
 * @access public
 */
async function logoutUserController(req, res) {
    const token = req.cookies.token

    if (token) {
        await tokenBlacklistModel.create({ token })
    }

    const { maxAge, ...clearCookieOptions } = cookieOptions
    res.clearCookie("token", clearCookieOptions)

    res.status(200).json({
        message: "User logged out successfully"
    })
}

/**
 * @name getMeController
 * @description get the current logged in user details.
 * @access private
 */
async function getMeController(req, res) {

    const user = await userModel.findById(req.user.id)



    res.status(200).json({
        message: "User details fetched successfully",
        user: {
            id: user._id,
            username: user.username,
            email: user.email
        }
    })

}



module.exports = {
    registerUserController,
    loginUserController,
    logoutUserController,
    getMeController
}