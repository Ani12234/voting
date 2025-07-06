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
- [MetaMask](https://metamask.io/) browser extension

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/decentralized-voting-system.git
    cd decentralized-voting-system
    ```

2.  **Install server dependencies:**
    ```bash
    cd server
    npm install
    ```

3.  **Install client dependencies:**
    ```bash
    cd ../client/temp-vite
    npm install
    ```

4.  **Set up environment variables:**

    Create a `.env` file in the `server` directory and add the following variables:

    ```env
    MONGODB_URI=your_mongodb_connection_string
    JWT_SECRET=your_jwt_secret
    SEPOLIA_RPC_URL=your_sepolia_rpc_url_from_alchemy_or_infura
    ADMIN_PRIVATE_KEY=your_admin_wallet_private_key
    VOTING_CONTRACT_ADDRESS=your_deployed_contract_address
    ```

    Create a `.env` file in the `client/temp-vite` directory and add the following:

    ```env
    VITE_API_URL=http://localhost:5000
    ```

5.  **Run the application:**

    -   **Start the backend server:**
        ```bash
        cd ../../server
        npm run dev
        ```

    -   **Start the frontend client:**
        ```bash
        cd ../client/temp-vite
        npm run dev
        ```

The application should now be running. Open your browser and navigate to the URL provided by Vite (usually `http://localhost:5173`).

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

