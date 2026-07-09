Bank Application (SBA)A robust, full-stack banking orchestration suite built with FastAPI, React, and MongoDB. This project demonstrates the implementation of secure RESTful APIs, transaction integrity, and modern architectural patterns.

🚀 Overview
The Simple Bank Application provides a secure environment for users to manage their financial assets. It moves beyond a passive ledger by implementing strict business rules for withdrawals, real-time transaction history, and an observable audit trail of all financial movements.

🛠 Tech Stack
- Backend: Python 3.12+ / FastAPI (Asynchronous REST API) 
- Frontend: React.js with Hooks and Functional Components 
- Database: MongoDB (NoSQL) for flexible schema management Authentication: JWT (JSON Web Tokens) with Argon2/Bcrypt     password 
- hashing Dev Tools: VS Code, Postman, Swagger UI 

🏗 Architecture & DesignThe system follows the MVC (Model-View-Controller) pattern to ensure a clean separation of concerns:
- Model: Pydantic and Motor (MongoDB) entities for data integrity.
- Controller (Services): Business logic layer for balance validation and transaction processing.
- Router: Fast API endpoints facilitating UI-to-Backend communication.Shutterstock

📋 Features
- Account Management: User registration, login, and secure account creation.
- Banking Operations: Real-time deposits and withdrawals with automated balance updates.
- Transaction Integrity: Maintains a non-mutable history of all account activities.
- Security: Role-based access control (Admin vs. User) and protected API routes.
- Asset Logic: Prevents overdrafts and ensures all deposit amounts are positive.

📂 Project Structure

├── backend/
│   ├── app/
│   │   ├── routers/    # API Endpoints
│   │   ├── services/   # Business Logic/Controllers
│   │   ├── models/     # Pydantic/MongoDB Schemas
│   │   └── main.py     # Application Entry Point
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/ # React UI Components
│   │   └── api/        # Axios Configuration
│   └── package.json
└── README.md

🚥 Getting Started
Prerequisites
- macOS (Zsh environment)
- Python 3.12+
- Node.js & npmMongoDB Atlas or local instance

Installation
1. Clone the repository:Bashgit clone https://github.com/your-username/bank-app.git
2. cd bank-app
3.  Backend Setup: 
    
    cd backend
    source venv/bin/activate
    pip install -r requirements.txt
    cp ../.env.example ../.env   # then fill in a real SECRET_KEY
    export SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")
    uvicorn app.main:app --reload

4.  Frontend Setup:Bashcd ../frontend
    npm install
    npm start

testing:
export PYTHONPATH=$PYTHONPATH:. && ../venv/bin/python3 -m pytest -v tests/bank_test.py

🔒 Business Rules
- Withdrawal Constraint: Users cannot withdraw more than their current balance.
- Positive Deposits: Only positive numerical values are accepted for deposit transactions.
- Data Audit: Every financial action creates a permanent record in the TRANSACTIONS collection.

Lead Architect: Miguel Corachea
Project Date: March 2026 