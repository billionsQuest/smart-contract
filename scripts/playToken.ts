import { ethers } from "hardhat";

async function main() {
  const addresses = await ethers.getSigners();
  console.table(addresses.map((m) => m.address));

  // PLY CONTRACT
  const PlyContract = await ethers.getContractFactory("MyToken");

  /** TOKEN DEPLOY */
  // const plyContract = await PlyContract.deploy("TestPlayToken", "TPLAY");
  // await plyContract.deployed();
  const plyContract = PlyContract.attach("0x1fA68Be6126BAe66533C8c2D38402C22a9Dd1f00");
  console.log("PLY TOKEN CONTRACT - ", plyContract.address);

  /** EXISITING CONTRACT LOAD */
  //   const plyContract = PlyContract.attach("0xfda9AA6084C4Be79710b47558302D253f726291F");

  /** MINT TOKEN */
  for (let i = 0; i < 20; i++) {
    const element = addresses[i];
    console.log(">>>> MINTING >>>>");
    console.log(element.address);
    const mintTx = await plyContract.mint(element.address, ethers.utils.parseEther("150"));
    await mintTx.wait();
    console.log("MINTED PLAYTOKEN FOR - ", element.address);

    // console.log(">>>> MINTING >>>>");
    // const tx = await plyContract
    //   .connect(element)
    //   .mint(element.address, ethers.utils.parseEther("1000"));
    // await tx.wait();

    // console.log("MINTED PLAYTOKEN FOR - ", element.address);
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
