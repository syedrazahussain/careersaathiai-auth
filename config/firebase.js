import { cert, initializeApp } from "firebase-admin/app";

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

export const app = initializeApp({
    credential: cert(serviceAccount)
});