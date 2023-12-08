const User = require("../models/User")
const Issue = require("../models/Issue");
const Comment = require("../models/Comment");
const Activity = require("../models/Activity")
const asyncHandler = require("../utils/asyncHandler")



//get all useers
exports.getAllUsers = asyncHandler(async (req, res, next) => {
  const users = await User.find()

  // SEND RESPONSE
  res.status(200).json({
    status: 'success',
    results: users.length,
    users
  });
});

exports.getSingleUser = asyncHandler(async (req, res, next) => {

  const user = await User.findById(req.params.id);

  if (!user) {
    
    return next(res.status(404).json({success : false , message :"No user found with that ID"}));
  }

  // Send the retrieved document as a response.
  res.status(200).json({
    status: 'success',
    user
  });
});

exports.updateUser = asyncHandler(async (req, res, next) => {

  const user = await User.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  // 2. Handle the case when no document is found
  if (!user) {
    
    return next(res.status(404).json({success : false , message :"No user found with that ID"}));
  }

  // 3. Send a success response with the updated data
  res.status(200).json({
    status: 'success',
    user
  });
});

//////////









const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach(el => {
    // If the property is in the list of allowed fields, add it to the new object
    if (allowedFields.includes(el)) {
      newObj[el] = obj[el];
    }
  });
  return newObj;
};

exports.getMe = (req, res, next) => {
  // Set the user's ID in the request parameters for retrieving the user's data
  req.params.id = req.user.id;
  next();
};

// Update user data except for password
exports.updateUserProfile = asyncHandler(async (req, res, next) => {
  // 1) Check if the request includes password-related fields; if so, disallow updates
  if (req.body.password || req.body.passwordConfirm) {
    return next(res.status(400).json({success : false , message :"This route is not for password updates. Please use /updateMyPassword."}));
  }

  // 2) Filter out any unwanted fields that should not be updated
  const filteredBody = filterObj(req.body, 'name', 'email');

  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true
  });

  if (!updatedUser) {
    

    return next(res.status(404).json({success : false , message :"No user with that id !"}))
  }

  const activity = new Activity({
    category: "Update Profile",
    user_id: {
      id: req.user._id,
      username: req.user.userName,
    },
  });
  await activity.save();

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser
    }
  });
});

exports.deleteUserAccount = async (req, res, next) => {
  const userId = req.user._id;

  // Use deleteOne or deleteMany instead of remove
  await User.deleteOne({ _id: userId });

  await Issue.deleteMany({ "user_id.id": userId });
  await Comment.deleteMany({ "author.id": userId });
  await Activity.deleteMany({ "user_id.id": userId });

  res.status(204).json({
    status: "success",
    data: null
  });
};
