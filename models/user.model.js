import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    firebaseUid:{
        type:String,
        required:true,
        unique:true
    },
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        unique:true,
        required:true
    },
    interviewCoins:{
        type:Number,
        default:150
    }



},{timestamps:true})

const usermodel = mongoose.model("user",userSchema)

export default usermodel
