# Bank Application (SBA)

A robust, full-stack banking orchestration suite built with FastAPI, React, and MongoDB. This project demonstrates the implementation of secure RESTful APIs, transaction integrity, and modern architectural patterns.

![Python](https://img.shields.io/badge/Python-3.12+-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-async-009688?logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![MongoDB](https://img.shields.io/badge/MongoDB-NoSQL-47A248?logo=mongodb&logoColor=white)
![JWT](https://img.shields.io/badge/Auth-JWT-000000?logo=jsonwebtokens&logoColor=white)

## Table of Contents
- [Overview](#-overview)
- [Tech Stack](#-tech-stack)
- [Architecture & Design](#-architecture--design)
- [Features](#-features)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Business Rules](#-business-rules)

## 🚀 Overview
The Simple Bank Application provides a secure environment for users to manage their financial assets. It moves beyond a passive ledger by implementing strict business rules for withdrawals, real-time transaction history, and an observable audit trail of all financial movements.

## 🛠 Tech Stack

| Layer            | Technology                                   | Purpose                                                |
|-------------------|-----------------------------------------------|---------------------------------------------------------|
| Backend           | Python 3.12+ / FastAPI (async REST API)       | Business logic, validation, and API routing              |
| Frontend          | React.js (Hooks + Functional Components)      | User interface and client-side state                    |
| Database          | MongoDB (NoSQL) via Motor                      | Flexible, document-based schema management               |
| Authentication    | JWT with Argon2 / Bcrypt password hashing      | Stateless auth and secure credential storage             |
| AI Support Chat   | Anthropic Claude API                           | In-app conversational support                            |
| Dev Tools         | VS Code, Postman, Swagger UI                   | Local development and API exploration                    |

## 🏗 Architecture & Design
The system follows the MVC (Model-View-Controller) pattern to ensure a clean separation of concerns:

| Layer                  | Responsibility                                                                 |
|--------------------------|-----------------------------------------------------------------------------------|
| Model                   | Pydantic and Motor (MongoDB) entities for data integrity                          |
| Controller (Services)   | Business logic layer for balance validation and transaction processing            |
| Router                  | FastAPI endpoints facilitating UI-to-Backend communication                        |

## 📋 Features

| Feature               | Description                                                                       |
|-------------------------|-----------------------------------------------------------------------------------|
| Account Management     | User registration, login, and secure account creation                             |
| Banking Operations     | Real-time deposits and withdrawals with automated balance updates                 |
| Transaction Integrity  | Maintains a non-mutable history of all account activities                         |
| Security               | Role-based access control (Admin vs. User) and protected API routes               |
| Asset Logic            | Prevents overdrafts and ensures all deposit amounts are positive                  |
| Goals & Budgets        | User-defined savings goals and spending budgets with progress tracking            |
| Recurring Transfers    | Scheduled, automated transfers between accounts                                   |
| Notifications          | In-app alerts for account and transaction activity                                |
| Beneficiaries          | Saved recipients for faster, repeatable transfers                                 |
| AI Support Chat        | Conversational assistant for common banking questions                            |

## 📂 Project Structure

```
├── backend/
│   ├── app/
│   │   ├── routers/    # API Endpoints
│   │   ├── services/   # Business Logic/Controllers
│   │   ├── models/     # Pydantic/MongoDB Schemas
│   │   └── main.py     # Application Entry Point
│   ├── scripts/        # One-off CLI utilities (e.g. create_admin)
│   ├── tests/          # Pytest suite
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/ # React UI Components
│   │   └── api/        # Axios Configuration
│   └── package.json
├── infrastructure/     # Deployment/infra configuration
├── deploy.sh
└── README.md
```

## 🚥 Getting Started

### Prerequisites

| Requirement                    | Notes                                            |
|----------------------------------|---------------------------------------------------|
| macOS (Zsh environment)         | Instructions below assume `zsh`/`bash`             |
| Python 3.12+                    | Backend runtime                                    |
| Node.js & npm                   | Frontend runtime                                   |
| MongoDB                         | Local instance or MongoDB Atlas                    |

### 1. Clone the repository
```
git clone https://github.com/your-username/bank-app.git
cd bank-app
```

### 2. Configure environment variables
```
cp .env.example .env   # then fill in a real SECRET_KEY and MONGO_URL
```

### 3. Run the Backend

The backend is a FastAPI app served by Uvicorn. A virtual environment already lives at the repo root (`venv/`).

```
# From the repo root
source venv/bin/activate
cd backend
pip install -r requirements.txt

# Make sure MongoDB is running (skip if using Atlas)
brew services start mongodb-community

# Start the API server
uvicorn app.main:app --reload --port 8000
```
The API is now available at `http://localhost:8000`, with interactive docs at `http://localhost:8000/docs`.

**Create the first admin (one-time):** registration always creates a regular "user" account — nobody can grant themselves admin over the API. Seed the initial admin directly instead:
```
python -m scripts.create_admin --name "Your Name" --email you@example.com --password "changeme123"
```
From there, that admin can promote anyone else to admin from the Admin Dashboard's "Make Admin" button — the script shouldn't be needed again.

**Run the backend test suite:**
```
export PYTHONPATH=$PYTHONPATH:.
python -m pytest -v tests/bank_test.py
```

### 4. Run the Frontend

In a separate terminal, from the repo root:
```
cd frontend
npm install
npm start
```

## 🔒 Business Rules

| Rule                    | Description                                                                 |
|----------------------------|---------------------------------------------------------------------------------|
| Withdrawal Constraint     | Users cannot withdraw more than their current balance                         |
| Positive Deposits         | Only positive numerical values are accepted for deposit transactions          |
| Data Audit                | Every financial action creates a permanent record in the TRANSACTIONS collection |

---

**Lead Architect:** Miguel Corachea
**Project Date:** March 2026
