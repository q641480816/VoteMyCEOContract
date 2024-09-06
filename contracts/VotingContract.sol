// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract VotingContract is Ownable {
    // increase the voting id when the owner begin the vote campaign
    uint256 public nextVotingId;

    // increase the batch id when the uploader update the batch
    uint256 public nextBatchId;

    // struct to store the vote campaign info
    struct VoteCampaign {
        string name;
        string[] options;
        uint256[] results;
        bool isActive;
    }

    // from voting ID to storing details of each voting campaign
    mapping(uint256 => VoteCampaign) public voteCampaigns;

    // track whether an address is authorized to upload batch results
    mapping(address => bool) public uploaders;

    // preventing duplicate batch uploads for each campaign
    mapping(uint256 => mapping(bytes32 => bool)) public voteBatchHashes;

    // via batch id track merkle root
    mapping(uint256 => bytes32) public batchIdToMerkleRoot;

    // event to notify the begin vote campaign
    event BeginVoteCampaign(
        string name,
        string[] options,
        uint256 indexed votingId,
        bool status
    );

    // event to notify the end vote campaign
    event EndVoteCampaign(uint256 indexed votingId, bool status);

    // event to notify the upload batch
    event UploadBatch(
        uint256 indexed votingId,
        uint256[] voteResults,
        uint256 indexed batchId
    );

    // to check if the caller is an authorized uploader
    modifier onlyUploader() {
        require(uploaders[msg.sender], "Caller is not authorized to upload");
        _;
    }

    constructor() Ownable(msg.sender) {}

    // function for owner to set uploader
    function setUploader(
        address _newUploader,
        bool _isAllowed
    ) external onlyOwner {
        require(_newUploader != address(0), "Zero address");
        uploaders[_newUploader] = _isAllowed;
    }

    // function to begin vote campaign
    function beginVoteCampaign(
        string calldata name,
        string[] calldata options
    ) external onlyOwner returns (uint256) {
        uint256[] memory initResults = new uint256[](options.length);
        voteCampaigns[nextVotingId] = VoteCampaign({
            name: name,
            options: options,
            results: initResults,
            isActive: true
        });

        nextVotingId++;
        uint256 votingId = nextVotingId - 1;

        emit BeginVoteCampaign(name, options, votingId, true);

        return votingId;
    }

    // function to end vote campaign
    function endVoteCampaign(uint256 votingId) external onlyOwner {
        require(voteCampaigns[votingId].isActive, "Campaign is not active");
        voteCampaigns[votingId].isActive = false;

        bool status = voteCampaigns[votingId].isActive;

        emit EndVoteCampaign(votingId, status);
    }

    // function to upload batch
    function uploadBatch(
        uint256 votingId,
        uint256[] calldata voteResults,
        bytes32 merkleRoot
    ) external onlyUploader returns (uint256) {
        require(voteCampaigns[votingId].isActive, "Campaign is not active");
        require(
            voteResults.length == voteCampaigns[votingId].options.length,
            "Invalid results length"
        );

        require(
            !voteBatchHashes[votingId][merkleRoot],
            "Duplicate results detected"
        );
        voteBatchHashes[votingId][merkleRoot] = true;

        for (uint i = 0; i < voteResults.length; i++) {
            voteCampaigns[votingId].results[i] += voteResults[i];
        }

        nextBatchId++;

        uint256 batchId = nextBatchId - 1;

        batchIdToMerkleRoot[batchId] = merkleRoot;

        emit UploadBatch(votingId, voteResults, batchId);

        return batchId;
    }

    // function to get campaign results
    function getCampaignResults(
        uint256 votingId
    )
        public
        view
        returns (string memory, string[] memory, uint256[] memory, bool)
    {
        return (
            voteCampaigns[votingId].name,
            voteCampaigns[votingId].options,
            voteCampaigns[votingId].results,
            voteCampaigns[votingId].isActive
        );
    }

    // function to via batch id get merkle root
    function getBatchMerkleRoot(uint256 batchId) public view returns (bytes32) {
        return batchIdToMerkleRoot[batchId];
    }
}
