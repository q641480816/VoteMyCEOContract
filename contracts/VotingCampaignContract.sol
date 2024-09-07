// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract VotingContract is Ownable {
    // increase the voting id when the owner begin the vote campaign
    uint256 public nextCampaignId;

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

    modifier validCampaign() {
        require()
    }
}