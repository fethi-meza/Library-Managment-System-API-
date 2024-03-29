const jwt = require('jsonwebtoken')
const { promisify } = require('util')
const crypto = require('crypto')
const User = require('../models/User')
const createToken = require('../utils/createToken')
const Email = require('../utils/email')
const asyncHandler = require('../utils/asyncHandler')
const { resetHtmlTemplate } = require('../utils/resetPasswordTemplate')
const Activity = require('../models/Activity')


// Helper function to send JWT token as a response
const sendTokenResponse = (res, user, statusCode) => {
  // Create a JWT token 
  const token = createToken(res, user._id);

  res.status(statusCode).json({
    status: "success",
    token,
    user,
  });
};

//SIGNUP
exports.signup = asyncHandler(async (req, res, next) => {
  const { name, userName, email, password, passwordConfirm, gender } = req.body;

  const emailAlreadyExists = await User.findOne({ email });

  if (emailAlreadyExists) {
  
    return next( res.status(404).json({success : false , message :"This Email is already registered in inventory"}));
  }

  const newUser = await User.create({
    name,
    userName,
    email,
    password,
    passwordConfirm,
    gender
  });

  newUser.password = undefined;

  const url = `${req.protocol}://${req.get('host')}/me`;
  const welcomeEmail = new Email(newUser, url);

  // Send welcome email asynchronously
  welcomeEmail.sendWelcomeEmail()
    .then(() => {
      sendTokenResponse(res, newUser, 201);
    })
    .catch((error) => {
      console.error('Error sending welcome email:', error);
      sendTokenResponse(res, newUser, 201);
    });
});

//LOGIN
exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  // Check if email and password are provided
  if (!email || !password) {
   
    return next(res.status(404).json({success : false , message :"lease provide valid email and password"}));
  }

  const user = await User.findOne({ email }).select('+password +active');
  

  if (!user) {
    return next(res.status(401).json({success : false , message :"Invalid email or password"}));
  }

  // Check if the provided password matches the stored hashed password
  const isPasswordCorrect = await user.passwordMatching(password, user.password);
  
  if (!isPasswordCorrect) {
    return next( res.status(401).json({success : false , message :"Invalid email or password"}));
  }

  user.password = undefined;

  sendTokenResponse(res, user, 200);
});

//LOGOUT
exports.logout = (req, res) => {
  res.cookie("jwt", "loggedout", {
    httpOnly: true,
    secure: process.env.NODE_ENV !== "development",
    sameSite: "strict",
    maxAge: new Date(Date.now() + 5 * 1000), // Set the cookie to expire in 5 seconds
  });

  res.status(200).json({ status: "success", message: 'You have been logged out.' });
};

//PROTECT ROUTES
exports.protect = asyncHandler(async (req, res, next) => {
  // 1) Get the token from the request's authorization header
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(res.status(401).json({success : false , message :"You are not logged in! Please log in to get access"}));
  }
  // 3) Verify the token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET_KEY);

  // 4) Check if the user associated with the token still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {

    return next(res.status(401).json({success : false , message :"The user belonging to this token no longer exists."}));
  }

  const tokenIssuedAt = decoded.iat;

  // 5) Check if the user changed the password after the token was issued
  if (currentUser.changedPasswordAfter(tokenIssuedAt)) {
    return next(res.status(401).json({success : false , message :"User recently changed the password! Please log in again."}));
  }
  // Grant access to the protected route by attaching the user object to the request
  req.user = currentUser;
  next();
});

// FORGET PASSWORD
exports.forgetPassword = asyncHandler(async (req, res, next) => {
  // 1) Find the user by their email
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(  res.status(404).json({success : false , message :"There is no user with this email address."})
    );
  }

  // 2) Generate a password reset token and save it to the user
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // 3) Construct the reset URL and email it to the user
  const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;
  const html = resetHtmlTemplate(
    req.protocol,
    req.headers.host,
    resetToken,
  );
  // Send the password reset email
  const email = new Email(user, resetURL);

  try {
    await email.sendPasswordResetEmail(html);

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email.',
    });
  } catch (err) {
    console.error(err);

    // Reset user properties and send an error response
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    res.status(401).json({success : false , message :"There was an error sending the email. Please try again later."})

    return next(res.status(401).json({success : false , message :"There was an error sending the email. Please try again later."}));
  }
});

//RESET PASSWORD
exports.resetPassword = asyncHandler(async (req, res, next) => {
  // 1) Decrypt the token and find the user
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });
  // 2) Check if the token is valid an  d not expired

  if (!user) {return next(  res.status(401).json({success : false , message :"Token is invalid or has expired. Please request a new password reset."}));
  }

  // 3) Set the new password and clean up the reset token
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  user.password = undefined;

  sendTokenResponse(res, user, 200);
});

//UPDATE PASSWORD
exports.updatePassword = asyncHandler(async (req, res, next) => {

  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    

    return next(res.status(401).json({success : false , message :"Please provide both values"}))
  }
  console.log(req.user);
  // 1) Find the user by ID and select the password field
  const user = await User.findById(req.user._id).select("+password");
  // 2) Check if the entered current password is correct
  const isPasswordCorrect = await user.passwordMatching(
    oldPassword,
    user.password
  );

  if (!isPasswordCorrect) {
    
    return next(res.status(401).json({success : false , message :"Your current password is incorrect"}));
  }
  // 3) Update the user's password with the new one and save the changes
  user.password = req.body.newPassword;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();

  const activity = new Activity({
    category: "Update Password",
    user_id: {
      id: req.user._id,
      username: req.user.userName,
    },
  });
  await activity.save({ validateBeforeSave: false });

  user.password = undefined;

  sendTokenResponse(res, user, 200);
});

exports.restrictTo = (...permittedRoles) => (req, res, next) => {
  const userRole = req.user.role;

  if (permittedRoles.includes(userRole)) {
    // If the user's role is included in the permitted roles, grant access.
    next();
  } else {
    // If the user's role is not included in the permitted roles, deny access.
    const errorMessage = `You don't have permission to perform this action.`;
    return res.status(403).json({ status: 'fail', message: errorMessage });
  }
};