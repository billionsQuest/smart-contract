import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { expect } from "chai";
import { ethers } from "hardhat";
import { BillionsNFT, MarketPlaceContract, MyToken, ScalarNFT } from "../typechain-types";

describe("BillionsnNFT", function () {
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
    billionsNftContract = await BillionsNFT.deploy("BillionsNFT", "BSN", PLYTokenContract.address);
    await billionsNftContract.deployed();

    const ScalarNFT = await ethers.getContractFactory("ScalarNFT");
    scalarNftContract = await ScalarNFT.deploy(PLYTokenContract.address);
    await scalarNftContract.deployed();

    const MarketPlaceContract = await ethers.getContractFactory("MarketPlaceContract");
    const marketplaceContract = await MarketPlaceContract.deploy(
      billionsNftContract.address,
      scalarNftContract.address,
      PLYTokenContract.address,
      USDTTokenContract.address
    );
    await marketplaceContract.deployed();

    await billionsNftContract.setMarketplaceAddress(marketplaceContract.address);

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

  describe("BillionsNft Info", function () {
    it("check the default rental and selling price", async function () {
      // Mint the NFT and transfer it to user1
      await billionsNftContract.mint(user1.address, "AAPL", "AAPL");

      // Verify nft details
      const nftInfo = await billionsNftContract.nftInfos(0);
      expect(nftInfo.rentable).to.be.false;
      expect(nftInfo.rentPrice).to.equal(ethers.utils.parseEther("1"));
      expect(nftInfo.sellingPrice).to.equal(ethers.utils.parseEther("10"));
    });
    it("update the default rental price", async function () {
      // Mint the NFT and transfer it to user1
      await billionsNftContract.mint(user1.address, "AAPL", "AAPL");

      // Verify auction details
      await billionsNftContract
        .connect(user1)
        .updateNftRentingStatus(0, ethers.utils.parseEther("2"), true);
      // Verify nft details
      const nftInfo = await billionsNftContract.nftInfos(0);
      expect(nftInfo.rentable).to.be.true;
      expect(nftInfo.rentPrice).to.equal(ethers.utils.parseEther("2"));
      expect(nftInfo.sellingPrice).to.equal(ethers.utils.parseEther("10"));
    });
    it("update the default selling price", async function () {
      // Mint the NFT and transfer it to user1
      await billionsNftContract.mint(user1.address, "AAPL", "AAPL");

      // Verify auction details
      await billionsNftContract.connect(user1).updateSellingPrice(0, ethers.utils.parseEther("2"));
      // Verify nft details
      const nftInfo = await billionsNftContract.nftInfos(0);
      expect(nftInfo.sellingPrice).to.equal(ethers.utils.parseEther("2"));
    });
  });

  describe("createFixedSale", function () {
    it("should allow NFT owners to create a fixed price sale", async function () {
      const tokenId = 0;
      const price = ethers.utils.parseEther("1"); // 1 ETH

      // Mint the NFT and transfer it to user1
      await billionsNftContract.mint(user1.address, "AAPL", "AAPL");
      await billionsNftContract.connect(user1).approve(marketplaceContract.address, tokenId);
      await marketplaceContract.connect(user1).createFixedSale(tokenId, price);

      await billionsNftContract.connect(user1).updateSellingPrice(0, ethers.utils.parseEther("2"));

      // Verify auction details
      const auctionInfo = await marketplaceContract.getAuctionInfo(0);
      expect(auctionInfo.isAuction).to.be.false;
      expect(auctionInfo.currentBidAmount).to.equal(price);
      expect(auctionInfo.nftOwner).to.equal(user1.address);

      // Verify nft details
      const nftInfo = await billionsNftContract.nftInfos(0);
      expect(nftInfo.sellingPrice).to.equal(ethers.utils.parseEther("2"));
    });
  });

  describe("buyOnFixedSale", function () {
    it("should allow users to buy NFTs instantly in fixed price sales", async function () {
      const tokenId = 0;
      const price = ethers.utils.parseEther("1"); // 1 ETH

      // Mint the NFT and create the fixed price sale
      await billionsNftContract.mint(user1.address, "AAPL", "AAPL");
      await billionsNftContract.connect(user1).approve(marketplaceContract.address, tokenId);
      await marketplaceContract.connect(user1).createFixedSale(tokenId, price);

      // Buy the NFT
      await PLYTokenContract.connect(user2).mint(user2.address, price);
      await PLYTokenContract.connect(user2).approve(marketplaceContract.address, price);
      await expect(marketplaceContract.connect(user2).buyOnFixedSale(0))
        .to.emit(marketplaceContract, "_Buy")
        .withArgs(0, user2.address);

      await billionsNftContract.connect(user2).updateSellingPrice(0, ethers.utils.parseEther("2"));

      // Verify the NFT ownership and tokens transfer
      expect(await billionsNftContract.ownerOf(tokenId)).to.equal(user2.address);
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
      await billionsNftContract.connect(user1).approve(marketplaceContract.address, tokenId);
      await marketplaceContract.connect(user1).createFixedSale(tokenId, price);

      await expect(marketplaceContract.connect(user1).cancelFixedSale(0))
        .to.emit(marketplaceContract, "_CancelFixedSale")
        .withArgs(0);

      const auctionInfo = await marketplaceContract.getAuctionInfo(0);

      // Verify the NFT ownership and tokens transfer
      expect(await billionsNftContract.ownerOf(tokenId)).to.equal(user1.address);
      expect(auctionInfo.status).to.equal(2);
    });
  });
});
