import { ethers } from "hardhat";

const sleep = (ms = 2000) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const addresses = await ethers.getSigners();
  console.table(addresses.map((m) => m.address));

  const BillionsNftContract = (await ethers.getContractFactory("BillionsNFT")).attach(
    "0xCca82179c2728Ce192Cf618E131b36291c900F7D"
  );

  const PlyContract = await ethers.getContractFactory("MyToken");
  const plyContract = PlyContract.attach(await BillionsNftContract.playTokenAddress());

  // const tx = await BillionsNftContract.transferFrom(
  //   addresses[0].address,
  //   "0x4b1Aa9EBd4Efc3cD4BAf3E686B507448a2Cb8EBE",
  //   2
  // );
  // await tx.wait();
  // console.log(await BillionsNftContract.balanceOf("0x4b1Aa9EBd4Efc3cD4BAf3E686B507448a2Cb8EBE"));
  // const billionsNftContract = await BillionsNftContract.deploy(
  //   "BillionsNFT",
  //   "BN",
  //   "0xfda9AA6084C4Be79710b47558302D253f726291F"
  // );
  // await billionsNftContract.deployed();
  // const tx = await BillionsNftContract.transferFrom(
  //   owner.address,
  //   "0x5199938b13B5321d9BFa28A8c9764A973F4Ea084",
  //   "2"
  // );
  // await tx.wait();

  /** MINT BILLIONS NFT */
  // for (let i = 0; i < STOCKS.length; i++) {
  //   const element = STOCKS[i];
  //   console.log("--- MINTING BILLIONS NFT ---");
  //   const tx = await BillionsNftContract.mint(addresses[0].address, element);
  //   await tx.wait();
  //   console.log("---BILLIONS NFT MINTED SUCCESSFULLY---");
  // }

  // for (let i = 0; i < 5; i++) {
  //   const tx = await BillionsNftContract.updateNftRentingStatus(
  //     i,
  //     ethers.utils.parseEther("0.1"),
  //     true
  //   );
  //   await tx.wait();
  //   console.log(i + "----UPDATED RENTING STATUS----");
  // }

  /** UPDATE RENT STATUS */
  // for (let i = 0; i < STOCKS.length; i++) {
  //   console.log("--- UPDATING NFT RENT STATUS ---");
  //   const tempOwner = addresses[0];
  //   const tx = await BillionsNftContract.connect(tempOwner).updateNftRentingStatus(
  //     i,
  //     ethers.utils.parseEther("1"),
  //     true
  //   );
  //   await tx.wait();
  //   console.log("--- UPDATED NFT STATUS");
  // }

  /** UPDATE SELLING PRICE */
  // const tempOwner = addresses[1];
  // console.log("--- UPDATING SELLING PRICE STATUS ---");
  // const stx = await BillionsNftContract.connect(tempOwner).updateSellingPrice(
  //   12,
  //   ethers.utils.parseEther("9")
  // );
  // await stx.wait();
  // console.log("--- UPDATED SELLING PRICE STATUS");

  /** MINT PLAY TOKEN */
  // for (let i = 10; i < 20; i++) {
  //   const element = addresses[i];

  //   console.log("--- MINTING FOR >>> ", element.address);
  //   const tx = await plyContract
  //     .connect(element)
  //     .mint(element.address, ethers.utils.parseEther("1000"));
  //   await tx.wait();
  //   console.log("MINTED");
  // }

  /** RENT AN NFT  */
  for (let i = 3; i < 15; i++) {
    const element = addresses[i];

    const allowance = await plyContract.allowance(element.address, BillionsNftContract.address);
    if (allowance.isZero()) {
      console.log(element.address + "-----APPROVING SUCCESS");
      const approveTx = await plyContract
        .connect(element)
        .approve(BillionsNftContract.address, ethers.constants.MaxUint256);
      await approveTx.wait();
      console.log(element.address + "-----APPROVED SUCCESS");
    }
    await sleep();
    console.log(element.address + "-----RENTING NFT SUCCESS");
    const tx = await BillionsNftContract.connect(element).rentAnNft(148, [13, 14, 15, 16]);
    await tx.wait();
    console.log(element.address + "-----RENTED NFT SUCCESS");
    await sleep();
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
