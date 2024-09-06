const { ethers } = require("hardhat");
const { expect } = require("chai");
const { beforeEach } = require("mocha");


describe("Token and Faucet Test", () => {
    let tokenContract;
    let contractAddress;

    beforeEach(async () => {
        const [creater, owner, faucetAddrs, recipient, recipient2, recipient3] = await ethers.getSigners();

        const tokenContractFactory = await ethers.getContractFactory(
            "VotingToken"
        );

        tokenContract = await tokenContractFactory.deploy(faucetAddrs);
    })

    it("Should set the right owner to creator", async () => {
        const [creater] = await ethers.getSigners();
        expect(await tokenContract.owner()).to.equal(creater.address);
    });

    it("should set correct owner after transfer", async () => {
        const [creater, owner] = await ethers.getSigners();
        await tokenContract.transferOwnership(owner.address)
        expect(await tokenContract.owner()).to.equal(owner.address);
    })

    it("should have correct faucet Address", async () => {
        const [creater, owner, faucetAddrs] = await ethers.getSigners();
        expect(await tokenContract.faucetAddress()).to.equal(faucetAddrs.address);
    })

    it("should have correct faucet Address after setting", async () => {
        const [creater, owner, faucetAddrs] = await ethers.getSigners();
        await tokenContract.setFaucetAddress(owner.address);
        expect(await tokenContract.faucetAddress()).to.equal(owner.address);
        await tokenContract.setFaucetAddress(faucetAddrs.address);
        expect(await tokenContract.faucetAddress()).to.equal(faucetAddrs.address);
    })

    it("should have owner or faucetAddrs be able to trigger fauset, owner", async () => {
        const [creater, owner, faucetAddrs, recipient] = await ethers.getSigners();
        const tx = await tokenContract.connect(creater).faucet(recipient.address, 10n * 10n ** 18n)
        const receipt = await tx.wait();
        const block = await ethers.provider.getBlock(receipt.blockNumber);
        await expect(tx)
            .to.emit(tokenContract, "FaucetToAddress")
            .withArgs(recipient.address, block.timestamp, 10n * 10n ** 18n);
    })

    it("should have owner or faucetAddrs be able to trigger fauset, faucet", async () => {
        const [creater, owner, faucetAddrs, recipient] = await ethers.getSigners();
        const tx = await tokenContract.connect(faucetAddrs).faucet(recipient.address, 10n * 10n ** 18n)
        const receipt = await tx.wait();
        const block = await ethers.provider.getBlock(receipt.blockNumber);
        await expect(tx)
            .to.emit(tokenContract, "FaucetToAddress")
            .withArgs(recipient.address, block.timestamp, 10n * 10n ** 18n);
    })

    it("should have owner or faucetAddrs be able to trigger fauset, neg", async () => {
        const [creater, owner, faucetAddrs, recipient] = await ethers.getSigners();
        await expect(tokenContract.connect(recipient).faucet(recipient.address, 10n * 10n ** 18n))
            .to.revertedWith("Caller is not the faucet nor the owner");
    })

    it("An address cannot request faucet within cooldown ", async () => {
        const [creater, owner, faucetAddrs, recipient] = await ethers.getSigners();
        const tx = await tokenContract.connect(faucetAddrs).faucet(recipient.address, 10n * 10n ** 18n)
        await expect(tokenContract.connect(faucetAddrs).faucet(recipient.address, 10n * 10n ** 18n))
            .to.revertedWith("Faucet can only be used once every 24 hours");
    })

    it("An address cannot request faucet more then limit", async () => {
        const [creater, owner, faucetAddrs, recipient] = await ethers.getSigners();
        await expect(tokenContract.connect(faucetAddrs).faucet(recipient.address, 101n * 10n ** 18n))
            .to.revertedWith("Faucet limit exceeded");
    })
})