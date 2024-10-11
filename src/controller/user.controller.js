import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"


const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refeshToken = user.generateRefreshToken()
        user.refeshToken = refeshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refeshToken }

    } catch (error) {
        throw new ApiError(404, "Something went wrong")
    }
}
const registerUser = asyncHandler(async (req, res) => {
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

    const { fullName, username, email, password } = req.body

    // if(fullName === ""){
    //     throw new ApiError(400, "fullName is required");
    // }

    if (
        [fullName, password, email, username].some((field) => {
            field?.trim() === ""
        })
    ) {
        throw new ApiError(400, "all field are required");
    }


    const exitedUser = User.findOne({
        $or: [{ username }, { email }]
    })

    if (exitedUser) {
        throw new ApiError(409, "username or email already exits");
    }

    const avatarLocalPath = req.files?.avatar[0].path;
    const coverImageLocalPath = req.files?.coverImage[0].path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "avatar is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar) {
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

    if (!createUser) {
        throw new ApiError(500, "failed to store the user try again !!!!!")
    }

    return res.status(201).json(
        new ApiResponse(200, "user registered successfully")
    )

})

const loginUser = asyncHandler(async (req, res) => {
    // req body -> data
    // username or email
    // find the user
    // password check
    // access and refrsh token
    // send throw cookie

    const { email, username, password } = req.body

    if (!email || !username) {
        throw new ApiError(400, "username or email is required")
    }

    const user = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (!user) {
        throw new ApiError(400, "user not found")
    }

    const ispaswordvalid = await user.isPasswordCorrect(password)
    if (!ispaswordvalid) {
        throw new ApiError(400, "password is not correct")
    }

    const { accessToken, refeshToken } = await generateAccessAndRefreshToken(user._id)

    const loggedInUser = User.findById(user._id).select("-password -refreshToken") //select => used when an user wants which field they would not need 

    const options = {
        httpOnly: true,
        secure: true,
        // since cookies is being modied by front end or in brower so to prevent that issue we do above two option true

    }

    return res.
        status(200).
        cookie("accessToken", accessToken, options).
        cookie("refeshToken", refeshToken, options).
        json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser, accessToken, refeshToken
                    // why we send this if we already send in cookie?
                    // ans is If user setup it on local server or user develop a mobile app so too do this is a good habit
                },
                "user logged in successfully"
            )
        )
})

const logoutUser = asyncHandler(async (req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken : undefined
            }
        },
        {
            new:true // return me new updated value milti h
        }
    )
    const options = {
        httpOnly: true,
        secure: true,
        // since cookies is being modied by front end or in brower so to prevent that issue we do above two option true

    }

    return res.status(200).
    clearCookie("accessToken",options).
    clearCookie("refreshToken",options).
    json(
        200,
        {},
        "user logout successfully"
    )
})



export { registerUser, loginUser,logoutUser }