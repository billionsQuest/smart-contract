import { ethers } from "hardhat";

async function main() {
  const addresses = await ethers.getSigners();
  console.table(addresses.map((m) => m.address));

  // MARKETPLACE CONTRACT
  console.log("--- DEPLOYING MARKETPLACE CONTRACT ---");
  const MarketPlaceContract = await ethers.getContractFactory("MarketPlaceContract");
  const marketplaceContract = MarketPlaceContract.attach(
    "0x4B1c590119A3dfdB1fA8BC4dff8DA365984F0951"
  );
  // const marketplaceContract = await MarketPlaceContract.deploy(
  //   "0xEE2A14B5d0E97C57f98328c9e35a7Af75890a1aF",
  //   "0xA8CA2aF9dB4A97AA425E49c87ba80e1116c478AC",
  //   "0x3d570334889c0FbA3eF2A53d807b97A550acB968",
  //   "0x3d570334889c0FbA3eF2A53d807b97A550acB968"
  // );
  // await marketplaceContract.deployed();

  console.log("MARKETPLACE CONTRACT ADDRESS", marketplaceContract.address);

  // console.log("--- UPDATING SCALAR NFT ADDRESS ---");
  // const stx = await marketplaceContract.setScalarNftAddress(
  //   "0x73d92516364137418DE1E98EAA7C3B02324a236e"
  // );
  // await stx.wait();
  // console.log("--- UPDATED SCALAR NFT ADDRESS ---");

  // console.log(await marketplaceContract.PLYTokenAddress());
  // console.log(await marketplaceContract.USDTTokenAddress());
  // console.log(await marketplaceContract.billionsNftAddress());
  // console.log(await marketplaceContract.scalarNftAddress());
  // BILLIONS NFT CONTRACT
  const BillionsNFTContract = await ethers.getContractFactory("BillionsNFT");
  const billionsNftContract = BillionsNFTContract.attach(
    await marketplaceContract.billionsNftAddress()
  );

  // const d = await marketplaceContract.getAuctionInfo(8);
  // console.log(d.tokenId.toString());

  // PLAY TOKEN CONTRACT
  const PlyContract = await ethers.getContractFactory("MyToken");
  const plyTokenContract = PlyContract.attach(await marketplaceContract.PLYTokenAddress());
  console.log("PLAY TOKEN ADDRESS - ", plyTokenContract.address);

  // GET OWNER OF MARKETPLACE
  const owner = await marketplaceContract.owner();
  console.log("OWNER OF MARKETPLACE CONTRACT - ", owner);

  /** SET PLAY TOKEN ADDRESS */
  // console.log("--- UPDATING PLAY TOKEN ADDRESS ---");
  // const tx = await marketplaceContract.setPLYTokenAddress(
  //   "0x3d570334889c0FbA3eF2A53d807b97A550acB968"
  // );
  // await tx.wait();
  // console.log("--- UPDATED PLAY TOKEN ADDRESS ---");

  // USDT TOKEN CONTRACT
  // const UsdtContract = await ethers.getContractFactory("MyToken");
  // const usdtTokenContract = UsdtContract.attach(await marketplaceContract.USDTTokenAddress());
  // console.log("USDT TOKEN ADDRESS - ", usdtTokenContract.address);

  /** TRANSFER OWNERSHIP */
  // console.log("--- OWNER TRANSFERRING... ---");
  // const ttx = await marketplaceContract.transferOwnership(
  //   "0x4b1Aa9EBd4Efc3cD4BAf3E686B507448a2Cb8EBE"
  // );
  // await ttx.wait();
  // console.log("--- OWNER TRANSFERRED SUCCESSFULLY");

  /** UPDATE USDT TOKEN ADDRESS */
  // console.log("--- UPDATING USDT TOKEN ADDRESS... ---");
  // const tx = await marketplaceContract.setUSDTTokenAddress(
  //   "0x5478404E8d874feD8EFDdE301d2Aa8B6e14090d2"
  // );
  // await tx.wait();
  // console.log("--- USDT ADDRESS UPDATED SUCCESSFULLY ---");

  /** CREATE AUCTION */
  // console.log("--- CREATING... AUCTION ---");
  // const tx = await marketplaceContract.createAuction(
  //   ["A1EE34_BOVESPA", "A1MP34_BOVESPA", "A1SN34_BOVESPA", "A1LN34_BOVESPA"],
  //   ["A1EE34_BOVESPA", "A1MP34_BOVESPA", "A1SN34_BOVESPA", "A1LN34_BOVESPA"],
  //   ethers.utils.parseEther("1"),
  //   1694698200
  // );
  // await tx.wait();
  // console.log("--- AUCTION CREATED SUCCESSFULLY ---");

  /** BID ON AUCTION */
  // for (let i = 0; i < 1; i++) {
  //   const element = addresses[i];

  //   console.log("--- BIDDING... ON AUCTION ---");

  //   const allowance = await usdtTokenContract.allowance(
  //     element.address,
  //     marketplaceContract.address
  //   );

  //   if (allowance.isZero()) {
  //     console.log(element.address + "-----APPROVING PLAY TOKEN");

  //     const approveTx = await usdtTokenContract
  //       .connect(element)
  //       .approve(marketplaceContract.address, ethers.constants.MaxUint256);
  //     await approveTx.wait();
  //     console.log(element.address + "-----APPROVED SUCCESSFULLY");
  //   }

  //   const tx = await marketplaceContract
  //     .connect(element)
  //     .bidOnAuction(0, ethers.utils.parseEther("14"));
  //   await tx.wait();
  //   console.log("--- BIDDED ON AUCTION ---");
  // }

  /** DISTRIBUTE NFT */
  // console.log("--- DISTRIBUTING NFT ---");
  // const tx = await marketplaceContract.distributeNft(0);
  // await tx.wait();
  // console.log("--- AUCTION ENDED SUCCESSFULLY ---");

  /** CREATE FIXED SALE */
  // console.log("--- CREATING... FIXED SALE ---");
  // const tempOwner = addresses[0];

  // const isApproved = await billionsNftContract.isApprovedForAll(
  //   tempOwner.address,
  //   marketplaceContract.address
  // );

  // if (!isApproved) {
  //   console.log("--- APPROVING... TOKEN ---");
  //   const approveTx = await billionsNftContract
  //     .connect(tempOwner)
  //     .setApprovalForAll(marketplaceContract.address, true);
  //   await approveTx.wait();
  //   console.log("--- APPROVED TOKEN ---");
  // }

  // const tx = await marketplaceContract
  //   .connect(tempOwner)
  //   .createFixedSale(0, ethers.utils.parseEther("1"));
  // await tx.wait();
  // console.log("--- CREATED FIXEDSALE ---");

  /** BUY ON FIXED SALE */
  // console.log("--- BUYING ON FIXED SALE... ---");
  // const tempOwner = addresses[1];
  // const isApproved = await plyTokenContract.allowance(
  //   tempOwner.address,
  //   marketplaceContract.address
  // );

  // if (isApproved.lte(BigInt(0))) {
  //   console.log("--- APPROVING TOKEN... ---");
  //   const approveTx = await plyTokenContract
  //     .connect(tempOwner)
  //     .approve(marketplaceContract.address, ethers.constants.MaxUint256);
  //   await approveTx.wait();
  //   console.log("--- TOKEN APPROVED!!! ---");
  // }

  // const tx = await marketplaceContract.connect(addresses[1]).buyOnFixedSale(20);
  // await tx.wait();
  // console.log("--- PURCHASED ON FIXEDSALE ---");

  // const balanceOf = await plyTokenContract.balanceOf(addresses[1].address);

  // if (balanceOf.lte(BigInt(0))) {
  //   console.log("--- MINTING TOKEN... ---");
  //   const mintTx = await playTokenContract
  //     .connect(addresses[1])
  //     .mint(addresses[1].address, ethers.utils.parseEther("100"));
  //   await mintTx.wait();
  //   console.log("--- TOKEN MINTED!!! ---");
  // }

  // const tx = await marketplaceContract.connect(addresses[1]).buyOnFixedSale(20);
  // await tx.wait();
  // console.log("--- PURCHASED ON FIXEDSALE ---");

  /** TRANSFER MARKETPLACE OWNER */
  // console.log("--- TRANSFERRING THE OWNERSHIP ---");
  // const tx = await marketplaceContract.transferOwnership(
  //   "0x5fdA46F090cc00cA6107Af279A8Ca2C4BcaF4D81"
  // );
  // await tx.wait();
  // console.log("---MARKETPLACE OWNER TRANSFERRED---");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
