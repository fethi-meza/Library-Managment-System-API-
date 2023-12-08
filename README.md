


## Overview

Library-Managment-System-API is an online platform built using MongoDB, Express.js, and Node.js. It is designed to efficiently manage library resources, including books, users, and administrators. The system supports key functionalities such as borrowing, creating, renewing, and returning books. Authentication ensures secure access, and additional features include comments and an activity tracker.


# Features

### Borrowing System

- Users can borrow up to 5 books.
- Each user has a 7-day period to return a book;
 otherwise, a violation flag is triggered, resulting in fines.

### Book Management

- Only admins can add new books to the system.

### Renewal and Return

- Users can rievew or return a book within the specified borrowing period.

### Authentication

- **Signup:** Users can create an account.
- **Login:** Secure login using JWT.
- **Logout:** Users can log out of their accounts.
- **Forget Password:** Password recovery through email.
- **Reset Password:** Users can reset their passwords securely.
- **Update Password:** Users have the option to update their passwords.





