# 🍽️ Restaurant AI System

An AI-powered restaurant management and online food ordering system built with the MERN stack.

## 🚀 Features

### 👤 Customer
- User Registration & Login
- Browse Restaurant Menu
- Search Food Items
- Add Items to Cart
- Checkout System
- Razorpay Test Payment
- Order Confirmation
- My Orders
- Live Order Status Tracking
- Cancel Order

### 👨‍💼 Admin
- Admin Login
- Admin Dashboard
- View All Orders
- View Customer Details
- Update Order Status
- Order Status History
- Order Statistics
- Manage Cancelled and Delivered Orders

## 🛠️ Tech Stack

### Frontend
- React.js
- React Router
- Vite
- CSS

### Backend
- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT Authentication
- bcryptjs

### Payment
- Razorpay Test Mode

## 📁 Project Structure

```text
Restaurant-AI-System/
│
├── client/
│   ├── src/
│   ├── public/
│   └── package.json
│
├── server/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   └── server.js
│
├── .gitignore
├── package.json
└── package-lock.json
⚙️ Installation
1. Clone the repository
git clone https://github.com/ADITYA-SINGH1123/Restaurant-AI-System.git
cd Restaurant-AI-System
2. Install frontend dependencies
cd client
npm install
3. Install backend dependencies
cd ../server
npm install
4. Environment Variables

Create a .env file inside the server folder.

Add your own:

MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
RAZORPAY_KEY_ID=your_razorpay_test_key
RAZORPAY_KEY_SECRET=your_razorpay_test_secret

Never upload .env or secret keys to GitHub.

▶️ Run the Project
Start Backend
cd server
node server.js

Backend runs on:

http://localhost:5000
Start Frontend

Open another terminal:

cd client
npm run dev

Frontend runs on:

http://localhost:5173
💳 Payment

The project uses Razorpay Test Mode for payment testing.

No real money is used during test payments.

🔐 Security
JWT-based authentication
Password hashing with bcryptjs
Protected backend routes
Admin-only order management
Razorpay server-side payment verification
Environment variables for sensitive credentials
CORS protection
🔮 Future Improvements
AI-based food recommendations
AI chatbot for restaurant assistance
Online food delivery tracking
UPI payment integration
Restaurant analytics
Email/SMS order notifications
Cloud deployment
Mobile application
👨‍💻 Author

1.Aditya Singh
2.Anurag Singh
3.Priyanshu Sharma

📄 License

This project is created for educational and development purposes.
