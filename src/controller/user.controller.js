import {asyncHandler} from "../utils/asyncHandler.js"
import  {ApiError} from "../utils/ApiError.js"
import  {ApiResponse} from "../utils/ApiResponse.js"
import { User } from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"

const registerUser = asyncHandler(async (req,res)=>{
    // get user detail from frontend
    // validation- non empty
    // check if user already exit
    // check for images
    // check for avatar
    // upload them to cloudinary
    // create user object
    // remove password and refrence token field from response
    // check for user creation
    // return res

    const {fullName,username,email,password} = req.body

    // if(fullName === ""){
    //     throw new ApiError(400, "fullName is required");
    // }

    if(
        [fullName,password,email,username].some((field)=>{
            field?.trim() === ""
        })
    ){
        throw new ApiError(400, "all field are required");
    }
    

    const exitedUser = User.findOne({
        $or: [{ username },{ email }]
    })

    if(exitedUser){
        throw new ApiError(409, "username or email already exits");
    }

    const avatarLocalPath = req.files?.avatar[0].path;
    const coverImageLocalPath = req.files?.coverImage[0].path;

    if(!avatarLocalPath){
        throw new ApiError(400, "avatar is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!avatar){
        throw new ApiError(400, "avatar is required")
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

// check whether the user is store in db or not .select is used for selecting the user the the field that you give in parameter
    const createUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createUser){
        throw new ApiError(500, "failed to store the user try again !!!!!")
    }

    return res.status(201).json(
        new ApiResponse(200, "user registered successfully")
    )
    
})



export {registerUser}