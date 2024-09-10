const { ethers } = require("hardhat");

const deploy = async () => {
  let votingCampaignContract;
  let tokenContract;
  const tokenContractFactory = await ethers.getContractFactory(
    "VotingToken"
  );
  tokenContract = await tokenContractFactory.deploy('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
  const votingCampaignContractFactory = await ethers.getContractFactory(
    "VotingCampaignContract"
  );

  const tokenAddress = await tokenContract.getAddress();
  votingCampaignContract = await votingCampaignContractFactory.deploy(tokenAddress);
  console.log("Token deployed to:", tokenAddress);
  console.log("Voting deployed to:", votingCampaignContract.target);
}

deploy()
  // .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });