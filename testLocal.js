const  test = async () => {
    const [deployer] = await ethers.getSigners();
    const myContract = await ethers.getContractAt("VotingCampaignContract", "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512");
  
    // const tx = await myContract.beginVoteCampaign('test', "metadate", ['A', 'B', 'C'])
    // const tx = await myContract.setUploader('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', true)
    const tx = await myContract.getCampaign(6);
    console.log(tx);
    // await tx.wait();
  
    console.log("Event emitted");
  }
  
  test().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });