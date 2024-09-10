// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IERC20 {
    function decimals() external view returns (uint8);
    function balanceOf(address account) external view returns (uint256);
    function transfer(
        address recipient,
        uint256 amount
    ) external returns (bool);
    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) external returns (bool);
    function getTokenAddress() external view returns (address);
}

contract VotingCampaignContract is Ownable, ReentrancyGuard {
    // increase the voting id when the owner begin the vote campaign
    uint256 public nextCampaignId;
    IERC20 public token;
    uint256 public costPerVote;

    // struct to store the vote campaign info
    struct VoteCampaign {
        address owner;
        string campaignName;
        string metadata;
        string[] options;
        uint256[] results;
        bool isActive;
    }

    mapping(address => uint256) public userVoteBalance;

    // track whether an address is authorized to upload batch results
    mapping(address => bool) public uploaders;

    // Mapping from campaignId to array of batchIds
    mapping(uint256 => uint256) public campaignToBatchIds;

    // preventing duplicate batch uploads for each campaign
    mapping(uint256 => mapping(bytes32 => bool)) public campaignVoteHashes;

    // from voting ID to storing details of each voting campaign
    mapping(uint256 => VoteCampaign) public voteCampaigns;

    // via campaign/batch id track merkle root
    mapping(uint256 => mapping(uint256 => bytes32))
        public campaignBatchIdToMerkleRoot;

    event PayingTokenUpdate(address indexed token);

    event UploaderChange(address indexed uploader, bool isAllowed);

    event CostPerVoteUpdate(uint256 cost);

    // event to notify the change of vote campaign
    event VoteCampaignChange(
        uint256 indexed campaignId,
        string campaignName,
        string metadata,
        string[] options,
        uint256[] results,
        bool isActive
    );

    event UserVoteBalanceUpdate(address indexed userAddress, uint256 balance);

    event VoteBatchUploaded(
        uint256 indexed campaignId,
        uint256 indexed batchId,
        uint256[] voteResults,
        bytes32 merkleRoot
    );

    event CampaignOwnershipTransferred(
        uint256 indexed campaignId,
        address newOwner
    );

    event EndCampaign(uint256 indexed campaignId);

    event UploadBatch(
        uint256 indexed votingId,
        uint256 indexed batchId,
        uint256[] voteResults
    );

    modifier onlyUploader() {
        require(uploaders[msg.sender], "Caller is not authorized to upload");
        _;
    }

    modifier enoughBalance(uint256 amount) {
        require(
            token.balanceOf(msg.sender) >= amount,
            "Not enough token balance"
        );
        _;
    }

    // Modifier to check if campaign exists and is active
    modifier isValidCampaign(uint256 campaignId) {
        require(
            voteCampaigns[campaignId].isActive,
            "Voting campaign does not exist or is not active"
        );
        _;
    }

    modifier onlyCampaignOwner(uint256 campaignId) {
        require(
            voteCampaigns[campaignId].owner == msg.sender,
            "Only campaign owner can modify campaign informations"
        );
        _;
    }

    modifier validNextBatchId(uint256 campaignId, uint256 batchId) {
        require(
            batchId == (campaignToBatchIds[campaignId] + 1),
            "Invalid batch Id: batchId is not the next in the sequence"
        );
        require(
            campaignBatchIdToMerkleRoot[campaignId][batchId] == bytes32(0),
            "Invalid batch Id: Merkle root already exists for this batchId"
        );
        _;
    }

    modifier uniqueMerkleRoot(uint campaignId, bytes32 merkleRoot) {
        require(
            !campaignVoteHashes[campaignId][merkleRoot],
            "Duplicated voting result found!"
        );
        _;
    }

    modifier nonZeroAddress(address addr) {
        require(addr != address(0), "Zero address");
        _;
    }

    constructor(address _payingToken) Ownable(msg.sender) {
        token = IERC20(_payingToken);
        costPerVote = 10 * 10 ** token.decimals();
    }

    // function for owner to set uploader
    function setUploader(
        address _newUploader,
        bool _isAllowed
    ) external onlyOwner nonZeroAddress(_newUploader) {
        uploaders[_newUploader] = _isAllowed;
        emit UploaderChange(_newUploader, _isAllowed);
    }

    function setPayingToken(
        address _payingToken
    ) external onlyOwner nonZeroAddress(_payingToken) {
        token = IERC20(_payingToken);
        emit PayingTokenUpdate(_payingToken);
    }

    function setCostPerVote(uint256 _cost) external onlyOwner {
        require(_cost > 0, "Cost must be greater than 0");
        costPerVote = _cost;
        emit CostPerVoteUpdate(_cost);
    }

    function userPayforVote() external enoughBalance(costPerVote) nonReentrant {
        require(
            token.transferFrom(msg.sender, address(this), costPerVote),
            "Token transfer failed"
        );

        userVoteBalance[msg.sender] += 1;
        emit UserVoteBalanceUpdate(msg.sender, userVoteBalance[msg.sender]);
    }

    function userCastVote() external {
        require(userVoteBalance[msg.sender] > 0, "User has no chance to vote");

        userVoteBalance[msg.sender] -= 1;
        emit UserVoteBalanceUpdate(msg.sender, userVoteBalance[msg.sender]);
    }

    function beginVoteCampaign(
        string calldata _campaignName,
        string calldata _metadata,
        string[] calldata _options
    ) external returns (uint256) {
        require(
            _options.length > 1 && _options.length < 5,
            "Options must be more than one and smaller than 5"
        );
        uint256[] memory initResults = new uint256[](_options.length);
        voteCampaigns[nextCampaignId] = VoteCampaign({
            owner: msg.sender,
            campaignName: _campaignName,
            metadata: _metadata,
            options: _options,
            results: initResults,
            isActive: true
        });

        nextCampaignId++;
        uint256 campaignId = nextCampaignId - 1;

        emit VoteCampaignChange(
            campaignId,
            _campaignName,
            _metadata,
            _options,
            initResults,
            true
        );

        return campaignId;
    }

    function updateVoteCampaign(
        uint256 campaignId,
        string calldata _campaignName,
        string calldata _metadata
    ) external onlyCampaignOwner(campaignId) {
        voteCampaigns[campaignId].campaignName = _campaignName;
        voteCampaigns[campaignId].metadata = _metadata;
        emit VoteCampaignChange(
            campaignId,
            _campaignName,
            _metadata,
            voteCampaigns[campaignId].options,
            voteCampaigns[campaignId].results,
            true
        );
    }

    function endCampaign(
        uint256 campaignId
    ) public onlyCampaignOwner(campaignId) {
        voteCampaigns[campaignId].isActive = false;
        emit EndCampaign(campaignId);
    }

    function transferCampaignOwnership(
        uint256 campaignId,
        address newOwner
    ) external onlyCampaignOwner(campaignId) nonZeroAddress(newOwner) {
        voteCampaigns[campaignId].owner = newOwner;
        emit CampaignOwnershipTransferred(campaignId, newOwner);
    }

    function uploadVoteBatch(
        uint256 campaignId,
        uint256[] calldata voteResults,
        bytes32 merkleRoot
    )
        external
        onlyUploader
        isValidCampaign(campaignId)
        uniqueMerkleRoot(campaignId, merkleRoot)
        returns (uint256, uint256)
    {
        require(
            voteResults.length == voteCampaigns[campaignId].options.length,
            "Invalid results length"
        );
        campaignVoteHashes[campaignId][merkleRoot] = true;

        for (uint i = 0; i < voteResults.length; i++) {
            voteCampaigns[campaignId].results[i] += voteResults[i];
        }

        //store merkle root of [campaignId][batchId]
        campaignBatchIdToMerkleRoot[campaignId][
            campaignToBatchIds[campaignId]
        ] = merkleRoot;
        campaignToBatchIds[campaignId] += 1;

        emit UploadBatch(
            campaignId,
            campaignToBatchIds[campaignId] - 1,
            voteCampaigns[campaignId].results
        );

        return (campaignId, campaignToBatchIds[campaignId] - 1);
    }

    function burnTokens() external onlyOwner {
        require(
            token.balanceOf(address(this)) >= 0,
            "Insufficient token balance to burn"
        );
        require(
            token.transfer(address(0), token.balanceOf(address(this))),
            "Token transfer to burn address failed"
        );
    }

    function getCampaignResults(
        uint256 campaignId
    ) public view returns (uint256[] memory) {
        return voteCampaigns[campaignId].results;
    }

    function getBatchMerkleRoot(
        uint256 campaignId,
        uint256 batchId
    ) public view returns (bytes32) {
        return campaignBatchIdToMerkleRoot[campaignId][batchId];
    }

    function getUploader(address uploader) public view returns (bool) {
        return uploaders[uploader];
    }

    function getCampaign(uint256 campaignId) public view returns (VoteCampaign memory){
        return voteCampaigns[campaignId];
    }

    function getTokenAndCost() public view returns (address, uint256){
        return(token.getTokenAddress(), costPerVote);
    }

    receive() external payable {
        revert("Contract does not accept ETH");
    }
}
