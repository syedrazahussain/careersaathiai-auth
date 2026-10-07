import { getAuth } from "firebase-admin/auth";
import { app } from "../config/firebase.js";
import usermodel from "../models/user.model.js";
import crypto from "crypto";
import redis from "../shared/redis/redis.js";


export const googleAuth = async (req, res) => {
    try {
        console.log("1️⃣ Login request received");

        const { token } = req.body;

        console.log("2️⃣ Token received:", !!token);

        if (!token) {
            return res.status(400).json({
                success: false,
                message: "Firebase token is required"
            });
        }

        const decoded = await getAuth(app).verifyIdToken(token);

        console.log("3️⃣ Firebase token verified:", decoded.uid);

        let user = await usermodel.findOne({
            firebaseUid: decoded.uid
        });

        console.log("4️⃣ User found:", !!user);

        if (!user) {
            user = await usermodel.create({
                firebaseUid: decoded.uid,
                name: decoded.name,
                email: decoded.email,
            });

            console.log("5️⃣ User created:", user._id);
        }

        const sessionId = crypto.randomUUID();

        console.log("6️⃣ Session created:", sessionId);

        await redis.set(
            `session:${sessionId}`,
            JSON.stringify({
                userId: user._id,
                name: user.name,
                email: user.email,
                interviewCoins: user.interviewCoins
            }),
            "EX",
            7 * 24 * 60 * 60
        );

        console.log("7️⃣ Redis session saved");


        const test = await redis.get(`session:${sessionId}`);
        console.log("TEST REDIS:", test);

        res.cookie("session", sessionId, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        console.log("8️⃣ Cookie created");

        return res.status(200).json({
            success: true,
            user
        });

    } catch (error) {
        console.error("🔥 Google Auth Error:", error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const logout = async (req, res) => {
    try {
        const sessionId = req.cookies?.session
        if (sessionId) {
            await redis.del(`session:${sessionId}`)
        }
        res.clearCookie("session", {
            httpOnly: true,
            secure: true,
            sameSite: "none",
        })

        return res.status(200).json({ success: true, message: "Logout successfully" })
    } catch (error) {
        console.error("Logout Error:", error);

        return res.status(500).json({
            success: false,
            message: error.message
        });


    }
}

export const useCoins = async (req, res) => {
    try {
        const sessionId = req.cookies?.session;

        if (!sessionId) {
            console.log("session id not getting")
            return res.status(401).json({ message: "unauthorized" })
        }

        const session = await redis.get(`session:${sessionId}`);
        if (!session) {
            return res.status(401).json({
                success: false,
                message: "Session expired or invalid"
            });
        }
        const sessionData = JSON.parse(session)

        const { coins, action } = req.body;
        if (!coins || coins <= 0) {
            return res.status(400).json({
                success: false,
                message: "Valid coins required"
            });
        }

        if (!Number.isInteger(coins) || coins <= 0) {
            return res.status(400).json({
                success: false,
                message: "Coins must be a positive integer"
            });
        }
        const user = await usermodel.findById(sessionData.userId)

        if (!user) {
            return res.status(404).json({ success: false, message: "user not found", });
        }

        if (user.interviewCoins < coins) {
            return res.status(403).json({ success: false, message: "Not enough interview coins", interviewCoins: user.interviewCoins });
        }

        user.interviewCoins -= coins
        await user.save()

        await redis.set(
            `session:${sessionId}`,
            JSON.stringify({
                userId: user._id,
                name: user.name,
                email: user.email,
                interviewCoins: user.interviewCoins
            }),
            "EX",
            7 * 24 * 60 * 60
        );

        return res.status(200).json({ success: true, message: "Interview coins updated successfully", action, interviewCoins: user.interviewCoins });


    } catch (error) {
        console.error("coins Error:", error);

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }
}

export const addCoin = async (req, res) => {
    try {
        const sessionId = req.cookies?.session;

        if (!sessionId) {
            console.log("session id not getting")
            return res.status(401).json({ message: "unauthorized" })
        }

        const session = await redis.get(`session:${sessionId}`);
        if (!session) {
            return res.status(401).json({
                success: false,
                message: "Session expired or invalid"
            });
        }
        const sessionData = JSON.parse(session)


        const { coins } = req.body;

        if (!coins || coins <= 0) {
            return res.status(400).json({
                success: false,
                message: "Valid coins required"
            })
        }

        if (!Number.isInteger(coins) || coins <= 0) {
            return res.status(400).json({
                success: false,
                message: "Coins must be a positive integer"
            });
        }

        const user = await usermodel.findById(sessionData.userId)

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "user not found"
            })
        }

        user.interviewCoins += Number(coins)

        await user.save()

        await redis.set(
            `session:${sessionId}`,
            JSON.stringify({
                userId: user._id,
                name: user.name,
                email: user.email,
                interviewCoins: user.interviewCoins
            }),
            "EX",
            7 * 24 * 60 * 60
        );

        return res.status(200).json({
            success: true,
            message: "coins added succesfully",
            interviewCoins: user.interviewCoins

        })



    } catch (error) {
        console.error("add coins Error:", error);

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }

}

export const refundCoins = async (req, res) => {
    try {

        const sessionId = req.cookies?.session

        if (!sessionId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            })
        }


        const session = await redis.get(
            `session:${sessionId}`
        )

        if (!session) {
            return res.status(401).json({
                success: false,
                message: "Session expired or invalid"
            })
        }


        const sessionData =
            JSON.parse(session)


        const { coins, action } = req.body


        if (
            !coins ||
            !Number.isInteger(coins) ||
            coins <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Coins must be a positive integer"
            })
        }


        const user =
            await usermodel.findById(
                sessionData.userId
            )


        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            })
        }


        // Refund coins
        user.interviewCoins += coins

        await user.save()


        // Update Redis session
        await redis.set(
            `session:${sessionId}`,
            JSON.stringify({
                userId: user._id,
                name: user.name,
                email: user.email,
                interviewCoins:
                    user.interviewCoins
            }),
            "EX",
            7 * 24 * 60 * 60
        )


        return res.status(200).json({
            success: true,
            message: "Interview coins refunded successfully",
            action,
            interviewCoins:
                user.interviewCoins
        })


    } catch (error) {

        console.error(
            "Refund coins error:",
            error
        )

        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}
