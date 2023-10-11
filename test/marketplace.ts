import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { expect } from "chai";
import { ethers } from "hardhat";
import {
  BillionsNFT,
  MarketPlaceContract,
  MyToken,
  ScalarNFT,
} from "../typechain-types";

describe("Marketplace", function () {
  let marketplaceContract: MarketPlaceContract;
  let billionsNftContract: BillionsNFT;
  let PLYTokenContract: MyToken;
  let USDTTokenContract: MyToken;
  let scalarNftContract: ScalarNFT;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  async function deployOneYearLockFixture() {
    // Deploy PLYToken and USDTToken contracts
    const PLYToken = await ethers.getContractFactory("MyToken"); // Replace with the actual PLYToken contract name
    PLYTokenContract = await PLYToken.deploy("PLY Token", "PLY"); // Provide the name and symbol as constructor arguments
    await PLYTokenContract.deployed();

    const USDTToken = await ethers.getContractFactory("MyToken"); // Replace with the actual USDTToken contract name
    USDTTokenContract = await USDTToken.deploy("USDT Token", "USDT"); // Provide the name and symbol as constructor arguments
    await USDTTokenContract.deployed();

    // Deploy the BillionsNFT and ScalarNFT contracts
    const BillionsNFT = await ethers.getContractFactory("BillionsNFT");
    billionsNftContract = await BillionsNFT.deploy(
      "BillionsNFT",
      "BSN",
      PLYTokenContract.address
    );
    await billionsNftContract.deployed();

    const ScalarNFT = await ethers.getContractFactory("ScalarNFT");
    scalarNftContract = await ScalarNFT.deploy(PLYTokenContract.address);
    await scalarNftContract.deployed();

    const MarketPlaceContract = await ethers.getContractFactory(
      "MarketPlaceContract"
    );
    const marketplaceContract = await MarketPlaceContract.deploy(
      billionsNftContract.address,
      scalarNftContract.address,
      PLYTokenContract.address,
      USDTTokenContract.address
    );
    await marketplaceContract.deployed();

    return {
      marketplaceContract: marketplaceContract,
      billionsNftContract: billionsNftContract,
      PLYTokenContract: PLYTokenContract,
      USDTTokenContract: USDTTokenContract,
      scalarNftContract: scalarNftContract,
    };
  }

  beforeEach(async () => {
    ({
      marketplaceContract,
      billionsNftContract,
      PLYTokenContract,
      USDTTokenContract,
      scalarNftContract,
    } = await loadFixture(deployOneYearLockFixture));
    [owner, user1, user2] = await ethers.getSigners();
  });

  describe("createAuction", function () {
    it("should create an auction for multiple symbols", async function () {
      const symbol1 = "AAPL";
      const symbol2 = "GOOG";
      const name1 = "apple";
      const name2 = "google";
      const minBidAmount = ethers.utils.parseEther("0.1"); // 0.1 ETH
      const endTime = (await time.latest()) + time.duration.days(7);

      expect(
        await marketplaceContract.createAuction(
          [symbol1, symbol2],
          [name1, name2],
          minBidAmount,
          endTime
        )
      );
      //     .to.emit(marketplaceContract, "_CreateAuction")
      //     .withArgs(anyValue(), [symbol1, symbol2], minBidAmount, endTime, user1.address);

      // Verify auction details
      const auctionInfo1 = await marketplaceContract.getAuctionInfo(0);
      const auctionInfo2 = await marketplaceContract.getAuctionInfo(1);

      expect(await marketplaceContract.AuctionId()).to.equal("2");

      expect(auctionInfo1.symbol).to.equal(symbol1);
      expect(auctionInfo2.symbol).to.equal(symbol2);
      expect(auctionInfo1.miniumBidAmount).to.equal(minBidAmount);
      expect(auctionInfo2.miniumBidAmount).to.equal(minBidAmount);
      expect(auctionInfo1.auctionEndTime).to.equal(endTime);
      expect(auctionInfo2.auctionEndTime).to.equal(endTime);
    });

    it("should allow users to place bids on active auctions", async function () {
      const symbol = "AAPL";
      const symbolName = "AAPL- Apple stock";
      const minBidAmount = ethers.utils.parseEther("0.1"); // 0.1 ETH
      const endTime = (await time.latest()) + time.duration.days(7);
      await marketplaceContract.createAuction(
        [symbol],
        [symbolName],
        minBidAmount,
        endTime
      );

      const auctionInfo = await marketplaceContract.getAuctionInfo(0);
      const bidAmount = minBidAmount.add(ethers.utils.parseEther("0.5")); // 0.15 ETH

      await USDTTokenContract.connect(user2).mint(
        user2.address,
        ethers.utils.parseEther("150")
      );
      await USDTTokenContract.connect(user2).approve(
        marketplaceContract.address,
        ethers.constants.MaxUint256
      );

      await expect(
        marketplaceContract.connect(user2).bidOnAuction(0, bidAmount)
      )
        .to.emit(marketplaceContract, "_Bid")
        .withArgs(0, user2.address, bidAmount);
      // Verify auction details after the bid
      const updatedAuctionInfo = await marketplaceContract.getAuctionInfo(0);
      expect(updatedAuctionInfo.currentBidAmount).to.equal(bidAmount);
      expect(updatedAuctionInfo.currentBidWinner).to.equal(user2.address);
    });
  });

  describe("createFixedSale", function () {
    it("should allow NFT owners to create a fixed price sale", async function () {
      const tokenId = 0;
      const price = ethers.utils.parseEther("1"); // 1 ETH

      // Mint the NFT and transfer it to user1
      await billionsNftContract.mint(user1.address, "AAPL", "AAPL");
      await billionsNftContract
        .connect(user1)
        .approve(marketplaceContract.address, tokenId);
      await marketplaceContract.connect(user1).createFixedSale(tokenId, price);

      // Verify auction details
      const auctionInfo = await marketplaceContract.getAuctionInfo(0);
      expect(auctionInfo.isAuction).to.be.false;
      expect(auctionInfo.currentBidAmount).to.equal(price);
      expect(auctionInfo.nftOwner).to.equal(user1.address);
    });
  });

  describe("buyOnFixedSale", function () {
    it("should allow users to buy NFTs instantly in fixed price sales", async function () {
      const tokenId = 0;
      const price = ethers.utils.parseEther("1"); // 1 ETH

      // Mint the NFT and create the fixed price sale
      await billionsNftContract.mint(user1.address, "AAPL", "AAPL");
      await billionsNftContract
        .connect(user1)
        .approve(marketplaceContract.address, tokenId);
      await marketplaceContract.connect(user1).createFixedSale(tokenId, price);

      // Buy the NFT
      await PLYTokenContract.connect(user2).mint(user2.address, price);
      await PLYTokenContract.connect(user2).approve(
        marketplaceContract.address,
        price
      );
      await expect(marketplaceContract.connect(user2).buyOnFixedSale(0))
        .to.emit(marketplaceContract, "_Buy")
        .withArgs(0, user2.address);

      // Verify the NFT ownership and tokens transfer
      expect(await billionsNftContract.ownerOf(tokenId)).to.equal(
        user2.address
      );
      expect(await PLYTokenContract.balanceOf(user2.address)).to.equal(0);
      // expect(await PLYTokenContract.balanceOf(user1.address)).to.equal(price);
    });
  });

  describe("cancelOnFixedSale", function () {
    it("cancel the listed nft from fixed sale", async function () {
      const tokenId = 0;
      const price = ethers.utils.parseEther("1"); // 1 ETH

      // Mint the NFT and create the fixed price sale
      await billionsNftContract.mint(user1.address, "AAPL", "AAPL");
      await billionsNftContract
        .connect(user1)
        .approve(marketplaceContract.address, tokenId);
      await marketplaceContract.connect(user1).createFixedSale(tokenId, price);

      await expect(marketplaceContract.connect(user1).cancelFixedSale(0))
        .to.emit(marketplaceContract, "_CancelFixedSale")
        .withArgs(0);

      const auctionInfo = await marketplaceContract.getAuctionInfo(0);

      // Verify the NFT ownership and tokens transfer
      expect(await billionsNftContract.ownerOf(tokenId)).to.equal(
        user1.address
      );
      expect(auctionInfo.status).to.equal(2);
    });
  });
});
