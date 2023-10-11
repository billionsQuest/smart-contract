import { ethers } from "hardhat";

async function main() {
  const [owner] = await ethers.getSigners();
  const nonce = await ethers.provider.getTransactionCount(owner.address);
  console.log(`Nonce for address ${owner.address}: ${nonce}`);

  /** PLAY TOKEN DEPLOY */
  console.log("--- DEPLOYING PLAY TOKEN CONTRACT ---");
  const PlyContract = await ethers.getContractFactory("MyToken");
  const plyContract = await PlyContract.deploy("TestPlayToken", "TPLAY");
  await plyContract.deployed();
  console.log("PLY TOKEN CONTRACT - ", plyContract.address);

  // /** USDT TOKEN DEPLOY */
  // const USDTTokenContract = await ethers.getContractFactory("MyToken");
  // const usdtTokenContract = await USDTTokenContract.deploy("TestnetUSDT", "TUSDT");
  // await usdtTokenContract.deployed();
  // console.log("USDT TOKEN CONTRACT - ", usdtTokenContract.address);

  /** SCALAR NFT CONTRACT */
  const ScalarNftContract = await ethers.getContractFactory("ScalarNFT");
  const scalarNftContract = await ScalarNftContract.deploy(plyContract.address);
  await scalarNftContract.deployed();
  console.log("SCALAR NFT CONTRACT - ", scalarNftContract.address);

  /** BILLIONS NFT CONTRACT */
  const BillionsNftContract = await ethers.getContractFactory("BillionsNFT");
  const billionsContract = await BillionsNftContract.deploy(
    "BillionsNFT",
    "BNN",
    plyContract.address
  );
  await billionsContract.deployed();
  console.log("BILLIONS NFT CONTRACT - ", billionsContract.address);

  /** BATTLE CONTRACT */
  const BattleContract = await ethers.getContractFactory("BattleContract");
  // const battleContract = BattleContract.attach("0x593ED59202Ac26FC7de59F7b8667F246018DBb28");
  const battleContract = await BattleContract.deploy(
    plyContract.address,
    billionsContract.address,
    scalarNftContract.address
  );
  await battleContract.deployed();
  console.log("BATTLE CONTRACT - ", battleContract.address);

  // const tx = await battleContract.SetBillionsNftAddress(
  //   "0x62eAF47e8eFF64c268e6511b7C4E7eED151f628B"
  // );
  // await tx.wait();
  // console.log("--- CHANGED ---");

  // console.log(await battleContract.billionsNftAddress());
  // console.log(await battleContract.scalarNftAddress());
  // console.log(await battleContract.playTokenAddress());

  /** MARKETPLACE CONTRACT */
  const MarketplaceNftContract = await ethers.getContractFactory("MarketPlaceContract");
  const marketplaceNftContract = await MarketplaceNftContract.deploy(
    billionsContract.address,
    scalarNftContract.address,
    plyContract.address,
    plyContract.address
  );

  await marketplaceNftContract.deployed();
  console.log("MARKETPLACE CONTRACT - ", marketplaceNftContract.address);

  /** UPDATE MARKETPLACE ADDRESS IN BILLIONS NFT ADDRESS */

  console.log("--- UPDATING MARKETPLACE ADDRESS ---");
  const mtx = await billionsContract.setMarketplaceAddress(marketplaceNftContract.address);
  await mtx.wait();
  console.log("--- UPDATED MARKETPLACE ADDRESS ---");

  /** TRANSFER MARKETPLACE OWNER */
  // const MarketplaceNftContract = await ethers.getContractFactory("MarketPlaceContract");
  // const marketplaceNftContract = MarketplaceNftContract.attach(
  //   "0x01eB8Ae8B0523163764F1490551BD3cB5d8A5044"
  // );
  // const tx = await marketplaceNftContract.transferOwnership(
  //   "0x4b1Aa9EBd4Efc3cD4BAf3E686B507448a2Cb8EBE"
  // );
  // await tx.wait();
  // console.log("---MARKETPLACE OWNER TRANSFERRED---");

  /** TRANSFER BATTLE CONTRACT OWNER */
  // console.log("--- TRANSFERING OWNERSHIP ---");
  // const BattleContract = await ethers.getContractFactory("BattleContract");
  // const battleContract = BattleContract.attach("0x1970FDCbf58F0b478d1ab88C31aB6a926Fd61436");
  // const tx = await battleContract.transferOwnership("0x4b1Aa9EBd4Efc3cD4BAf3E686B507448a2Cb8EBE");
  // await tx.wait();
  // console.log("---BATTLE OWNER TRANSFERRED---");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
