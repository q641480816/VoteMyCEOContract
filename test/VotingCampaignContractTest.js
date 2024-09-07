const { ethers } = require("hardhat");
const { expect } = require("chai");
const { beforeEach } = require("mocha");


describe("Token and Faucet Test", () => {
    let votingCampaignContract;
    let tokenContract;
    let tokenTwoContract;
    let contractAddress;

    beforeEach(async () => {
        const [creater, owner] = await ethers.getSigners();

        const tokenContractFactory = await ethers.getContractFactory(
            "VotingToken"
        );
        tokenContract = await tokenContractFactory.deploy(creater);
        tokenTwoContract = await tokenContractFactory.deploy(creater);
        const votingCampaignContractFactory = await ethers.getContractFactory(
            "VotingCampaignContract"
        );

        const tokenAddress = await tokenContract.getAddress();
        votingCampaignContract = await votingCampaignContractFactory.deploy(tokenAddress);
    })

    it("Should set the right owner to creator", async () => {
        const [creater] = await ethers.getSigners();
        expect(await votingCampaignContract.owner()).to.equal(creater.address);
    });

    it("should set correct owner after transfer", async () => {
        const [creater, owner] = await ethers.getSigners();
        await votingCampaignContract.transferOwnership(owner.address)
        expect(await votingCampaignContract.owner()).to.equal(owner.address);
    })

    it("should set correct paying token", async () => {
        const [creater, owner] = await ethers.getSigners();

        const tokenAddress = await tokenContract.getAddress();
        expect(await votingCampaignContract.token()).to.equal(tokenAddress);
    })

    it("should set correct paying token", async () => {
        const [creater, owner] = await ethers.getSigners();

        const tokenAddress = await tokenContract.getAddress();
        expect(await votingCampaignContract.token()).to.equal(tokenAddress);
    })

    it("should set correct new paying token", async () => {
        const [creater, owner] = await ethers.getSigners();

        const tokenAddress = await tokenContract.getAddress();
        expect(await votingCampaignContract.token()).to.equal(tokenAddress);

        const tokenTwoAddress = await tokenTwoContract.getAddress();
        await expect(votingCampaignContract.setPayingToken(tokenTwoAddress))
            .to.emit(votingCampaignContract, "PayingTokenUpdate").withArgs(tokenTwoAddress)

        expect(await votingCampaignContract.token()).to.equal(tokenTwoAddress);
    })

    it("Should only owner set paying token", async () => {
        const [creater, owner, add] = await ethers.getSigners();

        const tokenAddress = await tokenContract.getAddress();
        expect(await votingCampaignContract.token()).to.equal(tokenAddress);

        const tokenTwoAddress = await tokenTwoContract.getAddress();
        await expect(votingCampaignContract.connect(add).setPayingToken(tokenTwoAddress))
            .to.revertedWithCustomError(votingCampaignContract, "OwnableUnauthorizedAccount");
    })

    it("Should set correct cost per vote", async () => {
        const [creater, owner, address1] = await ethers.getSigners();

        expect(await votingCampaignContract.costPerVote()).to.equal(10n * 10n ** 18n);
    })

    it("Should set correct cost per vote after change", async () => {
        const [creater, owner, address1] = await ethers.getSigners();

        expect(await votingCampaignContract.costPerVote()).to.equal(10n * 10n ** 18n);
        await expect(votingCampaignContract.setCostPerVote(11n * 10n ** 18n))
            .to.emit(votingCampaignContract, "CostPerVoteUpdate").withArgs(11n * 10n ** 18n)
    })

    it("Should new cost per vote > 0", async () => {
        const [creater, owner, address1] = await ethers.getSigners();

        expect(await votingCampaignContract.costPerVote()).to.equal(10n * 10n ** 18n);
        await expect(votingCampaignContract.setCostPerVote(0n))
            .to.revertedWith("Cost must be greater than 0");
    })

    it("Should only owner set cost per vote", async () => {
        const [creater, owner, address1] = await ethers.getSigners();

        expect(await votingCampaignContract.costPerVote()).to.equal(10n * 10n ** 18n);
        await expect(votingCampaignContract.connect(address1).setCostPerVote(11n * 10n ** 18n))
            .to.revertedWithCustomError(votingCampaignContract, "OwnableUnauthorizedAccount");
    })

    it("Should only owner set uploader", async () => {
        const [creater, owner, address1, uploader] = await ethers.getSigners();

        await expect(votingCampaignContract.connect(address1).setUploader(uploader, true))
            .to.revertedWithCustomError(votingCampaignContract, "OwnableUnauthorizedAccount");
    })

    it("Should uploader be true after setting", async () => {
        const [creater, owner, address1, uploader] = await ethers.getSigners();

        await expect(votingCampaignContract.setUploader(uploader, true))
            .to.emit(votingCampaignContract, "UploaderChange").withArgs(uploader, true);

        expect(await votingCampaignContract.getUploader(uploader)).to.equal(true);
    })

    it("Should uploader be false after removing", async () => {
        const [creater, owner, address1, uploader] = await ethers.getSigners();

        await expect(votingCampaignContract.setUploader(uploader, true))
            .to.emit(votingCampaignContract, "UploaderChange").withArgs(uploader, true);

        expect(await votingCampaignContract.getUploader(uploader)).to.equal(true);

        await expect(votingCampaignContract.setUploader(uploader, false))
            .to.emit(votingCampaignContract, "UploaderChange").withArgs(uploader, false);
        expect(await votingCampaignContract.getUploader(uploader)).to.equal(false);
    })

    it("Should campaign be added", async () => {
        const [creater, owner, address1, uploader, campaignOwner] = await ethers.getSigners();

        await expect(votingCampaignContract.connect(campaignOwner).beginVoteCampaign("name", "metadata", ['1', '2']))
            .to.emit(votingCampaignContract, 'VoteCampaignChange').withArgs(
                0, "name", 'metadata', ['1', '2'], [0, 0], true
            )
    })

    it("Should campaign be added, check next id", async () => {
        const [creater, owner, address1, uploader, campaignOwner] = await ethers.getSigners();

        await expect(votingCampaignContract.connect(campaignOwner).beginVoteCampaign("name", "metadata", ['1', '2']))
            .to.emit(votingCampaignContract, 'VoteCampaignChange').withArgs(
                0, "name", 'metadata', ['1', '2'], [0, 0], true
            )

        expect(await votingCampaignContract.nextCampaignId()).to.equal(1);
    })

    it("Should campaign be added, check next id, with 1 option, neg", async () => {
        const [creater, owner, address1, uploader, campaignOwner] = await ethers.getSigners();

        await expect(votingCampaignContract.connect(campaignOwner).beginVoteCampaign("name", "metadata", ['1']))
            .to.revertedWith("Options must be more than one and smaller than 5")
    })

    it("Should campaign be added, check next id, with 6 option, neg", async () => {
        const [creater, owner, address1, uploader, campaignOwner] = await ethers.getSigners();

        await expect(votingCampaignContract.connect(campaignOwner).beginVoteCampaign("name", "metadata", ['1', '2', '3', '4', '5', '6']))
            .to.revertedWith("Options must be more than one and smaller than 5")
    })

    it("Should campaign be updated", async () => {
        const [creater, owner, address1, uploader, campaignOwner] = await ethers.getSigners();

        await expect(votingCampaignContract.connect(campaignOwner).beginVoteCampaign("name", "metadata", ['1', '2']))
            .to.emit(votingCampaignContract, 'VoteCampaignChange').withArgs(
                0, "name", 'metadata', ['1', '2'], [0, 0], true
            )

        await expect(votingCampaignContract.connect(campaignOwner).updateVoteCampaign(0, "name1", "metadata2"))
            .to.emit(votingCampaignContract, 'VoteCampaignChange').withArgs(
                0, "name1", 'metadata2', ['1', '2'], [0, 0], true
            )

        // const campaign = await votingCampaignContract.getCampaign(0);
        // console.log(campaign[5])
    })

    it("Should campaign be updated, only campaign owner", async () => {
        const [creater, owner, address1, uploader, campaignOwner] = await ethers.getSigners();

        await expect(votingCampaignContract.connect(campaignOwner).beginVoteCampaign("name", "metadata", ['1', '2']))
            .to.emit(votingCampaignContract, 'VoteCampaignChange').withArgs(
                0, "name", 'metadata', ['1', '2'], [0, 0], true
            )

        await expect(votingCampaignContract.connect(uploader).updateVoteCampaign(0, "name1", "metadata2"))
            .to.revertedWith("Only campaign owner can modify campaign informations")
    })

    it("Should campaign be transfered to new owner", async () => {
        const [creater, owner, address1, uploader, campaignOwner, campaignOwner2] = await ethers.getSigners();

        await expect(votingCampaignContract.connect(campaignOwner).beginVoteCampaign("name", "metadata", ['1', '2']))
            .to.emit(votingCampaignContract, 'VoteCampaignChange').withArgs(
                0, "name", 'metadata', ['1', '2'], [0, 0], true
            )

        await expect(votingCampaignContract.connect(campaignOwner).transferCampaignOwnership(0, campaignOwner2))
            .to.emit(votingCampaignContract, 'CampaignOwnershipTransferred').withArgs(0, campaignOwner2);
    })

    it("Should campaign be transfered to new owner, only campaign owner", async () => {
        const [creater, owner, address1, uploader, campaignOwner, campaignOwner2] = await ethers.getSigners();

        await expect(votingCampaignContract.connect(campaignOwner).beginVoteCampaign("name", "metadata", ['1', '2']))
            .to.emit(votingCampaignContract, 'VoteCampaignChange').withArgs(
                0, "name", 'metadata', ['1', '2'], [0, 0], true
            )

        await expect(votingCampaignContract.connect(uploader).transferCampaignOwnership(0, campaignOwner2))
            .to.revertedWith("Only campaign owner can modify campaign informations")
    })

    it("Should campaign has correct batch id after submit, only uploader", async () => {
        const [creater, owner, address1, uploader, campaignOwner] = await ethers.getSigners();

        await expect(votingCampaignContract.connect(campaignOwner).beginVoteCampaign("name", "metadata", ['1', '2']))
            .to.emit(votingCampaignContract, 'VoteCampaignChange').withArgs(
                0, "name", 'metadata', ['1', '2'], [0, 0], true
            )

        await expect(votingCampaignContract.setUploader(uploader, true))
            .to.emit(votingCampaignContract, "UploaderChange").withArgs(uploader, true);

        await expect(votingCampaignContract.connect(uploader).uploadVoteBatch(0, [1n, 2n], ethers.encodeBytes32String('testRoot')))
            .to.emit(votingCampaignContract, 'UploadBatch').withArgs(0, 0, [1, 2])
    })

    it("Should campaign has correct batch id after submit, only uploader, neg", async () => {
        const [creater, owner, address1, uploader, campaignOwner] = await ethers.getSigners();

        await expect(votingCampaignContract.connect(campaignOwner).beginVoteCampaign("name", "metadata", ['1', '2']))
            .to.emit(votingCampaignContract, 'VoteCampaignChange').withArgs(
                0, "name", 'metadata', ['1', '2'], [0, 0], true
            )

        await expect(votingCampaignContract.setUploader(uploader, true))
            .to.emit(votingCampaignContract, "UploaderChange").withArgs(uploader, true);

        await expect(votingCampaignContract.connect(address1).uploadVoteBatch(0, [1n, 2n], ethers.encodeBytes32String('testRoot')))
            .to.revertedWith('Caller is not authorized to upload')
    })

    it("Should campaign has correct batch id after submit and count, only uploader", async () => {
        const [creater, owner, address1, uploader, campaignOwner] = await ethers.getSigners();

        await expect(votingCampaignContract.connect(campaignOwner).beginVoteCampaign("name", "metadata", ['1', '2']))
            .to.emit(votingCampaignContract, 'VoteCampaignChange').withArgs(
                0, "name", 'metadata', ['1', '2'], [0, 0], true
            )

        await expect(votingCampaignContract.setUploader(uploader, true))
            .to.emit(votingCampaignContract, "UploaderChange").withArgs(uploader, true);

        await expect(votingCampaignContract.connect(uploader).uploadVoteBatch(0, [1n, 2n], ethers.encodeBytes32String('testRoot')))
            .to.emit(votingCampaignContract, 'UploadBatch').withArgs(0, 0, [1, 2])

        await expect(votingCampaignContract.connect(uploader).uploadVoteBatch(0, [1n, 2n], ethers.encodeBytes32String('testRoot1')))
            .to.emit(votingCampaignContract, 'UploadBatch').withArgs(0, 1, [2, 4])
    })

    it("Should campaign has correct batch id after submit and count, duplicate Root, neg", async () => {
        const [creater, owner, address1, uploader, campaignOwner] = await ethers.getSigners();

        await expect(votingCampaignContract.connect(campaignOwner).beginVoteCampaign("name", "metadata", ['1', '2']))
            .to.emit(votingCampaignContract, 'VoteCampaignChange').withArgs(
                0, "name", 'metadata', ['1', '2'], [0, 0], true
            )

        await expect(votingCampaignContract.setUploader(uploader, true))
            .to.emit(votingCampaignContract, "UploaderChange").withArgs(uploader, true);

        await expect(votingCampaignContract.connect(uploader).uploadVoteBatch(0, [1n, 2n], ethers.encodeBytes32String('testRoot')))
            .to.emit(votingCampaignContract, 'UploadBatch').withArgs(0, 0, [1, 2])

        await expect(votingCampaignContract.connect(uploader).uploadVoteBatch(0, [1n, 2n], ethers.encodeBytes32String('testRoot')))
            .to.revertedWith('Duplicated voting result found!')
    })

    it("Should campaign has correct root", async () => {
        const [creater, owner, address1, uploader, campaignOwner] = await ethers.getSigners();

        await expect(votingCampaignContract.connect(campaignOwner).beginVoteCampaign("name", "metadata", ['1', '2']))
            .to.emit(votingCampaignContract, 'VoteCampaignChange').withArgs(
                0, "name", 'metadata', ['1', '2'], [0, 0], true
            )

        await expect(votingCampaignContract.setUploader(uploader, true))
            .to.emit(votingCampaignContract, "UploaderChange").withArgs(uploader, true);

        await expect(votingCampaignContract.connect(uploader).uploadVoteBatch(0, [1n, 2n], ethers.encodeBytes32String('testRoot')))
            .to.emit(votingCampaignContract, 'UploadBatch').withArgs(0, 0, [1, 2])

        await expect(votingCampaignContract.connect(uploader).uploadVoteBatch(0, [1n, 2n], ethers.encodeBytes32String('testRoot1')))
            .to.emit(votingCampaignContract, 'UploadBatch').withArgs(0, 1, [2, 4])

        expect(ethers.decodeBytes32String(await votingCampaignContract.getBatchMerkleRoot(0, 0)))
            .to.equals('testRoot');

        expect(ethers.decodeBytes32String(await votingCampaignContract.getBatchMerkleRoot(0, 1)))
            .to.equals('testRoot1');
    })

})