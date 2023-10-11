import { ethers } from "hardhat";

async function main() {
  const addresses = await ethers.getSigners();
  console.table(addresses.map((a) => a.address));

  // PLY CONTRACT
  const PlyContract = await ethers.getContractFactory("MyToken");
  const plyContract = PlyContract.attach(
    "0x4088978b6037189920BE815DE7b6DD299093248c"
  );

  // console.log(await plyContract.balanceOf("0x4b1Aa9EBd4Efc3cD4BAf3E686B507448a2Cb8EBE"));

  // console.log(battleContract.address);

  // SCALAR NFT CONTRACT
  const ScalarNftContract = await ethers.getContractFactory("ScalarNFT");
  // const scalarNftContract = await ScalarNftContract.deploy(
  //   "0x3d570334889c0FbA3eF2A53d807b97A550acB968"
  // );
  // await scalarNftContract.deployed();
  const scalarNftContract = ScalarNftContract.attach(
    "0x56F9AeE1E46844887A3a446dc53961bB83Bc0c4e"
  );

  console.log("SCALAR NFT CONTRACT ADDRESS - ", scalarNftContract.address);

  // console.log(await scalarNftContract.scalarValueOfId(0));

  // console.log(await scalarNftContract.payTokenAddress());

  const approveTx = await plyContract.approve(
    scalarNftContract.address,
    ethers.constants.MaxUint256
  );

  await approveTx.wait();

  console.log("play contract start allowance start");

  const allowance = Number(
    ethers.utils.formatEther(
      await plyContract.allowance(
        addresses[0].address,
        scalarNftContract.address
      )
    )
  );

  console.log("-----APPROVED------");

  await scalarNftContract.deployed();

  const mintPrice = Number(
    ethers.utils.formatEther(await scalarNftContract.mintPrice())
  );
  console.log("---MINTING---", mintPrice);

  if (allowance < mintPrice) {
    const tx = await plyContract.approve(
      scalarNftContract.address,
      ethers.constants.MaxUint256
    );
    await tx.wait();
  }
  const tx = await scalarNftContract.mint();
  await tx.wait();
  // const ntx = await ScalarNftContract.mint();
  // await ntx.wait();
  console.log("---MINTED---");

  // const tx = await ScalarNftContract.transferFrom(
  //   addresses[0].address,
  //   "0x4b1Aa9EBd4Efc3cD4BAf3E686B507448a2Cb8EBE",
  //   0
  // );
  // await tx.wait();
  // const ntx = await ScalarNftContract.transferFrom(
  //   addresses[0].address,
  //   "0x4b1Aa9EBd4Efc3cD4BAf3E686B507448a2Cb8EBE",
  //   1
  // );
  // await ntx.wait();

  // console.log("----TRANSFERRED----");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
