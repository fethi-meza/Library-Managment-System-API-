const Book = require('../models/Book')
const User = require('../models/User')
const Activity = require('../models/Activity')
const asyncHandler = require('../utils/asyncHandler')
const Issue = require('../models/Issue')
const Comment = require('../models/Comment')


const PER_PAGE = 10

exports.getAdminBookInventory = asyncHandler(async (req, res, next) => {
  const page = req.params.page || 1;

  // get the book counts
  const booksCount = await Book.find().countDocuments();

  // fetching books
  const books = await Book.find()
    .skip(PER_PAGE * page - PER_PAGE)
    .limit(PER_PAGE);

  res.status(200).json({
    status: "success",
    result: booksCount,
    books
  })
});

exports.updateBook = asyncHandler(async (req, res, next) => {
  const { bookId } = req.params;
  const bookInfo = req.body.book;

  const book = await Book.findByIdAndUpdate(bookId, bookInfo);

  if (!book) {
    return next(res.status(404).json({success : false , message :"book not found"}))
  }

  res.status(200).json({
    status: "success",
    book
  })

});

exports.deleteBook = asyncHandler(async (req, res, next) => {
  const { bookId } = req.params;

  const book = await Book.findById(bookId);

  if (!book) {
    return next(res.status(404).json({success : false , message :"book not found"}))
  }

  await book.deleteOne();

  res.status(204).json({
    status: "success",
    data: null
  })
});

exports.flagUser = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;
  const user = await User.findById(userId);

  if (!user) {
    return next(res.status(404).json({success : false , message :"user not found"}))
  }

  user.violationFlag = !user.violationFlag;
  await user.save({ validateBeforeSave: false });

  const flagStatus = user.violationFlag ? 'flagged' : 'unflagged';

  res.json({
    message: `User ${user.name} is ${flagStatus}!`
  });
});

exports.getUserAllActivities = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;

  const activities = await Activity.find({ "user_id.id": userId }).sort("-entryTime");

  res.status(200).json({
    status: "success",
    activities
  });
});

exports.showActivitiesByCategory = asyncHandler(async (req, res, next) => {
  const { category } = req.body;
  const activities = await Activity.find({ category });

  res.status(200).json({
    status: "success",
    activities
  })
});

exports.deleteUser = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;
  const user = await User.findById(userId);
  await user.remove();


  await Issue.deleteMany({ "user_id.id": userId });
  await Comment.deleteMany({ "author.id": userId });
  await Activity.deleteMany({ "user_id.id": userId });

  res.status(204).json({
    status: "success",
    data: null
  })
});

exports.addNewBook = asyncHandler(async (req, res, next) => {
  const bookInfo = req.body.book;

  const isDuplicate = await Book.find(bookInfo);

  if (isDuplicate.length > 0) {
   
    return next( res.status(404).json({success : false , message :"This book is already registered in inventory"}))
  }

  const newBook = await Book.create(bookInfo);

  res.status(200).json({
    status: "success",
    message: `A new book named ${newBook.title} is added to the inventory`,
    newBook
  })
});

