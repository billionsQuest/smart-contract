import { ethers, config } from "hardhat";

const sleep = (ms = 2000) => new Promise((resolve) => setTimeout(resolve, ms));

// Given array
const originalArray = [13, 14, 15, 16];

function getRandomValues() {
  // Create a copy of the original array to avoid modifying it
  const newArray = originalArray.slice();

  // Initialize an empty array to store the randomly selected values
  const randomValues = [];

  // Randomly select and push three values into the new array
  while (randomValues.length < 3 && newArray.length > 0) {
    // Generate a random index within the range of the copy array
    const randomIndex = Math.floor(Math.random() * newArray.length);

    // Push the randomly selected value into the result array
    randomValues.push(newArray[randomIndex]);

    // Remove the selected value from the copy array to avoid duplicates
    newArray.splice(randomIndex, 1);
  }

  return randomValues;
}

async function main() {
  const addresses = await ethers.getSigners();
  console.table(addresses.map((m) => m.address));
  const owner = addresses[2];

  // BATTLE NFT CONTRACT
  console.log("--- DEPLOYING CONTRACT ---");
  const BattleContract = await ethers.getContractFactory("BattleContract");
  // const battleContract = await BattleContract.connect(owner).deploy(
  //   "0xBc94E0Ee3B2534F60C6CC9f4C137864AD3cb1409",
  //   "0xEE2A14B5d0E97C57f98328c9e35a7Af75890a1aF",
  //   "0x176b4CA0786519f3be3c5612Db5D4031808C5218"
  // );
  // await battleContract.deployed();
  const battleContract = BattleContract.attach(
    "0x64903C60e4052a5D9fb39a0E3bADAE5489A35d09"
  );
  console.log("BATTLE CONTRACT - ", battleContract.address);
  console.log("--- DEPLOYED CONTRACT ---");

  // PLY CONTRACT
  const PlyContract = await ethers.getContractFactory("MyToken");
  const plyContract = PlyContract.attach(
    await battleContract.playTokenAddress()
  );

  // SCALAR CONTRACT
  // const ScalarContract = await ethers.getContractFactory("ScalarNFT");
  // const scalarContract = ScalarContract.attach(await battleContract.scalarNftAddress());

  /** GET OWNER OF BATTLE CONTRACT */
  // const battleOwner = await battleContract.owner();
  // console.log("OWNER OF BATTLE CONTRACT - ", battleOwner);

  // console.log(await battleContract.playTokenAddress());

  // console.log("--- UPDATING SCALAR NFT ADDRESS ---");
  // const stx = await battleContract.SetScalarNftAddress(
  //   "0x73d92516364137418DE1E98EAA7C3B02324a236e"
  // );
  // await stx.wait();
  // console.log("--- UPDATED SCALAR NFT ADDRESS ---");

  /** TRANSFER OWNERSHIP */
  // console.log("--- OWNER TRANSFERRING... ---");
  // const ttx = await battleContract.transferOwnership("0xD8Bf7E8eeb86135dFdA143e5a09A751c827C60D6");
  // console.log(ttx);
  // await ttx.wait();
  // console.log("--- OWNER TRANSFERRED SUCCESSFULLY");

  /** ADD VERIFIED PLAYER */
  // console.log("---ADDING VERIFIED PLAYER ---");
  // const atx = await battleContract
  //   .connect(addresses[0])
  //   .AddVerifiedPlayer("0x4b1Aa9EBd4Efc3cD4BAf3E686B507448a2Cb8EBE");
  // await atx.wait();
  // console.log("---ADDED VERIFIED PLAYER SUCCESSFULLY---");

  /** CLAIM BONUS METHOD */

  // const tx = await BattleContract.ClaimBonus(0);
  // await tx.wait();

  // console.log("----CLIAMED----");

  // console.log("BILLIONS NFT - ", await BattleContract.billionsNftAddress());
  // console.log("SCALAR NFT - ", await BattleContract.scalarNftAddress());
  // console.log("PLAY TOKEN - ", await BattleContract.playTokenAddress());

  // console.log("OWNER - " + (await BattleContract.owner()));

  // const newTx = await BattleContract.AddVerifiedPlayer(
  //   "0xe05f949AB280414F4e3279fF3BE1e39774e4B4f3"
  // );
  // await newTx.wait();

  /** BATTLE CREATION METHOD */
  // console.log("----BATTLE CREATING...-------");

  // const ttx = await battleContract.CreateBattle(
  //   "1",
  //   "NASDAQ",
  //   "US",
  //   ethers.utils.parseEther("10"),
  //   3,
  //   1694755800,
  //   1694756400,
  //   ""
  // );
  // console.log(ttx);
  // await ttx.wait();
  // console.log("----BATTLE CREATED-------");
  // console.log("----BATTLE CREATING...-------");
  const btx = await battleContract.CreateBattle(
    "1",
    "NASDAQ",
    "US",
    ethers.utils.parseEther("10"),
    3,
    1695851739,
    1695852339,
    ""
  );
  await btx.wait();
  console.log(btx);
  console.log("----BATTLE CREATED-------");

  // console.log(await battleContract.GetBattle(10));

  // const element = addresses[0];
  // console.log(element.address);
  // const allowance = await plyContract.allowance(
  //   element.address,
  //   battleContract.address
  // );
  // if (allowance.isZero()) {
  //   console.log(element.address + "-----APPROVING PLAY TOKEN");
  //   const approveTx = await plyContract
  //     .connect(element)
  //     .approve(battleContract.address, ethers.constants.MaxUint256);
  //   await approveTx.wait();
  //   console.log(element.address + "-----APPROVED SUCCESSFULLY");
  // }
  // await sleep();
  // console.log("--- BETTING ON BATTLE ---", element.address);
  // const tx = await battleContract
  //   .connect(element)
  //   .BetBattle(2, [1, 2, 3], [], "", {});
  // await tx.wait();
  // console.log("--- PARTICIPATED ON BATTLE SUCCESSFULLY ---");
  // await sleep();

  /** BET BATTLE WITH RENT NFTS */
  for (let i = 0; i < 15; i++) {
    // const allowance = await plyContract.allowance(
    //   element.address,
    //   battleContract.address
    // );
    // if (allowance.isZero()) {
    //   console.log(element.address + "-----APPROVING PLAY TOKEN");
    //   const approveTx = await plyContract
    //     .connect(element)
    //     .approve(battleContract.address, ethers.constants.MaxUint256);
    //   await approveTx.wait();
    //   console.log(element.address + "-----APPROVED SUCCESSFULLY");
    // }
    // await sleep();
    // console.log("--- BETTING ON BATTLE ---", element.address);
    // const tx = await battleContract
    //   .connect(element)
    //   .BetBattle(2, [1, 2, 3], [], "", {});
    // await tx.wait();
    // console.log("--- PARTICIPATED ON BATTLE SUCCESSFULLY ---");
    // await sleep();
  }

  // const isApproved = await scalarContract.isApprovedForAll(owner.address, BattleContract.address);

  // if (!isApproved) {
  //   const tx = await scalarContract.setApprovalForAll(BattleContract.address, true);
  //   await tx.wait();

  //   console.log("----APPROVED-----");
  // }
  // console.log(await scalarContract.balanceOf(owner.address));
  // console.log("----STEP1----");
  // console.log(await BattleContract.billionsNftAddress());
  // console.log(await BattleContract.scalarNftAddress());
  // const tx = await BattleContract.BetBattle(0, [0, 1, 2], [0]);
  // await tx.wait();
  // console.log("----DONE----");

  // for (let i = 0; i < 2; i++) {
  //   const allowance = await plyContract.allowance(addresses[0].address, battleContract.address);

  //   if (allowance.isZero()) {
  //     console.log(addresses[0].address + "-----APPROVING PLAY TOKEN");

  //     const approveTx = await plyContract
  //       .connect(addresses[0])
  //       .approve(battleContract.address, ethers.constants.MaxUint256);
  //     await approveTx.wait();
  //     console.log(addresses[0].address + "-----APPROVED SUCCESSFULLY");
  //   }

  //   console.log("--- BETTING ---");
  //   const tx = await battleContract.connect(addresses[0]).BetBattle(1, [0, 1, 2], [], "");
  //   await tx.wait();
  //   console.log("----DONE----");
  // }

  // for (let i = 0; i < 5; i++) {
  //   const element = addresses[i];

  //   const allowance = await plyContract.allowance(element.address, BattleContract.address);
  //   if (allowance.isZero()) {
  //     const approveTx = await plyContract
  //       .connect(element)
  //       .approve(BattleContract.address, ethers.constants.MaxUint256);
  //     await approveTx.wait();
  //     console.log(element.address + "-----APPROVED SUCCESS");
  //   }

  //   const BetBattleTx = await BattleContract.connect(element).BetBattle(0, [0, 1], []);
  //   await BetBattleTx.wait();
  //   console.log(element.address + "-----BETTED------");
  // }

  // const users = [
  //   "0x45c07e11bb732b1071f4209b82285a1ce64369d7",
  //   "0x0797beecc048edb0d30a80552419bf608bdddf6a",
  //   "0x0279f6df18c42807bb72aaa05f32881fa4f40fed",
  //   "0xd74b3bfaa458bd813a624d13ce5ffbe0666acc95",
  //   "0x2469396303e174b31ab9ab8656e1e4df351fe52b",
  // ];

  // const rewards = [
  //   15.257414704929454, 14.947430711080735, 14.666945594454184,
  //   14.413152165728302, 12.715056823807327,
  // ];

  // const updatedReward = rewards.map((re) => {
  //   const val = ethers.utils.parseEther(re.toString());

  //   return val.toString();
  // });

  // console.log("updatedReward", updatedReward);

  // /** END BATTLE */
  // const battleId = 33;
  // console.log("--- ENDING BATTLE FOR - ", battleId);
  // const tx = await battleContract.EndBattle(battleId, users, updatedReward, {
  //   gasLimit: 5000000,
  // });
  // console.log(tx);
  // await tx.wait();
  // console.log("--- BATTLE ENDED FOR BATTLE ID - ", battleId);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  // process.exitCode = 1;
});

// export { main };
