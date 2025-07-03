# Decentralized Voting System

A transparent and secure voting system built on the Ethereum blockchain using Solidity smart contracts and modern web technologies.

## Features

- Secure voter registration and authentication
- Transparent voting process on the blockchain
- Real-time results tallying
- Public auditability
- Protection against double voting
- User-friendly interface

## Tech Stack

- **Frontend:** React, Chakra UI, Material-UI, Ethers.js
- **Backend:** Node.js, Express, MongoDB, Mongoose, JWT
- **Blockchain:** Solidity, Hardhat, Ethereum (Sepolia testnet)

## Prerequisites

- Node.js (v18 or higher)
- MongoDB
- MetaMask browser extension

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/Ani12234/voting.git
cd decentralized-voting-system
```

### 2. Environment Variables

You'll need to set up environment variables for the root directory, the server, and the client. There are `.env.example` files in each of these directories to guide you.

**Root `.env`:**

Create a `.env` file in the root directory and add the following:

```
SEPOLIA_RPC_URL=your_sepolia_rpc_url
ADMIN_PRIVATE_KEY=your_admin_private_key
```

**Server `.env`:**

Create a `.env` file in the `server` directory and add your MongoDB connection string and other required variables.

**Client `.env`:**

Create a `.env` file in the `client` directory and add the necessary environment variables, such as the server URL.

### 3. Install Dependencies

Install the necessary packages for the root, server, and client.

```bash
# Install root dependencies
npm install

# Install server dependencies
cd server
npm install
cd ..

# Install client dependencies
cd client
npm install
cd ..
```

### 4. Deploy Smart Contracts

Deploy the smart contracts to the Sepolia testnet using Hardhat.

```bash
npm run deploy
```

After deployment, take note of the `VoterRegistry` and `Voting` contract addresses. You will need to add these to your `client/.env` and `server/.env` files.

### 5. Run the Application

Once the setup is complete, you can run the backend and frontend servers.

```bash
# Start the backend server
cd server
npm start

# In a new terminal, start the frontend client
cd client
npm start
```

## Usage

1.  Connect your MetaMask wallet.
2.  The admin can register new voters.
3.  Browse active polls.
4.  Cast your vote.
5.  View the results.

## Contributing

1.  Fork the repository.
2.  Create your feature branch.
3.  Commit your changes.
4.  Push to the branch.
5.  Create a new Pull Request.
