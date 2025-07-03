// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./VoterRegistry.sol";

contract Voting {
    VoterRegistry public voterRegistry;
    address public admin;
    
    struct Poll {
        string title;
        string description;
        string[] options;
        uint256[] votes;
        uint256 endTime;
        bool isActive;
    }
    
    Poll[] public polls;
    mapping(address => mapping(uint256 => bool)) public hasVotedInPoll;
    
    event PollCreated(uint256 indexed pollId, string title, uint256 endTime);
    event VoteCast(uint256 indexed pollId, uint256 optionIndex, address voter);
    
    constructor(address _voterRegistryAddress) {
        admin = msg.sender;
        voterRegistry = VoterRegistry(_voterRegistryAddress);
    }
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this function");
        _;
    }
    
    modifier onlyRegisteredVoter() {
        require(voterRegistry.isRegistered(msg.sender), "Voter not registered");
        _;
    }
    
    function createPoll(
        string memory _title,
        string memory _description,
        string[] memory _options,
        uint256 _duration
    ) public onlyAdmin {
        require(_options.length > 1, "Must have at least 2 options");
        require(_duration > 0, "Duration must be greater than 0");
        
        uint256[] memory initialVotes = new uint256[](_options.length);
        for (uint256 i = 0; i < _options.length; i++) {
            initialVotes[i] = 0;
        }
        
        Poll memory newPoll = Poll({
            title: _title,
            description: _description,
            options: _options,
            votes: initialVotes,
            endTime: block.timestamp + _duration,
            isActive: true
        });
        
        polls.push(newPoll);
        emit PollCreated(polls.length - 1, _title, block.timestamp + _duration);
    }
    
    function castVote(uint256 _pollId, uint256 _optionIndex) public onlyRegisteredVoter {
        require(_pollId < polls.length, "Invalid poll ID");
        require(_optionIndex < polls[_pollId].options.length, "Invalid option index");
        require(block.timestamp <= polls[_pollId].endTime, "Poll has ended");
        require(!hasVotedInPoll[msg.sender][_pollId], "Already voted in this poll");
        require(!voterRegistry.hasAlreadyVoted(msg.sender), "Voter has already voted");
        
        polls[_pollId].votes[_optionIndex]++;
        hasVotedInPoll[msg.sender][_pollId] = true;
        voterRegistry.markAsVoted(msg.sender);
        
        emit VoteCast(_pollId, _optionIndex, msg.sender);
    }
    
    function getPoll(uint256 _pollId) public view returns (
        string memory title,
        string memory description,
        string[] memory options,
        uint256[] memory votes,
        uint256 endTime,
        bool isActive
    ) {
        require(_pollId < polls.length, "Invalid poll ID");
        Poll storage poll = polls[_pollId];
        return (
            poll.title,
            poll.description,
            poll.options,
            poll.votes,
            poll.endTime,
            poll.isActive
        );
    }
    
    function getPollsCount() external view returns (uint256) {
        return polls.length;
    }
}
