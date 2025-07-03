// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract VoterRegistry {
    address public admin;
    address public authorizedContract;
    mapping(address => bool) public registeredVoters;
    mapping(address => bool) public hasVoted;
    
    constructor() {
        admin = msg.sender;
    }
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this function");
        _;
    }

    modifier onlyAuthorizedContract() {
        require(msg.sender == authorizedContract, "Only authorized contract can call this function");
        _;
    }

    function authorizeContract(address _contract) public onlyAdmin {
        authorizedContract = _contract;
    }
    
    function registerVoter(address _voter) public onlyAdmin {
        require(!registeredVoters[_voter], "Voter already registered");
        registeredVoters[_voter] = true;
    }
    
    function isRegistered(address _voter) public view returns (bool) {
        return registeredVoters[_voter];
    }
    
    function markAsVoted(address _voter) public onlyAuthorizedContract {
        require(registeredVoters[_voter], "Voter not registered");
        require(!hasVoted[_voter], "Voter has already voted");
        hasVoted[_voter] = true;
    }
    
    function hasAlreadyVoted(address _voter) public view returns (bool) {
        return hasVoted[_voter];
    }
}
