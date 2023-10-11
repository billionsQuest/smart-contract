import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { expect } from "chai";
import { ethers } from "hardhat";
import "@nomiclabs/hardhat-ethers";
import {
  BillionsNFT,
  ERC20,
  MarketPlaceContract,
  MyToken,
  BattleContract,
  ScalarNFT,
} from "../typechain-types";

describe("TokenContract", function () {
  let PLYTokenContract: MyToken;
  let owner: SignerWithAddress;
  let player1: SignerWithAddress;
  let player2: SignerWithAddress;
  let players: SignerWithAddress[];

  beforeEach(async () => {
    const signers = await ethers.getSigners();
    [owner, player1, player2] = signers;
    players = [...signers.slice(3, 13)];
    // players = []

    const PLYToken = await ethers.getContractFactory("MyToken"); // Replace with the actual PLYToken contract name
    PLYTokenContract = await PLYToken.deploy("TPLY Token", "TPLY"); // Provide the name and symbol as constructor arguments
    await PLYTokenContract.deployed();
  });

  it("check mint methods", async function () {
    await PLYTokenContract.mint(owner.address, ethers.utils.parseEther("150"));
    await PLYTokenContract.connect(owner).transfer(player1.address, ethers.utils.parseEther("1"));
    await ethers.provider.send("evm_increaseTime", [time.duration.days(1)]); // Fast-forward time by 7 days
    await ethers.provider.send("evm_mine", []); // Mine a new block to update the timestamp
    await PLYTokenContract.mint(owner.address, ethers.utils.parseEther("150"));

    expect((await PLYTokenContract.balanceOf(owner.address)).toString()).to.equal(
      ethers.utils.parseEther("299")
    );
  });
});
