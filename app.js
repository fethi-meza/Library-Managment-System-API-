// environmental variables
require("dotenv").config({ path: './config.env' });

// Apply and import necessary modules
const express = require('express');



const cookieParser = require('cookie-parser');
const cors = require("cors");
const connectDatabase = require('./DB/dataBase');
const errorController = require("./controllers/errorController");
const adminRouter = require('./routes/adminRoutes');
const authRouter = require('./routes/authRoutes');
const bookRouter = require('./routes/bookRoutes');
const commentRouter = require('./routes/commentRoutes');
const userRouter = require('./routes/userRoutes');

// Initialize Express app 
const app = express();
const port = process.env.PORT || 3000;



// Parse cookies, enable CORS, and handle JSON parsing
app.use(cookieParser(process.env.JWT_SECRET_KEY));
app.use(cors());
app.options("*", cors());
app.use(express.json());

// Serve static files
app.use(express.static('./documentation'));

//ROUTES

app.use('/api/v1/admins', adminRouter)
app.use('/api/v1/users', userRouter)
app.use('/api/v1/auth', authRouter)
app.use('/api/v1/books', bookRouter)
app.use('/api/v1/comments', commentRouter)

// Connect to the database
connectDatabase();

// Error Handling Middleware: Handle requests for undefined routes
app.all("*", (req, res, next) => {
  const err = new Error(`Can't Find ${req.originalUrl}`);
  err.status = "fail";
  err.statusCode = 404;
  err.isOperational = true;
  next(err);
});

app.use(errorController)

// Start the server and listen on the defined port
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});