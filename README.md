# Decentralized Voting System

<div align="center">
  <h1>Decentralized Voting System</h1>
  <p>Secure • Transparent • Immutable</p>
  <hr/>
</div>


## Overview

This project is a full-stack decentralized application (DApp) that provides a secure and transparent platform for conducting polls and elections. It leverages the power of the Ethereum blockchain to ensure vote integrity while offering a modern, user-friendly interface built with React and Node.js.

Users can register as voters, participate in active polls, and view their voting history. The system prevents duplicate voting on the same poll and ensures that all votes are recorded immutably on the blockchain.

---

## ✨ Key Features

- **Secure User Authentication**: JWT-based authentication with role management (voter, admin).
- **Blockchain Integration**: Votes are cast as transactions on the Sepolia testnet via MetaMask.
- **Immutable & Transparent Voting**: All votes are recorded on-chain, ensuring they cannot be altered or censored.
- **Real-Time Polls**: View active polls with live vote counts.
- **Vote History**: Users can view a history of all the polls they have participated in.
- **Duplicate Vote Prevention**: The backend and frontend work together to prevent a user from voting more than once on the same poll.
- **Responsive UI**: A modern and intuitive user interface built with React, Tailwind CSS, and Framer Motion.

---

## 🛠️ Technology Stack

### Frontend
- **React**: A JavaScript library for building user interfaces.
- **Vite**: A next-generation frontend tooling for fast development.
- **Ethers.js**: A complete and compact library for interacting with the Ethereum Blockchain.
- **Tailwind CSS**: A utility-first CSS framework for rapid UI development.
- **Framer Motion**: A production-ready motion library for React.

### Backend
- **Node.js**: A JavaScript runtime built on Chrome's V8 engine.
- **Express**: A minimal and flexible Node.js web application framework.
- **MongoDB**: A cross-platform document-oriented database program.
- **Mongoose**: An elegant MongoDB object modeling tool for Node.js.
- **JSON Web Tokens (JWT)**: Used for securing user authentication.

### Blockchain
- **Solidity**: The programming language used for writing smart contracts.
- **Hardhat**: An Ethereum development environment for compiling, deploying, testing, and debugging smart contracts.
- **Sepolia Testnet**: The test network used for deploying and testing the voting contract.

---

## 🚀 Getting Started

Follow these instructions to set up and run the project on your local machine.

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [npm](https://www.npmjs.com/)
- Wallet & network:
  - Desktop: MetaMask browser extension
  - Mobile: MetaMask Mobile app (use its in-app browser)
- Sepolia ETH in your wallet (for on-chain actions)
- Backend API reachable at `VITE_API_URL` (default `http://localhost:5000`)

---

## 🔧 Configuration

### 1) Backend environment
Create `decentralized-voting-system/server/.env` with:

```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
SEPOLIA_RPC_URL=your_sepolia_rpc_url_from_alchemy_or_infura
ADMIN_PRIVATE_KEY=your_admin_wallet_private_key
# Set this to the deployed Voting contract address
VOTING_CONTRACT_ADDRESS=0xYourVotingAddress
# Optional: VoterRegistry address if the server uses it directly
VOTER_REGISTRY_CONTRACT_ADDRESS=0xYourRegistryAddress
```

Start the API server on port 5000 (see Run section below).

### 2) Frontend environment (Vite)
Create `decentralized-voting-system/temp-vite/.env` with:

```env
VITE_API_URL=http://localhost:5000
VITE_SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/<your-key>
VITE_VOTING_CONTRACT_ADDRESS=0xYourVotingAddress
VITE_VOTER_REGISTRY_CONTRACT_ADDRESS=0xYourRegistryAddress
```

Notes:
- Frontend reads addresses and RPC from `src/config/config.js` via the above VITE_ variables.
- If you omit them, defaults in `config.js` will be used (likely not your deployment).

---

## ▶️ Run the Application

1. Install dependencies (first time only):

```bash
# From repo root
cd decentralized-voting-system/server
npm install

cd ../temp-vite
npm install
```

2. Start services:

```bash
# Terminal 1 (API)
cd decentralized-voting-system/server
npm run dev

# Terminal 2 (Frontend)
cd decentralized-voting-system/temp-vite
npm run dev
```

The app will be available at the Vite URL (e.g., `http://localhost:5173`).

---

## 🗳️ How to Vote

Desktop (Chrome/Brave + MetaMask):
- **Open the app**: Visit the Vite URL (e.g., `http://localhost:5173`). Ensure MetaMask extension is installed and unlocked.
- **Connect & Login**: Go to `Login` and connect your wallet. A session token is saved locally.
- **View Polls**: Open `Polls` or `Dashboard` to see active polls.
- **Register (if asked)**: If your wallet isn’t registered on-chain, click Register and confirm in MetaMask.
- **Cast Vote**: Select your choice and confirm the transaction in MetaMask.
- **Download Receipt**: After confirmation, download your encrypted invoice/receipt from the dashboard.

Mobile (MetaMask Mobile in-app browser):
- **Open MetaMask app** → Browser tab → enter your Vite URL.
- **Connect & Login**: Use the `Login` page to connect within MetaMask’s browser.
- **View Polls**: Navigate to `Polls`/`Dashboard`.
- **Register & Vote**: If prompted, register on-chain, then vote and confirm the tx in-app.
- **Receipt**: Download the encrypted invoice after success.

Mobile:
- Use MetaMask Mobile’s in-app browser. Open your local URL inside MetaMask to interact with the DApp smoothly.

---

## 🧪 Demo: Aadhaar + Email

A demo route showcases adding Aadhaar + Email for illustrative purposes.

- Navigate to: `/demo/aadhaar`
- Component used: `DemoAadhaarAdmin` (wired in `src/App.jsx`)
- This is a demonstration flow and does not store sensitive information on-chain. Use it only for demo/testing.

---

## 🔍 Useful Source References

- Frontend routes: `decentralized-voting-system/temp-vite/src/App.jsx`
- Layout / Navbar: `decentralized-voting-system/temp-vite/src/components/Layout.jsx`
- Contracts config: `decentralized-voting-system/temp-vite/src/config/config.js`
- Voter dashboard: `decentralized-voting-system/temp-vite/src/pages/VoterDashboard.jsx`

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

