// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract VotingContract is Ownable {
    // increase the voting id when the owner begin the vote campaign
    uint256 public nextCampaignId;
    address public payingToken;

    // struct to store the vote campaign info
    struct VoteCampaign {
        address owner;
        string campaignName;
        string metadata;
        string[] options;
        uint256[] results;
        bool isActive;
    }

    // track whether an address is authorized to upload batch results
    mapping(address => bool) public uploaders;

    // Mapping from campaignId to array of batchIds
    mapping(uint256 => uint256[]) public campaignToBatchIds;

    // preventing duplicate batch uploads for each campaign
    mapping(uint256 => mapping(bytes32 => bool)) public campaignVoteHashes;

    // from voting ID to storing details of each voting campaign
    mapping(uint256 => VoteCampaign) public voteCampaigns;

    // via campaign/batch id track merkle root
    mapping(uint256 => mapping(uint256 => bytes32)) public campaignBatchIdToMerkleRoot;

    // event to notify the change of vote campaign
    event BeginVoteCampaign(
        uint256 indexed campaignId,
        string campaignName,
        string metadata,
        string[] options,
        uint256[] results,
        bool isActive
    );

    event VoteBatchUploaded(
        uint256 indexed campaignId,
        uint256 indexed batchId,
        uint256[] voteResults
    )

    modifier onlyUploader() {
        require(uploaders[msg.sender], "Caller is not authorized to upload");
        _;
    }

    // Modifier to check if campaign exists and is active
    modifier isValidCampaign(uint256 campaignId) {
        require(voteCampaigns[campaignId].isActive, "Voting campaign does not exist or is not active");
        _;
    }

    modifier onlyCampaignOwner(uint256 campaignId) {
        require(voteCampaigns[campaignId].owner == msg.sender, "Only campaign owner can modify campaign informations");
        _;
    }

    modifier validNextBatchId(uint256 campaignId, uint256 batchId) {
        require(batchId == campaignToBatchIds[campaignId] + 1 && campaignBatchIdToMerkleRoot[campaignId][batchId] == bytes32(0), "Invalid batch Id provided");
        _;
    }

    modifier uniqueMerkleRoot(uint campaignId, bytes32 merkleRoot){
        require(!campaignVoteHashes[campaignId][merkleRoot], "Duplicated voting result found!");
        _;
    }

    constructor(address _payingToken) Ownable(msg.sender) {
        payingToken = _payingToken;
    }

    // function for owner to set uploader
    function setUploader(address _newUploader, bool _isAllowed) external onlyOwner {
        require(_newUploader != address(0), "Zero address");
        uploaders[_newUploader] = _isAllowed;
    }

    function setPayingToken(address _payingToken) external onlyOwner {
        require(token != address(0), "Zero address");
        payingToken = _payingToken;
    }
}